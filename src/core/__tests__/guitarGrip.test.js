// VMU-209 — the guitar grip the loop plays is the very cells the neck draws:
// getGuitarFingering read through shapeCellsFromFingering, in the neck's
// string order. The helper exists so the loop and the neck cannot diverge; this
// pins that it is, cell for cell, that chain — position choice included.
import { describe, it, expect } from 'vitest';
import { guitarGripCells } from '../guitarGrip';
import { getGuitarFingering } from '../fingeringLogic';
import { shapeCellsFromFingering } from '../loopNotePlace';
import { TUNINGS } from '../tunings';

const NECK_STRINGS = [...TUNINGS.GUITAR_STANDARD].reverse();

describe('guitarGripCells — the loop sounds the very cells the neck draws', () => {
  it('equals the neck chain for several chords, root strings included', () => {
    const cases = [
      [0, 'chord_major', null],
      [7, 'chord_major', null],
      [0, 'chord_major', 4], // the Studio's chosen root string changes the position
      [2, 'chord_m7', null],
    ];
    for (const [rootPc, chordType, rootString] of cases) {
      const fingering = getGuitarFingering(rootPc, chordType, rootString, 0);
      const expected = shapeCellsFromFingering(fingering, NECK_STRINGS);
      expect(guitarGripCells({ rootPc, chordType, rootString })).toEqual(expected);
    }
  });

  it('draws the open C shape (x32010) with each sounding pitch', () => {
    expect(guitarGripCells({ rootPc: 0, chordType: 'chord_major' })).toEqual([
      { stringIndex: 0, fret: 0, absoluteValue: 64 }, // high E open
      { stringIndex: 1, fret: 1, absoluteValue: 60 }, // B, fret 1 -> C4
      { stringIndex: 2, fret: 0, absoluteValue: 55 }, // G open
      { stringIndex: 3, fret: 2, absoluteValue: 52 }, // D, fret 2 -> E3
      { stringIndex: 4, fret: 3, absoluteValue: 48 }, // A, fret 3 -> C3
    ]);
  });
});
