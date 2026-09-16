#!/usr/bin/env node
/**
 * audio_measure.mjs — the offline audio harness's single entry point (VMU-026).
 *
 * Renders VisualMusic's real audio graph inside an `OfflineAudioContext` in a
 * real Chromium page and prints numbers: peak and RMS in dBFS, gain reduction
 * at the output link, and the pitches actually present in the rendered sound.
 *
 *   npm run audio:measure          # print the measurement table
 *   npm run audio:check            # assert the domain expectations, exit 1 on failure
 *   npm run audio:measure -- --scenario=chord --json
 *
 * Why a browser: jsdom implements no Web Audio, so the vitest suite cannot
 * render a single sample. Why offline: Chrome refuses to start audio without a
 * user gesture, which is exactly what defeated the QA of VMU-129 — an
 * `OfflineAudioContext` needs no gesture and renders faster than real time.
 *
 * This script starts the Vite dev server itself if one is not already up, so
 * "one command" means one command.
 */
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");

const PORT = Number(process.env.AUDIO_MEASURE_PORT ?? 5199);
// `localhost`, not `127.0.0.1`: Vite binds the IPv6 loopback on this machine,
// so probing the IPv4 address reported "no server" while the port was in fact
// taken, and --strictPort then failed with a bare "port already in use".
const ORIGIN = `http://localhost:${PORT}`;
// A path the app does not serve: the probe page must be blank, because loading
// index.html would boot the app and bind every AudioEngine node to the
// realtime context before the harness can install an offline one.
const PROBE_URL = `${ORIGIN}/__audio_probe__`;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const ASSERT = flag("assert") || flag("check");
const AS_JSON = flag("json");
const KEEP_OPEN = flag("headed");
const ONLY = option("scenario", null);

/**
 * VMU-020 QA follow-up (coordinator, 2026-09-16). The gain-reduction checks
 * above compare levels at the *internal* tap points the harness installs
 * (`masterAnalyser` for "pre", whatever node `masterLimiter` currently points
 * to for "post" — today that is the last of three stages). That coupling is
 * only as strong as the internal wiring: it would not catch a regression
 * introduced *inside* an earlier stage in a way the later stages happen to
 * mask, or a future rewire that changes what `masterLimiter` points to.
 *
 * These two constants back an *end-to-end* check instead: the known,
 * deterministic level the probe oscillator injects (`r.probeLevelDb`, set by
 * the scenario itself, not measured) against the actual rendered mix peak
 * (`r.mix.peakDbfs`, the destination-bound signal) — no internal tap
 * involved, so it holds regardless of how many stages the chain has or which
 * one is named `masterLimiter`.
 *
 * AMPLIFICATION_TOLERANCE_DB reuses the 0.5 dB already justified for the "no
 * static gain" check below rather than inventing a second number: same
 * property (the chain must not make a signal louder), same bound, now
 * checked end-to-end instead of tap-to-tap. CEILING_TOLERANCE_DB is tighter
 * (0.2 dB) because it is not a tolerance on a measurement so much as on
 * floating-point rounding through the render: `outputCeiling` (AudioEngine.js)
 * hard-clamps to a fixed linear value equal to CEILING_DBFS by construction,
 * so any input clearly above it should render at essentially exactly the
 * ceiling — confirmed repeatedly at -1.00 dBFS (to 2 decimals) across
 * +0/+3/+6/+12 dBFS probes during VMU-020's own verification.
 */
const AMPLIFICATION_TOLERANCE_DB = 0.5;
const CEILING_DBFS = -1;
const CEILING_TOLERANCE_DB = 0.2;

/**
 * The measurements taken, and what each one is for.
 *
 * `expect` runs only under --assert. It returns a list of {label, ok, detail}
 * so a failure prints the number that failed, not just a red line.
 */
const PLAN = [
  {
    id: "harness-self-check",
    title: "Harness self-check — a bare 440 Hz sine through a real OfflineAudioContext",
    spec: { scenario: "sine-440", expectedNotes: ["A4"] },
    why: "If this is not A4, nothing the harness says about the app means anything (VMU-026 TDD step 1).",
    expect: (r) => [
      check("renders a non-silent buffer", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`),
      check("detects exactly one pitch", r.mix.pitches.length === 1, `got ${r.mix.pitches.length}`),
      check("that pitch is A4 (440 Hz) within 50 cents", r.pitchVerdict.ok, verdictDetail(r)),
    ],
  },
  {
    id: "single-note",
    title: "A single piano C4, through the real playback router",
    spec: { scenario: "single-note", params: { instrument: "piano", note: "C4" }, expectedNotes: ["C4"] },
    why: "Domain test 1: a note played alone must not be silent, and must sound at the pitch asked for.",
    expect: (r) => [
      check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`),
      check("sounds C4 (261.63 Hz) within 50 cents", r.pitchVerdict.ok, verdictDetail(r)),
    ],
  },
  {
    id: "chord",
    title: "A C major triad (C4 E4 G4) on piano",
    spec: {
      scenario: "chord",
      params: { instrument: "piano", notes: ["C4", "E4", "G4"] },
      expectedNotes: ["C4", "E4", "G4"],
    },
    why: "Domain test 2: three notes asked for, three heard, at the octave shown (the VMU-080 failure shape).",
    expect: (r) => [
      check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`),
      check("sounds C4, E4 and G4 and nothing unaccounted for", r.pitchVerdict.ok, verdictDetail(r)),
    ],
  },
  {
    id: "output-link-probe-quiet",
    title: "Output link characterised: a 220 Hz sine at -40 dBFS, far below the ~-1 dBFS ceiling",
    spec: { scenario: "output-link-probe", params: { levelDb: -40 }, expectedNotes: ["A3"] },
    why: "A signal this quiet must pass the output link untouched. Any level change here is static gain, not compression.",
    expect: (r) => [
      check("the pitch survives the chain", r.pitchVerdict.ok, verdictDetail(r)),
      check(
        "level is unchanged within 0.5 dB (no static gain)",
        Math.abs(r.gainReduction.meanDb) <= 0.5,
        `level change ${fmt(-r.gainReduction.meanDb)} dB (positive = louder after the link)`,
      ),
      check(
        "end-to-end: rendered mix is never louder than what was injected (whole chain, not one tap)",
        r.mix.peakDbfs <= r.probeLevelDb + AMPLIFICATION_TOLERANCE_DB,
        `injected ${fmt(r.probeLevelDb)} dBFS, mix peak ${fmt(r.mix.peakDbfs)} dBFS`,
      ),
    ],
  },
  {
    id: "output-link-probe-hot",
    title: "Output link characterised: a 220 Hz sine at -1 dBFS, at the ~-1 dBFS ceiling",
    spec: { scenario: "output-link-probe", params: { levelDb: -1 }, expectedNotes: ["A3"] },
    why:
      "VMU-020 fixed 2026-09-16: masterLimiter is now a limiter with a real ~-1 dBFS ceiling " +
      "(previously a Tone.Compressor thresholded at -6 dB). A signal sitting right at the ceiling " +
      "should be left alone or trimmed a hair, never amplified — this is the boundary case. See " +
      "output-link-probe-loud below for a signal well above the ceiling.",
    expect: (r) => [
      check(
        "the link reduces rather than amplifies",
        r.gainReduction.meanDb >= 0,
        `level change ${fmt(-r.gainReduction.meanDb)} dB (positive = louder after the link)`,
      ),
      check(
        "end-to-end: rendered mix is never louder than what was injected (whole chain, not one tap)",
        r.mix.peakDbfs <= r.probeLevelDb + AMPLIFICATION_TOLERANCE_DB,
        `injected ${fmt(r.probeLevelDb)} dBFS, mix peak ${fmt(r.mix.peakDbfs)} dBFS`,
      ),
    ],
  },
  {
    id: "output-link-probe-loud",
    title: "Output link characterised: a 220 Hz sine at +12 dBFS, well above the ~-1 dBFS ceiling",
    spec: { scenario: "output-link-probe", params: { levelDb: 12 }, expectedNotes: ["A3"] },
    why:
      "VMU-020 QA follow-up (coordinator, 2026-09-16): the stress case, made permanent. Verified " +
      "once by hand during VMU-020 that a genuinely loud signal is capped rather than digitally " +
      "clipped; a guarantee checked once by hand goes stale in silence, so it belongs here instead. " +
      "The compressor stage alone does not hold this ceiling (an envelope follower does not settle " +
      "fast enough against a continuous tone); the WaveShaper stage after it is a static per-sample " +
      "clamp and cannot overshoot, whatever the input.",
    expect: (r) => [
      check("the pitch survives the chain", r.pitchVerdict.ok, verdictDetail(r)),
      check(
        `the output holds the ~${CEILING_DBFS} dBFS ceiling instead of passing the input through`,
        Math.abs(r.mix.peakDbfs - CEILING_DBFS) <= CEILING_TOLERANCE_DB,
        `injected ${fmt(r.probeLevelDb)} dBFS, mix peak ${fmt(r.mix.peakDbfs)} dBFS (ceiling ${CEILING_DBFS} dBFS)`,
      ),
      check(
        "no digital clipping",
        r.mix.clippedSamples === 0,
        `${r.mix.clippedSamples} of ${r.renderedSamples} samples past full scale`,
      ),
    ],
  },
  {
    id: "silent-path",
    title: "A path asked for nothing",
    spec: { scenario: "silent-path" },
    why: "Domain test 4 / control: proves a silent verdict is an observation, not the harness failing to connect.",
    expect: (r) => [check("is silent", r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "default-progression",
    title: "The Studio's default four-chord pop loop, 120 BPM, default mixer",
    spec: { scenario: "default-progression" },
    why: "Domain test 3: the level of the mix as the app actually plays it. The number is recorded whatever it says.",
    expect: (r) => [
      check("the loop is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`),
      check(
        "the output link's effect on level is measurable",
        r.gainReduction.framesCounted > 0,
        `${r.gainReduction.framesCounted} frames compared`,
      ),
      check("notes were scheduled", (r.scheduledPitchCount ?? 0) > 0, `${r.scheduledPitchCount} note events`),
    ],
  },
];

// ─── helpers ─────────────────────────────────────────────────────────

const fmt = (n, digits = 2) => (typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : String(n));
/**
 * One assertion.
 *
 * `knownFail` marks an expectation that the application does not meet today,
 * with the ticket that owns the defect. Such a check does not fail the run —
 * but if it ever *passes*, the run fails instead, so the marker cannot quietly
 * outlive the bug. That is how this harness hands VMU-020 a red test that is
 * already written, without painting its own CI red.
 */
const check = (label, ok, detail = "", knownFail = null) => ({
  label,
  ok: Boolean(ok),
  detail,
  knownFail,
});

function pitchDetail(pitches) {
  if (!pitches || pitches.length === 0) return "no pitch detected";
  return pitches
    .map(
      (p) =>
        `${p.note} ${fmt(p.freq, 1)}Hz ${p.cents >= 0 ? "+" : ""}${fmt(p.cents, 0)}c` +
        (p.partialNumber ? ` [partial ${p.partialNumber}]` : ""),
    )
    .join(", ");
}

/**
 * One line describing a pitch verdict: what was wanted, what was heard, and
 * what the tolerance was.
 *
 * The verdict itself is computed in the page by
 * `signalMetrics.comparePitchContent`, not here. 50 cents is half a semitone:
 * the widest tolerance that still tells two adjacent semitones apart, and far
 * tighter than the octave errors this exists to catch (VMU-080 was off by
 * 1200 cents). It is not limited by the FFT — bin width at 16384/44100 is
 * 2.69 Hz, about 18 cents at C4, and the parabolic peak refinement brings a
 * pure sine inside 1 Hz. The slack is for the inharmonicity of real piano
 * samples, not for the arithmetic.
 */
function verdictDetail(r) {
  const v = r.pitchVerdict;
  if (!v) return pitchDetail(r.mix.pitches);
  const parts = [`heard ${pitchDetail(r.mix.pitches)}`];
  if (v.missing.length) parts.push(`MISSING ${v.missing.join(", ")}`);
  if (v.unexplained.length) parts.push(`UNEXPLAINED ${v.unexplained.join(", ")}`);
  if (v.ok) parts.push(`worst error ${fmt(v.worstCents, 0)} cents`);
  return parts.join("; ");
}

async function isServerUp() {
  try {
    const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Brings up the dev server, or reuses one already listening.
 *
 * Uses Vite's JS API rather than spawning its binary: Vite 7 does not expose
 * `./bin/vite.js` through its package exports, and an in-process server is one
 * fewer thing to leave running when this script is interrupted.
 */
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

// ─── run ─────────────────────────────────────────────────────────────

const plan = ONLY ? PLAN.filter((p) => p.id === ONLY || p.spec.scenario === ONLY) : PLAN;
if (plan.length === 0) {
  console.error(`No measurement matches --scenario=${ONLY}. Known: ${PLAN.map((p) => p.id).join(", ")}`);
  process.exit(2);
}

const { chromium } = await import("playwright");
const dev = await startDevServer();
if (!AS_JSON) {
  console.log(`\nVisualMusic offline audio harness (VMU-026)`);
  console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
}

const browser = await chromium.launch({
  headless: !KEEP_OPEN,
  // The flag that makes audio observable at all in Chromium. The harness does
  // not strictly need it (an OfflineAudioContext never suspends), but the same
  // flag is what lets a human open this build and hear it without clicking
  // first — which is the autonomy VMU-026 was promoted to buy.
  args: ["--autoplay-policy=no-user-gesture-required"],
});

const results = [];
let failures = 0;

try {
  for (const item of plan) {
    // One page per measurement: a dynamic import is cached, so a module
    // instance belongs to the first offline context that built it.
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") pageErrors.push(`console.error: ${m.text()}`);
    });
    await page.route(PROBE_URL, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>audio probe</title>" }),
    );
    await page.goto(PROBE_URL, { waitUntil: "domcontentloaded" });

    let measurement;
    try {
      measurement = await page.evaluate(async (spec) => {
        const mod = await import("/src/audio/measure/offlineRender.js");
        return await mod.runScenario(spec);
      }, item.spec);
    } catch (err) {
      measurement = { error: String(err && err.message ? err.message : err) };
    }
    await page.close();

    const checks = ASSERT && !measurement.error ? item.expect(measurement) : [];
    if (measurement.error) failures++;
    failures += checks.filter((c) => (c.knownFail ? c.ok : !c.ok)).length;
    results.push({ ...item, measurement, checks, pageErrors });

    if (!AS_JSON) printMeasurement(item, measurement, checks, pageErrors);
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}

if (AS_JSON) {
  console.log(
    JSON.stringify(
      results.map((r) => ({ id: r.id, title: r.title, measurement: r.measurement, checks: r.checks })),
      null,
      2,
    ),
  );
} else if (ASSERT) {
  // Known-fails are counted out of the asserted total and named separately:
  // folding one into "14/14 passed" would report a measured defect as a pass.
  const all = results.flatMap((r) => r.checks);
  const known = all.filter((c) => c.knownFail && !c.ok).length;
  const asserted = all.length - known;
  const verdict = failures === 0 ? "PASS" : "FAIL";
  const suffix = known > 0 ? `, ${known} known-fail on a documented defect (listed above)` : "";
  console.log("");
  console.log(`${verdict} — ${asserted - failures}/${asserted} checks passed${suffix}`);
  console.log("");
} else {
  console.log(`\nRun with --assert to turn these numbers into pass/fail checks.\n`);
}

process.exit(ASSERT && failures > 0 ? 1 : 0);

// ─── printing ────────────────────────────────────────────────────────

function printMeasurement(item, m, checks, pageErrors) {
  console.log(`\n${"─".repeat(78)}`);
  console.log(`${item.title}`);
  console.log(`  ${item.why}`);
  console.log(`${"─".repeat(78)}`);

  if (m.error) {
    console.log(`  ERROR: ${m.error}`);
    pageErrors.slice(0, 5).forEach((e) => console.log(`    page: ${e.slice(0, 200)}`));
    return;
  }

  const rows = [
    ["mix peak", `${fmt(m.mix.peakDbfs)} dBFS`, m.mix.clippedSamples > 0 ? `${m.mix.clippedSamples} samples past full scale` : "no clipping"],
    ["mix RMS", `${fmt(m.mix.rmsDbfs)} dBFS`, ""],
    ["before output link", `${fmt(m.preLimiter.peakDbfs)} dBFS peak`, `${fmt(m.preLimiter.rmsDbfs)} dBFS RMS`],
    [
      "output link",
      `${fmt(-m.gainReduction.meanDb)} dB louder on average`,
      `max reduction ${fmt(m.gainReduction.maxDb)} dB, p95 ${fmt(m.gainReduction.p95Db)} dB, ` +
        `${(m.gainReduction.framesOverThresholdRatio * 100).toFixed(0)}% of frames above ${m.gainReduction.thresholdDbfs} dB, ` +
        `taps aligned by ${m.gainReduction.alignmentSamples} samples (${fmt(m.gainReduction.alignmentMs)} ms)`,
    ],
    ["silence", m.mix.silence.silent ? "SILENT" : "audible", `floor ${m.mix.silence.floorDbfs} dBFS`],
    ["largest sample jump", fmt(m.mix.discontinuity.maxJump, 4), `${m.mix.discontinuity.jumpsOverThreshold} above ${m.mix.discontinuity.threshold}`],
    ["pitches detected", pitchDetail(m.mix.pitches), ""],
  ];
  if (m.mix.fundamentals) {
    rows.push(["fundamentals", pitchDetail(m.mix.fundamentals), "partials excluded"]);
  }
  if (m.requested) rows.push(["pitches requested", `${m.requested.instrument}: ${m.requested.notes.join(", ")}`, ""]);
  if (m.pitchVerdict) {
    rows.push([
      "pitch verdict",
      m.pitchVerdict.ok ? "matches what was asked for" : "DOES NOT MATCH",
      `expected ${m.expectedNotes.join(", ")}` +
        (m.pitchVerdict.missing.length ? `; missing ${m.pitchVerdict.missing.join(", ")}` : "") +
        (m.pitchVerdict.unexplained.length ? `; unexplained ${m.pitchVerdict.unexplained.join(", ")}` : ""),
    ]);
  }
  if (m.pianoVoice) rows.push(["voices", `piano: ${m.pianoVoice}`, m.guitarVoice ? `guitar: ${m.guitarVoice}` : ""]);
  if (m.style) rows.push(["style", `${m.style.name} — ${m.style.progression.join(" ")}`, `${m.style.bpm} BPM`]);
  if (m.scheduledPitchCount !== undefined) {
    rows.push([
      "note events",
      String(m.scheduledPitchCount),
      m.scheduledPitchRange ? `MIDI ${m.scheduledPitchRange.lowest}..${m.scheduledPitchRange.highest}` : "",
    ]);
  }
  if (m.mixerState) {
    rows.push(["mixer", JSON.stringify(m.mixerState.instrumentVolumes), `master ${m.mixerState.masterVolumeDb} dB (reported, not applied)`]);
  }
  rows.push(["render", `${fmt(m.durationSec, 2)} s at ${m.sampleRate} Hz`, `${m.contextDuringRender}, destination offline: ${m.destinationIsOffline}`]);

  const width = Math.max(...rows.map((r) => r[0].length));
  for (const [label, value, note] of rows) {
    console.log(`  ${label.padEnd(width)}  ${value}${note ? `   (${note})` : ""}`);
  }

  if (pageErrors.length > 0) {
    console.log(`  page errors      ${pageErrors.length}`);
    pageErrors.slice(0, 3).forEach((e) => console.log(`    ${e.slice(0, 160)}`));
  }

  for (const c of checks) {
    let verdict;
    if (c.knownFail) verdict = c.ok ? "UNEXPECTED PASS" : "KNOWN-FAIL";
    else verdict = c.ok ? "PASS" : "FAIL";
    console.log(`  ${verdict}  ${c.label}${c.detail ? `  —  ${c.detail}` : ""}`);
    if (c.knownFail && !c.ok) console.log(`          expected red: ${c.knownFail}`);
    if (c.knownFail && c.ok) {
      console.log(`          This was expected to fail. If the defect is fixed, remove the`);
      console.log(`          knownFail marker in scripts/audio_measure.mjs. Reference: ${c.knownFail}`);
    }
  }
}
