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
  getRoleForDegreeLabel,
} from '../harmonyEngine.js';
import { CHORDS } from '../theory.js';

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

  // --- VMU-146 fix2 — the coordinator's probe over the full CHORDS catalog
  // (see harmonyEngine.js:213) found two semitones whose label depended on
  // which caller's index convention was used: fretboardActiveNotes and
  // realization.js always pass index -1, while the piano/Dictionary
  // producers pass the note's real position. Both must agree.
  it('should return "1" for semitone 0 regardless of index — root, both conventions (VMU-146 fix2)', () => {
    // Before fix2 this only worked for index -1 BY COINCIDENCE of the
    // index+2 fallback (-1 + 2 = 1); any other index landed on 1 only
    // because index===0 was checked explicitly. Now semitone 0 is the rule.
    expect(getChordIntervalLabel(-1, 0)).toBe(1);
    expect(getChordIntervalLabel(0, 0)).toBe(1);
  });

  it('should return "#5" for semitone 8 (augmented 5th) regardless of index (VMU-146 fix2)', () => {
    // aug chord: [0, 4, 8] (core/theory.js CHORDS.chord_aug). Before fix2,
    // semitone 8 had no explicit case and fell through to the index+2
    // fallback: index -1 (fretboard/realization convention) produced 1
    // ("root" — chord_aug's #5 read as its own root), index 2 (piano/
    // Dictionary real-index convention) produced 4 ("extension"). Neither
    // was "#5" ("fifth"), and the two disagreed with each other.
    expect(getChordIntervalLabel(-1, 8)).toBe('#5');
    expect(getChordIntervalLabel(2, 8)).toBe('#5');
  });

  it('should return "bb7" for semitone 9 (diminished 7th) regardless of index (VMU-146 fix2)', () => {
    // dim7 chord: [0, 3, 6, 9] (core/theory.js CHORDS.chord_dim7) — the only
    // catalog chord with a semitone-9 tone, and it is a diminished seventh,
    // not a 6th/13th. Before fix2, index -1 produced 1 ("root"), the real
    // index 3 produced 5 ("fifth") — both wrong, and disagreeing.
    expect(getChordIntervalLabel(-1, 9)).toBe('bb7');
    expect(getChordIntervalLabel(3, 9)).toBe('bb7');
  });

  it('should still return index+2 as fallback for indices with no explicit case', () => {
    // No chord in the catalog has a semitone that reaches this fallback
    // today (verified by the full-catalog property test below) — kept as
    // the documented behaviour for any future/out-of-catalog semitone.
    expect(getChordIntervalLabel(5, 1)).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// getChordIntervalLabel × getRoleForDegreeLabel — full CHORDS catalog
// (VMU-146 fix2)
// ---------------------------------------------------------------------------
//
// The coordinator's probe (brief VMU-146-fix2-brief.md) measured every note
// of every chord in core/theory.js's CHORDS registry (52 notes across 14
// chords) against BOTH index conventions in live use: index -1
// (useMusicEngine.js's fretboardActiveNotes, core/realization.js) and the
// note's real array position (useMusicEngine.js's piano activeNotes,
// useDictionaryMode.js). Only chord_aug (semitone 8) and chord_dim7
// (semitone 9) disagreed with the expected role; the other 50 notes were
// already correct on both conventions.
describe('getChordIntervalLabel × getRoleForDegreeLabel — full CHORDS catalog (VMU-146 fix2)', () => {
  /** Expected harmonic role by semitone-from-root, per the brief's table. */
  function expectedRoleForSemitone(semitone) {
    if (semitone === 0) return 'root';
    if (semitone === 3 || semitone === 4) return 'third';
    if (semitone === 6 || semitone === 7 || semitone === 8) return 'fifth';
    return 'extension';
  }

  const chordEntries = Object.values(CHORDS);

  it('sanity: the catalog has 52 notes across 14 chords (matches the brief\'s probe)', () => {
    expect(chordEntries.length).toBe(14);
    const totalNotes = chordEntries.reduce((sum, c) => sum + c.semitones.length, 0);
    expect(totalNotes).toBe(52);
  });

  chordEntries.forEach((chord) => {
    describe(`${chord.key} [${chord.semitones.join(', ')}]`, () => {
      chord.semitones.forEach((semitone, realIndex) => {
        const expectedRole = expectedRoleForSemitone(semitone);

        it(`semitone ${semitone} (real index ${realIndex}) -> role ${expectedRole}, index -1 convention (fretboard/realization)`, () => {
          const label = getChordIntervalLabel(-1, semitone);
          expect(getRoleForDegreeLabel(label)).toBe(expectedRole);
        });

        it(`semitone ${semitone} (real index ${realIndex}) -> role ${expectedRole}, real-index convention (piano/Dictionary)`, () => {
          const label = getChordIntervalLabel(realIndex, semitone);
          expect(getRoleForDegreeLabel(label)).toBe(expectedRole);
        });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// getRoleForDegreeLabel (VMU-146)
// ---------------------------------------------------------------------------
//
// The single degree-label -> role rule, replacing two consumers that used
// to disagree: PianoKeyboard.jsx tested exact equality ("3" -> third),
// core/fretboardUtils.js tested inclusion (order.includes("3") -> third),
// so "b3" (contains no "3" as a full label under equality, but does under
// inclusion) read as extension on the piano and third on the fretboard.
// Table below is the single rule both now call (brief decision #1):
// "b3"/"3" -> third, "b5"/"5"/"#5" -> fifth, "1" -> root, rest -> extension
// (sevenths included: no role-seventh CSS class exists today).
describe('getRoleForDegreeLabel (VMU-146) — single degree-label -> role rule', () => {
  it.each([
    // [label, expected role]
    ['1', 'root'],
    [1, 'root'],          // getChordIntervalLabel(0, _) returns the number 1
    ['3', 'third'],
    [3, 'third'],         // getChordIntervalLabel(i, 4) returns the number 3
    ['b3', 'third'],      // minor 3rd — the case the old equality rule missed
    ['5', 'fifth'],
    [5, 'fifth'],         // getChordIntervalLabel(i, 7) returns the number 5
    ['b5', 'fifth'],
    ['#5', 'fifth'],      // augmented 5th — the case the old equality rule missed
    ['b7', 'extension'],  // no role-seventh class today — documented fallback
    ['7', 'extension'],
    [7, 'extension'],
    ['9', 'extension'],
    [9, 'extension'],
    ['2', 'extension'],   // sus2
    ['4', 'extension'],   // sus4
    ['bb7', 'extension'], // diminished 7th (VMU-146 fix2) — falls to extension, same as b7/7
  ])('degree label %p maps to role %p', (label, expected) => {
    expect(getRoleForDegreeLabel(label)).toBe(expected);
  });

  it('is the single rule: equality-style and inclusion-style labels for the minor 3rd agree', () => {
    // The pre-fix divergence, made explicit: PianoKeyboard's old rule
    // (order === "3") and fretboardUtils's old rule (order.includes("3"))
    // would have disagreed on "b3". The single function cannot: both
    // consumers now call the exact same code path.
    expect(getRoleForDegreeLabel('b3')).toBe(getRoleForDegreeLabel(3));
    expect(getRoleForDegreeLabel('b3')).toBe('third');
  });
});
