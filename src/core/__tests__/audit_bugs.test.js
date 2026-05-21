// src/core/__tests__/audit_bugs.test.js
//
// TDD tests for bugs identified by ARIA audit (2026-05-21).
// These tests document the EXPECTED CORRECT behavior.
// They should FAIL before fixes and PASS after.

import { describe, it, expect } from 'vitest';
import { suggestReVoicing } from '../voicingEngine.js';
import { getChordIntervalLabel } from '../harmonyEngine.js';
import { getAvailableScaleFingerings } from '../fingeringLogic.js';
import { resolveScaleSemitones, SCALES, getChordNotesAbsolute } from '../theory.js';

// ============================================================================
// BUG-DT-01: MIDI Octave Off-by-One in voicingEngine.suggestReVoicing
// ============================================================================
describe('BUG-DT-01: suggestReVoicing MIDI consistency', () => {
  // Reference: theory.js getChordNotesAbsolute uses (octave+1)*12
  // MIDI standard: C4 = 60, C3 = 48, C5 = 72

  it('should produce C major root position at octave 4 starting near MIDI 60 (C4)', () => {
    // C major = root 0, intervals [0, 4, 7]
    const suggestions = suggestReVoicing(0, [0, 4, 7], 'piano');
    // Find the root position at octave 4
    const oct4Root = suggestions.find(s =>
      s.octave === 4 && s.invIndex === 0
    );

    expect(oct4Root).toBeDefined();
    // In MIDI standard, C4 = 60. The chord should be [60, 64, 67]
    // Using (octave+1)*12: 4*12 + (4+1 -4)*12 ... no, let's check:
    // getChordNotesAbsolute(0, [0,4,7], 4) = [(4+1)*12 + 0, (4+1)*12 + 4, (4+1)*12 + 7] = [60, 64, 67]
    const reference = getChordNotesAbsolute(0, [0, 4, 7], 4);
    expect(reference).toEqual([60, 64, 67]);

    // suggestReVoicing at octave 4 root position should match
    expect(oct4Root.notes).toEqual([60, 64, 67]);
  });

  it('should produce notes consistent with getChordNotesAbsolute for octave 3', () => {
    // A minor at octave 3: root=9, intervals=[0, 3, 7]
    const reference = getChordNotesAbsolute(9, [0, 3, 7], 3);
    // (3+1)*12 + 9 = 57, +3 = 60, +7 = 64 → [57, 60, 64]
    expect(reference).toEqual([57, 60, 64]);

    const suggestions = suggestReVoicing(9, [0, 3, 7], 'piano');
    const oct3Root = suggestions.find(s =>
      s.octave === 3 && s.invIndex === 0
    );

    expect(oct3Root).toBeDefined();
    expect(oct3Root.notes).toEqual([57, 60, 64]);
  });
});

// ============================================================================
// BUG-DT-02: SCALE_SEMITONES duplication in fingeringLogic.js
// ============================================================================
describe('BUG-DT-02: Scale semitone consistency theory.js ↔ fingeringLogic.js', () => {
  // The fretboard scale fingerings should use the same semitone data as theory.js.
  // If fingeringLogic has its own copy, any new scale in theory.js but missing
  // in fingeringLogic will silently fallback to major.

  const guitarStrings = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];

  // Test every scale defined in theory.js SCALES registry
  Object.keys(SCALES).forEach(scaleKey => {
    it(`should generate fretboard positions for ${scaleKey} matching theory.js semitones`, () => {
      const theorySemitones = resolveScaleSemitones(scaleKey);
      expect(theorySemitones).not.toBeNull();

      // Get fretboard positions for root C (0)
      const positions = getAvailableScaleFingerings(0, scaleKey, 'guitar', guitarStrings);
      expect(positions.length).toBeGreaterThan(0);

      // The pitch classes used in the fretboard should match theory.js
      const expectedPitchClasses = new Set(theorySemitones.map(s => s % 12));

      // Check the first position: every scaleFret noteValue should be in expectedPitchClasses
      const firstPos = positions[0];
      const fretboardPitchClasses = new Set(firstPos.scaleFrets.map(sf => sf.noteValue));

      // Every note on the fretboard should be a valid scale note
      fretboardPitchClasses.forEach(pc => {
        expect(expectedPitchClasses.has(pc)).toBe(true);
      });
    });
  });
});

// ============================================================================
// BUG-DT-03: getChordIntervalLabel incorrect for sus2 and sus4
// ============================================================================
describe('BUG-DT-03: getChordIntervalLabel for suspended chords', () => {
  // sus2 chord intervals: [0, 2, 7]
  // Index 0 → semitone 0 → should return 1 (root) ✅
  // Index 1 → semitone 2 → should return '2' (the second)
  // Index 2 → semitone 7 → should return 5 (the fifth) ✅

  it('should label the second of a sus2 chord as "2", not "3"', () => {
    // sus2: [0, 2, 7] — index 1, semitone 2
    const label = getChordIntervalLabel(1, 2);
    expect(label).toBe('2');
  });

  it('should label the fourth of a sus4 chord as "4", not "3"', () => {
    // sus4: [0, 5, 7] — index 1, semitone 5
    const label = getChordIntervalLabel(1, 5);
    expect(label).toBe('4');
  });

  // Verify existing correct labels aren't broken
  it('should still label root correctly', () => {
    expect(getChordIntervalLabel(0, 0)).toBe(1);
  });

  it('should still label b3 correctly', () => {
    expect(getChordIntervalLabel(1, 3)).toBe('b3');
  });

  it('should still label major 3rd correctly', () => {
    expect(getChordIntervalLabel(1, 4)).toBe(3);
  });

  it('should still label 5th correctly', () => {
    expect(getChordIntervalLabel(2, 7)).toBe(5);
  });

  it('should still label b7 correctly', () => {
    expect(getChordIntervalLabel(3, 10)).toBe('b7');
  });

  it('should still label 7th correctly', () => {
    expect(getChordIntervalLabel(3, 11)).toBe(7);
  });

  // Additional edge case: augmented 5th (semitone 8)
  it('should label augmented 5th (semitone 8) reasonably', () => {
    // aug chord: [0, 4, 8] — index 2, semitone 8
    // Currently falls through to index+2=4. Could be '#5' or 'b6'.
    // At minimum, should not crash.
    const label = getChordIntervalLabel(2, 8);
    expect(label).toBeDefined();
  });
});

// ============================================================================
// BUG-DT-04: Dead code branch in voicingEngine (informational — no fix needed)
// ============================================================================
describe('BUG-DT-04: analyzeVoicingRules dead code path', () => {
  // Lines 76-79: guitar/bass + Array.isArray(voicing) is unreachable
  // because guitar/bass voicings are always fingeringMap objects.
  // This test documents the expectation that guitar voicings are objects.

  it('guitar voicings from fingeringLogic are objects, not arrays', async () => {
    const { getGuitarFingering } = await import('../fingeringLogic.js');
    const cmaj = getGuitarFingering(0, 'chord_major');
    expect(cmaj).toHaveProperty('fingeringMap');
    expect(Array.isArray(cmaj.fingeringMap)).toBe(false);
    expect(typeof cmaj.fingeringMap).toBe('object');
  });
});
