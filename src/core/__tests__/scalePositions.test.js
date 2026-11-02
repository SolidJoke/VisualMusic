// VMU-202 — the pure scale-position engine (src/core/scalePositions.js).
//
// Every position of a scale on a neck, numbered 1..N from the nut. A position
// is a fret window of span <= 5 that holds exactly one cell for each of the
// N+1 notes of the octave [startPitch, startPitch + 12]; span 4 is normal,
// span 5 is the grandEcart. Where the scale has no span-<=5 window below the
// first plain position (a "hole"), a single-shift position fills it.
//
// Standard tunings, low -> high (the order getStringTuning returns):
//   guitar E2 A2 D3 G3 B3 E4 = [40, 45, 50, 55, 59, 64]
//   bass   E1 A1 D2 G2       = [28, 33, 38, 43]
// stringIndex 0 = highest string, the indexing scaleFrets already uses.
import { describe, it, expect } from "vitest";
import {
  listScalePositions,
  availableStartPitches,
  positionAtFret,
  railLanes,
  defaultPositionIndex,
} from "../scalePositions";

const GUITAR = [40, 45, 50, 55, 59, 64];
const BASS = [28, 33, 38, 43];
// String letters (low -> high) -> stringIndex (0 = highest string).
const GUITAR_SI = { E: 5, A: 4, D: 3, G: 2, B: 1, e: 0 };
const BASS_SI = { E: 3, A: 2, D: 1, G: 0 };

const MAJOR = { semitones: [0, 2, 4, 5, 7, 9, 11], n: 8 };
const PENTA_MINOR = { semitones: [0, 3, 5, 7, 10], n: 6 };

function positions(startPitch, instrument, extra = {}) {
  return listScalePositions({
    scaleType: "scale_major",
    root: 0,
    startPitch,
    instrument,
    tuning: instrument === "guitar" ? GUITAR : BASS,
    numFrets: 22,
    ...extra,
  });
}

function pentatonic(startPitch, instrument) {
  return listScalePositions({
    scaleType: "scale_pentatonic_minor",
    root: 9,
    startPitch,
    instrument,
    tuning: instrument === "guitar" ? GUITAR : BASS,
    numFrets: 22,
  });
}

// "A[3] D[0,2,3] G[0,2 | 4]" -> [{stringIndex, fret}, ...]; "|" marks a shift
// window boundary in the owner's notation and is ignored for the cell set.
function parseCells(spec, si) {
  const out = [];
  for (const m of spec.matchAll(/([A-Za-z])\[([^\]]*)\]/g)) {
    const stringIndex = si[m[1]];
    const frets = m[2]
      .replace(/\|/g, ",")
      .split(",")
      .map(Number)
      .filter(Number.isInteger);
    for (const fret of frets) out.push({ stringIndex, fret });
  }
  return out;
}

const key = (c) => `${c.stringIndex}:${c.fret}`;
const cellKeys = (cells) => cells.map(key).sort();

function expectCells(position, spec, si) {
  expect(cellKeys(position.cells)).toEqual(cellKeys(parseCells(spec, si)));
}

// ---- fixed values, counted twice independently ------------------------------

const GUITAR_C3 = {
  startPitch: 48,
  plain: [
    [0, 3, 4, "A[3] D[0,2,3] G[0,2] B[0,1]"],
    [2, 5, 4, "A[3,5] D[2,3,5] G[2,4,5]"],
    [3, 7, 5, "A[3,5,7] D[3,5,7] G[4,5]"],
    [4, 8, 5, "E[8] A[5,7,8] D[5,7] G[4,5]"],
    [5, 9, 5, "E[8] A[5,7,8] D[5,7,9] G[5]"],
    [7, 10, 4, "E[8,10] A[7,8,10] D[7,9,10]"],
    [8, 12, 5, "E[8,10,12] A[8,10,12] D[9,10]"],
  ],
  shifts: 0,
};

const GUITAR_C4_RANGES = [
  [5, 8, 4], [7, 10, 4], [8, 12, 5], [9, 13, 5], [10, 14, 5],
  [12, 15, 4], [14, 17, 4], [15, 19, 5], [16, 20, 5], [17, 21, 5], [19, 22, 4],
];
const GUITAR_C4_CELLS = {
  "5-8": "G[5,7] B[5,6,8] e[5,7,8]",
  "7-10": "D[10] G[7,9,10] B[8,10] e[7,8]",
  "12-15": "A[15] D[12,14,15] G[12,14] B[12,13]",
  "14-17": "A[15,17] D[14,15,17] G[14,16,17]",
  "19-22": "E[20,22] A[19,20,22] D[19,21,22]",
};

const GUITAR_C5_CELLS = {
  "17-20": "G[17,19] B[17,18,20] e[17,19,20]",
  "19-22": "D[22] G[19,21,22] B[20,22] e[19,20]",
};

const BASS_C2_RANGES = [
  [2, 5, 4], [3, 7, 5], [4, 8, 5], [5, 9, 5], [7, 10, 4], [8, 12, 5],
];

const BASS_C3_RANGES = [
  [14, 17, 4], [15, 19, 5], [16, 20, 5], [17, 21, 5], [19, 22, 4],
];

const PENTA_A3_RANGES = [
  [2, 5, 4], [3, 7, 5], [5, 8, 4], [7, 10, 4], [9, 12, 4],
  [10, 14, 5], [12, 15, 4], [14, 17, 4], [15, 19, 5], [17, 20, 4],
];
const PENTA_A2_RANGES = [
  [0, 3, 4], [2, 5, 4], [3, 7, 5], [5, 8, 4],
];

describe("listScalePositions", () => {
  it("holds exactly the N+1 expected pitches, once each, in every position", () => {
    const cases = [
      ["guitar", 48], ["guitar", 60], ["guitar", 72], ["bass", 36], ["bass", 48],
    ];
    for (const [instrument, startPitch] of cases) {
      const expected = [...MAJOR.semitones.map((d) => startPitch + d), startPitch + 12];
      for (const p of positions(startPitch, instrument)) {
        expect(p.cells.map((c) => c.pitch)).toEqual(expected);
        expect(new Set(p.cells.map((c) => c.pitch)).size).toBe(expected.length);
      }
    }
  });

  it("never spans 6+; span <= 4 has no warning, span 5 is grandEcart", () => {
    for (const [instrument, startPitch] of [["guitar", 48], ["guitar", 60], ["guitar", 72], ["bass", 36], ["bass", 48]]) {
      for (const p of positions(startPitch, instrument)) {
        if (p.shift !== null) continue; // shift spans two windows, handled below
        expect(p.span).toBeLessThanOrEqual(5);
        if (p.span <= 4) expect(p.warning).toBeNull();
        else expect(p.warning).toBe("grandEcart");
      }
    }
  });

  it("has at most one shift, whose windows are span <= 4 and which never fits one window", () => {
    for (const [instrument, startPitch] of [["guitar", 48], ["guitar", 60], ["guitar", 72], ["bass", 36], ["bass", 48]]) {
      const ps = positions(startPitch, instrument);
      const shifts = ps.filter((p) => p.shift !== null);
      expect(shifts.length).toBeLessThanOrEqual(1);
      for (const s of shifts) {
        expect(s.shift.from.hi - s.shift.from.lo).toBeLessThanOrEqual(3);
        expect(s.shift.to.hi - s.shift.to.lo).toBeLessThanOrEqual(3);
        expect(s.shift.distance).toBeGreaterThanOrEqual(1);
        expect(s.shift.distance).toBeLessThanOrEqual(5);
        // A shift position that fits a single span-<=5 window is never kept.
        expect(s.span).toBeGreaterThan(5);
        expect(s.warning).toBeNull();
      }
    }
  });

  it("keeps every cell within 0..numFrets and returns [] for an incomplete octave", () => {
    for (const [instrument, startPitch] of [["guitar", 48], ["guitar", 60], ["guitar", 72], ["bass", 36], ["bass", 48]]) {
      for (const p of positions(startPitch, instrument)) {
        for (const c of p.cells) {
          expect(c.fret).toBeGreaterThanOrEqual(0);
          expect(c.fret).toBeLessThanOrEqual(22);
        }
      }
    }
    expect(positions(36, "guitar")).toEqual([]); // C2: 36 unplayable on the guitar
  });

  it("sorts from the nut (minFret, then maxFret) and numbers positions[i].index === i", () => {
    for (const [instrument, startPitch] of [["guitar", 48], ["guitar", 60], ["guitar", 72], ["bass", 36], ["bass", 48]]) {
      const ps = positions(startPitch, instrument);
      ps.forEach((p, i) => expect(p.index).toBe(i));
      for (let i = 1; i < ps.length; i++) {
        const a = ps[i - 1], b = ps[i];
        expect(a.minFret < b.minFret || (a.minFret === b.minFret && a.maxFret <= b.maxFret)).toBe(true);
      }
    }
  });

  it("matches the fixed guitar C3 values (7 positions, 3 of span 4)", () => {
    const ps = positions(48, "guitar");
    expect(ps.filter((p) => p.shift === null).length).toBe(7);
    expect(ps.filter((p) => p.shift === null && p.span === 4).length).toBe(3);
    expect(ps.filter((p) => p.shift !== null).length).toBe(0);
    GUITAR_C3.plain.forEach(([lo, hi, span, spec], i) => {
      const p = ps[i];
      expect(p.minFret).toBe(lo);
      expect(p.maxFret).toBe(hi);
      expect(p.span).toBe(span);
      expect(p.warning).toBe(span === 5 ? "grandEcart" : null);
      expectCells(p, spec, GUITAR_SI);
    });
  });

  it("matches the fixed guitar C4 values (11 plain ranges and the listed cells)", () => {
    const ps = positions(60, "guitar");
    const plain = ps.filter((p) => p.shift === null);
    expect(plain.length).toBe(11);
    GUITAR_C4_RANGES.forEach(([lo, hi, span], i) => {
      expect(plain[i].minFret).toBe(lo);
      expect(plain[i].maxFret).toBe(hi);
      expect(plain[i].span).toBe(span);
    });
    for (const [range, spec] of Object.entries(GUITAR_C4_CELLS)) {
      const p = plain.find((q) => `${q.minFret}-${q.maxFret}` === range);
      expect(p, range).toBeTruthy();
      expectCells(p, spec, GUITAR_SI);
    }
  });

  it("matches the fixed guitar C5 values (2 plain ranges and cells)", () => {
    const ps = positions(72, "guitar");
    const plain = ps.filter((p) => p.shift === null);
    expect(plain.length).toBe(2);
    expect(plain.map((p) => [p.minFret, p.maxFret, p.span])).toEqual([[17, 20, 4], [19, 22, 4]]);
    for (const [range, spec] of Object.entries(GUITAR_C5_CELLS)) {
      const p = plain.find((q) => `${q.minFret}-${q.maxFret}` === range);
      expectCells(p, spec, GUITAR_SI);
    }
  });

  it("matches the fixed bass C2 and C3 ranges (6 and 5 plain positions)", () => {
    expect(positions(36, "bass").filter((p) => p.shift === null).map((p) => [p.minFret, p.maxFret, p.span]))
      .toEqual(BASS_C2_RANGES);
    expect(positions(48, "bass").filter((p) => p.shift === null).map((p) => [p.minFret, p.maxFret, p.span]))
      .toEqual(BASS_C3_RANGES);
  });

  it("bass C2 = guitar C3 minus the 0-3 position, same cells string by string", () => {
    const bass = positions(36, "bass").filter((p) => p.shift === null);
    const guitar = positions(48, "guitar").filter((p) => p.shift === null);
    expect(bass.length).toBe(guitar.length - 1);
    for (let i = 0; i < bass.length; i++) {
      expect(bass[i].minFret).toBe(guitar[i + 1].minFret);
      expect(bass[i].maxFret).toBe(guitar[i + 1].maxFret);
      // The bass is the guitar's four low strings an octave down: bass string
      // s is the same physical string (G, D, A, E) as guitar string s + 2,
      // and these low positions never reach the guitar's two high strings.
      const bassKeys = bass[i].cells.map((c) => `${c.stringIndex + 2}:${c.fret}`).sort();
      expect(bassKeys).toEqual(cellKeys(guitar[i + 1].cells));
    }
  });

  it("railLanes: positions sharing a fret never share a lane; max lane count 4", () => {
    for (const [instrument, startPitch] of [["guitar", 48], ["guitar", 60], ["bass", 36]]) {
      const ps = positions(startPitch, instrument);
      const lanes = railLanes(ps);
      expect(lanes).toHaveLength(ps.length);
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const share = ps[i].minFret <= ps[j].maxFret && ps[j].minFret <= ps[i].maxFret;
          if (share) expect(lanes[i], `${i} vs ${j}`).not.toBe(lanes[j]);
        }
      }
      expect(Math.max(...lanes) + 1).toBe(4);
    }
  });

  it("positionAtFret picks the most centred position, then the next (cyclic), else null", () => {
    const ps = positions(48, "guitar");
    // fret 5 is in 2-5 (1), 3-7 (2), 4-8 (3), 5-9 (4); most centred is 3-7.
    expect(positionAtFret(ps, 5)).toBe(2);
    expect(positionAtFret(ps, 5, 2)).toBe(3); // next containing 5
    expect(positionAtFret(ps, 5, 4)).toBe(1); // wraps around
    expect(positionAtFret(ps, 13)).toBeNull(); // no position holds fret 13
  });

  it("matches the fixed pentatonic counts and ranges", () => {
    const a3 = pentatonic(57, "guitar").filter((p) => p.shift === null);
    expect(a3.map((p) => [p.minFret, p.maxFret, p.span])).toEqual(PENTA_A3_RANGES);
    const a2 = pentatonic(45, "guitar").filter((p) => p.shift === null);
    expect(a2.map((p) => [p.minFret, p.maxFret, p.span])).toEqual(PENTA_A2_RANGES);
    const a1 = pentatonic(33, "bass").filter((p) => p.shift === null);
    expect(a1.map((p) => [p.minFret, p.maxFret, p.span])).toEqual(PENTA_A2_RANGES);
    // exactness for the pentatonic
    for (const [instrument, startPitch] of [["guitar", 57], ["guitar", 45], ["bass", 33]]) {
      const expected = [...PENTA_MINOR.semitones.map((d) => startPitch + d), startPitch + 12];
      for (const p of pentatonic(startPitch, instrument)) {
        expect(p.cells.map((c) => c.pitch)).toEqual(expected);
      }
    }
  });

  it("rule 3 determinism: in the G/B variant the chosen cell is on the used, lower string", () => {
    const ps = positions(60, "guitar");
    const at = (lo, hi) => ps.find((p) => p.shift === null && p.minFret === lo && p.maxFret === hi);
    // 8-12: G4 (67) exists on G fret 12 and B fret 8 -> G (already used, bass-side).
    const g4 = at(8, 12).cells.find((c) => c.pitch === 67);
    expect(g4.stringIndex).toBe(2);
    expect(g4.fret).toBe(12);
    expect(g4.pitch).toBe(67);
    expect(g4.step).toBe(4);
    // 10-14: A4 (69) exists on G fret 14 and B fret 10 -> G.
    const a4 = at(10, 14).cells.find((c) => c.pitch === 69);
    expect(a4.stringIndex).toBe(2);
    expect(a4.fret).toBe(14);
    expect(a4.pitch).toBe(69);
    expect(a4.step).toBe(5);
  });

  it("guitar C4 has the expected shift position", () => {
    const shift = positions(60, "guitar").find((p) => p.shift !== null);
    expect(shift).toBeTruthy();
    expectCells(shift, "B[1,3] e[0,1,3 | 5,7,8]", GUITAR_SI);
    expect(shift.minFret).toBe(0);
    expect(shift.maxFret).toBe(8);
    expect(shift.warning).toBeNull();
    expect(shift.shift).toEqual({
      afterStep: 4,
      onString: 0, // high e
      from: { lo: 0, hi: 3 },
      to: { lo: 5, hi: 8 },
      distance: 5,
    });
  });

  it("guitar C3 has no shift; guitar C5 and bass C3 have exactly one, as listed", () => {
    expect(positions(48, "guitar").filter((p) => p.shift !== null)).toEqual([]);
    expect(positions(36, "bass").filter((p) => p.shift !== null)).toEqual([]);

    const c5 = positions(72, "guitar").filter((p) => p.shift !== null);
    expect(c5.length).toBe(1);
    expectCells(c5[0], "B[13,15] e[12,13,15 | 17,19,20]", GUITAR_SI);
    expect(c5[0].shift).toEqual({
      afterStep: 4, onString: 0, from: { lo: 12, hi: 15 }, to: { lo: 17, hi: 20 }, distance: 5,
    });

    const b3 = positions(48, "bass").filter((p) => p.shift !== null);
    expect(b3.length).toBe(1);
    expectCells(b3[0], "D[10,12] G[9,10,12 | 14,16,17]", BASS_SI);
    expect(b3[0].shift).toEqual({
      afterStep: 4, onString: 0, from: { lo: 9, hi: 12 }, to: { lo: 14, hi: 17 }, distance: 5,
    });
  });

  it("reading order: cells sorted by pitch, step 0..N, scaleFrets = the same cells", () => {
    const p = positions(48, "guitar")[0];
    expect(p.cells.map((c) => c.pitch)).toEqual([...MAJOR.semitones.map((d) => 48 + d), 60]);
    expect(p.cells.map((c) => c.step)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(p.scaleFrets).toEqual(p.cells.map(({ stringIndex, fret }) => ({ stringIndex, fret })));
    // cells sorted low -> high
    for (let i = 1; i < p.cells.length; i++) {
      expect(p.cells[i].pitch).toBeGreaterThan(p.cells[i - 1].pitch);
    }
  });

  it("availableStartPitches lists the complete octaves with their position counts", () => {
    const guitar = availableStartPitches({ scaleType: "scale_major", root: 0, instrument: "guitar", tuning: GUITAR, numFrets: 22 });
    // positionCount = plain + shift, so 7(+0), 11(+1), 2(+1).
    expect(guitar).toEqual([
      { pitch: 48, label: "C3", positionCount: 7 },
      { pitch: 60, label: "C4", positionCount: 12 },
      { pitch: 72, label: "C5", positionCount: 3 },
    ]);
    const bass = availableStartPitches({ scaleType: "scale_major", root: 0, instrument: "bass", tuning: BASS, numFrets: 22 });
    expect(bass).toEqual([
      { pitch: 36, label: "C2", positionCount: 6 },
      { pitch: 48, label: "C3", positionCount: 6 },
    ]);
  });

  it("defaultPositionIndex: the span-4 position nearest the nut", () => {
    expect(defaultPositionIndex(positions(48, "guitar"))).toBe(0); // 0-3
    // Bass C3: the shift (9-17) sorts first, so 14-17 is index 1.
    expect(defaultPositionIndex(positions(48, "bass"))).toBe(1);
    expect(defaultPositionIndex([])).toBeNull();
  });

  it("fingers: open position reads fret 1..4 as 1..4 and open as 0; span-5 top fret is 4", () => {
    const p = positions(48, "guitar")[0]; // 0-3
    const cell = (si, fret) => p.cells.find((c) => c.stringIndex === si && c.fret === fret);
    expect(cell(GUITAR_SI.A, 3).finger).toBe(3);
    expect(cell(GUITAR_SI.D, 0).finger).toBe(0);
    expect(cell(GUITAR_SI.G, 2).finger).toBe(2);
    expect(cell(GUITAR_SI.B, 1).finger).toBe(1);
    // a span-5 window (3-7): the top fret minFret+4 is the pinky stretch -> 4
    const wide = positions(48, "guitar").find((q) => q.shift === null && q.minFret === 3);
    for (const c of wide.cells) if (c.fret === 7) expect(c.finger).toBe(4);
    expect(wide.cells.find((c) => c.fret === 3).finger).toBe(1);
  });
});
