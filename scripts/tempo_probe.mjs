#!/usr/bin/env node
/**
 * tempo_probe.mjs — T2 (VMU-025 / VMU-153) measure 4: a Playwright probe
 * against the real served app, like scripts/metronome_probe.mjs.
 *
 *   npm run tempo:probe                 # human-readable table
 *   npm run tempo:probe -- --json       # JSON
 *
 * Port: TEMPO_PROBE_PORT (default 5199, this repo's convention for these
 * harnesses — never 4173). Reuses a dev server already listening there.
 *
 * ## What it checks
 *
 * 1. **Tempo** — the BPM the screen shows equals the tempo the app really
 *    plays at. The real tempo is read from the metronome's own clicks: every
 *    Web Audio `start(when)` is wrapped (same technique and same stack-based
 *    identification of the click as metronome_probe.mjs), and the interval
 *    between consecutive clicks' `when` — the exact AudioContext times the
 *    app scheduled — must equal 60/BPM within 1 ms. Steps: metronome on at
 *    the default style; change style twice while it runs (each style imposes
 *    its tempo); edit the BPM badge. Each step reads the badge, then the
 *    clicks scheduled after it.
 * 2. **Mixer** — after the first Play, the gain each mixer node really has.
 *    Read without adding any code to the app: the page imports the same
 *    `/src/audio/AudioEngine.js` module instance the app runs (Vite serves
 *    source modules at one URL, so the import returns the live instance) and
 *    reads `instrumentVols[name].volume` — Tone's dB view and the native
 *    AudioParam's linear value. Compared with what the mixer displays (the
 *    level text under each fader, "… dB").
 *    Control that the instance is the live one, not a second copy: where
 *    `transportOwner.getTransportState` exists (T2 and later), its `bpm` must
 *    equal the badge — a fresh copy would read its 120 default.
 */
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");

const PORT = Number(process.env.TEMPO_PROBE_PORT ?? 5199);
const ORIGIN = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const AS_JSON = args.includes("--json");
const KEEP_OPEN = args.includes("--headed");

const TEMPO_TOLERANCE_MS = 1;
const GAIN_TOLERANCE_DB = 0.05;

// ─── dev server (same pattern as metronome_probe.mjs) ───────────────────

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

// ─── in-page instrumentation (installed before any app script) ──────────

function installProbe() {
  Error.stackTraceLimit = 50;
  // @ts-ignore — page context
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
        t: performance.now(),
      });
      return original.apply(this, [when, ...rest]);
    };
  };
  wrap(OscillatorNode.prototype, "oscillator");
  wrap(AudioBufferSourceNode.prototype, "buffer");
}

// ─── page actions ───────────────────────────────────────────────────────

async function waitForAppReady(page) {
  await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="btn-mode-studio"]').first().waitFor({ state: "attached", timeout: 15_000 });
  await page.locator('[data-testid="btn-mode-studio"]').first().evaluate((el) => el.click());
  await page.locator(".bpm-badge").first().waitFor({ state: "attached", timeout: 15_000 });
}

/** element.click(), not a coordinate click: see metronome_probe.mjs (rail icons sit under the panel). */
async function clickEl(locator) {
  return locator.first().evaluate((el) => {
    el.click();
    return performance.now();
  });
}

async function readBadge(page) {
  const text = await page.locator(".bpm-badge span").first().textContent();
  return Number(String(text).trim());
}

async function closeModal(page) {
  const close = page.locator('.modal-container .modal-close-btn');
  if (await close.count()) await clickEl(close);
}

/**
 * Opens the "Studio & Harmonie" popup (where StudioPanel lives), picks the
 * style whose label matches, and closes the popup again.
 */
async function chooseStyle(page, labelRegex) {
  await clickEl(page.locator(".sidebar-cta-btn", { hasText: /Studio & Harmon/ }));
  await page.locator('[data-testid="studio-panel"]').first().waitFor({ state: "attached", timeout: 5_000 });
  const t = await chooseStyleInPanel(page, labelRegex);
  await closeModal(page);
  return t;
}

async function chooseStyleInPanel(page, labelRegex) {
  const panel = page.locator('[data-testid="studio-panel"]').first();
  if ((await panel.locator(".custom-select-header").count()) === 0) {
    await clickEl(panel.locator(".panel__header"));
  }
  await clickEl(panel.locator(".custom-select-header"));
  await page.locator('[data-testid="custom-select-dropdown"]').first().waitFor({ state: "attached", timeout: 5_000 });
  const item = page.locator('[data-testid="custom-select-dropdown"] .select-item', { hasText: labelRegex });
  if ((await item.count()) === 0) throw new Error(`style not found: ${labelRegex}`);
  return clickEl(item);
}

async function editBadge(page, bpm) {
  await clickEl(page.locator(".bpm-badge"));
  const input = page.locator('.bpm-badge input[type="number"]').first();
  await input.fill(String(bpm));
  await input.press("Enter");
  return page.evaluate(() => performance.now());
}

async function clicksSince(page, fromT) {
  const events = await page.evaluate(() => /** @type {any} */ (window).__probeEvents);
  return events
    .filter((e) => e.isMetronome && e.t >= fromT)
    .map((e) => e.when)
    .sort((a, b) => a - b);
}

const fmt = (n, d = 2) => (typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : String(n));

/**
 * Real tempo from the clicks scheduled after a change. The first interval
 * after a change can straddle it (one click at the old tempo, the next at
 * the new), so it is dropped; the median of the rest is the tempo.
 */
function tempoFromClicks(whens) {
  const intervals = whens.slice(1).map((t, i) => (t - whens[i]) * 1000).slice(1);
  if (intervals.length < 2) return { intervals, medianMs: null };
  const sorted = [...intervals].sort((a, b) => a - b);
  return { intervals, medianMs: sorted[Math.floor(sorted.length / 2)] };
}

async function tempoStep(page, name, action, settleMs) {
  const t = await action();
  await page.waitForTimeout(settleMs);
  const displayed = await readBadge(page);
  const whens = await clicksSince(page, t);
  const { intervals, medianMs } = tempoFromClicks(whens);
  const expectedMs = 60000 / displayed;
  const ok = medianMs != null && Math.abs(medianMs - expectedMs) <= TEMPO_TOLERANCE_MS;
  return {
    name,
    displayed,
    expectedMs,
    medianMs,
    clicks: whens.length,
    maxDeviationMs: intervals.length ? Math.max(...intervals.map((i) => Math.abs(i - expectedMs))) : null,
    ok,
  };
}

async function readMixer(page) {
  return page.evaluate(async () => {
    const engine = await import("/src/audio/AudioEngine.js");
    let owner = null;
    try {
      owner = await import("/src/audio/transportOwner.js");
    } catch {
      owner = null;
    }
    const nodes = {};
    for (const [name, vol] of Object.entries(engine.instrumentVols)) {
      // @ts-ignore — Tone internals: Param._param is the native AudioParam
      const linear = vol.volume._param ? vol.volume._param.value : null;
      nodes[name] = {
        toneDb: vol.volume.value,
        nativeLinear: linear,
        nativeDb: linear > 0 ? 20 * Math.log10(linear) : -Infinity,
      };
    }
    const displayed = {};
    // MixerStrip: one "<n> dB" text per fader, in the order of its instrument list.
    const order = ["kick", "snare", "hat", "bass", "piano", "guitar"];
    const texts = [...document.querySelectorAll("*")]
      .filter((el) => el.children.length === 0 && /^-?\d+(\.\d+)? dB$/.test((el.textContent || "").trim()))
      .map((el) => Number((el.textContent || "").trim().replace(" dB", "")));
    const ownerBpm = owner && typeof owner.getTransportState === "function" ? owner.getTransportState().bpm : null;
    return { nodes, displayedTexts: texts, order, ownerBpm };
  });
}

// ─── run ────────────────────────────────────────────────────────────────

const { chromium } = await import("playwright");
const dev = await startDevServer();
if (!AS_JSON) {
  console.log("\nVisualMusic tempo & mixer probe (T2 — VMU-025 / VMU-153)");
  console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}\n`);
}

const browser = await chromium.launch({ headless: !KEEP_OPEN, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
await page.addInitScript(installProbe);

const tempo = [];
let mixer = null;
let failures = 0;

try {
  await waitForAppReady(page);

  // Mixer first: it is about the *first* Play of the session.
  await clickEl(page.locator('[aria-label="Play"]'));
  await page.waitForTimeout(600);
  // The mixer is in the "Instruments & Audio" modal; open it so its level texts exist in the DOM.
  await clickEl(page.locator(".sidebar-cta-btn", { hasText: /Instruments/ }));
  await page.waitForTimeout(300);
  mixer = await readMixer(page);
  mixer.badge = await readBadge(page);
  await closeModal(page);
  await clickEl(page.locator('[aria-label="Stop"]'));

  // Tempo: metronome on at the default style, then change style twice, then the badge.
  tempo.push(await tempoStep(page, "default style, metronome on", () => clickEl(page.locator('[data-testid="btn-metronome-toggle"]')), 2600));
  tempo.push(await tempoStep(page, "style -> Metal Épique / Epic Metal (180)", () => chooseStyle(page, /Metal Épique|Epic Metal/), 2000));
  tempo.push(await tempoStep(page, "style -> Reggae Joyeux / Joyful Reggae (90)", () => chooseStyle(page, /Reggae Joyeux|Joyful Reggae/), 4000));
  tempo.push(await tempoStep(page, "badge edited to 150", () => editBadge(page, 150), 2600));
  await clickEl(page.locator('[data-testid="btn-metronome-toggle"]'));
  // Instance control again, now that the tempo is no longer the 120 default
  // a fresh module copy would also report.
  mixer.badgeAtEnd = await readBadge(page);
  mixer.ownerBpmAtEnd = await page.evaluate(async () => {
    try {
      const owner = await import("/src/audio/transportOwner.js");
      return typeof owner.getTransportState === "function" ? owner.getTransportState().bpm : null;
    } catch {
      return null;
    }
  });
} finally {
  await page.close();
  await browser.close();
  if (dev.server) await dev.server.close();
}

for (const s of tempo) {
  if (!s.ok) failures++;
  if (!AS_JSON) {
    console.log(`${s.ok ? "PASS" : "FAIL"}  tempo: ${s.name}`);
    console.log(
      `        badge ${s.displayed} BPM (expects ${fmt(s.expectedMs, 1)} ms/beat) — clicks: median ${fmt(s.medianMs, 2)} ms over ${s.clicks} clicks, worst ${fmt(s.maxDeviationMs, 2)} ms off`,
    );
  }
}

if (mixer) {
  const order = mixer.order;
  const shown = mixer.displayedTexts.length >= order.length ? mixer.displayedTexts.slice(0, order.length) : null;
  const rows = order.map((name, i) => {
    const node = mixer.nodes[name];
    const display = shown ? shown[i] : null;
    const ok = display != null && Math.abs(node.nativeDb - display) <= GAIN_TOLERANCE_DB;
    return { name, display, ...node, ok };
  });
  const allOk = rows.every((r) => r.ok);
  if (!allOk) failures++;
  const identityOk =
    mixer.ownerBpm == null || (mixer.ownerBpm === mixer.badge && mixer.ownerBpmAtEnd === mixer.badgeAtEnd);
  if (!identityOk) failures++;
  if (!AS_JSON) {
    console.log(`${allOk ? "PASS" : "FAIL"}  mixer after the first Play: node gain = displayed level (±${GAIN_TOLERANCE_DB} dB)`);
    for (const r of rows) {
      console.log(
        `        ${r.name.padEnd(6)} shown ${String(r.display).padStart(4)} dB   node ${fmt(r.nativeDb, 2)} dB (native ${fmt(r.nativeLinear, 4)}, Tone ${fmt(r.toneDb, 2)} dB)`,
      );
    }
    console.log(
      `${identityOk ? "PASS" : "FAIL"}  module instance control: ${mixer.ownerBpm == null ? "getTransportState absent (pre-T2 tree) — not checkable" : `owner bpm ${mixer.ownerBpm} vs badge ${mixer.badge} at the first Play, ${mixer.ownerBpmAtEnd} vs ${mixer.badgeAtEnd} at the end`}`,
    );
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
  console.log(JSON.stringify({ tempo, mixer, pageErrors }, null, 2));
} else {
  console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${failures} failure(s)\n`);
}

process.exit(failures > 0 ? 1 : 0);
