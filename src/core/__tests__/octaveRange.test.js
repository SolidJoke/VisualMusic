// src/core/__tests__/octaveRange.test.js
// TDD: Tests for octave range utilities
// These tests define the contract BEFORE implementation

import { describe, it, expect } from 'vitest';
import {
  INSTRUMENT_MIDI_RANGES,
  isNoteInRange,
  isSequenceInRange,
  computeAbsoluteNote,
} from '../theory';

// -------------------------------------------------------
// MIDI formula used in the project:
//   absoluteValue = rootValue + (baseOctave + 1) * 12
//   where baseOctave = 4 + dictOctave
//   => absoluteValue = rootValue + (5 + dictOctave) * 12
// C (rootValue=0) at dictOctave=0 → 0 + 5*12 = 60 (C5)
// -------------------------------------------------------

describe('INSTRUMENT_MIDI_RANGES', () => {
  it('exports guitar range 40–86', () => {
    expect(INSTRUMENT_MIDI_RANGES.guitar.min).toBe(40);
    expect(INSTRUMENT_MIDI_RANGES.guitar.max).toBe(86);
  });

  it('exports bass range 28–59', () => {
    expect(INSTRUMENT_MIDI_RANGES.bass.min).toBe(28);
    expect(INSTRUMENT_MIDI_RANGES.bass.max).toBe(59);
  });

  it('exports piano range 21–108', () => {
    expect(INSTRUMENT_MIDI_RANGES.piano.min).toBe(21);
    expect(INSTRUMENT_MIDI_RANGES.piano.max).toBe(108);
  });
});

describe('computeAbsoluteNote', () => {
  // C = value 0, D = 2, E = 4

  it.each([
    [-3, 0, 24],   // C at octave -3: 0 + (5 + -3)*12 = 0 + 24
    [-2, 0, 36],   // C at octave -2: 0 + 3*12
    [-1, 0, 48],   // C at octave -1: 0 + 4*12
    [0,  0, 60],   // C at octave  0: 0 + 5*12 (C5)
    [1,  0, 72],   // C at octave +1: 0 + 6*12
    [2,  0, 84],   // C at octave +2: 0 + 7*12
    [3,  0, 96],   // C at octave +3: 0 + 8*12
  ])('C at dictOctave=%i → MIDI %i', (dictOctave, rootValue, expected) => {
    expect(computeAbsoluteNote(rootValue, dictOctave)).toBe(expected);
  });

  it('computes E (value=4) at dictOctave=0 correctly', () => {
    expect(computeAbsoluteNote(4, 0)).toBe(64); // 4 + 60
  });

  it('computes A (value=9) at dictOctave=-1 correctly', () => {
    expect(computeAbsoluteNote(9, -1)).toBe(57); // 9 + 48
  });
});

describe('isNoteInRange', () => {
  describe('guitar (40–86)', () => {
    it('returns true for MIDI 60 (C5 — in range)', () => {
      expect(isNoteInRange(60, 'guitar')).toBe(true);
    });

    it('returns true for boundary 40 (E2)', () => {
      expect(isNoteInRange(40, 'guitar')).toBe(true);
    });

    it('returns true for boundary 86', () => {
      expect(isNoteInRange(86, 'guitar')).toBe(true);
    });

    it('returns false for MIDI 24 (C2 — below guitar)', () => {
      expect(isNoteInRange(24, 'guitar')).toBe(false);
    });

    it('returns false for MIDI 96 (C8 — above guitar)', () => {
      expect(isNoteInRange(96, 'guitar')).toBe(false);
    });

    it('returns false for MIDI 39 (one below guitar min)', () => {
      expect(isNoteInRange(39, 'guitar')).toBe(false);
    });

    it('returns false for MIDI 87 (one above guitar max)', () => {
      expect(isNoteInRange(87, 'guitar')).toBe(false);
    });
  });

  describe('bass (28–59)', () => {
    it('returns true for MIDI 40 (E2 — in range)', () => {
      expect(isNoteInRange(40, 'bass')).toBe(true);
    });

    it('returns true for boundary 28 (E1)', () => {
      expect(isNoteInRange(28, 'bass')).toBe(true);
    });

    it('returns true for boundary 59', () => {
      expect(isNoteInRange(59, 'bass')).toBe(true);
    });

    it('returns false for MIDI 60 (C5 — above bass)', () => {
      expect(isNoteInRange(60, 'bass')).toBe(false);
    });

    it('returns false for MIDI 24 (C2 — below bass min)', () => {
      expect(isNoteInRange(24, 'bass')).toBe(false);
    });
  });

  describe('piano (21–108)', () => {
    it('returns true for MIDI 24', () => {
      expect(isNoteInRange(24, 'piano')).toBe(true);
    });

    it('returns true for MIDI 96', () => {
      expect(isNoteInRange(96, 'piano')).toBe(true);
    });

    it('returns false for MIDI 108+1', () => {
      expect(isNoteInRange(109, 'piano')).toBe(false);
    });
  });

  it('returns true for unknown instrument (no restriction)', () => {
    expect(isNoteInRange(0, 'unknown')).toBe(true);
    expect(isNoteInRange(200, 'unknown')).toBe(true);
  });
});

describe('isSequenceInRange', () => {
  it('returns true when all notes are in guitar range', () => {
    // C major scale starting at C4 (MIDI 48..60)
    const notes = [48, 50, 52, 53, 55, 57, 59, 60];
    expect(isSequenceInRange(notes, 'guitar')).toBe(true);
  });

  it('returns false when at least one note is out of guitar range', () => {
    const notes = [48, 50, 96]; // 96 is above guitar max
    expect(isSequenceInRange(notes, 'guitar')).toBe(false);
  });

  it('returns false when at least one note is out of bass range', () => {
    const notes = [28, 40, 60]; // 60 is above bass max 59
    expect(isSequenceInRange(notes, 'bass')).toBe(false);
  });

  it('returns true for empty sequence', () => {
    expect(isSequenceInRange([], 'guitar')).toBe(true);
  });

  it('accepts objects with absoluteValue property', () => {
    const notes = [{ absoluteValue: 40 }, { absoluteValue: 86 }];
    expect(isSequenceInRange(notes, 'guitar')).toBe(true);
  });

  it('rejects objects when one absoluteValue is out of range', () => {
    const notes = [{ absoluteValue: 40 }, { absoluteValue: 90 }];
    expect(isSequenceInRange(notes, 'guitar')).toBe(false);
  });
});

// -------------------------------------------------------
// Cross-checks: octave extremes vs instrument ranges
// (validates the plan's analysis table)
// -------------------------------------------------------
describe('octave extremes vs instruments (integration checks)', () => {
  // C (root=0) as reference
  it('dictOctave=-3 puts C out of guitar range', () => {
    const midi = computeAbsoluteNote(0, -3); // 24
    expect(isNoteInRange(midi, 'guitar')).toBe(false);
  });

  it('dictOctave=-2 puts C out of guitar range', () => {
    const midi = computeAbsoluteNote(0, -2); // 36
    expect(isNoteInRange(midi, 'guitar')).toBe(false);
  });

  it('dictOctave=-1 puts C in guitar range', () => {
    const midi = computeAbsoluteNote(0, -1); // 48
    expect(isNoteInRange(midi, 'guitar')).toBe(true);
  });

  it('dictOctave=0 puts C in guitar range', () => {
    const midi = computeAbsoluteNote(0, 0); // 60
    expect(isNoteInRange(midi, 'guitar')).toBe(true);
  });

  it('dictOctave=+1 puts C above guitar comfortable range but within limits', () => {
    const midi = computeAbsoluteNote(0, 1); // 72
    expect(isNoteInRange(midi, 'guitar')).toBe(true);
  });

  it('dictOctave=+2 puts C (MIDI 84) within guitar max (86)', () => {
    const midi = computeAbsoluteNote(0, 2); // 84
    expect(isNoteInRange(midi, 'guitar')).toBe(true);
  });

  it('dictOctave=+3 puts C (MIDI 96) out of guitar range', () => {
    const midi = computeAbsoluteNote(0, 3); // 96
    expect(isNoteInRange(midi, 'guitar')).toBe(false);
  });

  it('dictOctave=-3 puts E (root=4) out of bass range', () => {
    const midi = computeAbsoluteNote(4, -3); // 28 — boundary!
    expect(isNoteInRange(midi, 'bass')).toBe(true); // E1 is exactly the open string
  });

  it('dictOctave=0 puts C (MIDI 60) out of bass range', () => {
    const midi = computeAbsoluteNote(0, 0); // 60
    expect(isNoteInRange(midi, 'bass')).toBe(false);
  });
});
