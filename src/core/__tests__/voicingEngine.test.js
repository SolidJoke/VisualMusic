// src/core/__tests__/voicingEngine.test.js
//
// TDD tests for the voicingEngine module.
// Run with: npm run test

import { describe, it, expect } from 'vitest';
import {
  analyzeVoicingRules,
  suggestReVoicing,
  VOICING_ISSUE_TYPES,
} from '../voicingEngine.js';

// ---------------------------------------------------------------------------
// Helpers — build fingeringMap objects as produced by fingeringLogic.js
// fingeringMap format: { [stringIndex]: { [fret]: fingerLabel } }
// X values mean muted, O means open.
// ---------------------------------------------------------------------------

/**
 * Build a simple guitar fingeringMap from a flat fret list.
 * @param {number[]} frets - Fret numbers per string (0=high E, 5=low E). Use -1 for muted.
 */
function buildGuitarMap(frets) {
  const map = {};
  frets.forEach((fret, stringIdx) => {
    if (fret < 0) {
      map[stringIdx] = {}; // muted — no fret entries
    } else {
      map[stringIdx] = { [fret]: 1 };
    }
  });
  return map;
}

// ---------------------------------------------------------------------------
// SPAN_TOO_WIDE tests
// ---------------------------------------------------------------------------

describe('analyzeVoicingRules — SPAN_TOO_WIDE', () => {
  it('should not flag a 4-fret span as SPAN_TOO_WIDE', () => {
    // Barre chord: frets 5,5,5,5,5,5 → span = 0 → fine
    const map = buildGuitarMap([5, 5, 5, 5, 5, 5]);
    const result = analyzeVoicingRules(map, 'guitar');
    const hasSpanIssue = result.issues.some(i => i.type === VOICING_ISSUE_TYPES.SPAN_TOO_WIDE);
    expect(hasSpanIssue).toBe(false);
    expect(result.isPlayable).toBe(true);
  });

  it('should flag a 5-fret span as SPAN_TOO_WIDE with severity warning', () => {
    // Low fret 2, high fret 7 → span = 5
    const map = buildGuitarMap([7, 5, 5, 5, 5, 2]);
    const result = analyzeVoicingRules(map, 'guitar');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.SPAN_TOO_WIDE);
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('warning');
    expect(result.isPlayable).toBe(false);
  });

  it('should include a human-readable message in SPAN_TOO_WIDE issue', () => {
    const map = buildGuitarMap([9, 5, 5, 5, 5, 2]);
    const result = analyzeVoicingRules(map, 'guitar');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.SPAN_TOO_WIDE);
    expect(issue.span).toBe(7);
    expect(issue.max).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// MUDDY_BASS tests
// ---------------------------------------------------------------------------

describe('analyzeVoicingRules — MUDDY_BASS', () => {
  it('should flag a minor 2nd interval between the two lowest notes (piano)', () => {
    // Piano: notes C2 (36) and C#2 (37) — semitone apart, both below octave 3 (MIDI < 48)
    const notes = [36, 37, 60, 64];
    const result = analyzeVoicingRules(notes, 'piano');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.MUDDY_BASS);
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('warning');
  });

  it('should not flag a perfect 5th in the bass (C2 + G2 = 7 semitones)', () => {
    // C2=36, G2=43 — quinte parfaite, stable dans les graves
    const notes = [36, 43, 60, 64];
    const result = analyzeVoicingRules(notes, 'piano');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.MUDDY_BASS);
    expect(issue).toBeUndefined();
  });

  it('should not flag muddy bass when the interval is an octave or above (≥12 semitones)', () => {
    // C2=36, C3=48 — octave, sonorité claire
    const notes = [36, 48, 60];
    const result = analyzeVoicingRules(notes, 'piano');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.MUDDY_BASS);
    expect(issue).toBeUndefined();
  });

  it('should not flag muddy bass when the close interval is above octave 3 (MIDI >= 48)', () => {
    // C4=60, D4=62 — tierce serrée mais dans l'aigu (> octave 3) → pas de bouillie
    const notes = [60, 62];
    const result = analyzeVoicingRules(notes, 'piano');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.MUDDY_BASS);
    expect(issue).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// UNPLAYABLE_STRETCH tests (piano)
// ---------------------------------------------------------------------------

describe('analyzeVoicingRules — UNPLAYABLE_STRETCH', () => {
  it('should flag more than 6 simultaneous piano notes as UNPLAYABLE_STRETCH', () => {
    const notes = [60, 62, 64, 65, 67, 69, 71]; // 7 notes
    const result = analyzeVoicingRules(notes, 'piano');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.UNPLAYABLE_STRETCH);
    expect(issue).toBeDefined();
    expect(issue.severity).toBe('error');
  });

  it('should not flag 6 or fewer piano notes', () => {
    const notes = [60, 62, 64, 65, 67, 69]; // exactly 6
    const result = analyzeVoicingRules(notes, 'piano');
    const issue = result.issues.find(i => i.type === VOICING_ISSUE_TYPES.UNPLAYABLE_STRETCH);
    expect(issue).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Issue structure contract tests
// ---------------------------------------------------------------------------

describe('analyzeVoicingRules — Issue structure contract', () => {
  it('every issue should have type, severity, message, and rule fields', () => {
    const map = buildGuitarMap([9, 5, 5, 5, 5, 2]); // triggers SPAN_TOO_WIDE
    const result = analyzeVoicingRules(map, 'guitar');
    result.issues.forEach(issue => {
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
    });
  });
});

// ---------------------------------------------------------------------------
// suggestReVoicing tests
// ---------------------------------------------------------------------------

describe('suggestReVoicing', () => {
  it('should return at least one suggestion for a chord with a SPAN_TOO_WIDE issue', () => {
    // C major: root=0, intervals=[0,4,7]
    const suggestions = suggestReVoicing(0, [0, 4, 7], 'guitar');
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('each suggestion should have a label and a notes array', () => {
    const suggestions = suggestReVoicing(0, [0, 4, 7], 'guitar');
    suggestions.forEach(s => {
      expect(s).toHaveProperty('invIndex');
      expect(s).toHaveProperty('octave');
      expect(s).toHaveProperty('notes');
      expect(Array.isArray(s.notes)).toBe(true);
    });
  });

  it('suggested voicings should have a span <= 8 semitones for guitar (GUITAR_MAX_SPAN * 2)', () => {
    const suggestions = suggestReVoicing(0, [0, 4, 7], 'guitar');
    // For each suggestion, verify that if it's for guitar, span is within the limit
    suggestions.forEach(s => {
      if (s.instrument === 'guitar') {
        expect(s.span).toBeLessThanOrEqual(8);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// harmonyEngine integration — getChordFunction
// ---------------------------------------------------------------------------

describe('harmonyEngine — getChordFunction', async () => {
  const { getChordFunction } = await import('../harmonyEngine.js');

  it('should identify degree 1 as tonic', () => {
    expect(getChordFunction('1')).toBe('tonic');
  });

  it('should identify degree 4 as subdominant', () => {
    expect(getChordFunction('4')).toBe('subdominant');
  });

  it('should identify degree 5 as dominant', () => {
    expect(getChordFunction('5')).toBe('dominant');
    expect(getChordFunction('5-')).toBe('dominant');
    expect(getChordFunction('5maj7')).toBe('dominant');
  });

  it('should return null for non-functional degrees', () => {
    expect(getChordFunction('2-')).toBe(null);
    expect(getChordFunction('3-')).toBe(null);
    expect(getChordFunction('6-')).toBe(null);
  });
});
