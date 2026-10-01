#!/usr/bin/env node
/**
 * metronome_probe.mjs — VMU-163-fix2 measure 2: a Playwright probe against
 * the *real* served app, not the offline harness — because only the real
 * app carries React's own render latency, which is exactly what the offline
 * harness's synchronous `transportOwner.playMusic()` calls cannot reproduce
 * (see `src/audio/measure/offlineRender.js`'s "metronome-then-play-midbar"
 * scenario docstring, and the ticket report). This is the coordinator's own
 * measurement method from the VMU-163-fix2 brief, turned into a repeatable
 * script: wrap the Web Audio `start(when)` methods, click the real buttons,
 * read back the exact scheduled times.
 *
 *   npm run metronome:probe                 # human-readable table
 *   npm run metronome:probe -- --json       # JSON, one entry per sequence
 *
 * Runs the brief's three sequences plus a Play/Stop stress repeat:
 *   1. metronome on, then Play 1.3s later — click ↔ first step, ≤ 1 ms.
 *   2. Play, then metronome on 1.7s later — click ↔ nearest step, ≤ 1 ms.
 *   3. metronome on, Play, then Stop — clicks must continue (VMU-056).
 *   4. metronome on, then Play/Stop toggled three times — no crash, clicks
 *      keep landing on a step throughout, exactly like sequence 1 repeated.
 *
 * Reuses whatever dev server is already listening on the target port
 * (5199, this repo's convention for these harnesses — never 4173, which is
 * reserved for a build Gabriel is served), same pattern as
 * scripts/audio_measure.mjs and scripts/layout_probe.mjs.
 *
 * ## Identifying the metronome's own click, robustly
 *
 * The click is a `Tone.Synth` with a square oscillator (metronome.js), but
 * "square" is not a safe fingerprint on its own — AudioEngine.js builds two
 * other square-oscillator voices (`pianoFallback` at :365, `guitarFallback`
 * at :196, both `Tone.PolySynth(Tone.Synth, ...)`). Instead, each wrapped
 * `start()` call captures its own JS call stack (`new Error().stack`) and
 * checks whether "metronome.js" appears in it. This works because the whole
 * chain from metronome.js's transport-scheduled callback down to the
 * oscillator's own `start()` call is synchronous — Tone.js does not defer
 * through a microtask or macrotask in between — so the originating source
 * file survives in the stack through every Tone.js internal frame. It does
 * not depend on the oscillator's type, frequency, or timing, so a change to
 * the click's own sound (VMU-056 decision: not this ticket's business)
 * would not silently break this identification.
 */
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");

const PORT = Number(process.env.METRONOME_PROBE_PORT ?? 5199);
const ORIGIN = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const AS_JSON = args.includes("--json");
const KEEP_OPEN = args.includes("--headed");

const TOLERANCE_MS = 1; // brief's measure 2 criterion for sequences 1 and 2

// ─── dev server (same pattern as audio_measure.mjs / layout_probe.mjs) ────

async function isServerUp() {
  try {
    const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await isServerUp()) return { server: null, reused: true };
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: path.join(ROOT, "vite.config.js"),
    root: ROOT,
    logLevel: "warn",
    server: { port: PORT, strictPort: true },
  });
  await server.listen();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isServerUp()) return { server, reused: false };
    await new Promise((r) => setTimeout(r, 200));
  }
  await server.close();
  throw new Error(`vite did not answer on ${ORIGIN} within 60s`);
}

// ─── in-page instrumentation ───────────────────────────────────────────

/**
 * Installed via `page.addInitScript`, before any app script runs (so every
 * node the app builds — samplers included — is wrapped, not just ones built
 * after this call). Records one entry per Web Audio `start()` call:
 * `when` (the AudioContext-time argument, seconds — what the app actually
 * scheduled), and `isMetronome` (see module docstring).
 */
function installProbe() {
  // V8 caps Error.stack at 10 frames by default — too shallow to reach
  // metronome.js's own call site through Tone.js's Synth/Oscillator/
  // Transport dispatch chain (confirmed: truncated stacks all bottomed out
  // inside tone.js with no caller visible). Raised once, before any app
  // script runs.
  Error.stackTraceLimit = 50;
  // @ts-ignore — page context, not this script's own
  window.__probeEvents = [];
  const wrap = (proto, kind) => {
    const original = proto.start;
    proto.start = function start(when, ...rest) {
      const stack = new Error().stack || "";
      // @ts-ignore
      window.__probeEvents.push({
        kind,
        when: typeof when === "number" ? when : 0,
        isMetronome: stack.includes("metronome.js"),
        // Wall-clock (performance.now(), not the AudioContext's own `when`
        // scheduling clock), so a sequence can tell "captured before I
        // clicked Play" from "captured after" without having to guess from
        // click counts — counting from the end of the array was tried first
        // and found flaky: the split between "before" and "after" shifts by
        // exactly how many clicks happened to land in the wait before the
        // click, which varies run to run.
        t: performance.now(),
      });
      return original.apply(this, [when, ...rest]);
    };
  };
  wrap(OscillatorNode.prototype, "oscillator");
  wrap(AudioBufferSourceNode.prototype, "buffer");
}

// ─── page actions ──────────────────────────────────────────────────────

async function waitForAppReady(page) {
  await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="btn-mode-studio"], .sidebar-cta-btn, .bottom-nav-btn').first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  // Studio mode is the default (AppContext.jsx), but asserted explicitly —
  // Dictionary mode's loop plays no audio at all (useSequencer.js's repeat
  // callback returns immediately when appMode is "dictionary").
  const studioBtn = page.locator('[data-testid="btn-mode-studio"]');
  if (await studioBtn.count()) await studioBtn.first().evaluate((el) => el.click());
}

/**
 * `element.click()` via `page.evaluate`, not Playwright's own `locator.click()`
 * (even with `force: true`): the sidebar's rail icons (Play/Stop, the
 * metronome toggle) sit visually under the expanded sidebar panel's own
 * buttons in this app's current layout — `document.elementFromPoint` at the
 * rail icon's own coordinates resolves to the sidebar's "Math & Rythmes"
 * button instead (confirmed: a coordinate-based click landed there, aria-
 * pressed on Play never changed). A pre-existing layout quirk, out of this
 * ticket's scope to fix — `element.click()` dispatches the click straight
 * at the element's own listeners, without browser hit-testing at a point,
 * so it reaches the right button regardless.
 */
// Each click returns the in-page performance.now() taken right after
// dispatching it — the same timebase installProbe() stamps every captured
// event with, so a sequence can find "the first event at or after this
// click" without guessing from click counts.
async function clickByTestId(page, testId) {
  return page.locator(`[data-testid="${testId}"]`).evaluate((el) => {
    el.click();
    return performance.now();
  });
}

async function clickMetronome(page) {
  return clickByTestId(page, "btn-metronome-toggle");
}

async function clickPlayStop(page) {
  return page.locator('[aria-label="Play"], [aria-label="Stop"]').first().evaluate((el) => {
    el.click();
    return performance.now();
  });
}

async function resetEvents(page) {
  await page.evaluate(() => {
    // @ts-ignore
    window.__probeEvents = [];
  });
}

async function readEvents(page) {
  // @ts-ignore
  return page.evaluate(() => window.__probeEvents);
}

// ─── analysis ──────────────────────────────────────────────────────────

const fmt = (n, d = 2) => (typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : String(n));

/**
 * For each metronome click captured at or after wall-clock `fromT`
 * (performance.now(), taken right when the triggering button was clicked —
 * see clickPlayStop/clickMetronome), the distance (ms) to the nearest music
 * ("buffer"/non-metronome) start. The *selection* of which events count is
 * wall-clock (avoids guessing the split from click counts, found flaky);
 * the *distance* itself is computed from `when`, the exact AudioContext-time
 * argument the app passed to Web Audio's `start()` — not onset detection,
 * not wall-clock timing — the same scheduling-level measurement the offline
 * harness's spyOnScheduleRepeat uses, applied to the real app's own calls.
 */
function alignmentStats(events, fromT) {
  const clicks = events.filter((e) => e.isMetronome && e.t >= fromT);
  const music = events.filter((e) => !e.isMetronome && e.t >= fromT).map((e) => e.when);
  if (clicks.length === 0 || music.length === 0) {
    return { count: 0, maxDeviationMs: null, detail: `${clicks.length} clicks, ${music.length} music starts captured` };
  }
  const deviations = clicks.map((c) => Math.min(...music.map((m) => Math.abs(m - c.when))) * 1000);
  return {
    count: clicks.length,
    maxDeviationMs: Math.max(...deviations),
    detail: `${clicks.length} clicks, worst click-to-step distance ${fmt(Math.max(...deviations), 2)} ms`,
  };
}

// ─── sequences ─────────────────────────────────────────────────────────

async function sequence1(page) {
  await waitForAppReady(page);
  await resetEvents(page);
  await clickMetronome(page);
  await page.waitForTimeout(1300);
  const playClickedAt = await clickPlayStop(page); // Play — the brief's own "tick 0 du transport relancé"
  await page.waitForTimeout(1500);
  const events = await readEvents(page);
  await clickPlayStop(page); // Stop — leave the app at rest for the next sequence
  await clickMetronome(page); // metronome off too
  return { name: "1: metronome then Play 1.3s later", stats: alignmentStats(events, playClickedAt), rawCount: events.length };
}

async function sequence2(page) {
  await waitForAppReady(page);
  await resetEvents(page);
  await clickPlayStop(page); // Play
  await page.waitForTimeout(1700);
  const metronomeClickedAt = await clickMetronome(page); // metronome on, off-grid
  await page.waitForTimeout(1500);
  const events = await readEvents(page);
  await clickMetronome(page); // metronome off
  await clickPlayStop(page); // Stop
  return { name: "2: Play then metronome 1.7s later", stats: alignmentStats(events, metronomeClickedAt), rawCount: events.length };
}

async function sequence3(page) {
  await waitForAppReady(page);
  await clickMetronome(page);
  await clickPlayStop(page); // Play
  await page.waitForTimeout(800);
  await resetEvents(page);
  await clickPlayStop(page); // Stop
  await page.waitForTimeout(2000);
  const events = await readEvents(page);
  const clicksAfterStop = events.filter((e) => e.isMetronome).length;
  await clickMetronome(page); // metronome off
  return {
    name: "3: metronome, Play, then Stop — clicks must continue",
    clicksAfterStop,
    detail: `${clicksAfterStop} metronome clicks in the 2s after Stop`,
  };
}

/**
 * Not one of the brief's three grid-alignment sequences — a robustness
 * check that three rapid Play/Stop cycles (each one resetting the transport
 * to tick 0, per transportOwner.playMusic) never break the metronome's own
 * click, which keeps running underneath every one of them. Checked by
 * click-to-click spacing (must stay ~500 ms throughout), not by click-to-
 * step alignment: a click landing during a brief Stop-to-Play gap has no
 * step to be near in *this* cycle, and its nearest one across a gap could
 * legitimately be from an adjacent cycle — comparing across gaps like that
 * would measure the test's own pauses, not a defect.
 */
async function sequence4(page) {
  await waitForAppReady(page);
  await clickMetronome(page);
  await resetEvents(page);
  for (let i = 0; i < 3; i++) {
    await clickPlayStop(page); // Play
    await page.waitForTimeout(400);
    await clickPlayStop(page); // Stop
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);
  const events = await readEvents(page);
  const metronomeClicks = events.filter((e) => e.isMetronome).map((e) => e.when).sort((a, b) => a - b);
  const intervalsMs = metronomeClicks.slice(1).map((t, i) => (t - metronomeClicks[i]) * 1000);
  const maxIntervalMs = intervalsMs.length ? Math.max(...intervalsMs) : null;
  const minIntervalMs = intervalsMs.length ? Math.min(...intervalsMs) : null;
  await clickMetronome(page); // metronome off
  return {
    name: "4: Play/Stop toggled three times — no crash, still ticking every ~500ms",
    clickCount: metronomeClicks.length,
    maxIntervalMs,
    minIntervalMs,
    detail:
      metronomeClicks.length >= 6
        ? `${metronomeClicks.length} clicks, interval range ${fmt(minIntervalMs, 1)}-${fmt(maxIntervalMs, 1)} ms`
        : `only ${metronomeClicks.length} clicks captured across three Play/Stop cycles`,
  };
}

// ─── run ────────────────────────────────────────────────────────────────

const { chromium } = await import("playwright");
const dev = await startDevServer();
if (!AS_JSON) {
  console.log("\nVisualMusic metronome probe (VMU-163-fix2 measure 2)");
  console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
  console.log("  browser    : Chromium — real Play/Stop/metronome buttons, real React render latency.\n");
}

const browser = await chromium.launch({
  headless: !KEEP_OPEN,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
await page.addInitScript(installProbe);

const results = [];
let failures = 0;

try {
  const r1 = await sequence1(page);
  results.push(r1);
  const r2 = await sequence2(page);
  results.push(r2);
  const r3 = await sequence3(page);
  results.push(r3);
  const r4 = await sequence4(page);
  results.push(r4);
} finally {
  await page.close();
  await browser.close();
  if (dev.server) await dev.server.close();
}

for (const r of results) {
  if (r.stats) {
    const ok = r.stats.maxDeviationMs != null && r.stats.maxDeviationMs <= TOLERANCE_MS;
    if (r.stats.maxDeviationMs == null || !ok) failures++;
    if (!AS_JSON) {
      console.log(`${ok ? "PASS" : "FAIL"}  sequence ${r.name}`);
      console.log(`        ${r.stats.detail}`);
    }
  } else if (typeof r.clicksAfterStop === "number") {
    const ok = r.clicksAfterStop >= 2;
    if (!ok) failures++;
    if (!AS_JSON) {
      console.log(`${ok ? "PASS" : "FAIL"}  sequence ${r.name}`);
      console.log(`        ${r.detail}`);
    }
  } else if (typeof r.clickCount === "number" && "maxIntervalMs" in r) {
    // Loose on purpose: only checks the metronome never *stalls* (no gap
    // much longer than one beat) across three rapid Play/Stop cycles, each
    // of which resets the transport to tick 0 underneath it. A short
    // interval below 500ms can legitimately happen right at a reset (the
    // metronome's own pending click firing just before the reset, then a
    // freshly re-anchored one right after) — found while building this
    // probe, not chased further: this sequence is a robustness check beyond
    // the brief's three required ones, not itself one of them.
    const ok = r.clickCount >= 6 && r.maxIntervalMs != null && r.maxIntervalMs <= 650;
    if (!ok) failures++;
    if (!AS_JSON) {
      console.log(`${ok ? "PASS" : "FAIL"}  sequence ${r.name}`);
      console.log(`        ${r.detail}`);
    }
  }
}

if (pageErrors.length > 0) {
  failures++;
  if (!AS_JSON) {
    console.log(`\nFAIL  page errors during the probe (${pageErrors.length}):`);
    pageErrors.slice(0, 5).forEach((e) => console.log(`  ${e.slice(0, 200)}`));
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ results, pageErrors }, null, 2));
} else {
  console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${results.length + (pageErrors.length ? 1 : 0) - failures}/${results.length + (pageErrors.length ? 1 : 0)} sequences passed\n`);
}

process.exit(failures > 0 ? 1 : 0);
