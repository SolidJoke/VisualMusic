// INST-B1 — MEASURE (a deliverable, not a fix): how many notes each scale
// position actually realizes, for the 12 roots x every scale of the catalog
// (theory.js SCALES) x {guitar, bass}, standard tuning. A position with fewer
// than 5 notes is flagged. The positions are listPlacements' (core/
// placements.js), realized by the same function the app plays and lights
// (realization.js realizeDictionarySelection).
//
// The shapes are fingeringLogic.js's (VMU-115): this file only measures them.
// It pins the counts so that a change of the shapes shows here.
//
// Print the full table:  B1_MEASURE=1 npx vitest run src/core/__tests__/placementsMeasure.test.js
import { describe, it, expect } from "vitest";
import process from "node:process";
import { listPlacements, isOutsideTessitura, tessitura } from "../placements";
import { realizeDictionarySelection } from "../realization";
import { SCALES, CHORDS, NOTES } from "../theory";
import { TUNINGS } from "../tunings";

const INSTRUMENTS = [
  { id: "guitar", tuning: TUNINGS.GUITAR_STANDARD, notation: "us" },
  { id: "bass", tuning: TUNINGS.BASS_STANDARD, notation: "us" },
];
const ROOTS = Array.from({ length: 12 }, (_, i) => i);
const SCALE_TYPES = Object.keys(SCALES);
const FLAG_BELOW = 5;

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
  it("covers 12 roots x every catalog scale x guitar and bass, five positions each", () => {
    expect(SCALE_TYPES.length).toBe(18);
    expect(ROWS.length).toBe(12 * 18 * 2 * 5);
  });

  it("counts measured on 0883c0b + INST-B1: guitar 0 of 1080 positions below 5 notes; bass 212 of 1080, 60 of them the box shown by default at octave 0", () => {
    const flagged = (id) => ROWS.filter((r) => r.instrument === id && r.count < FLAG_BELOW);
    expect(flagged("guitar")).toHaveLength(0);
    expect(flagged("bass")).toHaveLength(212);
    expect(flagged("bass").filter((r) => r.isDefault0)).toHaveLength(60);
    // Every guitar box holds one octave of its scale, root to root: 8 notes
    // for a 7-note scale, 6 for a pentatonic, 13 for the chromatic.
    const guitarCounts = (type) => [...new Set(ROWS.filter((r) => r.instrument === "guitar" && r.type === type).map((r) => r.count))];
    expect(guitarCounts("scale_major")).toEqual([8]);
    expect(guitarCounts("scale_pentatonic_minor")).toEqual([6]);
    expect(guitarCounts("scale_chromatic")).toEqual([13]);
  });

  it("finding 1 CONFIRMED — bass, Do major, octave 0, default position: two notes only, C3 D3 (48 50)", () => {
    const bass = INSTRUMENTS[1];
    const list = listPlacements({ type: "scale_major", root: 0, octave: 0 }, bass);
    const shown = list.find((p) => p.isDefault);
    expect(shown.index).toBe(2);
    expect(realized(shown, bass, 0).map((n) => n.absoluteValue)).toEqual([48, 50]);
  });

  it("finding 2 CONFIRMED — guitar, Do major, default position: 8 cells on strings 2 to 5, none on the high E (0) or the B (1)", () => {
    const guitar = INSTRUMENTS[0];
    const shown = listPlacements({ type: "scale_major", root: 0, octave: 0 }, guitar).find((p) => p.isDefault);
    expect(shown.fingering.scaleFrets).toHaveLength(8);
    expect([...new Set(shown.fingering.scaleFrets.map((c) => c.stringIndex))].sort()).toEqual([2, 3, 4, 5]);
    // One octave, root to root: C3..C4 — fingeringLogic.js cuts every box from
    // its lowest root to the next one.
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
