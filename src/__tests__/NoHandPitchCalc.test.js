/**
 * VMU-140 guard — no new hand-rolled "pitch class + octave -> absolute MIDI"
 * calculation outside core/noteEngine.js.
 *
 * The bug this ticket fixed (useDictionaryMode.js building each scale/chord
 * note as `pitchClass + (baseOctave + 1) * 12`, or `(root + semi) % 12 +
 * (baseOctave + 1) * 12` for chords) is a mechanism problem, not a one-off
 * typo: nothing stopped a second call site from re-deriving the same formula
 * by hand tomorrow, wrongly or not. A rule that says "use the engine" is a
 * reminder someone can forget; this is the refusing mechanism instead — it
 * scans the app for the formula's recognisable shapes and fails on any
 * occurrence that isn't already accounted for.
 *
 * "Accounted for" means listed in EXCEPTIONS below, each with a short reason:
 * a known false positive (a volume, not a pitch), or a genuine hand
 * calculation this ticket's brief left out of scope (decision #3 —
 * useMusicEngine.js and PianoKeyboard.jsx are VMU-115's job) and is
 * inventoried instead of migrated. Three shapes are matched, all named in the
 * brief or found while inventorying the reported bug's structural cause:
 *
 *   1. `(x + 1) * 12`        — the MIDI octave-base formula written out by
 *                              hand instead of calling realizeNote.
 *   2. `+ 48`, `+ 60`, ...   — a literal octave base (C1=24 .. C7=96) added
 *                              directly to a pitch class.
 *   3. `? 60 : 48` (etc.)    — the same literal octave base picked by a
 *      inline ternary — useMusicEngine.js's default-triad fallback, which
 *      shape 2 does not catch (the number never directly follows `+`).
 *
 * Comments are stripped before matching (a doc comment quoting the old
 * formula, e.g. useDictionaryMode.js's own migration note, is not a new
 * occurrence of it) — strings and template literals are not, since real
 * arithmetic can live inside a template literal (MixerStrip.jsx's CSS
 * strings, which is exactly this file's known false positive).
 *
 * `12` alone is deliberately not in the literal set: transposing by one
 * octave (`+ 12`) is a different, common and legitimate operation (the
 * engine's own closing-note calculation does it) — including it would drown
 * every real finding in noise.
 *
 * VMU-147 — exception keying: exceptions used to be keyed by `file:line`.
 * An edit that shifted lines *above* an exempted site (a new comment, an
 * added import — nothing about the exempted line itself) broke the key
 * without the exempted code changing at all: the exception went stale and
 * the untouched site reported as a brand-new unexcepted hit. That forced a
 * pure renumbering PR three times (VMU-131 gave up a refactor over it;
 * VMU-146 renumbered 10 exceptions across three commits; VMU-144 twice
 * more). Worse, the same line-number key is *blind* to the opposite case: if
 * the exempted line's own text changes but happens to land on the same line
 * number, the old key still matches and nothing flags it for re-review.
 *
 * The fix: key each exception on `file` + the exempted line's own
 * *normalized* text (after stripComments, runs of whitespace collapsed to
 * one, edges trimmed) + how many occurrences of that exact text are allowed
 * in that file (`count`, default 1). A pure line shift changes no text, so
 * the exception survives it. A change to the exempted line's own text still
 * breaks the exception — that is the point, not a defect: the code that was
 * reviewed and exempted is gone, so whatever replaced it needs a fresh look.
 * The scanning and matching logic itself lives in ./pitchCalcGuard.js (not a
 * test file — sourceFiles() below already excludes __tests__/ from the scan,
 * which is what makes this an importable module rather than dead code),
 * exposing checkExceptions as a pure function so it can be driven from a
 * fixture-based test (below) or from an external verification script without
 * going through vitest.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, findHandPitchCalcs, normalizeLine, collectHits, checkExceptions } from "./pitchCalcGuard.js";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The engine is allowed — it IS the canonical formula, named once.
const EXCLUDED_FILES = new Set([path.join(SRC, "core", "noteEngine.js")]);

function sourceFiles(dir = SRC, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") sourceFiles(full, acc);
    } else if (/\.jsx?$/.test(entry.name) && !EXCLUDED_FILES.has(full)) {
      acc.push(full);
    }
  }
  return acc;
}

function relFile(file) {
  return path.relative(SRC, file).replace(/\\/g, "/");
}

// Every entry below was converted from the file:line-keyed EXCEPTIONS this
// test used before VMU-147, same 18 original entries, same reasons,
// unchanged scope (nothing migrated, nothing added or removed — decision #4
// of the VMU-147 brief). `count` defaults to 1 and is only ever set higher
// when the exempted line itself produces more than one match:
//
//   - components/Audio/MixerStrip.jsx's line 76 has TWO `+ 60` occurrences
//     (the gradient's CSS template literal repeats the volume-percentage
//     expression) — count: 2, not a new exception, just an accurate count
//     for the one that was already there.
//
// core/theory.js's getClosestInversionN (line 244 at conversion time) and
// getChordNotesAbsolute (line 559) independently compute the identical
// normalized line `const base = (octave + 1) * 12;` as one internal step of
// two otherwise-different functions. Kept as two separate entries below (two
// original file:line exceptions, two distinct reasons preserved) rather than
// merged into one with count: 2 — checkExceptions pools exceptions that
// share the same (file, code) key, so the two together correctly cover both
// call sites' hits. The one thing this loses versus the old per-line key: if
// only ONE of the two functions is later fixed or removed, the pool still
// shows one hit consumed and nothing stale, so that specific narrowing is
// not individually flagged — only the case of BOTH disappearing (or one
// appearing twice) is visible via `exceeded`. Flagged in the ticket's report
// per decision #4 ("si une exception ne se convertit pas proprement,
// dis-le") — it is a known, accepted narrowing, not a silent one.
const EXCEPTIONS = [
  // --- Known false positive (not a pitch) ---
  {
    file: "components/Audio/MixerStrip.jsx",
    code: "'--value': `${((instrumentVolumes[inst.id] + 60) / 70) * 100}%`,",
    count: 1,
    reason: "volume percentage for a CSS gradient (dB -60..10 -> 0..100%), not a pitch",
  },
  {
    file: "components/Audio/MixerStrip.jsx",
    code: "background: `linear-gradient(to top, var(--led-cyan) 0%, var(--led-cyan) ${((instrumentVolumes[inst.id] + 60) / 70) * 100}%, #333 ${((instrumentVolumes[inst.id] + 60) / 70) * 100}%, #333 100%)`",
    count: 2, // the same volume-percentage expression appears twice in this one gradient literal
    reason: "same volume percentage, repeated in the gradient's background stops",
  },

  // --- core/theory.js: the pre-existing canonical low-level conversions.
  // Not migrated to noteEngine.js by this ticket (VMU-140's brief scopes the
  // migration to useDictionaryMode.js/useDictionaryPlayback.js only); each is
  // either a single note (no scale/chord sequence to fold, so VMU-140's
  // do-crossing defect does not apply) or already ascending by construction. ---
  {
    file: "core/theory.js",
    code: "return noteValue + (octave + 1) * 12;",
    count: 1,
    reason: "getAbsoluteNoteValue — parses ONE note name + octave; no sequence to fold",
  },
  {
    file: "core/theory.js",
    code: "const base = (octave + 1) * 12;",
    count: 1,
    reason: "getClosestInversionN — explicit ascending fix-up (`if pitch <= last, += 12`); correct for any root",
  },
  {
    file: "core/theory.js",
    code: "const base = (octave + 1) * 12;", // identical text to getClosestInversionN's — see module-level note above
    count: 1,
    reason:
      "getChordNotesAbsolute — root+semitones, no modulo before adding; same shape as realizeChord, still used by useDictionaryPlayback.js's chord fallback-of-fallback",
  },
  {
    file: "core/theory.js",
    code: "const midiNote = (chordRootValue % 12) + semitones + (baseOctave + 1) * 12;",
    count: 1,
    reason: "getBassNote — one note, no sequence",
  },
  {
    file: "core/theory.js",
    code: "const targetMidi = (nextChordRootValue % 12) + (baseOctave + 1) * 12;",
    count: 1,
    reason: "getLeadingTone — one note, no sequence",
  },
  {
    file: "core/theory.js",
    code: "return rootValue + (baseOctave + 1) * 12;",
    count: 1,
    reason:
      "computeAbsoluteNote — the canonical single-note octave-selector helper (realizeNote's pre-existing equivalent); still used directly (useDictionaryPlayback.js, useMusicEngine.js)",
  },

  // --- core/voicingEngine.js: same explicit ascending fix-up as
  // getClosestInversionN, independent implementation, pre-existing, out of
  // this ticket's scope. ---
  {
    file: "core/voicingEngine.js",
    code: "let pitch = (octave + 1) * 12 + rootValue + intervals[idx];",
    count: 1,
    reason: "suggestReVoicing — explicit ascending fix-up (`if pitch <= last, += 12`); correct for any root",
  },

  // --- src/audio: MIDI export and the sequencer's own chord resolution.
  // Both add semitones to the root without ever taking the sum modulo 12,
  // so — like useMusicEngine.js's fretboardActiveNotes fallback below — they
  // are already correct for any root; out of this ticket's scope (VMU-115
  // territory, not the Dictionary). ---
  {
    file: "audio/MidiExporter.js",
    code: "const midiNote = (rootValChord % 12) + s + (baseOctave + 1) * 12;",
    count: 1,
    reason: "MIDI export — root+semitone, no modulo before adding; correct for any root, out of Dictionary scope",
  },
  {
    file: "audio/useSequencer.js",
    code: "const absolutePitches = semitones.map((s) => chord.rootNote.value + s + (baseOctave + 1) * 12);",
    count: 1,
    reason: "Studio sequencer chord resolution — same shape, correct for any root, out of Dictionary scope",
  },

  // --- src/audio/measure: the offline render / audio-measurement harness
  // (scripts/audio_measure.mjs's engine). Single-note conversions, not a
  // scale or chord sequence — VMU-140's defect does not apply. ---
  {
    file: "audio/measure/offlineRender.js",
    code: "finalNoteName = `${theory.midiToNoteName((brick.rootValue % 12) + (octave + 1) * 12)}`;",
    count: 1,
    reason: "bass fallback note name — one note, no sequence",
  },
  {
    file: "audio/measure/signalMetrics.js",
    code: "return semitone + (Number(octave) + 1) * 12;",
    count: 1,
    reason: "noteNameToMidi — the harness's own note-name parser, one note at a time",
  },

  // --- useMusicEngine.js: Studio mode, explicitly out of scope (brief
  // decision #3 — untouched; VMU-115 migrates the rest). Both sites are
  // correct for any root: the fretboardActiveNotes fallback never re-derives
  // a pitch class before adding (root+semi+base, like theory.js's
  // getChordNotesAbsolute); the default-triad fallback explicitly re-checks
  // for the do-crossing case (`n2 < n1 ? 60 : 48`) and picks the next octave
  // up when it happens — the "correct" hand calc the ticket's own cause
  // analysis names. ---
  {
    file: "hooks/useMusicEngine.js",
    code: "absoluteValue: played ? played.absoluteValue : (effectiveChord.rootNote.value + semi + 48)",
    count: 1,
    reason: "Studio fretboardActiveNotes fallback — root+semi+48, no modulo; correct for any root",
  },
  {
    file: "hooks/useMusicEngine.js",
    code: "{ value: n1, order: getChordIntervalLabel(0, 0), absoluteValue: n1 + 48 },",
    count: 1,
    reason: "Studio default-triad fallback, root note — trivially correct (first note, nothing to cross)",
  },
  {
    file: "hooks/useMusicEngine.js",
    code: "{ value: n2, order: getChordIntervalLabel(1, (n2 - n1 + 12) % 12), absoluteValue: n2 + (n2 < n1 ? 60 : 48) },",
    count: 1,
    reason: "Studio default-triad fallback, 3rd — ternary explicitly picks the octave above when it crosses do",
  },
  {
    file: "hooks/useMusicEngine.js",
    code: "{ value: n3, order: getChordIntervalLabel(2, (n3 - n1 + 12) % 12), absoluteValue: n3 + (n3 < n1 ? 60 : 48) },",
    count: 1,
    reason: "Studio default-triad fallback, 5th — same explicit do-crossing check as the 3rd",
  },

  // --- PianoKeyboard.jsx: explicitly out of scope (brief decision #3).
  // Single pitch (the harmonic-series overlay's base note) — VMU-140's
  // defect (a note falling below a DIFFERENT note in the same sequence)
  // does not apply to a single note. It does hard-code octave 3, ignoring
  // the Dictionary's octave selector — a real but separate issue, left for
  // VMU-115 as the brief asks. ---
  {
    file: "components/Instruments/PianoKeyboard.jsx",
    code: "const midi = Number(rootValue) + 48;",
    count: 1,
    reason: "harmonic-series overlay base pitch — single note, fixed octave 3 (ignores the octave selector; separate, pre-existing, VMU-115 territory)",
  },
];

describe("guard — no hand-rolled pitch-class + octave calculation outside core/noteEngine.js (VMU-140)", () => {
  it("the scanner itself finds each named shape (garde-fou du garde-fou)", () => {
    expect(findHandPitchCalcs(stripComments("const base = (octave + 1) * 12;"))).toHaveLength(1);
    expect(findHandPitchCalcs(stripComments("const m = n.value + 60;"))).toHaveLength(1);
    expect(findHandPitchCalcs(stripComments("const m = n2 + (n2 < n1 ? 60 : 48);"))).toHaveLength(1);
    // A comment quoting the formula is not a new occurrence of it.
    expect(findHandPitchCalcs(stripComments("// old code: n.value + (baseOctave + 1) * 12"))).toHaveLength(0);
    // `+ 12` alone is a plain octave transpose (the engine's own closing-note
    // step does this), not a fixed octave BASE — deliberately not matched.
    expect(findHandPitchCalcs(stripComments("const x = a + 12;"))).toHaveLength(0);
    // The literal-addition shape is intentionally broad (any `+ 60` reads as
    // a possible octave base) — that breadth is exactly why MixerStrip.jsx's
    // volume percentage needs an explicit exception below, same as a real
    // pitch calculation would.
    expect(findHandPitchCalcs(stripComments("const total = price + 60;"))).toHaveLength(1);
  });

  it("actually scans the app's source (garde-fou du garde-fou)", () => {
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.endsWith("useDictionaryMode.js"))).toBe(true);
    expect(files.some((f) => f.endsWith("theory.js"))).toBe(true);
  });

  const allHits = sourceFiles().flatMap((file) => collectHits(relFile(file), fs.readFileSync(file, "utf-8")));
  const result = checkExceptions(allHits, EXCEPTIONS);

  it("every hand-rolled pitch calculation found in the app is in the exceptions list above", () => {
    expect(result.unexcepted.map((h) => `${h.file}:${h.line} -> ${h.snippet}`)).toEqual([]);
  });

  it("every exception still matches something — a fixed, removed, or edited site must be re-reviewed and removed from the list too", () => {
    expect(result.stale.map((e) => `${e.file} -> ${e.reason}`)).toEqual([]);
  });

  it("no exception is used more times than its declared count — a duplicated occurrence needs its own reviewed exception", () => {
    expect(result.exceeded.map((h) => `${h.file}:${h.line} -> ${h.snippet}`)).toEqual([]);
  });

  it("useDictionaryMode.js and useDictionaryPlayback.js — VMU-140's two migrated files — are entirely clean, no exceptions needed", () => {
    const flaggedInMigratedFiles = allHits
      .map((h) => `${h.file}:${h.line}`)
      .filter((k) => k.startsWith("hooks/useDictionaryMode.js") || k.startsWith("hooks/useDictionaryPlayback.js"));
    expect(flaggedInMigratedFiles).toEqual([]);
  });

  it("VMU-147 — total sites found is unchanged by the exception-key refactor (19 hits, 18 distinct file:line sites pre-refactor)", () => {
    // Ground truth captured by running the pre-refactor, file:line-keyed
    // version of this test (git history: this file before VMU-147) with a
    // one-line console.log instrumentation, reverted before this commit:
    // `VMU147_BEFORE_TOTAL_HITS 19 DISTINCT_KEYS 18`. The scanning logic
    // (stripComments, findHandPitchCalcs) is byte-for-byte unchanged by this
    // refactor — only the exception format changed — so this total is
    // expected to hold exactly, not approximately.
    expect(allHits.length).toBe(19);
  });
});

describe("VMU-147 — checkExceptions is content-keyed, not line-keyed (fixtures only, nothing under src/ touched)", () => {
  it("a shift (blank lines added above the exempted site) leaves the guard clean — the exempted text did not change", () => {
    const before = `function f(octave) {\n  return (octave + 1) * 12;\n}\n`;
    const after = `function f(octave) {\n\n\n\n  return (octave + 1) * 12;\n}\n`; // 3 blank lines added above

    const hitLineBefore = findHandPitchCalcs(stripComments(before))[0].line;
    const exceptions = [
      { file: "fixture.js", code: normalizeLine(stripComments(before).split("\n")[hitLineBefore - 1]), count: 1, reason: "fixture" },
    ];

    const result = checkExceptions(collectHits("fixture.js", after), exceptions);
    expect(result.unexcepted).toEqual([]);
    expect(result.stale).toEqual([]);
    expect(result.exceeded).toEqual([]);
  });

  it("a genuinely new, unexempted calculation is still reported (positive control — the detector must keep detecting)", () => {
    const src = `function g(x) {\n  return x + 60;\n}\n`;
    const result = checkExceptions(collectHits("fixture2.js", src), []);
    expect(result.unexcepted).not.toEqual([]);
  });

  it("the same exempted line occurring twice with count:1 reports the second occurrence as exceeded", () => {
    const src = `function h(o) {\n  return (o + 1) * 12;\n}\nfunction h2(o) {\n  return (o + 1) * 12;\n}\n`;
    const code = normalizeLine("  return (o + 1) * 12;");
    const exceptions = [{ file: "fixture3.js", code, count: 1, reason: "fixture" }];

    const result = checkExceptions(collectHits("fixture3.js", src), exceptions);
    expect(result.exceeded).not.toEqual([]);
  });

  it("the exempted line's own text changing reports BOTH unexcepted (new text, uncovered) and stale (old text, gone)", () => {
    const before = `function k(oldName) {\n  return oldName + 48;\n}\n`;
    const after = `function k(newName) {\n  return newName + 48;\n}\n`; // same line number, same shape, renamed variable

    const hitLineBefore = findHandPitchCalcs(stripComments(before))[0].line;
    const exceptions = [
      { file: "fixture4.js", code: normalizeLine(stripComments(before).split("\n")[hitLineBefore - 1]), count: 1, reason: "fixture" },
    ];

    const result = checkExceptions(collectHits("fixture4.js", after), exceptions);
    expect(result.unexcepted).not.toEqual([]);
    expect(result.stale).not.toEqual([]);
  });

  it("VMU-147 follow-up (coordinator QA) — a declared count higher than the actual occurrences is reported: count is exact, not a maximum", () => {
    // Exception declares count: 2, but the fixture file contains only ONE
    // real occurrence of that exact line. Before this follow-up,
    // checkExceptions treated `count` as an upper bound only: the single
    // occurrence consumed 1 of the pool's 2 allowed slots, leaving the pool
    // neither empty (not `stale`) nor over budget (not `exceeded`) — so a
    // declared-but-absent second occurrence went completely unreported.
    const src = `function m(o) {\n  return (o + 1) * 12;\n}\n`; // exactly one occurrence
    const code = normalizeLine("  return (o + 1) * 12;");
    const exceptions = [{ file: "fixture6.js", code, count: 2, reason: "fixture — declares 2 occurrences, only 1 is actually present" }];

    const result = checkExceptions(collectHits("fixture6.js", src), exceptions);
    expect(result.unexcepted).toEqual([]);
    expect(result.exceeded).toEqual([]);
    // The gap itself: 1 of the 2 declared occurrences is missing. Asserted
    // as an explicit shape check (not `.not.toEqual([])`, which passes
    // vacuously — and wrongly — when `missing` doesn't exist at all yet).
    expect(Array.isArray(result.missing)).toBe(true);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
