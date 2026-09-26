import { describe, it, expect } from "vitest";
import { BRICKS } from "../bricks";
import extendedTheoryData from "../extendedTheoryData.json";
import { chordsFromProgression, describeChord } from "../timeline";
import {
  CHORDS,
  generateChordsFromNNS,
  getChordAbsolute,
  getChordShortName,
  resolveChordFromShortName,
  resolveChordSemitones,
  resolveNnsToChordType,
} from "../theory";

/**
 * VMU-157 / VMU-158 — how a progression symbol becomes a chord.
 *
 * The styles (bricks.json: `nnsProgression`, `nnsProgressionVariation`) and
 * the Quick Start progressions (extendedTheoryData.json:
 * `axiomRules.progressions`) write their chords as degrees. Two readings were
 * wrong:
 *
 * - VMU-157, the root. An altered degree ("b2", "b3", "b6", "b7") was flattened
 *   *on top of* the mode's own degree, so in E phrygian "b2" (F) became E and
 *   "b6" (C) became B; "b5" was not flattened at all.
 * - VMU-158, the type. It was read off the whole string, degree included, so
 *   the degree 7 ("7", "b7", "b7m") made a dominant seventh, and "ii7", "vi7",
 *   "IMaj7", "IVMaj7" all became dominant sevenths.
 *
 * The rule these tests hold the code to:
 * 1. A degree without an accidental is read in the style's mode ("6" in a
 *    minor key is its sixth, a minor sixth above the tonic; "4" in lydian is
 *    the raised fourth). This is what the code already did.
 * 2. A degree with an accidental is read against the major scale of the tonic
 *    (Nashville convention): "b2" is one semitone above the tonic whatever
 *    the mode, "b7" ten.
 * 3. The type comes from what follows the degree, never from the degree:
 *    "-" or "m" minor, "°" diminished, "7" dominant seventh, "m7", "maj7" /
 *    "Maj7", "m7b5", "7alt" (a dominant seventh). In roman numerals the case
 *    gives the quality (lower case minor) and "7" after lower case is m7.
 *    Nothing after an arabic degree: a major triad, as the code already did.
 *
 * Expected chords are written out by hand below, from the rule and the
 * style's key — not read off theory.js.
 *
 * Predicted reds (run before the fix, on main at ceec153):
 * - "the rule, tonic C": every row (20) — they are the cases measured wrong.
 * - "every style": the 22 progressions whose chords change —
 *   6:A 6:B 7:A 7:B 10:B 11:A 11:B 13:B 15:A 16:A 16:B 17:A 17:B 19:B 20:B
 *   23:A 23:B 24:A 24:B 25:B 26:A 26:B — through both entry points (the
 *   timeline's chordsFromProgression, and the Studio chord buttons'
 *   generateChordsFromNNS + resolveNnsToChordType).
 * - "every Quick Start, in C major": jazz_251_maj, jazz_turnaround, rnb_436.
 * - describeChord's degree read back: predicted 7 — "b5" (F#) in C major,
 *   minor, dorian, phrygian, mixolydian and phrygian dominant, "#2" (D) in C
 *   phrygian dominant, whose root the old reading got wrong. Observed 21: the
 *   prediction missed the 14 labels on the degree 7 ("7" or "b7": A, A# or B
 *   depending on the mode), whose root was right but whose type the old
 *   reading made a dominant seventh — VMU-158 again.
 * Everything else is green before and after: unaltered degrees, the other
 * styles, the Dictionary's chords, the type marks read back.
 */

const PC = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const TYPE = { "": "chord_major", m: "chord_minor", dim: "chord_dim", 7: "chord_7", m7: "chord_m7", maj7: "chord_maj7", m7b5: "chord_m7b5" };

/** "Bbm" → { rootPc: 10, type: "chord_minor" }. */
function chord(name) {
  const [, root, suffix] = /^([A-G][#b]?)(.*)$/.exec(name);
  expect(PC[root], `root of ${name}`).toBeDefined();
  expect(TYPE[suffix], `type of ${name}`).toBeDefined();
  return { rootPc: PC[root], type: TYPE[suffix] };
}

/** The chords of a progression through the timeline (playback, export, audio harness). */
function viaTimeline(key, progression) {
  return chordsFromProgression(key, progression)
    .slice(0, progression.length)
    .map(({ rootPc, type }) => ({ rootPc, type }));
}

/** The chords of a progression as the Studio's chord buttons resolve them (StudioPanel + useStudioPlayback). */
function viaStudioButtons(key, progression) {
  return generateChordsFromNNS(key.rootValue, key.scaleKey, progression).map((c) => ({
    rootPc: c.rootNote.value,
    type: resolveNnsToChordType(c.nns),
  }));
}

const C = (scaleKey) => ({ rootValue: 0, scaleKey });

describe("VMU-157/158 — the rule, tonic C (predicted red: every row)", () => {
  // [symbol, scale, expected chord]
  const ROWS = [
    ["b2", "scale_phrygian", "Db"],
    ["b2", "scale_locrian", "Db"],
    ["b2", "scale_phrygian_dominant", "Db"],
    ["b3", "scale_dorian", "Eb"],
    ["b3", "scale_locrian", "Eb"],
    ["b3", "scale_minor", "Eb"],
    ["b5", "scale_phrygian", "Gb"],
    ["b6", "scale_phrygian", "Ab"],
    ["b6", "scale_phrygian_dominant", "Ab"],
    ["b6", "scale_minor", "Ab"],
    ["b7", "scale_mixolydian", "Bb"],
    ["b7", "scale_minor", "Bb"],
    ["b7", "scale_dorian", "Bb"],
    ["b7m", "scale_phrygian_dominant", "Bbm"],
    ["7", "scale_dorian", "Bb"],
    ["7", "scale_minor", "Bb"],
    ["ii7", "scale_major", "Dm7"],
    ["vi7", "scale_major", "Am7"],
    ["IMaj7", "scale_major", "Cmaj7"],
    ["IVMaj7", "scale_major", "Fmaj7"],
  ];
  it.each(ROWS)("%s in C %s is %s", (symbol, scaleKey, expected) => {
    expect(viaTimeline(C(scaleKey), [symbol])).toEqual([chord(expected)]);
    expect(viaStudioButtons(C(scaleKey), [symbol])).toEqual([chord(expected)]);
  });
});

describe("VMU-157/158 — what does not change (green before and after)", () => {
  const ROWS = [
    // Unaltered degrees are read in the mode.
    ["1", "scale_major", "C"],
    ["4", "scale_major", "F"],
    ["5", "scale_major", "G"],
    ["2-", "scale_major", "Dm"],
    ["6-", "scale_major", "Am"],
    ["6", "scale_minor", "Ab"],
    ["4", "scale_lydian", "F#"],
    ["5", "scale_mixolydian", "G"],
    ["1°", "scale_locrian", "Cdim"],
    ["4m", "scale_phrygian_dominant", "Fm"],
    ["4-", "scale_minor", "Fm"],
    // "b5" in locrian is the mode's own fifth: the same pitch either way.
    ["b5", "scale_locrian", "Gb"],
    // Roman numerals whose type was already read right.
    ["I", "scale_major", "C"],
    ["V", "scale_major", "G"],
    ["vi", "scale_major", "Am"],
    ["IV", "scale_major", "F"],
    ["V7", "scale_major", "G7"],
    ["iim7b5", "scale_major", "Dm7b5"],
    ["V7alt", "scale_major", "G7"],
    ["im7", "scale_major", "Cm7"],
    ["iiim7", "scale_major", "Em7"],
    ["vim7", "scale_major", "Am7"],
  ];
  it.each(ROWS)("%s in C %s is %s", (symbol, scaleKey, expected) => {
    expect(viaTimeline(C(scaleKey), [symbol])).toEqual([chord(expected)]);
    expect(viaStudioButtons(C(scaleKey), [symbol])).toEqual([chord(expected)]);
  });
});

// Every style, both themes: [id, key as written in bricks.json, symbols, expected chords].
// Styles 0-4 have no variation (theme B plays theme A).
const STYLES = [
  ["0:A", "C scale_major", "1 5 6- 4", "C G Am F"],
  ["1:A", "G scale_mixolydian", "1 4 5 4", "G C D C"],
  ["2:A", "D scale_major", "1 6- 4 5", "D Bm G A"],
  ["3:A", "E scale_dorian", "1- 4 1- 4", "Em A Em A"],
  ["4:A", "D scale_dorian", "2- 5 1 1", "Em A D D"],
  ["5:A", "C scale_major", "1 5 4 1", "C G F C"],
  ["5:B", "C scale_major", "1 6- 4 5", "C Am F G"],
  ["6:A", "D scale_dorian", "1- 6 7 1-", "Dm B C Dm"],
  ["6:B", "D scale_dorian", "1- b3 4 5", "Dm F G A"],
  ["7:A", "E scale_phrygian", "1 b2 b6 5", "E F C B"],
  ["7:B", "E scale_phrygian", "1 b5 4 b2", "E Bb A F"],
  ["8:A", "G scale_major", "1 4 5 4", "G C D C"],
  ["8:B", "G scale_major", "1 2- 5 1", "G Am D G"],
  ["9:A", "F scale_lydian", "1 1 4 1", "F F B F"],
  ["9:B", "F scale_lydian", "1 5 4 1", "F C B F"],
  ["10:A", "C# scale_minor", "1- 4- 5- 1-", "C#m F#m G#m C#m"],
  ["10:B", "C# scale_minor", "1- 6 7 1-", "C#m A B C#m"],
  ["11:A", "D# scale_phrygian", "1 b2 1 b2", "Eb E Eb E"],
  ["11:B", "D# scale_phrygian", "1 1 b6 5", "Eb Eb B Bb"],
  ["12:A", "E scale_dorian", "1- 4 1- 4", "Em A Em A"],
  ["12:B", "E scale_dorian", "1- 1- 2- 5", "Em Em F#m B"],
  ["13:A", "A scale_mixolydian", "1 4 5 4", "A D E D"],
  ["13:B", "A scale_mixolydian", "1 b7 4 1", "A G D A"],
  ["14:A", "D scale_lydian", "1 2 4 5", "D E G# A"],
  ["14:B", "D scale_lydian", "1 3- 4 2", "D F#m G# E"],
  ["15:A", "F# scale_minor", "1- 7 6 7", "F#m E D E"],
  ["15:B", "F# scale_minor", "1- 4- 5- 1-", "F#m Bm C#m F#m"],
  ["16:A", "E scale_locrian", "1° b2 b5 1°", "Edim F Bb Edim"],
  ["16:B", "E scale_locrian", "1° b5 b3 b2", "Edim Bb G F"],
  ["17:A", "D scale_phrygian_dominant", "1 b2 1 4m", "D Eb D Gm"],
  ["17:B", "D scale_phrygian_dominant", "1 b7m b6 5", "D Cm Bb A"],
  ["18:A", "C scale_major", "1 5 6- 4", "C G Am F"],
  ["18:B", "C scale_major", "6- 4 1 5", "Am F C G"],
  ["19:A", "E scale_dorian", "1- 4 1- 4", "Em A Em A"],
  ["19:B", "E scale_dorian", "1- b3 4 5", "Em G A B"],
  ["20:A", "A scale_mixolydian", "1 4 1 5", "A D A E"],
  ["20:B", "A scale_mixolydian", "1 b7 4 1", "A G D A"],
  ["21:A", "G scale_major", "2- 5 1 1", "Am D G G"],
  ["21:B", "G scale_major", "1 6- 2- 5", "G Em Am D"],
  ["22:A", "D scale_dorian", "2- 5 1 6-", "Em A D Bm"],
  ["22:B", "D scale_dorian", "1 6- 2- 5", "D Bm Em A"],
  ["23:A", "D scale_minor", "1- b3 4 5", "Dm F G A"],
  ["23:B", "D scale_minor", "1- b7 b6 5", "Dm C Bb A"],
  ["24:A", "A# scale_minor", "1- 4- b7 1-", "Bbm Ebm Ab Bbm"],
  ["24:B", "A# scale_minor", "1- b3 b6 5", "Bbm Db Gb F"],
  ["25:A", "E scale_mixolydian", "1 4 1 4", "E A E A"],
  ["25:B", "E scale_mixolydian", "1 b7 4 1", "E D A E"],
  ["26:A", "A scale_dorian", "1- 4- b7 1-", "Am Dm G Am"],
  ["26:B", "A scale_dorian", "1- b3 b7 4", "Am C G D"],
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

describe("VMU-157/158 — every style, both themes", () => {
  it("covers every style, and every variation there is", () => {
    const expectedIds = BRICKS.flatMap((brick, i) => [`${i}:A`, ...(brick.nnsProgressionVariation ? [`${i}:B`] : [])]);
    expect(STYLES.map(([id]) => id)).toEqual(expectedIds);
  });

  it.each(STYLES)("%s (%s) %s plays %s", (id, keyText, symbols, expected) => {
    const [index, theme] = id.split(":");
    const brick = BRICKS[Number(index)];
    const progression = theme === "B" ? brick.nnsProgressionVariation : brick.nnsProgression;
    // The table is the data: key and symbols as bricks.json writes them.
    expect(`${NOTE_NAMES[brick.rootValue]} ${brick.scaleKey}`).toBe(keyText);
    expect(progression.join(" ")).toBe(symbols);

    const key = { rootValue: brick.rootValue, scaleKey: brick.scaleKey };
    const chords = expected.split(" ").map(chord);
    expect(viaTimeline(key, progression)).toEqual(chords);
    expect(viaStudioButtons(key, progression)).toEqual(chords);
  });
});

describe("VMU-157/158 — every Quick Start, in C major (the default style's key)", () => {
  const QUICK_STARTS = [
    ["jazz_251_maj", "ii7 V7 IMaj7", "Dm7 G7 Cmaj7"],
    ["jazz_251_min", "iim7b5 V7alt im7", "Dm7b5 G7 Cm7"],
    ["pop_1564", "I V vi IV", "C G Am F"],
    ["jazz_turnaround", "IMaj7 vi7 ii7 V7", "Cmaj7 Am7 Dm7 G7"],
    ["rnb_436", "IVMaj7 iiim7 vim7", "Fmaj7 Em7 Am7"],
  ];

  it("covers every Quick Start", () => {
    expect(QUICK_STARTS.map(([id]) => id)).toEqual(extendedTheoryData.axiomRules.progressions.map((p) => p.id));
  });

  it.each(QUICK_STARTS)("%s: %s plays %s", (id, symbols, expected) => {
    const { degrees, rootIntervals } = extendedTheoryData.axiomRules.progressions.find((p) => p.id === id);
    expect(degrees.join(" ")).toBe(symbols);
    const chords = expected.split(" ").map(chord);
    expect(viaTimeline(C("scale_major"), degrees)).toEqual(chords);
    expect(viaStudioButtons(C("scale_major"), degrees)).toEqual(chords);
    // The data's own record of the intended roots agrees, in C major.
    expect(chords.map((c) => c.rootPc)).toEqual(rootIntervals);
  });
});

describe("VMU-157/158 — the degree shown for a chord without a label reads back as that chord", () => {
  const MODES = [
    "scale_major",
    "scale_minor",
    "scale_dorian",
    "scale_phrygian",
    "scale_lydian",
    "scale_mixolydian",
    "scale_locrian",
    "scale_phrygian_dominant",
  ];
  const CASES = MODES.flatMap((scaleKey) => NOTE_NAMES.map((name, rootPc) => [scaleKey, name, rootPc]));

  it.each(CASES)("C %s: %s major", (scaleKey, name, rootPc) => {
    const key = C(scaleKey);
    const { nns } = describeChord(key, { rootPc, type: "chord_major", durationSteps: 16 });
    // A root no degree label can name in this key is shown by its note name.
    if (!/^[#b]?[1-7]/.test(nns)) return;
    expect(viaTimeline(key, [nns]), `label "${nns}"`).toEqual([{ rootPc, type: "chord_major" }]);
  });

  it("every chord type shown for a chord without a label reads back as that type", () => {
    for (const type of Object.keys(CHORDS)) {
      for (const key of [C("scale_major"), C("scale_minor"), null]) {
        const { nns } = describeChord(key, { rootPc: 0, type, durationSteps: 16 });
        expect(resolveNnsToChordType(nns), `${type} shown as "${nns}"`).toBe(type);
      }
    }
  });
});

describe("VMU-157/158 — the Dictionary's chords do not change (green before and after)", () => {
  it("absolute pitches of a few Dictionary chords", () => {
    expect(getChordAbsolute(0, "chord_major", 4)).toEqual([60, 64, 67]);
    expect(getChordAbsolute(9, "chord_minor", 4)).toEqual([69, 72, 76]);
    expect(getChordAbsolute(7, "chord_7", 4)).toEqual([67, 71, 74, 77]);
    expect(getChordAbsolute(0, "chord_maj7", 4)).toEqual([60, 64, 67, 71]);
    expect(getChordAbsolute(2, "chord_m7", 4)).toEqual([62, 65, 69, 72]);
    expect(getChordAbsolute(11, "chord_m7b5", 3)).toEqual([59, 62, 65, 69]);
    expect(getChordAbsolute(4, "chord_dim", 4)).toEqual([64, 67, 70]);
  });

  it("chord types and short names round-trip", () => {
    for (const type of Object.keys(CHORDS)) {
      expect(resolveChordSemitones(type)).toBe(CHORDS[type]);
      for (const rootValue of [0, 5, 10]) {
        expect(resolveChordFromShortName(getChordShortName(rootValue, type))).toEqual({ rootValue, dictType: type });
      }
    }
    expect(resolveChordFromShortName("Dm7")).toEqual({ rootValue: 2, dictType: "chord_m7" });
    expect(resolveChordFromShortName("CMaj7")).toEqual({ rootValue: 0, dictType: "chord_maj7" });
    expect(resolveChordFromShortName("G7")).toEqual({ rootValue: 7, dictType: "chord_7" });
  });
});
