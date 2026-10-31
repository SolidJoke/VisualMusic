// VMU-200 — a loop note placed near the drawn shape, read cell by cell.
//
// core/loopNotePlace.js decides WHICH cell; this file checks the neck honours
// that decision through computeFretMetadata — the same rule Fretboard.jsx
// renders. A nearShape note inside the shape lights exactly one cell with
// isPlaying; one outside lights exactly one cell with isPlayingOutside and
// none with isPlaying. A note tagged for another instrument lights nothing.
// The Dictionary's single note (tagged, no place, no nearShape) keeps lighting
// every place of its pitch.
import { describe, it, expect } from 'vitest';
import { computeFretMetadata } from '../fretboardUtils';
import { getBassFingering } from '../fingeringLogic';
import { TUNINGS } from '../tunings';
import { getAbsoluteNoteValue } from '../theory';
import { shapeCellsFromFingering } from '../loopNotePlace';

const TUNING = [...TUNINGS.BASS_STANDARD].reverse(); // neck order: G, D, A, E
const NUM_FRETS = 20;
const SHAPE = shapeCellsFromFingering(getBassFingering(0, 'chord_major', null, 0), TUNING);

const BASE = {
  appMode: 'dictionary',
  dictType: 'single_note',
  activeNotes: [],
  fingering: null,
  scaleAnchor: null,
  activeBrick: null,
  rootValue: 0,
  targetValues: [],
  notation: 'us',
  contextualScaleAbsoluteValues: [],
  activePath: [],
  showFingering: false,
  showFingerNumbers: false,
  singlePlayContext: null,
  shapeCells: SHAPE,
  tuning: TUNING,
  numFrets: NUM_FRETS,
};

/** Every cell of the neck under test, as computeFretMetadata answers it. */
function sweep(notes, instrument = 'bass', params = BASE) {
  const cells = [];
  for (let stringIndex = 0; stringIndex < params.tuning.length; stringIndex++) {
    const openStringAbsValue = getAbsoluteNoteValue(params.tuning[stringIndex]);
    for (let fret = 0; fret <= params.numFrets; fret++) {
      const meta = computeFretMetadata({
        ...params,
        instrument,
        stringIndex,
        fret,
        openStringAbsValue,
        currentlyPlayingNotes: notes,
      });
      cells.push({ stringIndex, fret, isPlaying: meta.isPlaying, isPlayingOutside: meta.isPlayingOutside });
    }
  }
  return cells;
}

const lit = (cells) => cells.filter((c) => c.isPlaying).map(({ stringIndex, fret }) => ({ stringIndex, fret }));
const outlined = (cells) =>
  cells.filter((c) => c.isPlayingOutside).map(({ stringIndex, fret }) => ({ stringIndex, fret }));

describe('computeFretMetadata — a nearShape bass loop note', () => {
  it('inside the shape: exactly that one cell, as the normal playing look', () => {
    // C2 (36) is the shape's A-string fret 3.
    const cells = sweep([{ absoluteValue: 36, instrument: 'bass', nearShape: true }]);
    expect(lit(cells)).toEqual([{ stringIndex: 2, fret: 3 }]);
    expect(outlined(cells)).toEqual([]);
  });

  it.each([
    ['G#2', 44, { stringIndex: 1, fret: 6 }],
    ['C#3', 49, { stringIndex: 0, fret: 6 }],
    ['F#3', 54, { stringIndex: 0, fret: 11 }],
  ])('outside the shape: %s (%i) is outlined on one cell, never filled', (_name, pitch, cell) => {
    const cells = sweep([{ absoluteValue: pitch, instrument: 'bass', nearShape: true }]);
    expect(outlined(cells)).toEqual([cell]);
    expect(lit(cells)).toEqual([]);
  });
});

describe('computeFretMetadata — the loop note belongs to one instrument', () => {
  it('a piano-tagged chord note lights nothing on a neck', () => {
    const cells = sweep([{ absoluteValue: 36, instrument: 'piano' }]);
    expect(lit(cells)).toEqual([]);
    expect(outlined(cells)).toEqual([]);
  });

  it('a bass-tagged note with nearShape lights nothing on another neck', () => {
    const guitarTuning = [...TUNINGS.GUITAR_STANDARD].reverse();
    const cells = sweep([{ absoluteValue: 36, instrument: 'bass', nearShape: true }], 'guitar', {
      ...BASE,
      shapeCells: [],
      tuning: guitarTuning,
    });
    expect(lit(cells)).toEqual([]);
    expect(outlined(cells)).toEqual([]);
  });
});

describe('computeFretMetadata — the Dictionary single note keeps its behaviour', () => {
  it('a tagged note with no place and no nearShape lights every place of the pitch', () => {
    // C3 (48) on the bass: G fret 5, D fret 10, A fret 15, E fret 20.
    const cells = sweep([{ absoluteValue: 48, instrument: 'bass' }]);
    expect(lit(cells)).toEqual([
      { stringIndex: 0, fret: 5 },
      { stringIndex: 1, fret: 10 },
      { stringIndex: 2, fret: 15 },
      { stringIndex: 3, fret: 20 },
    ]);
    expect(outlined(cells)).toEqual([]);
  });

  it('an unresolvable nearShape note (empty shape) falls back to every place', () => {
    const cells = sweep([{ absoluteValue: 48, instrument: 'bass', nearShape: true }], 'bass', {
      ...BASE,
      shapeCells: [],
    });
    expect(lit(cells)).toEqual([
      { stringIndex: 0, fret: 5 },
      { stringIndex: 1, fret: 10 },
      { stringIndex: 2, fret: 15 },
      { stringIndex: 3, fret: 20 },
    ]);
  });
});
