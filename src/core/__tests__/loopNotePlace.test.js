// VMU-200 — where a Studio loop note that is not in the drawn shape is shown.
//
// The bass neck keeps drawing the current chord's shape while the loop plays.
// A loop note inside that shape lights its cell; one outside has no cell of its
// own on the neck, so it is outlined at ONE place: the playable cell of that
// pitch nearest the shape's fret span, ties broken by the string nearest the
// shape's strings, then by the lower fret. `placeNearShape` is the oracle;
// these are the C-77 "Jazz Standard" notes against a real C major bass shape
// (getBassFingering(0, "chord_major", null, 0)).
import { describe, it, expect } from 'vitest';
import { getBassFingering } from '../fingeringLogic';
import { TUNINGS } from '../tunings';
import { placeNearShape, shapeCellsFromFingering } from '../loopNotePlace';

// The neck's own string order: index 0 is the highest string (G), as
// useFretboard reverses the low-to-high tuning before handing it to the neck.
const BASS_TUNING = [...TUNINGS.BASS_STANDARD].reverse();
const NUM_FRETS = 20;

const C_MAJOR_BASS = getBassFingering(0, 'chord_major', null, 0);
const SHAPE = shapeCellsFromFingering(C_MAJOR_BASS, BASS_TUNING);

const place = (pitch) =>
  placeNearShape({ pitch, shapeCells: SHAPE, tuning: BASS_TUNING, numFrets: NUM_FRETS });

describe('shapeCellsFromFingering — the cells the neck draws for the shape', () => {
  it('reads the real C major bass fingering in the neck string indexing', () => {
    expect(
      [...SHAPE].sort((a, b) => a.stringIndex - b.stringIndex),
    ).toEqual([
      { stringIndex: 0, fret: 5, absoluteValue: 48 }, // G string, C3
      { stringIndex: 1, fret: 5, absoluteValue: 43 }, // D string, G2
      { stringIndex: 2, fret: 3, absoluteValue: 36 }, // A string, C2
    ]);
  });

  it('draws nothing for a scale box or an absent fingering', () => {
    expect(shapeCellsFromFingering({ scaleFrets: [], isScaleMode: true }, BASS_TUNING)).toEqual([]);
    expect(shapeCellsFromFingering(null, BASS_TUNING)).toEqual([]);
  });
});

describe('placeNearShape — a loop note against the drawn shape', () => {
  it.each([
    ['C2', 36, { stringIndex: 2, fret: 3, inShape: true }],
    ['G2', 43, { stringIndex: 1, fret: 5, inShape: true }],
    ['C3', 48, { stringIndex: 0, fret: 5, inShape: true }],
  ])('%s (%i) is in the shape: that very cell, inShape', (_name, pitch, expected) => {
    expect(place(pitch)).toEqual(expected);
  });

  it.each([
    // C-77 Jazz Standard notes, outside every drawn bass shape.
    ['G#2', 44, { stringIndex: 1, fret: 6, inShape: false }], // fret distance 1 to the [3,5] span
    ['C#3', 49, { stringIndex: 0, fret: 6, inShape: false }],
    ['D#3', 51, { stringIndex: 0, fret: 8, inShape: false }],
    ['E3', 52, { stringIndex: 0, fret: 9, inShape: false }],
    ['F#3', 54, { stringIndex: 0, fret: 11, inShape: false }],
  ])('%s (%i) is outside: the nearest playable cell, outlined', (_name, pitch, expected) => {
    expect(place(pitch)).toEqual(expected);
  });

  it('breaks a fret-distance tie by the string nearest the shape strings', () => {
    // Three identical open strings; the shape holds string 1 fret 5. The pitch
    // (the open string) is at fret 0 on every string — equal fret distance 5 —
    // so the shape's own string wins over its two neighbours.
    const tuning = ['C3', 'C3', 'C3'];
    const shapeCells = [{ stringIndex: 1, fret: 5, absoluteValue: 53 }];
    expect(placeNearShape({ pitch: 48, shapeCells, tuning, numFrets: 12 })).toEqual({
      stringIndex: 1,
      fret: 0,
      inShape: false,
    });
  });

  it('breaks a remaining tie by the lower fret', () => {
    // One string, shape at fret 6: the pitch (open C3, 48) sounds at fret 0 and
    // fret 12, both a distance of 6 from the span — the lower fret is chosen.
    const tuning = ['C3'];
    const shapeCells = [{ stringIndex: 0, fret: 6, absoluteValue: 54 }];
    expect(placeNearShape({ pitch: 48, shapeCells, tuning, numFrets: 12 })).toEqual({
      stringIndex: 0,
      fret: 0,
      inShape: false,
    });
  });

  it('returns null when the pitch has no playable cell', () => {
    expect(place(20)).toBeNull(); // below the bass's low E1 (28)
    expect(place(100)).toBeNull(); // above fret 20 on every string
  });

  it('returns null with an empty shape (the caller keeps today’s behaviour)', () => {
    expect(placeNearShape({ pitch: 44, shapeCells: [], tuning: BASS_TUNING, numFrets: NUM_FRETS })).toBeNull();
    expect(placeNearShape({ pitch: 44, shapeCells: undefined, tuning: BASS_TUNING, numFrets: NUM_FRETS })).toBeNull();
  });

  it('respects numFrets: a cell past the last fret is not playable', () => {
    const tuning = ['E1'];
    const shapeCells = [{ stringIndex: 0, fret: 12, absoluteValue: 40 }];
    // E3 (52) sits at fret 24 on the low E string.
    expect(placeNearShape({ pitch: 52, shapeCells, tuning, numFrets: 20 })).toBeNull();
    expect(placeNearShape({ pitch: 52, shapeCells, tuning, numFrets: 24 })).toEqual({
      stringIndex: 0,
      fret: 24,
      inShape: false,
    });
  });
});
