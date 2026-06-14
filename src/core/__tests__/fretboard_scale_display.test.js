// src/core/__tests__/fretboard_scale_display.test.js
// Regression tests for computeFretMetadata in scale mode (SCALE-02b)
// Tests T1-T6 must stay GREEN before AND after the fix.

import { describe, it, expect } from 'vitest';
import { computeFretMetadata } from '../fretboardUtils.js';
import { getScaleNotesGeneric, resolveScaleIntervals } from '../theory.js';

// Helper: build activeNotes for C major at dictOctave=0
// formula: absoluteValue = noteValue + (4+0+1)*12 = noteValue + 60
function cMajorActiveNotes() {
  const scaleData = resolveScaleIntervals('scale_major');
  return getScaleNotesGeneric(0, scaleData.intervals).map(n => ({
    ...n,
    absoluteValue: n.value + 60
  }));
}

const BASE_PARAMS = {
  appMode: 'dictionary',
  dictType: 'scale_major',
  activeNotes: cMajorActiveNotes(),
  currentlyPlayingNotes: [],
  fingering: null,
  scaleAnchor: null,
  activeBrick: null,
  rootValue: 0,
  targetValue: -1,
  notation: 'us',
  showFingering: false,
  fingeringMode: 'numeric',
  contextualScaleAbsoluteValues: [],
  activePath: [],
  instrument: 'guitar',
};

// T1 — Baseline: scale mode, no anchor, C on high E string fret 8 is active
describe('T1: baseline scale mode pitch class matching', () => {
  it('high E string fret 8 (MIDI 72 = C5, noteValue=0) is active for C major', () => {
    // E4 open = MIDI 64, fret 8 = MIDI 72, noteValue = 0 (C) → in C major
    const result = computeFretMetadata({
      ...BASE_PARAMS,
      stringIndex: 0,
      fret: 8,
      openStringAbsValue: 64, // E4
    });
    expect(result.isActive).toBe(true);
  });

  it('high E string fret 9 (MIDI 73 = C#5, noteValue=1) is NOT active for C major', () => {
    const result = computeFretMetadata({
      ...BASE_PARAMS,
      stringIndex: 0,
      fret: 9,
      openStringAbsValue: 64,
    });
    expect(result.isActive).toBe(false);
  });
});

// T2 — scaleFrets mask: with scaleFrets, only listed positions are active
describe('T2: scaleFrets mask — only listed frets active', () => {
  const fingeringWithScaleFrets = {
    scaleFrets: [
      { stringIndex: 0, fret: 8, noteValue: 0 }, // C on high E
      { stringIndex: 1, fret: 1, noteValue: 0 },  // C on B — would be duplicate but included here for test
    ]
  };

  it('fret in scaleFrets is active', () => {
    const result = computeFretMetadata({
      ...BASE_PARAMS,
      fingering: fingeringWithScaleFrets,
      stringIndex: 0,
      fret: 8,
      openStringAbsValue: 64,
    });
    expect(result.isActive).toBe(true);
  });

  it('fret NOT in scaleFrets is inactive even if pitch class matches', () => {
    // B3 string (open=59), fret 13 = MIDI 72 = C5, noteValue=0 (C) → pitch class OK but not in scaleFrets
    const result = computeFretMetadata({
      ...BASE_PARAMS,
      fingering: fingeringWithScaleFrets,
      stringIndex: 1,
      fret: 13,
      openStringAbsValue: 59,
    });
    expect(result.isActive).toBe(false);
  });
});

// T3 — scaleAnchor: outside box → inactive
describe('T3: scaleAnchor — outside box is inactive', () => {
  it('fret 0 is inactive when anchor at fret 5 (box = frets 4-9)', () => {
    const result = computeFretMetadata({
      ...BASE_PARAMS,
      scaleAnchor: { fret: 5, stringIndex: 0, absoluteValue: 65 },
      stringIndex: 0,
      fret: 0,
      openStringAbsValue: 64,
    });
    expect(result.isActive).toBe(false);
  });
});

// T4 — scaleAnchor: inside box → respects pitch class
describe('T4: scaleAnchor — inside box respects pitch class', () => {
  it('C at fret 8 (inside box anchor=5, box=4-9) is active for C major', () => {
    const result = computeFretMetadata({
      ...BASE_PARAMS,
      scaleAnchor: { fret: 5, stringIndex: 0, absoluteValue: 69 }, // A4
      stringIndex: 0,
      fret: 8,       // MIDI 72 = C5, noteValue=0 ✓
      openStringAbsValue: 64,
    });
    expect(result.isActive).toBe(true);
  });
});
