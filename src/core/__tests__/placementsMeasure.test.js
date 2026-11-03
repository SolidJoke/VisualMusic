// INST-B1 — MEASURE (a deliverable, not a fix): how many notes each scale
// position actually realizes, for the 12 roots x every scale of the catalog
// (theory.js SCALES) x {guitar, bass}, standard tuning. A position with fewer
// than 5 notes is flagged. The positions are listPlacements' (core/
// placements.js), realized by the same function the app plays and lights
// (realization.js realizeDictionarySelection).
//
// VMU-202: the shapes are now the scale-position engine's (core/scalePositions.js)
// — one complete octave each, so no position is flagged. This file pins that
// invariant so a change of the engine shows here.
//
// Print the full table:  B1_MEASURE=1 npx vitest run src/core/__tests__/placementsMeasure.test.js
import { describe, it, expect } from "vitest";
import process from "node:process";
import { listPlacements, isOutsideTessitura, tessitura } from "../placements";
import { realizeDictionarySelection } from "../realization";
import { SCALES, CHORDS, NOTES, resolveScaleSemitones } from "../theory";
import { TUNINGS } from "../tunings";

const INSTRUMENTS = [
  { id: "guitar", tuning: TUNINGS.GUITAR_STANDARD, notation: "us" },
  { id: "bass", tuning: TUNINGS.BASS_STANDARD, notation: "us" },
];
const ROOTS = Array.from({ length: 12 }, (_, i) => i);
const SCALE_TYPES = Object.keys(SCALES);
const FLAG_BELOW = 5;
// VMU-202: a position is one complete octave, so it realizes N+1 notes (N =
// the scale's intervals): 8 for a heptatonic scale, 6 for a pentatonic, 13 for
// the chromatic.
const OCTAVE_NOTES = Object.fromEntries(SCALE_TYPES.map((t) => [t, resolveScaleSemitones(t).length + 1]));

function realized(placement, instrument, root) {
  return realizeDictionarySelection({
    instrument: instrument.id,
    fingering: placement.fingering,
    tuning: instrument.tuning,
    rootPitchClass: root,
    theoreticalNotes: [],
  }).notes;
}

/** rows: { instrument, type, root, index, count, isDefault0, strings } */
function measure() {
  const rows = [];
  for (const instrument of INSTRUMENTS) {
    for (const type of SCALE_TYPES) {
      for (const root of ROOTS) {
        const list = listPlacements({ type, root, octave: 0 }, instrument);
        for (const p of list) {
          rows.push({
            instrument: instrument.id,
            type,
            root,
            index: p.index,
            count: realized(p, instrument, root).length,
            isDefault0: p.isDefault,
            strings: [...new Set(p.fingering.scaleFrets.map((c) => c.stringIndex))].sort(),
            lowFret: p.lowFret,
            highFret: p.highFret,
          });
        }
      }
    }
  }
  return rows;
}

const ROWS = measure();

if (process.env.B1_MEASURE) {
  const name = (root) => NOTES[root].us;
  for (const instrument of INSTRUMENTS) {
    console.log(`\n=== ${instrument.id}: notes realized per position (positions 1..5 from the nut), * = fewer than ${FLAG_BELOW}, [ ] = the default at octave 0`);
    console.log(`${"scale".padEnd(24)}${ROOTS.map((r) => name(r).padEnd(16)).join("")}`);
    for (const type of SCALE_TYPES) {
      const cells = ROOTS.map((root) => ROWS
        .filter((r) => r.instrument === instrument.id && r.type === type && r.root === root)
        .map((r) => `${r.isDefault0 ? "[" : ""}${r.count}${r.count < FLAG_BELOW ? "*" : ""}${r.isDefault0 ? "]" : ""}`)
        .join(" ")
        .padEnd(16));
      console.log(`${type.padEnd(24)}${cells.join("")}`);
    }
    const flagged = ROWS.filter((r) => r.instrument === instrument.id && r.count < FLAG_BELOW);
    console.log(`flagged: ${flagged.length} of ${ROWS.filter((r) => r.instrument === instrument.id).length} positions; of which default at octave 0: ${flagged.filter((r) => r.isDefault0).length}`);
    console.log(`flagged list: ${flagged.map((r) => `${name(r.root)} ${r.type.replace("scale_", "")} pos${r.index + 1}=${r.count}${r.isDefault0 ? "(default)" : ""}`).join(", ")}`);
  }
}

describe("MEASURE — notes realized by each scale position (INST-B1)", () => {
  it("covers 12 roots x every catalog scale x guitar and bass, every engine position", () => {
    expect(SCALE_TYPES.length).toBe(18);
    const expected = INSTRUMENTS.reduce((sum, instrument) => {
      for (const type of SCALE_TYPES) {
        for (const root of ROOTS) sum += listPlacements({ type, root }, instrument).length;
      }
      return sum;
    }, 0);
    expect(ROWS.length).toBe(expected);
  });

  it("every position realizes exactly one octave, root to root (N+1 notes), never below 5", () => {
    expect(ROWS.every((r) => r.count === OCTAVE_NOTES[r.type])).toBe(true);
    expect(ROWS.filter((r) => r.count < FLAG_BELOW)).toHaveLength(0);
    // A spot check of the sizes, as the old measure pinned them: major 8,
    // pentatonic minor 6, chromatic 13.
    expect(OCTAVE_NOTES.scale_major).toBe(8);
    expect(OCTAVE_NOTES.scale_pentatonic_minor).toBe(6);
    expect(OCTAVE_NOTES.scale_chromatic).toBe(13);
  });

  it("finding 1 REVISED — bass, Do major, default position: one full octave C2..C3 (36..48), not two notes", () => {
    const bass = INSTRUMENTS[1];
    const list = listPlacements({ type: "scale_major", root: 0, octave: 0 }, bass);
    const shown = list.find((p) => p.isDefault);
    expect(shown.index).toBe(0);
    expect(realized(shown, bass, 0).map((n) => n.absoluteValue)).toEqual([36, 38, 40, 41, 43, 45, 47, 48]);
  });

  it("finding 2 REVISED — guitar, Do major, default position (0-3): 8 cells, one full octave C3..C4", () => {
    const guitar = INSTRUMENTS[0];
    const shown = listPlacements({ type: "scale_major", root: 0, octave: 0 }, guitar).find((p) => p.isDefault);
    expect(shown.fingering.scaleFrets).toHaveLength(8);
    expect(shown.lowFret).toBe(0);
    expect(shown.highFret).toBe(3);
    expect(realized(shown, guitar, 0).map((n) => n.absoluteValue)).toEqual([48, 50, 52, 53, 55, 57, 59, 60]);
  });
});

describe("MEASURE — the out-of-range warning over the whole catalog (INST-B1)", () => {
  it("no chord shape and no scale box of the catalog is outside its instrument's tessitura (standard tuning)", () => {
    const outside = [];
    for (const instrument of INSTRUMENTS) {
      const range = tessitura(instrument.id, instrument.tuning);
      for (const root of ROOTS) {
        for (const type of [...SCALE_TYPES, ...Object.keys(CHORDS)]) {
          for (const p of listPlacements({ type, root }, instrument)) {
            if (isOutsideTessitura(realized(p, instrument, root), range)) outside.push(`${instrument.id} ${root} ${type} ${p.id}`);
          }
        }
      }
    }
    expect(outside).toEqual([]);
  });
});
