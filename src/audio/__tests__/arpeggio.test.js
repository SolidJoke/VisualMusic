import { describe, it, expect } from "vitest";
import { planArpeggio } from "../arpeggio";

describe("planArpeggio — a chord's notes as a rising sequence", () => {
  it("sorts bare pitches ascending, whatever the input order", () => {
    const steps = planArpeggio([67, 60, 64], 2, 0.25);
    expect(steps.map((s) => s.note)).toEqual([60, 64, 67]);
    expect(steps.map((s) => s.time)).toEqual([2, 2.25, 2.5]);
  });

  it("sorts tagged notes by absoluteValue and keeps the object untouched", () => {
    const high = { absoluteValue: 67, instrument: "bass", stringIndex: 0, fret: 3 };
    const low = { absoluteValue: 60, instrument: "bass", stringIndex: 2, fret: 0 };
    const middle = { absoluteValue: 64, instrument: "bass", stringIndex: 1, fret: 2 };
    const steps = planArpeggio([high, low, middle], 1, 0.5);
    expect(steps.map((s) => s.note)).toEqual([low, middle, high]);
    expect(steps[0].note).toBe(low);
  });

  it("clears each note just before the next step (stepTime 0.25)", () => {
    const steps = planArpeggio([48, 55, 60], 1, 0.25);
    expect(steps.map((s) => s.clearAt)).toEqual([1.2, 1.45, 1.7]);
  });

  it("never clears sooner than 0.05 s, even for a tiny step (0.03)", () => {
    const steps = planArpeggio([48, 55], 1, 0.03);
    expect(steps.map((s) => s.time)).toEqual([1, 1.03]);
    expect(steps.map((s) => s.clearAt)).toEqual([1.05, 1.08]);
  });

  it("keeps duplicated pitches: two strings can give the same note", () => {
    const first = { absoluteValue: 60, stringIndex: 1, fret: 3 };
    const second = { absoluteValue: 60, stringIndex: 2, fret: 15 };
    const steps = planArpeggio([first, second, 48], 0, 0.25);
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.note)).toEqual([48, first, second]);
    expect(steps.map((s) => s.time)).toEqual([0, 0.25, 0.5]);
  });

  it("returns an empty plan for empty input", () => {
    expect(planArpeggio([], 0, 0.25)).toEqual([]);
  });
});
