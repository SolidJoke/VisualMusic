import { describe, it, expect } from "vitest";
import { PITCH_MAP } from "../useSequencer";

describe("SequencerLogic - PITCH_MAP", () => {
  it("maps 'R' to 0 semitones", () => {
    expect(PITCH_MAP['R']).toBe(0);
  });

  it("maps '8va' to 12 semitones", () => {
    expect(PITCH_MAP['8va']).toBe(12);
  });

  it("maps '5' to 7 semitones (perfect fifth)", () => {
    expect(PITCH_MAP['5']).toBe(7);
  });

  it("maps 'b3' to 3 semitones (minor third)", () => {
    expect(PITCH_MAP['b3']).toBe(3);
  });

  it("handles alternative 'octave' label", () => {
    expect(PITCH_MAP['octave']).toBe(12);
  });
});
