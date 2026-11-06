import { describe, it, expect } from "vitest";
import { loopLengthForCycle, maxCycleLength, sequencerViewSize } from "../loopWindow";

/**
 * VMU-214 — the loop window grows with the longest active cycle, never shorter
 * than 4 measures, never past the document's 8 (128 steps).
 */
describe("loopLengthForCycle — the length rule", () => {
  it.each([
    [16, 4],
    [64, 4],
    [65, 8],
    [112, 8],
    [128, 8],
    [129, 8],
    [210, 8],
  ])("%i steps -> %i measures", (cycle, measures) => {
    expect(loopLengthForCycle(cycle).lengthMeasures).toBe(measures);
  });

  it("is cut only above 128 steps", () => {
    expect(loopLengthForCycle(16).cut).toBe(false);
    expect(loopLengthForCycle(128).cut).toBe(false);
    expect(loopLengthForCycle(129).cut).toBe(true);
    expect(loopLengthForCycle(210).cut).toBe(true);
  });

  it("never goes below today's 4 measures when there is no cycle", () => {
    expect(loopLengthForCycle(0).lengthMeasures).toBe(4);
    expect(loopLengthForCycle(0).cut).toBe(false);
  });
});

describe("maxCycleLength — the longest active cycle", () => {
  it("is 0 when nothing is a whole-circle override", () => {
    expect(maxCycleLength()).toBe(0);
    expect(maxCycleLength({ customRhythm: [0, 6, 10] })).toBe(0);
    expect(maxCycleLength({ customDrums: { Kick: [0, 4] } })).toBe(0);
    expect(maxCycleLength({ suggestedBassTrack: { name: "Bass", activeSteps: [0] } })).toBe(0);
  });

  it("reads the longest among rhythm, drums and the suggested bass", () => {
    expect(
      maxCycleLength({
        customRhythm: { activeSteps: [0], cycleLength: 20 },
        customDrums: { Kick: { activeSteps: [0], cycleLength: 8 }, Hat: { activeSteps: [0], cycleLength: 112 } },
        suggestedBassTrack: { name: "Bass", activeSteps: [0], cycleLength: 64 },
      }),
    ).toBe(112);
  });

  it("ignores array-shaped overrides when a circle is present too", () => {
    expect(
      maxCycleLength({
        customDrums: { Kick: [0, 4], Snare: { activeSteps: [0], cycleLength: 32 } },
      }),
    ).toBe(32);
  });
});

describe("sequencerViewSize — the density after a send", () => {
  it.each([
    [16, 16],
    [32, 32],
    [64, 64],
    [65, 64],
    [112, 64],
    [128, 64],
  ])("%i steps -> %i", (steps, size) => {
    expect(sequencerViewSize(steps)).toBe(size);
  });
});
