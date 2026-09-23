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
 * "Accounted for" means listed in EXCEPTIONS below, each with its file:line
 * and a short reason: a known false positive (a volume, not a pitch), or a
 * genuine hand calculation this ticket's brief left out of scope (decision
 * #3 — useMusicEngine.js and PianoKeyboard.jsx are VMU-115's job) and is
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
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/** Blank out line and block comments, preserving line structure; strings/template literals pass through untouched. */
export function stripComments(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < src.length) {
        out += src[i];
        if (src[i] === "\\" && i + 1 < src.length) {
          i++;
          out += src[i];
        } else if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "/" && c2 === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && c2 === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        out += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Deliberately not anchored on the opening paren's content (e.g.
// `(Number(octave) + 1) * 12` nests a call inside it) — the closing shape
// `+ 1) * 12` alone is specific enough in practice.
const OCTAVE_BASE_FORMULA = /\+\s*1\)\s*\*\s*12/g;
const OCTAVE_BASES = "24|36|48|60|72|84|96"; // C1..C7, theory.js:75-78
const OCTAVE_LITERAL_ADD = new RegExp(`\\+\\s*(?:${OCTAVE_BASES})\\b`, "g");
const OCTAVE_LITERAL_TERNARY = new RegExp(`\\?\\s*(?:${OCTAVE_BASES})\\s*:\\s*(?:${OCTAVE_BASES})\\b`, "g");

/**
 * @param {string} src already comment-stripped
 * @returns {Array<{line: number, snippet: string}>}
 */
export function findHandPitchCalcs(src) {
  const hits = [];
  for (const re of [OCTAVE_BASE_FORMULA, OCTAVE_LITERAL_ADD, OCTAVE_LITERAL_TERNARY]) {
    re.lastIndex = 0;
    for (const m of src.matchAll(re)) {
      const line = src.slice(0, m.index).split("\n").length;
      hits.push({ line, snippet: m[0] });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

// file:line -> reason. Every entry was found by this scanner on the branch
// this test was written on; a line number drifting when the surrounding
// file changes is expected to break this test — that is the point (it means
// the exception needs re-checking, not a silent match against the wrong
// line forever).
const EXCEPTIONS = {
  // --- Known false positive (not a pitch) ---
  "components/Audio/MixerStrip.jsx:75": "volume percentage for a CSS gradient (dB -60..10 -> 0..100%), not a pitch",
  "components/Audio/MixerStrip.jsx:76": "same volume percentage, repeated in the gradient's background stops",

  // --- core/theory.js: the pre-existing canonical low-level conversions.
  // Not migrated to noteEngine.js by this ticket (VMU-140's brief scopes the
  // migration to useDictionaryMode.js/useDictionaryPlayback.js only); each is
  // either a single note (no scale/chord sequence to fold, so VMU-140's
  // do-crossing defect does not apply) or already ascending by construction. ---
  "core/theory.js:78": "getAbsoluteNoteValue — parses ONE note name + octave; no sequence to fold",
  // VMU-146 fix2 shifted the five lines below, 240->244, 555->559,
  // 787->791, 803->807, 826->830: a 4-line comment was added just above
  // resolveNnsToChordType's dim7 check, moving that check above the m7
  // check (a genuine reachability fix — "dim7" always contains "m7" as a
  // substring, so the old order made the dim7 branch dead code; found while
  // writing the DegreeRoleDom "clicked dim7 chord" DOM test). The
  // arithmetic on each exception's own line is untouched.
  "core/theory.js:244": "getClosestInversionN — explicit ascending fix-up (`if pitch <= last, += 12`); correct for any root",
  "core/theory.js:559": "getChordNotesAbsolute — root+semitones, no modulo before adding; same shape as realizeChord, still used by useDictionaryPlayback.js's chord fallback-of-fallback",
  "core/theory.js:791": "getBassNote — one note, no sequence",
  "core/theory.js:807": "getLeadingTone — one note, no sequence",
  "core/theory.js:830": "computeAbsoluteNote — the canonical single-note octave-selector helper (realizeNote's pre-existing equivalent); still used directly (useDictionaryPlayback.js, useMusicEngine.js)",

  // --- core/voicingEngine.js: same explicit ascending fix-up as
  // getClosestInversionN, independent implementation, pre-existing, out of
  // this ticket's scope. ---
  "core/voicingEngine.js:101": "suggestReVoicing — explicit ascending fix-up (`if pitch <= last, += 12`); correct for any root",

  // --- src/audio: MIDI export and the sequencer's own chord resolution.
  // Both add semitones to the root without ever taking the sum modulo 12,
  // so — like useMusicEngine.js:135 below — they are already correct for
  // any root; out of this ticket's scope (VMU-115 territory, not the
  // Dictionary). ---
  "audio/MidiExporter.js:160": "MIDI export — root+semitone, no modulo before adding; correct for any root, out of Dictionary scope",
  "audio/useSequencer.js:64": "Studio sequencer chord resolution — same shape, correct for any root, out of Dictionary scope",

  // --- src/audio/measure: the offline render / audio-measurement harness
  // (scripts/audio_measure.mjs's engine). Single-note conversions, not a
  // scale or chord sequence — VMU-140's defect does not apply. ---
  "audio/measure/offlineRender.js:486": "bass fallback note name — one note, no sequence (line shifted from :470 by VMU-144 phase B's reverb-ready determinism fix, added above it)",
  "audio/measure/signalMetrics.js:922": "noteNameToMidi — the harness's own note-name parser, one note at a time (line shifted from :919 by VMU-144's K_WEIGHTING_STAGES comment, added above it)",

  // --- useMusicEngine.js: Studio mode, explicitly out of scope (brief
  // decision #3 — untouched; VMU-123 touches this file in parallel and
  // VMU-115 migrates the rest). Both sites are correct for any root: :138
  // never re-derives a pitch class before adding (root+semi+base, like
  // theory.js's getChordNotesAbsolute); :148-150 is the default-triad
  // fallback, which explicitly re-checks for the do-crossing case
  // (`n2 < n1 ? 60 : 48`) and picks the next octave up when it happens —
  // the "correct" hand calc the ticket's own cause analysis names (there
  // cited as useMusicEngine.js:141-143; VMU-123 (PR #117, merged onto this
  // ticket's base) shifted it to :145-147 — see report for the discrepancy).
  // VMU-146 shifted these four again, 135->138 and 145-147->148-150: a
  // 3-line comment was added just above (explaining why fretboardActiveNotes
  // now calls getChordIntervalLabel with index -1, not chordData's own
  // position `i` — a real producer-side fix, not cosmetic; see the VMU-146
  // report). The arithmetic on each line is untouched. ---
  "hooks/useMusicEngine.js:138": "Studio fretboardActiveNotes fallback — root+semi+48, no modulo; correct for any root",
  "hooks/useMusicEngine.js:148": "Studio default-triad fallback, root note — trivially correct (first note, nothing to cross)",
  "hooks/useMusicEngine.js:149": "Studio default-triad fallback, 3rd — ternary explicitly picks the octave above when it crosses do",
  "hooks/useMusicEngine.js:150": "Studio default-triad fallback, 5th — same explicit do-crossing check as :149",

  // --- PianoKeyboard.jsx: explicitly out of scope (brief decision #3).
  // Single pitch (the harmonic-series overlay's base note) — VMU-140's
  // defect (a note falling below a DIFFERENT note in the same sequence)
  // does not apply to a single note. It does hard-code octave 3, ignoring
  // the Dictionary's octave selector — a real but separate issue, left for
  // VMU-115 as the brief asks. Line shifted 83 -> 84 (VMU-146 added an
  // import line above it for getRoleForDegreeLabel); content unchanged. ---
  "components/Instruments/PianoKeyboard.jsx:84": "harmonic-series overlay base pitch — single note, fixed octave 3 (ignores the octave selector; separate, pre-existing, VMU-115 territory)",
};

function relKey(file, line) {
  return `${path.relative(SRC, file).replace(/\\/g, "/")}:${line}`;
}

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

  const allHits = [];
  for (const file of sourceFiles()) {
    const src = stripComments(fs.readFileSync(file, "utf-8"));
    for (const hit of findHandPitchCalcs(src)) {
      allHits.push({ key: relKey(file, hit.line), snippet: hit.snippet });
    }
  }
  const seenKeys = new Set(allHits.map((h) => h.key));
  const unexcepted = allHits.filter((h) => !(h.key in EXCEPTIONS));
  const staleExceptions = Object.keys(EXCEPTIONS).filter((k) => !seenKeys.has(k));

  it("every hand-rolled pitch calculation found in the app is in the exceptions list above", () => {
    expect(unexcepted.map((h) => `${h.key} -> ${h.snippet}`)).toEqual([]);
  });

  it("every exception still matches something — a fixed or removed site must be removed from the list too", () => {
    expect(staleExceptions).toEqual([]);
  });

  it("useDictionaryMode.js and useDictionaryPlayback.js — VMU-140's two migrated files — are entirely clean, no exceptions needed", () => {
    const flaggedInMigratedFiles = allHits
      .map((h) => h.key)
      .filter((k) => k.startsWith("hooks/useDictionaryMode.js") || k.startsWith("hooks/useDictionaryPlayback.js"));
    expect(flaggedInMigratedFiles).toEqual([]);
  });
});
