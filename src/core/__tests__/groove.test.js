// VMU-223 — swing and humanisation, placed once and read by playback, display and export.
//
// RED FIRST: src/core/groove.js does not exist on main.
import { describe, it, expect } from "vitest";
import {
  SWING_MIN,
  SWING_MAX,
  SWING_DEFAULT,
  HUMANIZE_MAX_MS,
  HUMANIZE_MAX_VELOCITY,
  clampSwing,
  clampHumanize,
  grooveOf,
  swingOffsetSteps,
  eventGroove,
  offsetSeconds,
  stepOffsetSeconds,
} from "../groove";

const NEUTRAL = { swing: 50, humanize: 0, seed: 7 };

describe("the settings", () => {
  it("the defaults are straight and not humanised; the swing goes from 50 to 75", () => {
    expect(SWING_DEFAULT).toBe(50);
    expect(SWING_MIN).toBe(50);
    expect(SWING_MAX).toBe(75);
    expect(clampSwing(10)).toBe(50);
    expect(clampSwing(99)).toBe(75);
    expect(clampSwing(66.4)).toBe(66);
    expect(clampSwing("abc")).toBe(50);
    expect(clampHumanize(-5)).toBe(0);
    expect(clampHumanize(250)).toBe(100);
  });

  it("grooveOf is null (no groove at all) at 50 % and 0 %, the settings otherwise", () => {
    expect(grooveOf(50, 0, 7)).toBeNull();
    expect(grooveOf(66, 0, 7)).toEqual({ swing: 66, humanize: 0, seed: 7 });
    expect(grooveOf(50, 40, 7)).toEqual({ swing: 50, humanize: 40, seed: 7 });
  });
});

describe("the swing: the odd steps (0-based 1, 3, 5... = the 'e' and the 'a' of 1-e-&-a) come late", () => {
  it("at 50 % nothing moves", () => {
    for (let step = 0; step < 32; step++) expect(swingOffsetSteps(step, 50)).toBe(0);
  });

  it("the delay is (2 x swing - 1) steps: 0.32 at 66 %, 0.5 at 75 %", () => {
    expect(swingOffsetSteps(1, 66)).toBeCloseTo(0.32, 12);
    expect(swingOffsetSteps(3, 66)).toBeCloseTo(0.32, 12);
    expect(swingOffsetSteps(1, 75)).toBeCloseTo(0.5, 12);
    expect(swingOffsetSteps(1, 60)).toBeCloseTo(0.2, 12);
  });

  it("the even steps (0, 2, 4...) never move with the swing alone", () => {
    for (let step = 0; step < 128; step += 2) expect(swingOffsetSteps(step, 75)).toBe(0);
  });

  it("is the same for every voice: only the step decides", () => {
    const a = eventGroove({ swing: 66, humanize: 0, seed: 1 }, { trackId: "drum-0", step: 5, velocity: 0.8 });
    const b = eventGroove({ swing: 66, humanize: 0, seed: 99 }, { trackId: "bass-2", step: 5, velocity: 0.9 });
    expect(a.offsetSteps).toBeCloseTo(0.32, 12);
    expect(b.offsetSteps).toBeCloseTo(0.32, 12);
  });

  it("an odd step moves by 0.32 x 15 / bpm seconds: 80 ms at 60 bpm, 40 ms at 120", () => {
    const e = eventGroove({ swing: 66, humanize: 0, seed: 1 }, { trackId: "t", step: 1, velocity: 0.8 });
    expect(offsetSeconds(e, 60)).toBeCloseTo(0.32 * 0.25, 12);
    expect(offsetSeconds(e, 120)).toBeCloseTo(0.32 * 0.125, 12);
  });
});

describe("neutral settings change nothing", () => {
  it("at 50 % and 0 %: offset 0, no jitter, the same velocity", () => {
    for (const step of [0, 1, 2, 3, 17, 127]) {
      const e = eventGroove(NEUTRAL, { trackId: "drum-0", step, velocity: 0.8 });
      expect(e.offsetSteps).toBe(0);
      expect(e.jitterMs).toBe(0);
      expect(e.velocity).toBe(0.8);
      expect(offsetSeconds(e, 120)).toBe(0);
    }
  });

  it("a missing groove (null) is the same as neutral", () => {
    const e = eventGroove(null, { trackId: "drum-0", step: 3, velocity: 0.3 });
    expect(e).toEqual({ offsetSteps: 0, jitterMs: 0, velocity: 0.3, velocityScale: 1 });
  });

  it("the swing alone leaves the velocity and the timing jitter at zero", () => {
    const e = eventGroove({ swing: 66, humanize: 0, seed: 7 }, { trackId: "drum-0", step: 1, velocity: 0.8 });
    expect(e.jitterMs).toBe(0);
    expect(e.velocity).toBe(0.8);
  });
});

describe("the humanisation: bounded, and drawn from the Studio's seed", () => {
  const full = { swing: 50, humanize: 100, seed: 12345 };

  it("never goes past 10 ms nor 15 % of the velocity, over 4 seeds x 3 tracks x 128 steps", () => {
    expect(HUMANIZE_MAX_MS).toBe(10);
    expect(HUMANIZE_MAX_VELOCITY).toBe(0.15);
    let maxMs = 0;
    let maxRel = 0;
    for (const seed of [1, 2, 3, 0xdeadbeef]) {
      for (const trackId of ["drum-0", "drum-1", "bass-0"]) {
        for (let step = 0; step < 128; step++) {
          const e = eventGroove({ ...full, seed }, { trackId, step, velocity: 0.8 });
          maxMs = Math.max(maxMs, Math.abs(e.jitterMs));
          maxRel = Math.max(maxRel, Math.abs(e.velocity / 0.8 - 1));
          expect(e.velocity).toBeGreaterThan(0);
          expect(e.velocity).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(maxMs).toBeLessThanOrEqual(10);
    expect(maxRel).toBeLessThanOrEqual(0.15 + 1e-12);
    // And it is really used: not a constant zero.
    expect(maxMs).toBeGreaterThan(8);
    expect(maxRel).toBeGreaterThan(0.12);
  });

  it("scales with the setting: 50 % stays within half the bounds", () => {
    for (let step = 0; step < 128; step++) {
      const e = eventGroove({ ...full, humanize: 50 }, { trackId: "drum-0", step, velocity: 0.8 });
      expect(Math.abs(e.jitterMs)).toBeLessThanOrEqual(5);
      expect(Math.abs(e.velocity / 0.8 - 1)).toBeLessThanOrEqual(0.075 + 1e-12);
    }
  });

  it("the same seed gives the same offsets and forces, call after call", () => {
    const run = () =>
      Array.from({ length: 64 }, (_, step) => eventGroove(full, { trackId: "drum-0", step, velocity: 0.8 }));
    expect(run()).toEqual(run());
  });

  it("another seed, another track, or another step gives another draw", () => {
    const at = (g, trackId, step) => eventGroove(g, { trackId, step, velocity: 0.8 });
    expect(at(full, "drum-0", 5)).not.toEqual(at({ ...full, seed: 54321 }, "drum-0", 5));
    expect(at(full, "drum-0", 5)).not.toEqual(at(full, "drum-1", 5));
    expect(at(full, "drum-0", 5)).not.toEqual(at(full, "drum-0", 6));
  });

  it("the draw of a step does not depend on the other steps asked first (it is per absolute step)", () => {
    const solo = eventGroove(full, { trackId: "drum-0", step: 77, velocity: 0.8 });
    for (let step = 0; step < 77; step++) eventGroove(full, { trackId: "drum-0", step, velocity: 0.8 });
    expect(eventGroove(full, { trackId: "drum-0", step: 77, velocity: 0.8 })).toEqual(solo);
  });

  it("the first step of the loop is never early (nothing can sound before the loop starts)", () => {
    for (const seed of Array.from({ length: 200 }, (_, i) => i + 1)) {
      const e = eventGroove({ ...full, seed }, { trackId: "drum-0", step: 0, velocity: 0.8 });
      expect(e.jitterMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("swing and humanisation add up on the time; the jitter is in milliseconds, whatever the tempo", () => {
    const g = { swing: 66, humanize: 100, seed: 3 };
    const e = eventGroove(g, { trackId: "drum-0", step: 1, velocity: 0.8 });
    expect(e.offsetSteps).toBeCloseTo(0.32, 12);
    expect(offsetSeconds(e, 100)).toBeCloseTo(0.32 * 0.15 + e.jitterMs / 1000, 12);
    expect(offsetSeconds(e, 200)).toBeCloseTo(0.32 * 0.075 + e.jitterMs / 1000, 12);
  });
});

describe("the step's own moment (what the grid lights)", () => {
  it("is the swing alone: the cell of an odd step lights when its hit sounds", () => {
    expect(stepOffsetSeconds(null, 1, 120)).toBe(0);
    expect(stepOffsetSeconds({ swing: 66, humanize: 100, seed: 1 }, 2, 120)).toBe(0);
    expect(stepOffsetSeconds({ swing: 66, humanize: 100, seed: 1 }, 3, 120)).toBeCloseTo(0.32 * 0.125, 12);
  });
});
