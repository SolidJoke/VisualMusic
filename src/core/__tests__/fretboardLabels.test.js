// src/core/__tests__/fretboardLabels.test.js
// VMU-111 §5 — a fretted note's label defaults to its degree; finger
// numbers (1-4) show only on demand via the separate showFingerNumbers
// flag. showFingering itself is untouched: it keeps gating the voicing
// mask (see fretboard_scale_display.test.js / resolveVoicingMask) and the
// position selector (InstrumentView.test.jsx), independent of the label.
import { describe, it, expect } from 'vitest';
import { computeFretMetadata } from '../fretboardUtils.js';

// A single fretted note: string 0, fret 3, played with finger 2 (middle),
// and the third of the chord (order '3') — chosen so the degree label
// ("3") and the finger label ("2") can never be confused with each other.
const fingering = {
  fingeringMap: {
    0: { status: 'played', fret: 3, finger: 2 },
  },
};

const BASE_PARAMS = {
  appMode: 'dictionary', // isVoicingMaskActive doesn't need showFingering here
  dictType: 'chord_major',
  activeNotes: [{ value: 3, absoluteValue: 63, order: '3' }],
  currentlyPlayingNotes: [],
  fingering,
  scaleAnchor: null,
  activeBrick: null,
  rootValue: 0,
  targetValues: [],
  notation: 'us',
  contextualScaleAbsoluteValues: [],
  activePath: [],
  instrument: 'guitar',
  stringIndex: 0,
  fret: 3,
  openStringAbsValue: 60, // + fret 3 = absoluteValue 63, noteValue 3
};

describe('computeFretMetadata — note labels (VMU-111 §5)', () => {
  it('by default (showFingerNumbers off) a fretted chord note carries its degree label, not a finger', () => {
    const result = computeFretMetadata({ ...BASE_PARAMS, showFingering: true, showFingerNumbers: false });
    expect(result.isActive).toBe(true);
    expect(result.label).toBe('3'); // degree, not finger '2'
  });

  it('with showFingerNumbers on, the label switches to the finger number (1-4)', () => {
    const result = computeFretMetadata({ ...BASE_PARAMS, showFingering: true, showFingerNumbers: true });
    expect(result.label).toBe('2'); // finger 2 -> numeric label '2'
  });

  it('never produces an anatomic letter (I/M/A/m) regardless of showFingerNumbers', () => {
    const off = computeFretMetadata({ ...BASE_PARAMS, showFingering: true, showFingerNumbers: false });
    const on = computeFretMetadata({ ...BASE_PARAMS, showFingering: true, showFingerNumbers: true });
    expect(['I', 'M', 'A', 'm']).not.toContain(off.label);
    expect(['I', 'M', 'A', 'm']).not.toContain(on.label);
  });

  it('showFingerNumbers being on does not depend on showFingering (label logic is decoupled from the voicing-mask/position-selector flag)', () => {
    // showFingering: false here — the voicing mask and position selector
    // would be affected by this in the app, but the label swap must not be.
    const result = computeFretMetadata({ ...BASE_PARAMS, showFingering: false, showFingerNumbers: true });
    expect(result.label).toBe('2');
  });
});
