import { describe, it, expect } from "vitest";
import { midiToNoteName, getAbsoluteNoteValue } from "../theory";

/**
 * midiToNoteName is the single place a MIDI value becomes a note name for the
 * synth. Nine hand-written copies of this conversion existed, and most of them
 * dropped the `- 1` that scientific pitch notation needs (MIDI 60 is C4, and
 * Math.floor(60 / 12) is 5), so chords and scales played an octave above what
 * the screen showed. Some also used the UI notation, producing "Do4", which
 * Tone.Frequency reads as NaN — silence.
 */
describe("midiToNoteName", () => {
  it("nomme le do central C4 (MIDI 60), la convention de getAbsoluteNoteValue", () => {
    expect(midiToNoteName(60)).toBe("C4");
  });

  it("couvre les bornes du piano et les cordes à vide graves", () => {
    expect(midiToNoteName(21)).toBe("A0"); // touche la plus grave du piano
    expect(midiToNoteName(108)).toBe("C8"); // touche la plus aiguë
    expect(midiToNoteName(40)).toBe("E2"); // mi grave de la guitare
    expect(midiToNoteName(28)).toBe("E1"); // mi grave de la basse
    expect(midiToNoteName(61)).toBe("C#4");
  });

  it("est la réciproque exacte de getAbsoluteNoteValue sur toute la tessiture du piano", () => {
    for (let midi = 21; midi <= 108; midi++) {
      expect(getAbsoluteNoteValue(midiToNoteName(midi))).toBe(midi);
    }
  });

  it("produit toujours un nom lisible par Tone — notation US, jamais « Do4 »", () => {
    for (let midi = 21; midi <= 108; midi++) {
      expect(midiToNoteName(midi)).toMatch(/^[A-G]#?\d$/);
    }
  });
});
