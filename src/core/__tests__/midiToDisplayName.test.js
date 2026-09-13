/**
 * VMU-101 — note names for the screen, in the notation the user chose.
 *
 * `midiToNoteName` exists and is deliberately US-only: it feeds the synth, and
 * Tone.Frequency reads "Do4" as NaN — which once silently dropped notes. The
 * instrument bar needs the other thing, a DISPLAY name that follows the
 * notation setting. Keeping the two functions apart is the point; a notation
 * parameter on the synth path is how that defect happened.
 *
 * Expected values come from the domain, never from the code: MIDI 60 is middle
 * C, C4 in scientific notation, Do4 in the French convention this app uses.
 */
import { describe, it, expect } from "vitest";
import { midiToDisplayName, formatPitchRange, midiToNoteName } from "../theory";

describe("midiToDisplayName", () => {
  it("names middle C in both notations", () => {
    expect(midiToDisplayName(60, "us")).toBe("C4");
    expect(midiToDisplayName(60, "eu")).toBe("Do4");
  });

  it("changes octave number at C, not at A", () => {
    // B3 = 59 and C4 = 60 sit a semitone apart across an octave boundary.
    expect(midiToDisplayName(59, "us")).toBe("B3");
    expect(midiToDisplayName(59, "eu")).toBe("Si3");
    expect(midiToDisplayName(48, "eu")).toBe("Do3");
  });

  it("spells sharps in each notation", () => {
    expect(midiToDisplayName(61, "us")).toBe("C#4");
    expect(midiToDisplayName(61, "eu")).toBe("Do#4");
  });

  it("defaults to US spelling", () => {
    expect(midiToDisplayName(64)).toBe("E4");
  });

  it("leaves the synth-facing name untouched and US-only", () => {
    expect(midiToNoteName(60)).toBe("C4");
  });
});

describe("formatPitchRange", () => {
  it("formats the open C major guitar grip, C3 to E4", () => {
    expect(formatPitchRange({ low: 48, high: 64 }, "eu")).toBe("Do3 – Mi4");
    expect(formatPitchRange({ low: 48, high: 64 }, "us")).toBe("C3 – E4");
  });

  it("names a single pitch once rather than as a range to itself", () => {
    expect(formatPitchRange({ low: 60, high: 60 }, "eu")).toBe("Do4");
  });

  it("returns null when there is no range", () => {
    expect(formatPitchRange(null, "eu")).toBeNull();
  });
});
