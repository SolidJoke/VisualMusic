// INST-B1 — core/placements.js: the ordered list of positions of a selection
// on one instrument, the C-06 link made explicit, the tessitura of a tuning.
//
// Domain values, standard tuning (guitar E2 A2 D3 G3 B3 E4 = MIDI 40 45 50 55
// 59 64, bass E1 A1 D2 G2 = 28 33 38 43; C4 = 60), frets counted from the nut
// (0 = open string):
//   Do majeur, guitar — open shape x32010 (frets 0-3, sounds C3..E4 = 48..64);
//     A shape barred at fret 3 (x35553, 3-5, 48..67); E shape at fret 8
//     (8 10 10 9 8 8, 8-10, 48..72); D shape at fret 10 (xx 10 12 13 12,
//     10-13, 60..76).
//   Do majeur, bass — root, fifth, octave: on the A string fret 3 (3-5,
//     C2 G2 C3 = 36 43 48); on the E string fret 8 (8-10, 36 43 48); on the D
//     string fret 10 (10-12, root and fifth only: 48 55).
//   Do major scale, guitar — five boxes starting at frets 0, 2, 4, 6, 8, each
//     one octave C3..C4 (48..60).
//   Note C4 (60), guitar — B string fret 1, G 5, D 10, A 15, low E 20.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listPlacements,
  resolvePlacement,
  scalePositionForOctave,
  octaveClearsPlacement,
  tessitura,
  isOutsideTessitura,
} from "../placements";
import { getGuitarFingering, getBassFingering, INSTRUMENT_RANGES } from "../fingeringLogic";
import { SCALES, CHORDS } from "../theory";
import { TUNINGS } from "../tunings";

const GUITAR = { id: "guitar", tuning: TUNINGS.GUITAR_STANDARD, notation: "us" };
const BASS = { id: "bass", tuning: TUNINGS.BASS_STANDARD, notation: "us" };
const shape = (p) => ({ index: p.index, id: p.id, label: p.label, lowFret: p.lowFret, highFret: p.highFret, range: p.range, isDefault: p.isDefault });

describe("listPlacements — chords, from the nut to the body", () => {
  it("Do majeur, guitar: open (0-3), A shape (3-5), E shape (8-10), D shape (10-13)", () => {
    const list = listPlacements({ type: "chord_major", root: 0, octave: 0 }, GUITAR);
    expect(list.map(shape)).toEqual([
      { index: 0, id: "open", label: "Open", lowFret: 0, highFret: 3, range: { low: 48, high: 64 }, isDefault: true },
      { index: 1, id: 4, label: "A-shape (fr. 3)", lowFret: 3, highFret: 5, range: { low: 48, high: 67 }, isDefault: false },
      { index: 2, id: 5, label: "E-shape (fr. 8)", lowFret: 8, highFret: 10, range: { low: 48, high: 72 }, isDefault: false },
      { index: 3, id: 3, label: "D-shape (fr. 10)", lowFret: 10, highFret: 13, range: { low: 60, high: 76 }, isDefault: false },
    ]);
  });

  it("Do majeur, bass: A string (3-5), E string (8-10), D string (10-12)", () => {
    const list = listPlacements({ type: "chord_major", root: 0, octave: 0 }, BASS);
    expect(list.map(shape)).toEqual([
      { index: 0, id: 2, label: "String A", lowFret: 3, highFret: 5, range: { low: 36, high: 48 }, isDefault: true },
      { index: 1, id: 3, label: "String E", lowFret: 8, highFret: 10, range: { low: 36, high: 48 }, isDefault: false },
      { index: 2, id: 1, label: "String D", lowFret: 10, highFret: 12, range: { low: 48, high: 55 }, isDefault: false },
    ]);
  });

  it("the latin notation names the shapes and strings the way the page does (Mi-shape, Corde La)", () => {
    expect(listPlacements({ type: "chord_major", root: 0 }, { ...GUITAR, notation: "eu" }).map((p) => p.label))
      .toEqual(["Open", "La-shape (fr. 3)", "Mi-shape (fr. 8)", "Ré-shape (fr. 10)"]);
    expect(listPlacements({ type: "chord_major", root: 0 }, { ...BASS, notation: "eu" }).map((p) => p.label))
      .toEqual(["Corde La", "Corde Mi", "Corde Ré"]);
  });

  it("the octave does not move a shape: the same entries at every octave, only the default changes", () => {
    const at0 = listPlacements({ type: "chord_major", root: 0, octave: 0 }, GUITAR);
    for (let octave = -3; octave <= 3; octave++) {
      const list = listPlacements({ type: "chord_major", root: 0, octave }, GUITAR);
      expect(list.map(({ index, id, label, lowFret, highFret, range }) => ({ index, id, label, lowFret, highFret, range })))
        .toEqual(at0.map(({ index, id, label, lowFret, highFret, range }) => ({ index, id, label, lowFret, highFret, range })));
      expect(list.map((p) => p.fingering.fingeringMap)).toEqual(at0.map((p) => p.fingering.fingeringMap));
    }
    // Octave 0 shows the open shape; any other octave the A shape (fret 3).
    expect(listPlacements({ type: "chord_major", root: 0, octave: 2 }, GUITAR).find((p) => p.isDefault).id).toBe(4);
  });

  it("'Fondamentale sur' chooses the default: E string -> the E shape, D string -> the D shape", () => {
    const def = (rootString, instrument = GUITAR) => listPlacements({ type: "chord_major", root: 0, rootString }, instrument).find((p) => p.isDefault).id;
    expect(def(null)).toBe("open");
    expect(def(5)).toBe(5);
    expect(def(4)).toBe(4);
    expect(def(3)).toBe(3);
    expect(def(3, BASS)).toBe(3);
    expect(def(1, BASS)).toBe(1);
  });

  it("a tie on the frets keeps the shapes' own order: Mi majeur, open shape before the E shape at fret 0", () => {
    const list = listPlacements({ type: "chord_major", root: 4 }, GUITAR);
    expect(list.map((p) => `${p.id} ${p.lowFret}-${p.highFret}`)).toEqual(["open 0-2", "5 0-2", "3 2-5", "4 7-9"]);
  });
});

describe("listPlacements — scales and single notes", () => {
  it("Do major scale, guitar: five boxes, first frets 0 2 4 7 8, each one octave C3..C4", () => {
    const list = listPlacements({ type: "scale_major", root: 0, octave: 0 }, GUITAR);
    expect(list.map((p) => [p.id, p.lowFret, p.highFret, p.range.low, p.range.high])).toEqual([
      ["pos_0", 0, 3, 48, 60],
      ["pos_2", 2, 5, 48, 60],
      ["pos_4", 4, 8, 48, 60],
      ["pos_6", 7, 10, 48, 60],
      ["pos_8", 8, 12, 48, 60],
    ]);
    expect(list.map((p) => p.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it("Do major scale, bass: the third box holds two notes only (C3 D3)", () => {
    const list = listPlacements({ type: "scale_major", root: 0, octave: 0 }, BASS);
    expect(list.map((p) => [p.id, p.lowFret, p.highFret])).toEqual([
      ["pos_0", 0, 3], ["pos_2", 2, 5], ["pos_4", 5, 7], ["pos_6", 7, 9], ["pos_8", 8, 12],
    ]);
    expect(list[2].range).toEqual({ low: 48, high: 50 });
  });

  it("a scale's default box is the one the octave picks (C-06): -3 first, 0 third, +3 last", () => {
    const def = (octave) => listPlacements({ type: "scale_major", root: 0, octave }, GUITAR).find((p) => p.isDefault).index;
    expect([-3, -2, -1, 0, 1, 2, 3].map(def)).toEqual([0, 1, 1, 2, 3, 3, 4]);
  });

  it("the box follows the style's tuning (Drop D lowers the low string)", () => {
    const std = listPlacements({ type: "scale_major", root: 2 }, GUITAR);
    const dropD = listPlacements({ type: "scale_major", root: 2 }, { ...GUITAR, tuning: TUNINGS.GUITAR_DROP_D });
    expect(dropD.map((p) => p.fingering.scaleFrets)).not.toEqual(std.map((p) => p.fingering.scaleFrets));
  });

  it("note C4, guitar: B string fret 1, G 5, D 10, A 15, low E 20 — and no default (every place is lit)", () => {
    const list = listPlacements({ type: "single_note", notePitch: 60 }, GUITAR);
    expect(list.map((p) => [p.id, p.lowFret, p.stringName, p.fret])).toEqual([
      ["note_1_1", 1, "B", 1],
      ["note_2_5", 5, "G", 5],
      ["note_3_10", 10, "D", 10],
      ["note_4_15", 15, "A", 15],
      ["note_5_20", 20, "E", 20],
    ]);
    expect(list.every((p) => p.range.low === 60 && p.range.high === 60)).toBe(true);
    expect(list.some((p) => p.isDefault)).toBe(false);
  });

  it("nothing for the piano, an unknown type, or a note without a pitch", () => {
    expect(listPlacements({ type: "chord_major", root: 0 }, { id: "piano" })).toEqual([]);
    expect(listPlacements({ type: "whatever", root: 0 }, GUITAR)).toEqual([]);
    expect(listPlacements({ type: "single_note", notePitch: null }, GUITAR)).toEqual([]);
  });

  it("an explicit family wins over the type's name (the Studio's chord, whatever its key)", () => {
    expect(listPlacements({ family: "chord", type: "chord_major", root: 0 }, GUITAR)).toHaveLength(4);
  });
});

describe("resolvePlacement", () => {
  const chords = listPlacements({ type: "chord_major", root: 0, octave: 1 }, GUITAR);
  const notes = listPlacements({ type: "single_note", notePitch: 60 }, GUITAR);
  it("an index picks that entry; null or a stale index gives the default", () => {
    expect(resolvePlacement(chords, 2).id).toBe(5);
    expect(resolvePlacement(chords, null).id).toBe(4);
    expect(resolvePlacement(chords, 9).id).toBe(4);
    expect(resolvePlacement(chords, "open").id).toBe(4);
  });
  it("a note has no default: null stays null", () => {
    expect(resolvePlacement(notes, null)).toBeNull();
    expect(resolvePlacement(notes, 0).id).toBe("note_1_1");
    expect(resolvePlacement([], 0)).toBeNull();
  });
});

describe("listPlacements — the whole catalog", () => {
  const roots = Array.from({ length: 12 }, (_, i) => i);
  const chordTypes = Object.keys(CHORDS);
  const scaleTypes = Object.keys(SCALES);

  it("every chord list is ordered from the nut (lowest fret, then highest fret)", () => {
    for (const instrument of [GUITAR, BASS]) {
      for (const root of roots) {
        for (const type of chordTypes) {
          const list = listPlacements({ type, root }, instrument);
          for (let i = 1; i < list.length; i++) {
            const a = list[i - 1];
            const b = list[i];
            expect(a.lowFret < b.lowFret || (a.lowFret === b.lowFret && a.highFret <= b.highFret), `${instrument.id} ${root} ${type}`).toBe(true);
          }
        }
      }
    }
  });

  it("the default shape of a chord is exactly the one shown today (getGuitarFingering / getBassFingering), for every root, type, octave and 'Fondamentale sur'", () => {
    let checked = 0;
    for (const root of roots) {
      for (const type of chordTypes) {
        for (let octave = -3; octave <= 3; octave++) {
          for (const rootString of [null, 5, 4, 3]) {
            const list = listPlacements({ type, root, octave, rootString }, GUITAR);
            const defaults = list.filter((p) => p.isDefault);
            expect(defaults, `guitar ${root} ${type} ${octave} ${rootString}`).toHaveLength(1);
            expect(defaults[0].fingering.fingeringMap).toEqual(getGuitarFingering(root, type, rootString, octave).fingeringMap);
            checked++;
          }
          for (const rootString of [null, 3, 2, 1]) {
            const list = listPlacements({ type, root, octave, rootString }, BASS);
            const defaults = list.filter((p) => p.isDefault);
            expect(defaults, `bass ${root} ${type} ${octave} ${rootString}`).toHaveLength(1);
            expect(defaults[0].fingering.fingeringMap).toEqual(getBassFingering(root, type, rootString, octave).fingeringMap);
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(12 * chordTypes.length * 7 * 8);
  });

  it("scale boxes keep their order (by first fret of the window), so C-06 still picks the same box", () => {
    for (const instrument of [GUITAR, BASS]) {
      for (const root of roots) {
        for (const type of scaleTypes) {
          const list = listPlacements({ type, root }, instrument);
          const starts = list.map((p) => p.fingering.startFret);
          expect(starts, `${instrument.id} ${root} ${type}`).toEqual([...starts].sort((a, b) => a - b));
          expect(list.map((p) => p.lowFret)).toEqual([...list.map((p) => p.lowFret)].sort((a, b) => a - b));
        }
      }
    }
  });
});

describe("C-06, made explicit: the common octave picks a scale box", () => {
  it("five boxes: -3 -> 0, -2 -> 1, -1 -> 1, 0 -> 2, +1 -> 3, +2 -> 3, +3 -> 4", () => {
    expect([-3, -2, -1, 0, 1, 2, 3].map((o) => scalePositionForOctave(o, 5))).toEqual([0, 1, 1, 2, 3, 3, 4]);
  });
  it("clamped beyond +-3, a single box is always the first, no box gives null", () => {
    expect(scalePositionForOctave(-7, 5)).toBe(0);
    expect(scalePositionForOctave(9, 5)).toBe(4);
    expect([-3, 0, 3].map((o) => scalePositionForOctave(o, 1))).toEqual([0, 0, 0]);
    expect([-3, 0, 3].map((o) => scalePositionForOctave(o, 3))).toEqual([0, 1, 2]);
    expect(scalePositionForOctave(0, 0)).toBeNull();
  });
  it("the octave clears a chosen placement for a scale (C-06) and a note (the octave is the note), not for a chord", () => {
    expect(octaveClearsPlacement("scale_major")).toBe(true);
    expect(octaveClearsPlacement("single_note")).toBe(true);
    expect(octaveClearsPlacement("chord_major")).toBe(false);
  });

  it("the conversion is called at one place only, and the old inline formula is gone from the hooks", () => {
    const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "__tests__") walk(full); }
        else if (/\.jsx?$/.test(e.name)) files.push(full);
      }
    };
    walk(SRC);
    const calls = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf-8");
      for (const m of src.matchAll(/scalePositionForOctave\s*\(/g)) {
        const before = src.slice(Math.max(0, m.index - 9), m.index);
        if (!before.includes("function")) calls.push(path.relative(SRC, f).replace(/\\/g, "/"));
      }
      if (f.includes(`${path.sep}hooks${path.sep}`)) expect(src.includes("(octaveNorm + 3) / 6"), f).toBe(false);
    }
    expect(calls).toEqual(["core/placements.js"]);
  });
});

describe("tessitura — the pitches a tuning reaches", () => {
  it("standard tunings: exactly INSTRUMENT_RANGES (guitar E2..D6 = 40..86, bass E1..F4 = 28..65)", () => {
    expect(tessitura("guitar", TUNINGS.GUITAR_STANDARD)).toEqual({ min: 40, max: 86 });
    expect(tessitura("bass", TUNINGS.BASS_STANDARD)).toEqual({ min: 28, max: 65 });
    expect(tessitura("guitar", TUNINGS.GUITAR_STANDARD)).toEqual(INSTRUMENT_RANGES.guitar);
    expect(tessitura("bass", TUNINGS.BASS_STANDARD)).toEqual(INSTRUMENT_RANGES.bass);
  });
  it("Drop D reaches D2 (38)", () => {
    expect(tessitura("guitar", TUNINGS.GUITAR_DROP_D)).toEqual({ min: 38, max: 86 });
  });
  it("a note below or above the tessitura is outside; its edges are inside", () => {
    const std = tessitura("guitar", TUNINGS.GUITAR_STANDARD);
    expect(isOutsideTessitura([{ absoluteValue: 38 }], std)).toBe(true);
    expect(isOutsideTessitura([40, 86], std)).toBe(false);
    expect(isOutsideTessitura([87], std)).toBe(true);
    expect(isOutsideTessitura([{ absoluteValue: 38 }], tessitura("guitar", TUNINGS.GUITAR_DROP_D))).toBe(false);
    expect(isOutsideTessitura([], std)).toBe(false);
  });
});
