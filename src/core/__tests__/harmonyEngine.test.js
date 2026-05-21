// src/core/__tests__/harmonyEngine.test.js
//
// TDD tests for the harmonyEngine module.
// Run with: npm run test

import { describe, it, expect } from 'vitest';
import {
  THEORY_MODES,
  getChordFunction,
  isResolutionRequired,
  getIntervalVector,
  getDissonanceScore,
  chordToPitchClasses,
  SONG_STRUCTURES,
  getInversionType,
  getChordIntervalLabel,
} from '../harmonyEngine.js';

// ---------------------------------------------------------------------------
// getChordFunction
// ---------------------------------------------------------------------------

describe('getChordFunction', () => {
  it('should identify degree 1 as tonic', () => {
    expect(getChordFunction('1')).toBe('tonic');
  });

  it('should identify degree 4 as subdominant', () => {
    expect(getChordFunction('4')).toBe('subdominant');
    expect(getChordFunction('4-')).toBe('subdominant');
  });

  it('should identify degree 5 as dominant in all its variants', () => {
    expect(getChordFunction('5')).toBe('dominant');
    expect(getChordFunction('5-')).toBe('dominant');
    expect(getChordFunction('5maj7')).toBe('dominant');
    expect(getChordFunction('57')).toBe('dominant');
  });

  it('should return null for non-functional degrees (II, III, VI, VII)', () => {
    expect(getChordFunction('2-')).toBeNull();
    expect(getChordFunction('3-')).toBeNull();
    expect(getChordFunction('6-')).toBeNull();
    expect(getChordFunction('7°')).toBeNull();
  });

  it('should return null for null or invalid input', () => {
    expect(getChordFunction(null)).toBeNull();
    expect(getChordFunction('')).toBeNull();
    expect(getChordFunction(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isResolutionRequired
// ---------------------------------------------------------------------------

describe('isResolutionRequired', () => {
  it('should require resolution for V7 in CLASSICAL mode', () => {
    expect(isResolutionRequired('5', THEORY_MODES.CLASSICAL)).toBe(true);
    expect(isResolutionRequired('5-', THEORY_MODES.CLASSICAL)).toBe(true);
  });

  it('should NOT require resolution for I or IV in CLASSICAL mode', () => {
    expect(isResolutionRequired('1', THEORY_MODES.CLASSICAL)).toBe(false);
    expect(isResolutionRequired('4', THEORY_MODES.CLASSICAL)).toBe(false);
  });

  it('should never require resolution in MODERN mode', () => {
    expect(isResolutionRequired('5', THEORY_MODES.MODERN)).toBe(false);
    expect(isResolutionRequired('1', THEORY_MODES.MODERN)).toBe(false);
    expect(isResolutionRequired('7°', THEORY_MODES.MODERN)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getIntervalVector (Set Theory)
// ---------------------------------------------------------------------------

describe('getIntervalVector', () => {
  it('should return [0,0,1,1,1,0] for a major triad (C major = [0,4,7])', () => {
    // C major: intervals are m3(3), M3(4), P4(5) → vector indices 2,3,4
    // Actually: C→E=4(M3), C→G=7(P5), E→G=3(m3)
    // Interval classes: 4→M3(idx3), 7→P5(idx4), 3→m3(idx2)
    expect(getIntervalVector([0, 4, 7])).toEqual([0, 0, 1, 1, 1, 0]);
  });

  it('should return [0,0,0,3,0,0] for a diminished triad (C dim = [0,3,6])', () => {
    // C→Eb=3(m3), C→Gb=6(TT), Eb→Gb=3(m3)
    // Interval classes: 3→idx2, 6→idx5, 3→idx2 → [0,0,2,0,0,1]
    expect(getIntervalVector([0, 3, 6])).toEqual([0, 0, 2, 0, 0, 1]);
  });

  it('should return a 6-element array for any input', () => {
    const result = getIntervalVector([0, 2, 4, 5, 7, 9, 11]);
    expect(result).toHaveLength(6);
    result.forEach(v => expect(typeof v).toBe('number'));
  });

  it('should handle pitch classes > 12 by applying modulo', () => {
    // C=0, E=4 (same as C=12, E=16)
    expect(getIntervalVector([0, 4, 7])).toEqual(getIntervalVector([12, 16, 19]));
  });

  it('should return all zeros for a single pitch class', () => {
    expect(getIntervalVector([0])).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// getDissonanceScore
// ---------------------------------------------------------------------------

describe('getDissonanceScore', () => {
  it('major triad should have a lower dissonance score than a tritone-containing chord', () => {
    const majorVector = getIntervalVector([0, 4, 7]);    // [0,0,1,1,1,0]
    const tritoneVector = getIntervalVector([0, 6]);     // [0,0,0,0,0,1]
    expect(getDissonanceScore(majorVector)).toBeLessThan(getDissonanceScore(tritoneVector));
  });

  it('should return 0 for a zero vector', () => {
    expect(getDissonanceScore([0, 0, 0, 0, 0, 0])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// chordToPitchClasses
// ---------------------------------------------------------------------------

describe('chordToPitchClasses', () => {
  it('should convert C major (root=0, intervals=[0,4,7]) to [0,4,7]', () => {
    expect(chordToPitchClasses(0, [0, 4, 7])).toEqual([0, 4, 7]);
  });

  it('should convert G major (root=7, intervals=[0,4,7]) to [7,11,2]', () => {
    expect(chordToPitchClasses(7, [0, 4, 7])).toEqual([7, 11, 2]);
  });

  it('all pitch classes should be in range 0–11', () => {
    const pcs = chordToPitchClasses(10, [0, 4, 7, 11]); // A# major 7
    pcs.forEach(pc => {
      expect(pc).toBeGreaterThanOrEqual(0);
      expect(pc).toBeLessThanOrEqual(11);
    });
  });
});

// ---------------------------------------------------------------------------
// SONG_STRUCTURES
// ---------------------------------------------------------------------------

describe('SONG_STRUCTURES', () => {
  it('should define ABA, RONDO, and SONATA structures', () => {
    expect(SONG_STRUCTURES).toHaveProperty('ABA');
    expect(SONG_STRUCTURES).toHaveProperty('RONDO');
    expect(SONG_STRUCTURES).toHaveProperty('SONATA');
  });

  it('each structure should have name, description, and sections array', () => {
    Object.values(SONG_STRUCTURES).forEach(structure => {
      expect(structure).toHaveProperty('name');
      expect(structure).toHaveProperty('description');
      expect(Array.isArray(structure.sections)).toBe(true);
      expect(structure.sections.length).toBeGreaterThan(0);
    });
  });

  it('each section should have label, role, tension, and harmonicHint', () => {
    Object.values(SONG_STRUCTURES).forEach(structure => {
      structure.sections.forEach(section => {
        expect(section).toHaveProperty('label');
        expect(section).toHaveProperty('role');
        expect(section).toHaveProperty('tension');
        expect(section).toHaveProperty('harmonicHint');
      });
    });
  });

  it('ABA structure should start and end with low tension (tonic)', () => {
    const { sections } = SONG_STRUCTURES.ABA;
    expect(sections[0].tension).toBe('low');
    expect(sections[sections.length - 1].tension).toBe('low');
  });

  it('ABA middle section (B) should have high tension', () => {
    const { sections } = SONG_STRUCTURES.ABA;
    expect(sections[1].tension).toBe('high');
  });
});

// ---------------------------------------------------------------------------
// getInversionType
// ---------------------------------------------------------------------------

describe('getInversionType', () => {
  it('should detect root position when bass = root (C major, bass=C)', () => {
    // C=0, bass MIDI 60 (C4), root=0 → bassClass=0 === rootValue
    expect(getInversionType(60, 0, '1')).toBe('root');
  });

  it('should detect first inversion when bass = third (C major, bass=E)', () => {
    // E=4, bass MIDI 64 (E4), root=0, major chord → thirdVal=4
    expect(getInversionType(64, 0, '1')).toBe('first');
  });

  it('should detect second inversion when bass = fifth (C major, bass=G)', () => {
    // G=7, bass MIDI 67 (G4), root=0, major chord → fifthVal=7
    expect(getInversionType(67, 0, '1')).toBe('second');
  });

  it('should detect root position for minor chord (Am, bass=A)', () => {
    // A=9, bass MIDI 57 (A3), root=9, minor chord
    expect(getInversionType(57, 9, '6-')).toBe('root');
  });

  it('should use dim5 for diminished chords (Bdim, bass=F)', () => {
    // Bdim: root=11, isDim=true → fifthVal=(11+6)%12=5 (F)
    // bass MIDI 65 (F4) → bassClass=5 === fifthVal → 'second'
    expect(getInversionType(65, 11, '7°')).toBe('second');
  });

  it('should return unknown for unrecognised bass note', () => {
    // C major but bass=D (not root/third/fifth)
    expect(getInversionType(62, 0, '1')).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// getChordIntervalLabel
// ---------------------------------------------------------------------------

describe('getChordIntervalLabel', () => {
  it('should return 1 for index 0 (root)', () => {
    expect(getChordIntervalLabel(0, 0)).toBe(1);
  });

  it('should return "b3" for semitone 3 (minor 3rd)', () => {
    expect(getChordIntervalLabel(1, 3)).toBe('b3');
  });

  it('should return 3 for semitone 4 (major 3rd)', () => {
    expect(getChordIntervalLabel(1, 4)).toBe(3);
  });

  it('should return "b5" for semitone 6 (tritone)', () => {
    expect(getChordIntervalLabel(2, 6)).toBe('b5');
  });

  it('should return 5 for semitone 7 (perfect 5th)', () => {
    expect(getChordIntervalLabel(2, 7)).toBe(5);
  });

  it('should return "b7" for semitone 10 (minor 7th)', () => {
    expect(getChordIntervalLabel(3, 10)).toBe('b7');
  });

  it('should return 7 for semitone 11 (major 7th)', () => {
    expect(getChordIntervalLabel(3, 11)).toBe(7);
  });

  it('should return 9 for semitone > 12 (9th extension)', () => {
    expect(getChordIntervalLabel(4, 14)).toBe(9);
  });

  it('should return "2" for semitone 2 (sus2 second)', () => {
    // sus2 chord: [0, 2, 7] — the second (semitone 2) must be labeled '2', not the fallback
    expect(getChordIntervalLabel(1, 2)).toBe('2');
  });

  it('should return "4" for semitone 5 (sus4 fourth)', () => {
    // sus4 chord: [0, 5, 7] — the fourth (semitone 5) must be labeled '4', not the fallback
    expect(getChordIntervalLabel(1, 5)).toBe('4');
  });

  it('should return index+2 as fallback for genuinely unlabeled intervals (e.g. aug5)', () => {
    // aug chord: [0, 4, 8] — semitone 8 has no explicit case → falls to index+2 = 2+2 = 4
    // This is acceptable as a display fallback for unusual intervals
    expect(getChordIntervalLabel(2, 8)).toBe(4);
  });
});
