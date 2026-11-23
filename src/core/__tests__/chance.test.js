// VMU-221 — a chance per cell and a density per track.
//
// RED FIRST: src/core/chance.js does not exist on main.
import { describe, it, expect, vi } from "vitest";
import { buildStudioTimeline, DRUM_ROLES, MELODIC_ROLES, MAX_STEPS, STEPS_PER_MEASURE } from "../timeline";
import {
  CHANCE_LEVELS,
  emptyChance,
  isNeutral,
  cycleChance,
  setDensity,
  withSeed,
  chanceAt,
  densityOf,
  applyChance,
} from "../chance";
import { assertDensityMonotone, forAllSeeds } from "./propertyHelpers";

const doc8 = () => buildStudioTimeline({ brickIndex: 0, theme: "A", lengthMeasures: 8 });
const track = (doc, role) => doc.tracks.find((t) => t.role === role);
const hits = (t) => t.steps.flatMap((cell, i) => (cell ? [i] : []));
const hatId = (doc) => track(doc, "hat").id;

describe("the settings are plain, small data", () => {
  it("starts neutral: no chance, density 100 everywhere", () => {
    const s = emptyChance(7);
    expect(isNeutral(s)).toBe(true);
    expect(densityOf(s, "drum-0")).toBe(100);
    expect(chanceAt(s, "drum-0", 4)).toBe(100);
  });

  it("a cell cycles 100 -> 50 -> 25 -> 100, and 100 leaves no trace (equal by value to before)", () => {
    expect(CHANCE_LEVELS).toEqual([100, 50, 25]);
    let s = emptyChance(7);
    s = cycleChance(s, "drum-0", 4);
    expect(chanceAt(s, "drum-0", 4)).toBe(50);
    expect(isNeutral(s)).toBe(false);
    s = cycleChance(s, "drum-0", 4);
    expect(chanceAt(s, "drum-0", 4)).toBe(25);
    s = cycleChance(s, "drum-0", 4);
    expect(chanceAt(s, "drum-0", 4)).toBe(100);
    expect(s).toEqual(emptyChance(7));
  });

  it("density: 0 to 100, clamped, 100 leaves no trace", () => {
    let s = setDensity(emptyChance(7), "drum-2", 60);
    expect(densityOf(s, "drum-2")).toBe(60);
    expect(setDensity(s, "drum-2", -5).density["drum-2"]).toBe(0);
    expect(densityOf(setDensity(s, "drum-2", 250), "drum-2")).toBe(100);
    expect(setDensity(s, "drum-2", 100)).toEqual(emptyChance(7));
    expect(isNeutral(s)).toBe(false);
  });

  it("changing the seed alone is not a chance setting", () => {
    expect(isNeutral(withSeed(emptyChance(7), 8))).toBe(true);
    expect(withSeed(emptyChance(7), 8).seed).toBe(8);
  });
});

describe("applyChance", () => {
  it("nothing set: the very same document", () => {
    const doc = doc8();
    const out = applyChance(doc, emptyChance(123));
    expect(out.doc).toBe(doc);
    expect(out.dropped).toEqual({});
  });

  it("100% everywhere and a seed that changes: still the very same document", () => {
    const doc = doc8();
    for (const seed of [1, 2, 3]) expect(applyChance(doc, emptyChance(seed)).doc).toBe(doc);
  });

  it("the same seed gives the same document, another seed gives another one", () => {
    const doc = doc8();
    const s = setDensity(emptyChance(11), hatId(doc), 50);
    const a = applyChance(doc, s).doc;
    const b = applyChance(doc, s).doc;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = applyChance(doc, withSeed(s, 12)).doc;
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it("0% leaves no hit on that track, and touches nothing else", () => {
    const doc = doc8();
    const id = hatId(doc);
    const out = applyChance(doc, setDensity(emptyChance(5), id, 0)).doc;
    expect(hits(track(out, "hat"))).toEqual([]);
    for (const t of doc.tracks) {
      if (t.id === id) continue;
      expect(out.tracks.find((x) => x.id === t.id)).toBe(t);
    }
    expect(out.chords).toBe(doc.chords);
    expect(out.base).toBe(doc.base);
    expect(out.lengthMeasures).toBe(doc.lengthMeasures);
  });

  it("only removes hits: what stays is the very cell it was, and `dropped` is exactly what left", () => {
    const doc = doc8();
    const id = hatId(doc);
    const before = track(doc, "hat");
    const out = applyChance(doc, setDensity(emptyChance(9), id, 60));
    const after = track(out.doc, "hat");
    const left = hits(before).filter((i) => after.steps[i] === null);
    expect(left.length).toBeGreaterThan(0);
    expect(out.dropped[id]).toEqual(left);
    hits(after).forEach((i) => expect(after.steps[i]).toBe(before.steps[i]));
    expect(after.steps).toHaveLength(MAX_STEPS);
  });

  it("the density is monotone: a higher density keeps a superset of the hits (every seed)", () => {
    const doc = doc8();
    const id = hatId(doc);
    forAllSeeds(20, (seed) => {
      assertDensityMonotone(
        (d) => hits(track(applyChance(doc, setDensity(emptyChance(seed), id, d)).doc, "hat")),
        [0, 10, 25, 50, 75, 90, 99],
      );
      let kept = new Set();
      for (const d of [0, 10, 25, 50, 75, 90, 99]) {
        const now = new Set(hits(track(applyChance(doc, setDensity(emptyChance(seed), id, d)).doc, "hat")));
        for (const i of kept) if (!now.has(i)) throw new Error(`step ${i} kept at a lower density, lost at ${d}`);
        kept = now;
      }
    });
  });

  it("the chance of a cell is monotone too: 25% keeps a subset of 50%'s hits, which keeps a subset of 100%'s", () => {
    const doc = doc8();
    const id = track(doc, "snare").id;
    const step = hits(track(doc, "snare"))[0];
    forAllSeeds(30, (seed) => {
      const at = (level) => {
        let s = emptyChance(seed);
        for (let k = 0; k < (level === 100 ? 0 : level === 50 ? 1 : 2); k++) s = cycleChance(s, id, step);
        return applyChance(doc, s).doc.tracks.find((t) => t.id === id).steps[step] !== null;
      };
      if (at(25) && !at(50)) throw new Error("kept at 25 but not at 50");
      if (at(50) && !at(100)) throw new Error("kept at 50 but not at 100");
    });
  });

  it("a cell at 50% is kept about half of the time over many seeds (the rule is u < chance)", () => {
    const doc = doc8();
    const id = track(doc, "snare").id;
    const step = hits(track(doc, "snare"))[0];
    let kept = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      const s = cycleChance(emptyChance(seed), id, step);
      if (applyChance(doc, s).doc.tracks.find((t) => t.id === id).steps[step]) kept++;
    }
    expect(kept / N).toBeGreaterThan(0.4);
    expect(kept / N).toBeLessThan(0.6);
  });

  it("draws over the absolute steps: an 8-measure loop differs from one measure to the next", () => {
    const doc = doc8();
    const id = hatId(doc);
    // The hat plays the same pattern in every measure; with a density of 50 the
    // measures do not stay equal.
    forAllSeeds(10, (seed) => {
      const t = track(applyChance(doc, setDensity(emptyChance(seed), id, 50)).doc, "hat");
      const measures = new Set();
      for (let m = 0; m < 8; m++) {
        measures.add(hits(t).filter((i) => Math.floor(i / STEPS_PER_MEASURE) === m).map((i) => i % STEPS_PER_MEASURE).join(","));
      }
      expect(measures.size).toBeGreaterThan(1);
    });
  });

  it("the draw does not depend on the window: shortening the loop only shows the same first steps", () => {
    const long = doc8();
    const short = buildStudioTimeline({ brickIndex: 0, theme: "A", lengthMeasures: 4 });
    const s = setDensity(emptyChance(77), hatId(long), 50);
    const a = hits(track(applyChance(long, s).doc, "hat")).filter((i) => i < 64);
    const b = hits(track(applyChance(short, s).doc, "hat")).filter((i) => i < 64);
    expect(b).toEqual(a);
  });

  it("the draw of a track does not depend on the other tracks (a track is its own stream)", () => {
    const doc = doc8();
    const hat = hatId(doc);
    const kick = track(doc, "kick").id;
    const alone = applyChance(doc, setDensity(emptyChance(31), hat, 50)).doc;
    const both = applyChance(doc, setDensity(setDensity(emptyChance(31), kick, 30), hat, 50)).doc;
    expect(hits(track(both, "hat"))).toEqual(hits(track(alone, "hat")));
  });

  it("never touches the chord row, whatever is set on it", () => {
    const doc = doc8();
    const chords = doc.tracks.find((t) => t.role === "chordHits");
    const s = setDensity(emptyChance(3), chords.id, 0);
    const out = applyChance(doc, s);
    expect(out.doc).toBe(doc);
    expect(out.dropped).toEqual({});
  });

  it("works on the melodic rows and keeps the cells' pitch", () => {
    const doc = doc8();
    const bass = doc.tracks.find((t) => MELODIC_ROLES.includes(t.role));
    const out = applyChance(doc, setDensity(emptyChance(4), bass.id, 50));
    const after = out.doc.tracks.find((t) => t.id === bass.id);
    hits(after).forEach((i) => expect(after.steps[i]).toBe(bass.steps[i]));
    expect(hits(after).length).toBeLessThan(hits(bass).length);
  });

  it("only drum and melodic roles are in play", () => {
    const doc = doc8();
    const roles = doc.tracks.map((t) => t.role);
    expect(roles.some((r) => DRUM_ROLES.includes(r))).toBe(true);
  });

  it("does not mutate its input", () => {
    const doc = doc8();
    const frozen = JSON.stringify(doc);
    applyChance(doc, setDensity(emptyChance(1), hatId(doc), 40));
    expect(JSON.stringify(doc)).toBe(frozen);
  });
});

describe("the module reads no clock and no ambient randomness", () => {
  it("applyChance works with Math.random and Date.now forbidden", () => {
    const doc = doc8();
    const s = setDensity(emptyChance(5), hatId(doc), 50);
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random called");
    });
    const now = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Date.now called");
    });
    try {
      expect(() => applyChance(doc, s)).not.toThrow();
      expect(random).not.toHaveBeenCalled();
      expect(now).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
      now.mockRestore();
    }
  });
});
