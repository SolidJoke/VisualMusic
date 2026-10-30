// VMU-180 point 5 — what a neck flashes for a published note.
// A pitch tagged with the neck's instrument but with no string or fret (a single
// note played by the guitar: its realization carries no place) flashes every
// place of that pitch on THAT neck, and only there. An untagged object keeps
// flashing nothing, as before; a bare pitch keeps flashing every neck, as before.
import { describe, it, expect } from 'vitest';
import { computeFretMetadata } from '../fretboardUtils.js';

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
};

// C4 (60): the guitar's B string (open 59) fret 1, the bass's G string (open 43) fret 17.
const guitarCell = { ...BASE, instrument: 'guitar', stringIndex: 1, fret: 1, openStringAbsValue: 59 };
const bassCell = { ...BASE, instrument: 'bass', stringIndex: 0, fret: 17, openStringAbsValue: 43 };

describe("computeFretMetadata — a pitch tagged with the neck's instrument and no place", () => {
  it("flashes the guitar neck's cell of that pitch when tagged guitar", () => {
    const notes = [{ absoluteValue: 60, instrument: 'guitar' }];
    expect(computeFretMetadata({ ...guitarCell, currentlyPlayingNotes: notes }).isPlaying).toBe(true);
  });

  it("does not flash the bass neck's cell of the same pitch", () => {
    const notes = [{ absoluteValue: 60, instrument: 'guitar' }];
    expect(computeFretMetadata({ ...bassCell, currentlyPlayingNotes: notes }).isPlaying).toBe(false);
  });

  it('guard: an object with no instrument and no place still flashes nothing', () => {
    const notes = [{ absoluteValue: 60 }];
    expect(computeFretMetadata({ ...guitarCell, currentlyPlayingNotes: notes }).isPlaying).toBe(false);
  });

  it('guard: a bare pitch still flashes the cell of that pitch on any neck', () => {
    expect(computeFretMetadata({ ...guitarCell, currentlyPlayingNotes: [60] }).isPlaying).toBe(true);
    expect(computeFretMetadata({ ...bassCell, currentlyPlayingNotes: [60] }).isPlaying).toBe(true);
  });

  it('guard: a placed note still flashes only its own cell', () => {
    const notes = [{ absoluteValue: 60, stringIndex: 1, fret: 1, instrument: 'guitar' }];
    expect(computeFretMetadata({ ...guitarCell, currentlyPlayingNotes: notes }).isPlaying).toBe(true);
    const other = { ...guitarCell, stringIndex: 2, fret: 5, openStringAbsValue: 55 };
    expect(computeFretMetadata({ ...other, currentlyPlayingNotes: notes }).isPlaying).toBe(false);
  });
});
