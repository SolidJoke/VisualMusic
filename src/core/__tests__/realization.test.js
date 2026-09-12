/**
 * VMU-003 — the realization module, checked against fixed pitches.
 *
 * Every expected value here is derived from the domain, never copied from the
 * code's output: middle C is C4 is MIDI 60, and a guitar in standard tuning
 * sounds E2 = 40 on its lowest string. That rule exists because three tests in
 * this repository once asserted the octave defect they should have caught —
 * they had been written by pasting what the code returned.
 *
 * The companion file `hooks/__tests__/RealizationConsistency.test.jsx` asserts
 * the invariant (played set === highlighted set) through the real hooks. Each
 * file covers what the other cannot: an invariant passes when both channels are
 * wrong together, and fixed values say nothing about the two channels agreeing.
 */
import { describe, it, expect } from "vitest";
import {
  realizeChordFromFingering,
  realizeScaleFromBox,
  realizeDictionarySelection,
} from "../realization";
import { TUNINGS } from "../tunings";

// Fretboard indices count from the highest string: 0 = high E4, 5 = low E2.
const GUITAR = [...TUNINGS.GUITAR_STANDARD].reverse();
const BASS = [...TUNINGS.BASS_STANDARD].reverse();

describe("realizeChordFromFingering", () => {
  it("reads a V1 grip and returns its sounding pitches, low to high", () => {
    // Open C major, x32010. A string fret 3 = C3 48, D fret 2 = E3 52,
    // G open = G3 55, B fret 1 = C4 60, high E open = E4 64.
    const grip = {
      0: { 0: 0 },
      1: { 1: 1 },
      2: { 0: 0 },
      3: { 2: 2 },
      4: { 3: 3 },
    };
    const notes = realizeChordFromFingering(grip, GUITAR, 0, "guitar");
    expect(notes.map((n) => n.absoluteValue)).toEqual([48, 52, 55, 60, 64]);
  });

  it("labels each pitch by its interval above the root, octave-independently", () => {
    const grip = { 4: { 3: 3 }, 3: { 2: 2 }, 2: { 0: 0 }, 1: { 1: 1 } };
    const notes = realizeChordFromFingering(grip, GUITAR, 0, "guitar");
    // C3 root, E3 third, G3 fifth, C4 root again — the octave does not change
    // what degree a note is.
    expect(notes.map((n) => n.order)).toEqual([1, 3, 5, 1]);
  });

  it("reads a V2 grip and skips muted strings", () => {
    // Same chord in the shape useMusicEngine re-exposes. Read as V1, the key
    // "fret" became parseInt("fret") = NaN and crashed every guitar chord.
    const grip = {
      0: { fret: 0, status: "open" },
      1: { fret: 1, status: "played", finger: 1 },
      2: { fret: 0, status: "open" },
      3: { fret: 2, status: "played", finger: 2 },
      4: { fret: 3, status: "played", finger: 3 },
      5: { fret: -1, status: "muted" },
    };
    const notes = realizeChordFromFingering(grip, GUITAR, 0, "guitar");
    expect(notes.map((n) => n.absoluteValue)).toEqual([48, 52, 55, 60, 64]);
  });

  it("keeps string and fret alongside each pitch", () => {
    const notes = realizeChordFromFingering({ 4: { 3: 3 } }, GUITAR, 0, "guitar");
    expect(notes[0]).toMatchObject({
      absoluteValue: 48,
      value: 0,
      stringIndex: 4,
      fret: 3,
      instrument: "guitar",
    });
  });

  it("realizes a bass grip in the bass register", () => {
    // Bass low E is E1 = 28. A string (index 2 reversed) fret 3 = C2 36.
    const notes = realizeChordFromFingering({ 2: { 3: 1 } }, BASS, 0, "bass");
    expect(notes.map((n) => n.absoluteValue)).toEqual([36]);
  });
});

describe("realizeScaleFromBox", () => {
  it("returns the box ascending", () => {
    const box = [
      { stringIndex: 4, fret: 3 }, // C3 48
      { stringIndex: 4, fret: 5 }, // D3 50
      { stringIndex: 3, fret: 3 }, // F3 53
      { stringIndex: 4, fret: 7 }, // E3 52
    ];
    const notes = realizeScaleFromBox(box, GUITAR, 0, "guitar");
    expect(notes.map((n) => n.absoluteValue)).toEqual([48, 50, 52, 53]);
  });

  it("collapses a pitch that exists at two positions onto its lowest one", () => {
    // E3 = 52 sits on the A string at fret 7 and on the D string at fret 2.
    // Lighting the same key twice would leave the keyboard in two states.
    const box = [
      { stringIndex: 4, fret: 7 },
      { stringIndex: 3, fret: 2 },
    ];
    const notes = realizeScaleFromBox(box, GUITAR, 4, "guitar");
    expect(notes).toHaveLength(1);
    expect(notes[0].absoluteValue).toBe(52);
  });
});

describe("realizeDictionarySelection", () => {
  const theoretical = [
    { value: 0, order: 1, absoluteValue: 60 },
    { value: 4, order: 3, absoluteValue: 64 },
    { value: 7, order: 5, absoluteValue: 67 },
  ];

  it("uses the grip when a fretted instrument owns playback", () => {
    const result = realizeDictionarySelection({
      instrument: "guitar",
      fingering: { fingeringMap: { 4: { 3: 3 }, 3: { 2: 2 }, 2: { 0: 0 } } },
      tuning: TUNINGS.GUITAR_STANDARD,
      rootPitchClass: 0,
      theoreticalNotes: theoretical,
    });
    expect(result.source).toBe("fingering");
    expect(result.notes.map((n) => n.absoluteValue)).toEqual([48, 52, 55]);
  });

  it("keeps the theoretical notes on piano, grip or no grip", () => {
    const result = realizeDictionarySelection({
      instrument: "piano",
      fingering: { fingeringMap: { 4: { 3: 3 } } },
      tuning: TUNINGS.GUITAR_STANDARD,
      rootPitchClass: 0,
      theoreticalNotes: theoretical,
    });
    expect(result.source).toBe("theory");
    expect(result.notes.map((n) => n.absoluteValue)).toEqual([60, 64, 67]);
  });

  it("falls back to theory when a fretted instrument has no fingering", () => {
    const result = realizeDictionarySelection({
      instrument: "guitar",
      fingering: null,
      tuning: TUNINGS.GUITAR_STANDARD,
      rootPitchClass: 0,
      theoreticalNotes: theoretical,
    });
    expect(result.source).toBe("theory");
    expect(result.notes).toEqual(theoretical);
  });

  it("falls back to theory rather than returning nothing when a grip is empty", () => {
    const result = realizeDictionarySelection({
      instrument: "guitar",
      fingering: { fingeringMap: {} },
      tuning: TUNINGS.GUITAR_STANDARD,
      rootPitchClass: 0,
      theoreticalNotes: theoretical,
    });
    expect(result.source).toBe("theory");
    expect(result.notes).toEqual(theoretical);
  });
});
