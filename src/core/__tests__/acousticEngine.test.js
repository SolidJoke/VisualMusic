import { describe, it, expect } from "vitest";
import { freqToMidi, midiToNoteName, getHarmonicSeries } from "../acousticEngine";

describe("acousticEngine", () => {
  describe("freqToMidi", () => {
    it("should return 69 for 440 Hz (A4)", () => {
      expect(freqToMidi(440)).toBeCloseTo(69, 5);
    });

    it("should return 60 for Middle C (~261.63 Hz)", () => {
      expect(freqToMidi(261.625565)).toBeCloseTo(60, 5);
    });
  });

  describe("midiToNoteName", () => {
    it("should convert MIDI 69 to A4", () => {
      expect(midiToNoteName(69)).toBe("A4");
    });

    it("should convert MIDI 60 to C4", () => {
      expect(midiToNoteName(60)).toBe("C4");
    });

    it("should handle flats/sharps correctly (MIDI 61 -> C#4)", () => {
      expect(midiToNoteName(61)).toBe("C#4");
    });
  });

  describe("getHarmonicSeries", () => {
    it("should generate the first 16 harmonics by default (US notation)", () => {
      const harmonics = getHarmonicSeries(110); // A2 = 110Hz
      expect(harmonics.length).toBe(16);
      
      // H1 (Fundamental)
      expect(harmonics[0].order).toBe(1);
      expect(harmonics[0].frequency).toBeCloseTo(110, 5);
      expect(harmonics[0].noteName).toBe("A2");
      expect(harmonics[0].centsOffset).toBe(0);

      // H2 (Octave)
      expect(harmonics[1].order).toBe(2);
      expect(harmonics[1].frequency).toBeCloseTo(220, 5);
      expect(harmonics[1].noteName).toBe("A3");
      expect(harmonics[1].centsOffset).toBe(0);

      // H3 (Perfect Fifth + Octave) -> E4
      expect(harmonics[2].order).toBe(3);
      expect(harmonics[2].frequency).toBeCloseTo(330, 5);
      expect(harmonics[2].noteName).toBe("E4");
      // The perfect fifth is around +2 cents from equal temperament
      expect(harmonics[2].centsOffset).toBeCloseTo(2, 0);

      // H5 (Major Third + 2 Octaves) -> C#5
      expect(harmonics[4].order).toBe(5);
      expect(harmonics[4].frequency).toBeCloseTo(550, 5);
      expect(harmonics[4].noteName).toBe("C#5");
      // The major third is around -14 cents
      expect(harmonics[4].centsOffset).toBeCloseTo(-14, 0);
    });

    // BUG-10 — non-regression test: EU notation must be respected in HarmonicSeriesPanel
    it("should use EU notation when notation='eu' is passed (BUG-10)", () => {
      const harmonics = getHarmonicSeries(110, 16, "eu"); // A2 = 110Hz
      expect(harmonics.length).toBe(16);

      // H1: A2 in US → La2 in EU
      expect(harmonics[0].noteName).toBe("La2");

      // H2: A3 in US → La3 in EU
      expect(harmonics[1].noteName).toBe("La3");

      // H3: E4 in US → Mi4 in EU
      expect(harmonics[2].noteName).toBe("Mi4");

      // H5: C#5 in US → Do#5 in EU
      expect(harmonics[4].noteName).toBe("Do#5");
    });

    it("should default to US notation when no notation param is given", () => {
      const harmonicsDefault = getHarmonicSeries(110, 1);
      const harmonicsUS = getHarmonicSeries(110, 1, "us");
      expect(harmonicsDefault[0].noteName).toBe(harmonicsUS[0].noteName);
      expect(harmonicsDefault[0].noteName).toBe("A2");
    });
  });
});
