// src/core/__tests__/chordSuggestions.test.js
//
// TDD tests for getNextChordSuggestions (G.3.4 Studio Mode)
// and getAbsoluteChordSuggestions (G.3.4 Dictionary Mode).
//
// Run with: npx vitest run src/core/__tests__/chordSuggestions.test.js

import { describe, it, expect } from 'vitest';
import {
  getNextChordSuggestions,
  getAbsoluteChordSuggestions,
} from '../theory';

// ---------------------------------------------------------------------------
// getNextChordSuggestions — NNS numeric format (as used in Studio Mode)
// ---------------------------------------------------------------------------

describe('getNextChordSuggestions — NNS format', () => {

  // ------ Bug #3 regression tests ------

  it('should return V as next diatonic chord for ii (2-)', () => {
    const suggestions = getNextChordSuggestions('2-');
    const chords = suggestions.map(s => s.chord);
    expect(chords).toContain('V');
  });

  it('should return I as next diatonic chord for V (5)', () => {
    const suggestions = getNextChordSuggestions('5');
    const chords = suggestions.map(s => s.chord);
    expect(chords).toContain('I');
  });

  it('should return V as next diatonic chord for IV (4)', () => {
    const suggestions = getNextChordSuggestions('4');
    const chords = suggestions.map(s => s.chord);
    expect(chords).toContain('V');
  });

  it('should return ii as next diatonic chord for vi (6-)', () => {
    const suggestions = getNextChordSuggestions('6-');
    const chords = suggestions.map(s => s.chord);
    expect(chords).toContain('ii');
  });

  it('should return vi as next diatonic chord for iii (3-)', () => {
    const suggestions = getNextChordSuggestions('3-');
    const chords = suggestions.map(s => s.chord);
    expect(chords).toContain('vi');
  });

  it('should return I as next diatonic chord for vii (7°)', () => {
    const suggestions = getNextChordSuggestions('7°');
    const chords = suggestions.map(s => s.chord);
    expect(chords).toContain('I');
  });

  it('should include IV and V as suggestions for I (1)', () => {
    const suggestions = getNextChordSuggestions('1');
    const chords = suggestions.map(s => s.chord);
    expect(chords).toContain('IV');
    expect(chords).toContain('V');
  });

  // ------ Secondary dominant resolution ------

  it('should resolve VI7 toward ii (secondary dominant)', () => {
    // VI7 is the secondary dominant of ii
    const suggestions = getNextChordSuggestions('VI7');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].chord).toBe('ii');
    expect(suggestions[0].reason).toMatch(/Résolution/);
  });

  it('should resolve II7 toward V (secondary dominant)', () => {
    const suggestions = getNextChordSuggestions('II7');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].chord).toBe('V');
  });

  // ------ Stability / edge cases ------

  it('should return an empty array for null input', () => {
    expect(getNextChordSuggestions(null)).toEqual([]);
  });

  it('should return an empty array for empty string', () => {
    expect(getNextChordSuggestions('')).toEqual([]);
  });

  it('should return suggestions with chord and reason fields', () => {
    const suggestions = getNextChordSuggestions('2-');
    suggestions.forEach(s => {
      expect(s).toHaveProperty('chord');
      expect(s).toHaveProperty('reason');
      expect(typeof s.chord).toBe('string');
      expect(typeof s.reason).toBe('string');
    });
  });

  it('should not return more than 4 suggestions for any degree', () => {
    const inputs = ['1', '2-', '3-', '4', '5', '6-', '7°'];
    inputs.forEach(nns => {
      const suggestions = getNextChordSuggestions(nns);
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });
  });
});

// ---------------------------------------------------------------------------
// getAbsoluteChordSuggestions — Dictionary Mode (no tonal context)
// ---------------------------------------------------------------------------

describe('getAbsoluteChordSuggestions — Dictionary Mode', () => {

  it('should suggest chord_major a 4th up for a dominant 7th chord', () => {
    // G7 (rootValue=7) → should suggest C major (rootValue=0)
    const suggestions = getAbsoluteChordSuggestions(7, 'chord_7');
    expect(suggestions.some(s => s.targetRoot === 0 && s.targetType === 'chord_major')).toBe(true);
  });

  it('should suggest chord_minor a 4th up for a dominant 7th chord (minor resolution)', () => {
    // G7 → should also suggest Cm (minor resolution)
    const suggestions = getAbsoluteChordSuggestions(7, 'chord_7');
    expect(suggestions.some(s => s.targetRoot === 0 && s.targetType === 'chord_minor')).toBe(true);
  });

  it('should suggest chord_7 a 4th up for a minor chord (ii → V jazz)', () => {
    // Dm (rootValue=2) → should suggest G7 (rootValue=7)
    const suggestions = getAbsoluteChordSuggestions(2, 'chord_minor');
    expect(suggestions.some(s => s.targetRoot === 7 && s.targetType === 'chord_7')).toBe(true);
  });

  it('should suggest chord_7 a 4th up for a m7 chord (ii7 → V)', () => {
    // Dm7 (rootValue=2) → G7 (rootValue=7)
    const suggestions = getAbsoluteChordSuggestions(2, 'chord_m7');
    expect(suggestions.some(s => s.targetRoot === 7 && s.targetType === 'chord_7')).toBe(true);
  });

  it('should suggest IV (4th up) for a major chord', () => {
    // C major (rootValue=0) → F major (rootValue=5)
    const suggestions = getAbsoluteChordSuggestions(0, 'chord_major');
    expect(suggestions.some(s => s.targetRoot === 5 && s.targetType === 'chord_major')).toBe(true);
  });

  it('should suggest self-transform to 7th for a major chord (I → I7)', () => {
    // C major → C7 (secondary dominant transformation)
    const suggestions = getAbsoluteChordSuggestions(0, 'chord_major');
    expect(suggestions.some(s => s.targetRoot === 0 && s.targetType === 'chord_7')).toBe(true);
  });

  it('should suggest V7 a 4th up for a half-diminished chord (ii°7 → V)', () => {
    // Bm7b5 (rootValue=11) → E7 (rootValue=4)
    const suggestions = getAbsoluteChordSuggestions(11, 'chord_m7b5');
    expect(suggestions.some(s => s.targetRoot === 4 && s.targetType === 'chord_7')).toBe(true);
  });

  it('should return an empty array for unknown chord types', () => {
    const suggestions = getAbsoluteChordSuggestions(0, 'chord_unknown_xyz');
    expect(suggestions).toEqual([]);
  });

  it('each suggestion should have targetRoot, targetType, reason fields', () => {
    const suggestions = getAbsoluteChordSuggestions(0, 'chord_7');
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(s => {
      expect(s).toHaveProperty('targetRoot');
      expect(s).toHaveProperty('targetType');
      expect(s).toHaveProperty('reason');
      expect(s.targetRoot).toBeGreaterThanOrEqual(0);
      expect(s.targetRoot).toBeLessThan(12);
    });
  });

  it('should wrap rootValue correctly at the chromatic boundary (e.g. B7 → E major)', () => {
    // B7 (rootValue=11) → 4th up = (11+5)%12 = 4 (E)
    const suggestions = getAbsoluteChordSuggestions(11, 'chord_7');
    expect(suggestions.some(s => s.targetRoot === 4)).toBe(true);
  });

  it('perfect 4th calculation: (rootValue + 5) % 12 for all roots', () => {
    // Spot-check a few roots
    const cases = [
      { root: 0, expectedP4: 5 },  // C → F
      { root: 7, expectedP4: 0 },  // G → C
      { root: 5, expectedP4: 10 }, // F → Bb
      { root: 9, expectedP4: 2 },  // A → D
    ];
    cases.forEach(({ root, expectedP4 }) => {
      const suggestions = getAbsoluteChordSuggestions(root, 'chord_7');
      // All dominant suggestions resolve up a 4th
      const resolvesSuggestion = suggestions.find(s => s.targetType === 'chord_major');
      expect(resolvesSuggestion.targetRoot).toBe(expectedP4);
    });
  });
});
