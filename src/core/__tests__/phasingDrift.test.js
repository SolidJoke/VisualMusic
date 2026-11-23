import { describe, it, expect } from "vitest";
import { generateEuclideanRhythm, rotate } from "../compositionEngine";
import {
  PHASING_EVERY_CHOICES,
  driftCopy,
  driftOffsetAtStep,
} from "../phasingDrift";

// VMU-211: "Deux copies qui glissent" — the copy moves one case every N turns
// by itself. The drift is laid out in advance, in the copy's own track.

const hitsOf = (pattern) => pattern.flatMap((v, i) => (v === 1 ? [i] : []));
const patternOf = (n, k) => generateEuclideanRhythm(n, k, 0).pattern;

// The reference, written the long way: the copy's hits over `turns` turns.
const reference = (pattern, start, every, turns) => {
  const n = pattern.length;
  const out = [];
  for (let t = 0; t < turns; t += 1) {
    const offset = (start + Math.floor(t / every)) % n;
    for (const idx of hitsOf(rotate(pattern, offset))) out.push(t * n + idx);
  }
  return out;
};

describe("driftCopy — Off (every = 0) is today's fixed copy", () => {
  it.each([8, 12, 16])("n = %i: the copy is the phrase rotated by the start, cycle = n", (n) => {
    const pattern = patternOf(n, 5);
    for (const start of [0, 3]) {
      const copy = driftCopy(pattern, start, 0);
      expect(copy.activeSteps).toEqual(hitsOf(rotate(pattern, start)));
      expect(copy.cycleLength).toBe(n);
      expect(copy.cut).toBe(false);
    }
  });

  it("the offered choices are Off, 1, 2 and 4 turns", () => {
    expect(PHASING_EVERY_CHOICES).toEqual([0, 1, 2, 4]);
  });
});

describe("driftCopy — one case every N turns", () => {
  it("n = 8, every 1 turn: 8 turns, the offset grows by 1 each turn, then unison again", () => {
    const pattern = patternOf(8, 3);
    const copy = driftCopy(pattern, 0, 1);
    expect(copy.cycleLength).toBe(64);
    expect(copy.cut).toBe(false);
    expect(copy.activeSteps).toEqual(reference(pattern, 0, 1, 8));
    // turn 0 is the phrase itself, turn 1 is moved by one case.
    expect(copy.activeSteps.filter((s) => s < 8)).toEqual(hitsOf(pattern));
    expect(copy.activeSteps.filter((s) => s >= 8 && s < 16).map((s) => s - 8)).toEqual(
      hitsOf(rotate(pattern, 1)),
    );
  });

  it("n = 8, every 2 turns: the offset changes every second turn", () => {
    const pattern = patternOf(8, 3);
    const copy = driftCopy(pattern, 0, 2);
    expect(copy.cycleLength).toBe(128);
    expect(copy.cut).toBe(false);
    expect(copy.activeSteps).toEqual(reference(pattern, 0, 2, 16));
    expect(driftOffsetAtStep({ subdivisions: 8, start: 0, every: 2, cycleLength: 128 }, 0)).toBe(0);
    expect(driftOffsetAtStep({ subdivisions: 8, start: 0, every: 2, cycleLength: 128 }, 8)).toBe(0);
    expect(driftOffsetAtStep({ subdivisions: 8, start: 0, every: 2, cycleLength: 128 }, 16)).toBe(1);
  });

  it("n = 4, every 4 turns, a non-zero start: the offset starts at the start", () => {
    const pattern = patternOf(4, 3);
    const copy = driftCopy(pattern, 2, 4);
    expect(copy.cycleLength).toBe(64);
    expect(copy.activeSteps).toEqual(reference(pattern, 2, 4, 16));
    // 4 turns at offset 2, then 4 at 3, then 4 at 0 (wrap), then 4 at 1.
    const offs = [0, 4, 8, 12].map((t) =>
      driftOffsetAtStep({ subdivisions: 4, start: 2, every: 4, cycleLength: 64 }, t * 4),
    );
    expect(offs).toEqual([2, 3, 0, 1]);
  });

  it("n = 12, every 1 turn, start 5: wraps modulo n and comes back to the start offset", () => {
    const pattern = patternOf(12, 5);
    const copy = driftCopy(pattern, 5, 1);
    // 144 steps do not fit: cut at 128 (see below), but the first turns follow the rule.
    expect(copy.cycleLength).toBe(128);
    // Turn 10 starts at step 120 and is cut at 128: only its hits below 128 stay.
    expect(copy.activeSteps).toEqual(reference(pattern, 5, 1, 11).filter((s) => s < 128));
    expect(copy.cut).toBe(true);
  });

  it("n = 16, every 1 turn: the unison comes back after n turns only when the cycle fits", () => {
    const pattern = patternOf(16, 5);
    // 16 turns of 16 steps = 256 steps: cut.
    expect(driftCopy(pattern, 0, 1).cut).toBe(true);
    // The retour à l'unisson in the fitting case (n = 8): the last turn + 1 is turn 0 again.
    const small = patternOf(8, 3);
    const copy = driftCopy(small, 0, 1);
    const lastTurn = copy.activeSteps.filter((s) => s >= 56).map((s) => s - 56);
    expect(lastTurn).toEqual(hitsOf(rotate(small, 7)));
    // 8 shifts of one case = a whole circle: turn 8 would be the phrase again.
    expect(driftOffsetAtStep({ subdivisions: 8, start: 0, every: 1, cycleLength: 64 }, 64)).toBe(0);
  });
});

describe("driftCopy — a full cycle longer than 128 steps (the cut rule)", () => {
  it("is cut at 128 steps: the copy drifts through them, then restarts at the start offset", () => {
    const pattern = patternOf(12, 5);
    const copy = driftCopy(pattern, 0, 2);
    expect(copy.cut).toBe(true);
    expect(copy.cycleLength).toBe(128);
    // Every active step is inside the loop, strictly sorted, no duplicates.
    expect(copy.activeSteps.every((s) => s >= 0 && s < 128)).toBe(true);
    expect([...copy.activeSteps].sort((a, b) => a - b)).toEqual(copy.activeSteps);
    expect(new Set(copy.activeSteps).size).toBe(copy.activeSteps.length);
    // A step belongs to turn floor(step / 12): offset floor(turn / 2).
    const expected = [];
    for (let s = 0; s < 128; s += 1) {
      const turn = Math.floor(s / 12);
      const offset = Math.floor(turn / 2) % 12;
      if (pattern[(((s % 12) - offset) % 12 + 12) % 12] === 1) expected.push(s);
    }
    expect(copy.activeSteps).toEqual(expected);
  });

  it("the offset read by the wheel at step 128 + s is the one at step s (it restarts)", () => {
    const cfg = { subdivisions: 12, start: 3, every: 2, cycleLength: 128 };
    for (const s of [0, 11, 24, 100, 127]) {
      expect(driftOffsetAtStep(cfg, 128 + s)).toBe(driftOffsetAtStep(cfg, s));
    }
    expect(driftOffsetAtStep(cfg, 0)).toBe(3);
    expect(driftOffsetAtStep(cfg, 24)).toBe(4);
  });

  it("exactly 128 steps is not cut (n = 8, every 2 turns)", () => {
    expect(driftCopy(patternOf(8, 3), 0, 2).cut).toBe(false);
  });
});

describe("driftOffsetAtStep — what the wheel shows is what plays", () => {
  it("agrees with the copy's track, step by step, for several settings", () => {
    for (const [n, k, start, every] of [[8, 3, 0, 1], [8, 3, 5, 2], [12, 5, 2, 2], [16, 5, 0, 4], [12, 7, 3, 1]]) {
      const pattern = patternOf(n, k);
      const copy = driftCopy(pattern, start, every);
      const cfg = { subdivisions: n, start, every, cycleLength: copy.cycleLength };
      const played = new Set(copy.activeSteps);
      for (let s = 0; s < copy.cycleLength; s += 1) {
        const offset = driftOffsetAtStep(cfg, s);
        const rotated = rotate(pattern, offset);
        expect(played.has(s)).toBe(rotated[s % n] === 1);
      }
    }
  });

  it("Off: always the start offset", () => {
    const cfg = { subdivisions: 16, start: 7, every: 0, cycleLength: 16 };
    for (const s of [0, 1, 15, 16, 200]) expect(driftOffsetAtStep(cfg, s)).toBe(7);
  });

  it("before the music plays (step -1), the start offset", () => {
    expect(driftOffsetAtStep({ subdivisions: 8, start: 3, every: 1, cycleLength: 64 }, -1)).toBe(3);
  });
});
