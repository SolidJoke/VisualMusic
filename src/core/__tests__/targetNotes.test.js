// VMU-123 — pure function: target notes of a chord, per preset.
//
// A "target note" is always a member of the CHORD BEING PLAYED — never a
// scale-degree suggestion outside it (redefinition, 2026-09-16). Presets are
// named by intent, never by theory jargon (product decision, VMU-136):
//   off        — nothing
//   majorMinor — the 3rd (major or minor); a chord with no 3rd (sus, power
//                chord): nothing
//   color      — 3rd and 7th if the chord contains a 7th; a triad without a
//                7th: the 3rd alone
//   skeleton   — root and 5th (perfect, diminished or augmented — whichever
//                the chord actually has)
//
// Domain-derived tests, C major, I-V-vi-IV progression (brief's own worked
// table) plus the chords that exercise diminished/augmented 5ths, extended
// chords with a 7th, and chords that have no 3rd at all.
import { describe, it, expect } from "vitest";
import { getChordTargetNotes, TARGET_NOTES_PRESETS } from "../targetNotes.js";

// Pitch classes, C = 0.
const C = 0, D = 2, E = 4, F = 5, G = 7, A = 9, B = 11;

describe("getChordTargetNotes — majorMinor (default)", () => {
  it("I – C major -> the 3rd (E)", () => {
    expect(getChordTargetNotes(C, "chord_major", "majorMinor")).toEqual([E]);
  });
  it("V – G major -> the 3rd (B)", () => {
    expect(getChordTargetNotes(G, "chord_major", "majorMinor")).toEqual([B]);
  });
  it("vi – A minor -> the 3rd (C)", () => {
    expect(getChordTargetNotes(A, "chord_minor", "majorMinor")).toEqual([C]);
  });
  it("IV – F major -> the 3rd (A)", () => {
    expect(getChordTargetNotes(F, "chord_major", "majorMinor")).toEqual([A]);
  });
  it("a chord with no 3rd (sus4) -> nothing", () => {
    expect(getChordTargetNotes(C, "chord_sus4", "majorMinor")).toEqual([]);
  });
  it("a chord with no 3rd (sus2) -> nothing", () => {
    expect(getChordTargetNotes(C, "chord_sus2", "majorMinor")).toEqual([]);
  });
});

describe("getChordTargetNotes — skeleton (root + 5th)", () => {
  it("C major -> C, G", () => {
    expect(getChordTargetNotes(C, "chord_major", "skeleton")).toEqual([C, G]);
  });
  it("G major -> G, D", () => {
    expect(getChordTargetNotes(G, "chord_major", "skeleton")).toEqual([G, D]);
  });
  it("A minor -> A, E", () => {
    expect(getChordTargetNotes(A, "chord_minor", "skeleton")).toEqual([A, E]);
  });
  it("F major -> F, C", () => {
    expect(getChordTargetNotes(F, "chord_major", "skeleton")).toEqual([F, C]);
  });
  it("B diminished -> B, F (diminished 5th, the chord's own)", () => {
    expect(getChordTargetNotes(B, "chord_dim", "skeleton")).toEqual([B, F]);
  });
});

describe("getChordTargetNotes — color (3rd + 7th, or 3rd alone)", () => {
  it("G7 -> B (3rd), F (7th)", () => {
    expect(getChordTargetNotes(G, "chord_7", "color")).toEqual([B, F]);
  });
  it("C major triad (no 7th) -> E alone", () => {
    expect(getChordTargetNotes(C, "chord_major", "color")).toEqual([E]);
  });
  it("C maj7 -> E (3rd), B (7th)", () => {
    expect(getChordTargetNotes(C, "chord_maj7", "color")).toEqual([E, B]);
  });
});

describe("getChordTargetNotes — off", () => {
  it("off -> nothing, for every chord", () => {
    expect(getChordTargetNotes(C, "chord_major", "off")).toEqual([]);
    expect(getChordTargetNotes(C, "chord_sus4", "off")).toEqual([]);
    expect(getChordTargetNotes(G, "chord_7", "off")).toEqual([]);
    expect(getChordTargetNotes(B, "chord_dim", "off")).toEqual([]);
  });
});

describe("getChordTargetNotes — never a note outside the chord", () => {
  it.each(TARGET_NOTES_PRESETS)("for every preset (%s), the result is a subset of the chord's own semitones", (preset) => {
    const chords = ["chord_major", "chord_minor", "chord_dim", "chord_aug", "chord_sus2", "chord_sus4", "chord_maj7", "chord_m7", "chord_7", "chord_dim7", "chord_m7b5", "chord_add9", "chord_9", "chord_m9"];
    for (const chordType of chords) {
      const targets = getChordTargetNotes(C, chordType, preset);
      // Recompute the chord's own pitch classes independently (not by
      // re-importing resolveChordSemitones, to keep this an outside check).
      const chordSemitonesByType = {
        chord_major: [0, 4, 7], chord_minor: [0, 3, 7], chord_dim: [0, 3, 6], chord_aug: [0, 4, 8],
        chord_sus2: [0, 2, 7], chord_sus4: [0, 5, 7], chord_maj7: [0, 4, 7, 11], chord_m7: [0, 3, 7, 10],
        chord_7: [0, 4, 7, 10], chord_dim7: [0, 3, 6, 9], chord_m7b5: [0, 3, 6, 10],
        chord_add9: [0, 4, 7, 14], chord_9: [0, 4, 7, 10, 14], chord_m9: [0, 3, 7, 10, 14],
      };
      const chordPitchClasses = chordSemitonesByType[chordType].map((s) => (C + s) % 12);
      for (const t of targets) {
        expect(chordPitchClasses).toContain(t);
      }
    }
  });
});

describe("getChordTargetNotes — edge cases", () => {
  it("unknown chord type -> nothing (no crash)", () => {
    expect(getChordTargetNotes(C, "chord_does_not_exist", "majorMinor")).toEqual([]);
  });
  it("missing preset -> nothing", () => {
    expect(getChordTargetNotes(C, "chord_major", undefined)).toEqual([]);
  });
});
