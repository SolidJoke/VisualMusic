import { describe, it, expect } from "vitest";
import { planArpeggio, arpeggioStepSeconds, ARPEGGIO_NOTE_VALUE } from "../arpeggio";

describe("arpeggioStepSeconds — a step is the loop's fastest note", () => {
  it("is a sixteenth at 120 bpm: 0.125 s", () => {
    expect(arpeggioStepSeconds(120)).toBe(0.125);
  });

  it("is 60 / bpm / 4 at any tempo (90 bpm)", () => {
    expect(arpeggioStepSeconds(90)).toBeCloseTo(60 / 90 / 4, 12);
  });

  it.each([0, -1, NaN, undefined])("falls back to 120 bpm for %p", (bpm) => {
    expect(arpeggioStepSeconds(bpm)).toBe(0.125);
  });

  it("names the note value the steps are played with: a sixteenth", () => {
    expect(ARPEGGIO_NOTE_VALUE).toBe("16n");
  });
});

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

  // VMU-203 hold rule: a note's light stays on until the next note replaces it,
  // and the LAST note holds for at least 0.1 s however fast the tempo. The old
  // plan cleared each note just BEFORE the next step, leaving a gap at 120 bpm.
  it("clears each note exactly when the next step starts (stepTime 0.25)", () => {
    const steps = planArpeggio([48, 55, 60], 1, 0.25);
    expect(steps.map((s) => s.time)).toEqual([1, 1.25, 1.5]);
    expect(steps.map((s) => s.clearAt)).toEqual([1.25, 1.5, 1.75]);
  });

  it("holds the last note at least 0.1 s, even for a tiny step (0.03)", () => {
    const steps = planArpeggio([48, 55], 1, 0.03);
    expect(steps.map((s) => s.time)).toEqual([1, 1.03]);
    expect(steps.map((s) => s.clearAt)[0]).toBeCloseTo(1.03, 12);
    expect(steps.map((s) => s.clearAt)[1]).toBeCloseTo(1.13, 12);
  });

  it("holds the last note max(stepTime, 0.1) s at any tempo", () => {
    // 120 bpm -> step 0.125 s, so the last note holds 0.125 s (stepTime wins).
    const fast = planArpeggio([48, 55], 0, arpeggioStepSeconds(120));
    expect(fast.map((s) => s.clearAt)).toEqual([0.125, 0.25]);
    // 200 bpm -> step 0.075 s, so the last note holds the 0.1 s floor.
    const faster = planArpeggio([48, 55], 0, arpeggioStepSeconds(200));
    expect(faster.map((s) => s.clearAt)).toEqual([0.075, 0.175]);
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
