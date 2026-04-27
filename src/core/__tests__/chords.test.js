// src/core/__tests__/chords.test.js
// Tests for Phase 10.A: CHORDS registry, resolveChordSemitones, 
// getChordNotesAbsolute, and getClosestInversionN

import { describe, it, expect } from 'vitest';
import {
  CHORDS,
  CHORD_CATEGORIES,
  resolveChordSemitones,
  getChordNotesAbsolute,
  getClosestInversion,
  getClosestInversionN,
  NOTES,
} from '../theory';

// ─── A1: CHORDS Registry ──────────────────────────────────────

describe('CHORDS Registry (A1)', () => {
  it('exports CHORDS as a non-empty object', () => {
    expect(typeof CHORDS).toBe('object');
    expect(Object.keys(CHORDS).length).toBeGreaterThan(0);
  });

  it('every chord key starts with "chord_"', () => {
    Object.keys(CHORDS).forEach(key => {
      expect(key.startsWith('chord_')).toBe(true);
    });
  });

  it('every chord has required fields', () => {
    Object.values(CHORDS).forEach(chord => {
      expect(chord).toHaveProperty('key');
      expect(chord).toHaveProperty('category');
      expect(chord).toHaveProperty('semitones');
      expect(chord).toHaveProperty('noteCount');
      expect(chord).toHaveProperty('emotion');
      expect(chord).toHaveProperty('description');
      expect(Array.isArray(chord.semitones)).toBe(true);
      expect(chord.noteCount).toBe(chord.semitones.length);
    });
  });

  it('every chord category exists in CHORD_CATEGORIES', () => {
    const validCats = Object.keys(CHORD_CATEGORIES);
    Object.values(CHORDS).forEach(chord => {
      expect(validCats).toContain(chord.category);
    });
  });

  it('every chord starts with semitone 0 (root)', () => {
    Object.values(CHORDS).forEach(chord => {
      expect(chord.semitones[0]).toBe(0);
    });
  });

  it('has at least 14 chord types', () => {
    expect(Object.keys(CHORDS).length).toBeGreaterThanOrEqual(14);
  });

  it('contains the essential chord types', () => {
    const essentialKeys = [
      'chord_major', 'chord_minor', 'chord_dim', 'chord_aug',
      'chord_sus2', 'chord_sus4',
      'chord_maj7', 'chord_m7', 'chord_7', 'chord_dim7', 'chord_m7b5',
      'chord_add9', 'chord_9', 'chord_m9',
    ];
    essentialKeys.forEach(key => {
      expect(CHORDS).toHaveProperty(key);
    });
  });

  // Verify well-known interval structures
  it('Major triad = [0, 4, 7]', () => {
    expect(CHORDS.chord_major.semitones).toEqual([0, 4, 7]);
  });

  it('Minor triad = [0, 3, 7]', () => {
    expect(CHORDS.chord_minor.semitones).toEqual([0, 3, 7]);
  });

  it('Dominant 7th = [0, 4, 7, 10]', () => {
    expect(CHORDS.chord_7.semitones).toEqual([0, 4, 7, 10]);
  });

  it('Major 7th = [0, 4, 7, 11]', () => {
    expect(CHORDS.chord_maj7.semitones).toEqual([0, 4, 7, 11]);
  });

  it('Diminished 7th = [0, 3, 6, 9] — symmetric', () => {
    expect(CHORDS.chord_dim7.semitones).toEqual([0, 3, 6, 9]);
  });

  it('Dominant 9th = [0, 4, 7, 10, 14] — 5 notes', () => {
    expect(CHORDS.chord_9.semitones).toEqual([0, 4, 7, 10, 14]);
    expect(CHORDS.chord_9.noteCount).toBe(5);
  });
});

describe('CHORD_CATEGORIES', () => {
  it('has ordered categories', () => {
    const orders = Object.values(CHORD_CATEGORIES).map(c => c.order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });

  it('each category has a labelKey', () => {
    Object.values(CHORD_CATEGORIES).forEach(cat => {
      expect(typeof cat.labelKey).toBe('string');
      expect(cat.labelKey.length).toBeGreaterThan(0);
    });
  });
});

// ─── A1 continued: resolveChordSemitones ────────────────────

describe('resolveChordSemitones (A1)', () => {
  it('returns chord data for a valid chord_* key', () => {
    const result = resolveChordSemitones('chord_major');
    expect(result).not.toBeNull();
    expect(result.semitones).toEqual([0, 4, 7]);
  });

  it('returns null for scale keys', () => {
    expect(resolveChordSemitones('scale_major')).toBeNull();
  });

  it('returns null for unknown chord keys', () => {
    expect(resolveChordSemitones('chord_nonexistent')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(resolveChordSemitones(null)).toBeNull();
    expect(resolveChordSemitones(undefined)).toBeNull();
    expect(resolveChordSemitones('')).toBeNull();
  });

  it('returns null for non-string', () => {
    expect(resolveChordSemitones(42)).toBeNull();
  });
});

// ─── A2: getChordNotesAbsolute ──────────────────────────────

describe('getChordNotesAbsolute (A2)', () => {
  it('C major triad at octave 4 → [60, 64, 67]', () => {
    // C=0, semitones=[0,4,7], octave 4
    // base = (4+1)*12 = 60
    // → [60+0, 60+4, 60+7] = [60, 64, 67]
    const result = getChordNotesAbsolute(0, [0, 4, 7], 4);
    expect(result).toEqual([60, 64, 67]);
  });

  it('A minor at octave 3 → [57, 60, 64]', () => {
    // A=9, base=(3+1)*12=48
    // → [48+9, 48+12, 48+16] = [57, 60, 64]
    const result = getChordNotesAbsolute(9, [0, 3, 7], 3);
    expect(result).toEqual([57, 60, 64]);
  });

  it('works with 4-note chords (Cmaj7)', () => {
    const result = getChordNotesAbsolute(0, [0, 4, 7, 11], 4);
    expect(result).toEqual([60, 64, 67, 71]);
    expect(result.length).toBe(4);
  });

  it('works with 5-note chords (C9)', () => {
    const result = getChordNotesAbsolute(0, [0, 4, 7, 10, 14], 4);
    expect(result).toEqual([60, 64, 67, 70, 74]);
    expect(result.length).toBe(5);
  });

  it('defaults to octave 4', () => {
    const result = getChordNotesAbsolute(0, [0, 4, 7]);
    expect(result).toEqual([60, 64, 67]);
  });

  it('transposes correctly for different roots', () => {
    // G = 7, major at octave 4: base=60, → [67, 71, 74]
    const result = getChordNotesAbsolute(7, [0, 4, 7], 4);
    expect(result).toEqual([67, 71, 74]);
  });
});

// ─── A3: getClosestInversion / getClosestInversionN ─────────

describe('getClosestInversion legacy wrapper (A3)', () => {
  it('returns 3 notes for a triad', () => {
    const result = getClosestInversion([], 0, 4, 7);
    expect(result.length).toBe(3);
  });

  it('returns root position near octave 4 when no previous notes', () => {
    // C major: root=0, third=4, fifth=7
    const result = getClosestInversion([], 0, 4, 7);
    // Should be near C4 (MIDI ~48-60 range)
    expect(result[0]).toBeGreaterThanOrEqual(36);
    expect(result[0]).toBeLessThanOrEqual(72);
  });

  it('finds closest inversion to previous chord', () => {
    // Play C major (around [60, 64, 67])
    const prev = [60, 64, 67];
    // Next chord: F major (root=5, third=4, fifth=7)
    const result = getClosestInversion(prev, 5, 4, 7);
    // Should not jump far from previous notes
    const avgDist = result.reduce((sum, n, i) => sum + Math.abs(n - prev[i]), 0) / 3;
    expect(avgDist).toBeLessThan(12); // Less than an octave average distance
  });
});

describe('getClosestInversionN — generalized (A3)', () => {
  it('works with 4-note chords (Cmaj7)', () => {
    const result = getClosestInversionN([], 0, [0, 4, 7, 11]);
    expect(result.length).toBe(4);
  });

  it('works with 5-note chords (C9)', () => {
    const result = getClosestInversionN([], 0, [0, 4, 7, 10, 14]);
    expect(result.length).toBe(5);
  });

  it('all notes are in ascending order', () => {
    const result = getClosestInversionN([], 0, [0, 4, 7, 11]);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it('voice leads a 4-note chord toward previous notes', () => {
    const prev = [60, 64, 67, 71]; // Cmaj7
    // Move to Dm7: root=2, semitones=[0,3,7,10]
    const result = getClosestInversionN(prev, 2, [0, 3, 7, 10]);
    const avgDist = result.reduce((sum, n, i) => sum + Math.abs(n - prev[i]), 0) / 4;
    expect(avgDist).toBeLessThan(12);
  });

  it('handles transition from 3-note to 4-note chord gracefully', () => {
    const prev = [60, 64, 67]; // C major triad
    // Move to Cmaj7: root=0, semitones=[0,4,7,11]
    const result = getClosestInversionN(prev, 0, [0, 4, 7, 11]);
    expect(result.length).toBe(4);
    // First 3 notes should be close to previous
    const dist = Math.abs(result[0] - prev[0]) + Math.abs(result[1] - prev[1]) + Math.abs(result[2] - prev[2]);
    expect(dist).toBeLessThan(24);
  });

  it('respects octaveOffset parameter', () => {
    const resultDefault = getClosestInversionN([], 0, [0, 4, 7]);
    const resultHigher = getClosestInversionN([], 0, [0, 4, 7], 1);
    // Higher offset should produce higher pitches
    expect(resultHigher[0]).toBeGreaterThanOrEqual(resultDefault[0]);
  });
});
