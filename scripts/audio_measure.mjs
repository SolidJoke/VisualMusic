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
 * VMU-144 phase B — tolerances the coordinator fixed after reviewing phase A
 * (brief, "Phase B — cible fixée par la coordinatrice", 2026-09-22).
 */
const GUITAR_VS_PIANO_TOLERANCE_LU = 1.5;
const BASS_GENRE_STABILITY_TOLERANCE_LU = 0.5;

/**
 * The 13 notes guitar actually has a sample for (`guitarSampler.urls`,
 * AudioEngine.js:210-215; Do-Mi-Sol from Do2 to Do6). VMU-144 phase B item 1:
 * "chaque échantillon de guitare joué à sa propre hauteur (13 notes, aucune
 * transposition), et le piano sur les mêmes 13 notes pour référence" — the
 * relevé this generates one measurement row per note, per instrument, from.
 */
const GUITAR_SAMPLE_NOTES = [
  "C2", "E2", "G2",
  "C3", "E3", "G3",
  "C4", "E4", "G4",
  "C5", "E5", "G5",
  "C6",
];

/**
 * One row of the phase B relevé: `instrument` played at `note`, its own
 * pitch, no transposition. Generated rather than written out 26 times —
 * the 13 notes above, twice (guitar, then piano for reference).
 */
const VMU144_RELEVE_ROWS = ["guitar", "piano"].flatMap((instrument) =>
  GUITAR_SAMPLE_NOTES.map((note) => ({
    id: `vmu144-releve-${instrument}-${note}`,
    title: `VMU-144 phase B relevé: ${instrument}, ${note} (its own sample, no transposition)`,
    // Guitar C2 has no expectedNotes and is expected to render *silent*:
    // guitar's own note-range filter (playDictionaryNote, AudioEngine.js,
    // E2-C6 = MIDI 40-84) rejects C2 (MIDI 36) before any synth sees it, even
    // though guitarSampler.urls does have a C2.mp3 (VMU-144 phase B finding —
    // that sample can never sound through this app). Asserting a pitch or
    // "not silent" here would fail on the app's own intended behaviour.
    spec:
      instrument === "guitar" && note === "C2"
        ? { scenario: "single-note", params: { instrument, note } }
        : { scenario: "single-note", params: { instrument, note }, expectedNotes: [note] },
    why:
      instrument === "guitar" && note === "C2"
        ? `Guitar's own filtered range starts at E2 (playDictionaryNote, AudioEngine.js) — C2 is silence by design, not a level to correct.`
        : instrument === "guitar"
          ? `Guitar's own recorded sample at ${note} (AudioEngine.js:210-215) — the relevé the coordinator asked for before any per-note correction.`
          : `Piano at ${note}, for reference against the guitar row of the same note — piano is not corrected in this ticket.`,
    expect: (r) =>
      instrument === "guitar" && note === "C2"
        ? [check("is silent (outside guitar's playable range)", r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)]
        : [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  })),
);

/**
 * VMU-144 phase B, permanent checks: guitar vs piano at the same note, and
 * bass's Dictionary level against itself before/after a genre preset. Reads
 * `results` (closed over below, populated as the plan runs) rather than a
 * single `r`, because these compare *two* measurements the plan takes
 * separately — unlike every other `expect` in this file.
 */
// Generic despite the name (also used for guitar-fallback-vs-sampler, brief
// item 3): any two ids compared by loudness within GUITAR_VS_PIANO_TOLERANCE_LU.
function guitarVsPianoCheck(results, firstId, secondId, label) {
  const a = results.find((r) => r.id === firstId)?.measurement;
  const b = results.find((r) => r.id === secondId)?.measurement;
  if (!a || !b || a.error || b.error) {
    return check(label, false, `missing measurement (${firstId} or ${secondId})`);
  }
  const deltaLu = a.mix.loudness.lufs - b.mix.loudness.lufs;
  return check(
    label,
    Math.abs(deltaLu) <= GUITAR_VS_PIANO_TOLERANCE_LU,
    `${firstId} ${fmt(a.mix.loudness.lufs)} LUFS, ${secondId} ${fmt(b.mix.loudness.lufs)} LUFS, ` +
      `Δ ${fmt(deltaLu)} LU (tolerance ±${GUITAR_VS_PIANO_TOLERANCE_LU})`,
  );
}

function bassGenreStabilityCheck(results, freshId, afterId, group) {
  const fresh = results.find((r) => r.id === freshId)?.measurement;
  const after = results.find((r) => r.id === afterId)?.measurement;
  if (!fresh || !after || fresh.error || after.error) {
    return check(`bass Do2 stable after "${group}" preset`, false, `missing measurement (${freshId} or ${afterId})`);
  }
  const deltaLu = after.mix.loudness.lufs - fresh.mix.loudness.lufs;
  return check(
    `bass Do2 stable after "${group}" preset`,
    Math.abs(deltaLu) <= BASS_GENRE_STABILITY_TOLERANCE_LU,
    `fresh ${fmt(fresh.mix.loudness.lufs)} LUFS, after "${group}" ${fmt(after.mix.loudness.lufs)} LUFS, ` +
      `Δ ${fmt(deltaLu)} LU (tolerance ±${BASS_GENRE_STABILITY_TOLERANCE_LU})`,
  );
}

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

  // ─── VMU-144 phase A: piano vs guitar vs bass, measured ───────────────
  // Gabriel (2026-09-18): guitar and bass sit notably quieter than piano in
  // the Dictionary. None of the scenarios above ever played guitar or bass —
  // this is the harness's first look at either (the ticket's own "angle
  // mort" finding). Nine rows per the brief: for each instrument, (a) the
  // same C4, (b) that instrument's own usual register (bass C2, guitar C3,
  // piano C4 — piano's (a) and (b) therefore render the same note on
  // purpose, not a copy-paste slip), (c) the C-E-G triad in that register.
  // `expect` below only confirms each render is audible: phase A measures
  // and reports, it does not yet judge the gap (no target/tolerance chosen —
  // that is phase B, on the coordinator's word).
  {
    id: "vmu144-c4-piano",
    title: "VMU-144 (a): piano, C4",
    spec: { scenario: "single-note", params: { instrument: "piano", note: "C4" }, expectedNotes: ["C4"] },
    why: "Same note on every instrument, before each one's own usual register below.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-c4-guitar",
    title: "VMU-144 (a): guitar, C4",
    spec: { scenario: "single-note", params: { instrument: "guitar", note: "C4" }, expectedNotes: ["C4"] },
    why: "Same note on every instrument, before each one's own usual register below.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-c4-bass",
    title: "VMU-144 (a): bass, C4",
    spec: { scenario: "single-note", params: { instrument: "bass", note: "C4" }, expectedNotes: ["C4"] },
    why:
      "Same note on every instrument. C4 (MIDI 60) is inside bass's filtered range but near its top " +
      "(E1-G4 = MIDI 28-67, AudioEngine.js:408-410) — near the edge of what bass ever plays, on purpose: " +
      "the brief's registre usuel row below (C2) is where bass actually lives.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-register-piano",
    title: "VMU-144 (b): piano, its own usual register (C4)",
    spec: { scenario: "single-note", params: { instrument: "piano", note: "C4" }, expectedNotes: ["C4"] },
    why: "Piano's usual register is C4 — the same render as (a) above by construction, kept as its own row for the brief's nine-row table.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-register-guitar",
    title: "VMU-144 (b): guitar, its own usual register (C3)",
    spec: { scenario: "single-note", params: { instrument: "guitar", note: "C3" }, expectedNotes: ["C3"] },
    why: "C3 (MIDI 48) sits inside guitar's filtered range (E2-C6 = MIDI 40-84, AudioEngine.js:411-413), a register guitar is actually played in.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-register-bass",
    title: "VMU-144 (b): bass, its own usual register (C2)",
    spec: { scenario: "single-note", params: { instrument: "bass", note: "C2" }, expectedNotes: ["C2"] },
    why: "C2 (MIDI 36) sits inside bass's filtered range (E1-G4 = MIDI 28-67, AudioEngine.js:408-410), a register bass is actually played in.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-chord-piano",
    title: "VMU-144 (c): piano, C-E-G at C4 (C4 E4 G4)",
    spec: {
      scenario: "chord",
      params: { instrument: "piano", notes: ["C4", "E4", "G4"] },
      expectedNotes: ["C4", "E4", "G4"],
    },
    why: "The C major triad in piano's usual register.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-chord-guitar",
    title: "VMU-144 (c): guitar, C-E-G at C3 (C3 E3 G3)",
    spec: {
      scenario: "chord",
      params: { instrument: "guitar", notes: ["C3", "E3", "G3"] },
      expectedNotes: ["C3", "E3", "G3"],
    },
    why: "The C major triad in guitar's usual register.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },
  {
    id: "vmu144-chord-bass",
    title: "VMU-144 (c): bass, C-E-G at C2 (C2 E2 G2)",
    spec: {
      scenario: "chord",
      params: { instrument: "bass", notes: ["C2", "E2", "G2"] },
      // No expectedNotes: bassSynth is a Tone.MonoSynth (AudioEngine.js:446).
      // playDictionaryNote (:424-436) sorts the filtered notes by MIDI and
      // plays only the lowest one — for this chord, just C2. Asserting the
      // triad here would fail on the app's actual, intentional behaviour,
      // not a defect; the "voices"/pitch-content row is where this shows up.
    },
    why:
      "The C major triad in bass's usual register — but bass only ever sounds its lowest note of a chord " +
      "(MonoSynth, AudioEngine.js:424-436): this row measures what actually plays, C2 alone, not C2+E2+G2.",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },

  // ─── VMU-144 phase B, item 1: the relevé (13 guitar samples + piano ref) ──
  ...VMU144_RELEVE_ROWS,

  // ─── VMU-144 phase B, item 3: guitar fallback forced ──────────────────
  {
    id: "vmu144-guitar-fallback-c3",
    title: "VMU-144 phase B: guitar fallback (forced), C3",
    spec: { scenario: "guitar-fallback-note", params: { note: "C3" }, expectedNotes: ["C3"] },
    why:
      "guitarFallback had no declared volume before this ticket (AudioEngine.js, phase A finding). " +
      "Compared against vmu144-register-guitar (the sampler at C3) by the cross-scenario check below, " +
      "within ±1.5 LU (brief item 3).",
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  },

  // ─── VMU-144 phase B, item 4: bass Do2 in Dictionary, after each genre preset ──
  // `vmu144-register-bass` above is the "fresh" baseline (no preset applied
  // yet, matching phase A). Each row here applies one genre preset first
  // (single-note scenario's new `applyGenrePreset` param, offlineRender.js —
  // the exact function Studio calls, AudioEngine.js:471), then plays bass Do2
  // through the same Dictionary path (playDictionaryNote). The cross-scenario
  // check below compares each of these against the fresh baseline.
  ...["electronic", "jazz", "rock", "pop", "urban", "world"].map((group) => ({
    id: `vmu144-bass-after-${group}`,
    title: `VMU-144 phase B: bass, C2, Dictionary path, after applyGenrePreset("${group}")`,
    spec: {
      scenario: "single-note",
      params: { instrument: "bass", note: "C2", applyGenrePreset: group },
      expectedNotes: ["C2"],
    },
    why: `Bass's Dictionary level must not move when a genre preset is applied in Studio (brief item 4, ±${BASS_GENRE_STABILITY_TOLERANCE_LU} LU).`,
    expect: (r) => [check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`)],
  })),

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
    id: "metronome",
    title: "Metronome alone at 120 BPM, sequencer stopped (VMU-056)",
    spec: { scenario: "metronome", params: { bpm: 120, detectOnsets: true } },
    why:
      "VMU-056 definition of done: proves the module produces audible, evenly-spaced clicks on its " +
      "own (decision 3 — 'seul, séquenceur à l'arrêt'), through the real output chain (decision 2), " +
      "without metronome.js writing the tempo itself — this scenario sets it once, the module only reads it.",
    expect: (r) => [
      check("is not silent", !r.mix.silence.silent, `peak ${fmt(r.mix.peakDbfs)} dBFS`),
      check(
        "at least 4 clicks detected over 2.3s at 120 BPM",
        (r.onsets?.onsets.length ?? 0) >= 4,
        `${r.onsets?.onsets.length ?? 0} onsets at ${r.onsets?.onsets.map((t) => fmt(t, 3)).join(", ")}s`,
      ),
      check(
        "click spacing matches 120 BPM (500ms) within 20ms",
        r.onsets?.meanIntervalSec != null && Math.abs(r.onsets.meanIntervalSec - 0.5) <= 0.02,
        `mean interval ${fmt((r.onsets?.meanIntervalSec ?? 0) * 1000, 1)} ms (expected 500 ms)`,
      ),
    ],
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

// ─── VMU-144 phase B cross-scenario checks ────────────────────────────
// These compare two measurements the loop above took *separately* (guitar
// vs piano on the same note, or bass before/after a genre preset), so they
// cannot live inside one PLAN entry's own `expect(measurement)` — there is
// no single `measurement` that holds both sides. Run once here instead.
// Skipped (not failed) when a required id was not part of this run — e.g.
// `--scenario=` filtered the plan down to something else.
const crossChecks = [];
if (ASSERT) {
  const has = (id) => results.some((r) => r.id === id && !r.measurement.error);
  const pairs = [
    // "Do3" and "Do4" (brief item 6) are the same-note relevé pairs below
    // (guitar C3 vs piano C3, guitar C4 vs piano C4) — item 2 asks for
    // "chaque note ... à ±1,5 LU du piano sur la même note", not guitar's
    // Do3 against piano's own usual register Do4 (a cross-register pair
    // that was here in an earlier draft, measured -2.09 LU: outside
    // tolerance, and not what item 2 actually specifies — removed, not
    // "fixed", once re-read against the brief).
    ["vmu144-c4-guitar", "vmu144-c4-piano", "guitar C4 vs piano C4"],
    // The chord *is* explicitly cross-register (brief item 2: "l'accord
    // Do-Mi-Sol en Do3 à ±1,5 LU de l'accord piano en Do4").
    ["vmu144-chord-guitar", "vmu144-chord-piano", "guitar C-E-G chord at Do3 vs piano C-E-G chord at Do4"],
    ["vmu144-guitar-fallback-c3", "vmu144-register-guitar", "guitar fallback (forced) at Do3 vs guitar sampler at Do3"],
    // C2 excluded: guitar's own note-range filter (playDictionaryNote,
    // AudioEngine.js, E2-C6 = MIDI 40-84) rejects it before it ever reaches
    // a synth — guitar C2 is always silence in this app, not a level to
    // correct or compare (relevé row still runs and reports -200 LUFS,
    // informational; asserting it against piano here would be asserting the
    // wrong thing).
    ...GUITAR_SAMPLE_NOTES.filter((note) => note !== "C2").map((note) => [
      `vmu144-releve-guitar-${note}`,
      `vmu144-releve-piano-${note}`,
      `relevé: guitar ${note} vs piano ${note}`,
    ]),
  ];
  for (const [g, p, label] of pairs) {
    if (has(g) && has(p)) crossChecks.push(guitarVsPianoCheck(results, g, p, label));
  }
  for (const group of ["electronic", "jazz", "rock", "pop", "urban", "world"]) {
    const afterId = `vmu144-bass-after-${group}`;
    if (has("vmu144-register-bass") && has(afterId)) {
      crossChecks.push(bassGenreStabilityCheck(results, "vmu144-register-bass", afterId, group));
    }
  }
}
failures += crossChecks.filter((c) => (c.knownFail ? c.ok : !c.ok)).length;
if (!AS_JSON && crossChecks.length > 0) {
  console.log(`\n${"─".repeat(78)}`);
  console.log("VMU-144 phase B — cross-scenario checks (guitar vs piano, bass genre stability)");
  console.log(`${"─".repeat(78)}`);
  for (const c of crossChecks) {
    console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.label}${c.detail ? `  —  ${c.detail}` : ""}`);
  }
}

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        results: results.map((r) => ({ id: r.id, title: r.title, measurement: r.measurement, checks: r.checks })),
        crossChecks,
      },
      null,
      2,
    ),
  );
} else if (ASSERT) {
  // Known-fails are counted out of the asserted total and named separately:
  // folding one into "14/14 passed" would report a measured defect as a pass.
  const all = results.flatMap((r) => r.checks).concat(crossChecks);
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
    [
      "mix loudness",
      `${fmt(m.mix.loudness.lufs)} LUFS`,
      `ITU-R BS.1770, ${m.mix.loudness.gatedBlockCount}/${m.mix.loudness.blockCount} 400ms blocks passed gating`,
    ],
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
  if (m.onsets) {
    rows.push([
      "onsets (clicks)",
      `${m.onsets.onsets.length} detected`,
      m.onsets.meanIntervalSec != null
        ? `mean interval ${fmt(m.onsets.meanIntervalSec * 1000, 1)} ms — at ${m.onsets.onsets.map((t) => fmt(t, 3)).join(", ")}s`
        : "fewer than 2 onsets, no interval",
    ]);
  }
  if (m.pitchVerdict) {
    rows.push([
      "pitch verdict",
      m.pitchVerdict.ok ? "matches what was asked for" : "DOES NOT MATCH",
      `expected ${m.expectedNotes.join(", ")}` +
        (m.pitchVerdict.missing.length ? `; missing ${m.pitchVerdict.missing.join(", ")}` : "") +
        (m.pitchVerdict.unexplained.length ? `; unexplained ${m.pitchVerdict.unexplained.join(", ")}` : ""),
    ]);
  }
  if (m.pianoVoice) {
    const noteDetail = [m.guitarVoice ? `guitar: ${m.guitarVoice}` : "", m.bassVoice ? `bass: ${m.bassVoice}` : ""]
      .filter(Boolean)
      .join(", ");
    rows.push(["voices", `piano: ${m.pianoVoice}`, noteDetail]);
  } else if (m.bassVoice) {
    // Bass-only scenarios still call loadSamplers (piano/guitar samplers are
    // always loaded), so pianoVoice should be set too — this branch exists
    // only so a future scenario that reports bass alone is not silently
    // dropped from the table.
    rows.push(["voices", `bass: ${m.bassVoice}`, ""]);
  }
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
