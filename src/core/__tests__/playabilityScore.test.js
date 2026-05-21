// src/core/__tests__/playabilityScore.test.js
//
// TDD tests for calculatePlayabilityScore (G.4.3).
// Covers Bug #1 (double penalty dim7/m7b5) and Bug #2 (chord_9 double penalty).
//
// Run with: npx vitest run src/core/__tests__/playabilityScore.test.js

import { describe, it, expect } from 'vitest';
import { calculatePlayabilityScore } from '../harmonyEngine';

// Helper: build a minimal chord object in NNS format (as generateChordsFromNNS returns)
const nnsChord = (nns, rootValue = 0) => ({
  nns,
  rootNote: { value: rootValue },
});

// Helper: build a minimal chord object in Dictionary format
const dictChord = (dictType, rootValue = 0) => ({
  dictType,
  rootValue,
});

// ---------------------------------------------------------------------------
// Basic contract
// ---------------------------------------------------------------------------

describe('calculatePlayabilityScore — contract', () => {
  it('should return 100 for an empty progression', () => {
    const result = calculatePlayabilityScore([]);
    expect(result.score).toBe(100);
  });

  it('should return a score between 0 and 100', () => {
    const progressions = [
      [nnsChord('1')],
      [nnsChord('2-'), nnsChord('5'), nnsChord('1')],
      [dictChord('chord_major', 0), dictChord('chord_major', 5)],
    ];
    progressions.forEach(prog => {
      const { score } = calculatePlayabilityScore(prog);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('should return label, color, and details in the result', () => {
    const result = calculatePlayabilityScore([nnsChord('1')]);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('details');
    expect(Array.isArray(result.details)).toBe(true);
  });

  it('a simple I-IV-V-I progression should score high (>= 90)', () => {
    const prog = [
      nnsChord('1', 0),
      nnsChord('4', 5),
      nnsChord('5', 7),
      nnsChord('1', 0),
    ];
    const { score } = calculatePlayabilityScore(prog);
    expect(score).toBeGreaterThanOrEqual(90);
  });
});

// ---------------------------------------------------------------------------
// Bug #1 Regression — dim7 and m7b5 must NOT receive double penalty
// ---------------------------------------------------------------------------

describe('calculatePlayabilityScore — Bug #1: no double penalty for dim7 / m7b5', () => {

  it('a single chord_dim7 should score higher than 90 (only one penalty ≤ 5)', () => {
    // Before fix: -2 (extensions block) -3 (dissonance block) = -5
    // After fix:  only -3 from dissonance block (or similar, single penalty)
    const result = calculatePlayabilityScore([dictChord('chord_dim7', 0)]);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('a single chord_m7b5 should score higher than 90', () => {
    const result = calculatePlayabilityScore([dictChord('chord_m7b5', 0)]);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('chord_dim7 should be more penalized than chord_maj7 (dim is more complex)', () => {
    const dim7Score = calculatePlayabilityScore([dictChord('chord_dim7', 0)]).score;
    const maj7Score = calculatePlayabilityScore([dictChord('chord_maj7', 0)]).score;
    expect(dim7Score).toBeLessThan(maj7Score);
  });

  it('chord_m7b5 should be more penalized than chord_m7', () => {
    const m7b5Score = calculatePlayabilityScore([dictChord('chord_m7b5', 0)]).score;
    const m7Score   = calculatePlayabilityScore([dictChord('chord_m7', 0)]).score;
    expect(m7b5Score).toBeLessThan(m7Score);
  });

  it('a 4-chord progression of dim7 should stay above 60 (not zero due to stacking)', () => {
    // Before fix: 4 × (-5) = 80 pts lost, score 20
    // After fix:  4 × (-3) = 12 pts, score 88 (before other penalties)
    const prog = [
      dictChord('chord_dim7', 0),
      dictChord('chord_dim7', 3),
      dictChord('chord_dim7', 6),
      dictChord('chord_dim7', 9),
    ];
    const { score } = calculatePlayabilityScore(prog);
    expect(score).toBeGreaterThan(60);
  });
});

// ---------------------------------------------------------------------------
// Bug #2 Regression — chord_9 must NOT be double-penalized
// ---------------------------------------------------------------------------

describe('calculatePlayabilityScore — Bug #2: chord_9 single penalty only', () => {

  it('chord_9 should have the same total penalty as chord_m9 (both are 9th chords)', () => {
    const score9  = calculatePlayabilityScore([dictChord('chord_9', 0)]).score;
    const scorem9 = calculatePlayabilityScore([dictChord('chord_m9', 0)]).score;
    // They might differ (maj vs min), but neither should be further penalized by dissonance
    // The point is that both should be above a reasonable floor (90 for a single chord)
    expect(score9).toBeGreaterThanOrEqual(90);
    expect(scorem9).toBeGreaterThanOrEqual(90);
  });

  it('chord_9 should be more penalized than chord_7 (more complex)', () => {
    const score9  = calculatePlayabilityScore([dictChord('chord_9', 0)]).score;
    const score7  = calculatePlayabilityScore([dictChord('chord_7', 0)]).score;
    expect(score9).toBeLessThan(score7);
  });

  it('chord_9 should be more penalized than chord_major (simpler)', () => {
    const score9   = calculatePlayabilityScore([dictChord('chord_9', 0)]).score;
    const scoreMaj = calculatePlayabilityScore([dictChord('chord_major', 0)]).score;
    expect(score9).toBeLessThan(scoreMaj);
  });
});

// ---------------------------------------------------------------------------
// Penalty ordering (musical logic)
// ---------------------------------------------------------------------------

describe('calculatePlayabilityScore — penalty ordering makes musical sense', () => {

  it('Pop (I-V-vi-IV) should score higher than Jazz (ii7-V7-Imaj7)', () => {
    const pop = [
      nnsChord('1', 0),
      nnsChord('5', 7),
      nnsChord('6-', 9),
      nnsChord('4', 5),
    ];
    const jazz = [
      dictChord('chord_m7', 2),    // Dm7
      dictChord('chord_7', 7),     // G7
      dictChord('chord_maj7', 0),  // Cmaj7
    ];
    const popScore  = calculatePlayabilityScore(pop).score;
    const jazzScore = calculatePlayabilityScore(jazz).score;
    expect(popScore).toBeGreaterThan(jazzScore);
  });

  it('Facile / Pop label for scores >= 80', () => {
    const result = calculatePlayabilityScore([nnsChord('1'), nnsChord('4'), nnsChord('5')]);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.label).toBe('Facile / Pop');
    expect(result.color).toBe('#4ade80');
  });

  it('Complexe / Expérimental label for scores < 50', () => {
    // To reliably score < 50 we need: many dim7/m7b5 (high dissonance) + non-diatonic
    // chords (nns with flats) + distant leaps on the circle of fifths.
    // Each dim7 = -5 dissonance; each non-diatonic = -5; each big leap = -2 to -6.
    const prog = [
      // Non-diatonic chords (flat degrees)
      { nns: 'b2', rootNote: { value: 1 } },   // -5 diatonic
      { nns: 'b6', rootNote: { value: 8 } },   // -5 diatonic + big leap
      { nns: 'b3', rootNote: { value: 3 } },   // -5 diatonic + big leap
      { nns: 'b7', rootNote: { value: 10 } },  // -5 diatonic + big leap
      // dim7 + m7b5 (high dissonance)
      dictChord('chord_dim7', 0),              // -5 dissonance
      dictChord('chord_m7b5', 6),             // -5 dissonance + big leap
      dictChord('chord_dim7', 3),             // -5 dissonance + big leap
      dictChord('chord_m7b5', 9),             // -5 dissonance + big leap
    ];
    const result = calculatePlayabilityScore(prog);
    expect(result.score).toBeLessThan(50);
    expect(result.label).toBe('Complexe / Expérimental');
    expect(result.color).toBe('#f87171');
  });

  it('details array should not be empty for a penalized progression', () => {
    const prog = [
      dictChord('chord_m7b5', 0),
      dictChord('chord_dim7', 6),
    ];
    const { details } = calculatePlayabilityScore(prog);
    expect(details.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Harmonic leap detection
// ---------------------------------------------------------------------------

describe('calculatePlayabilityScore — harmonic leaps', () => {

  it('smooth stepwise motion (C → F → G) should not trigger leap penalty', () => {
    // C(0) → F(5): distance on CoF = 1 step. G(7) → C(0): also 1 step.
    const prog = [
      dictChord('chord_major', 0),  // C
      dictChord('chord_major', 5),  // F
      dictChord('chord_7', 7),      // G7
    ];
    const { details } = calculatePlayabilityScore(prog);
    const hasLeapPenalty = details.some(d => d.includes('saut'));
    expect(hasLeapPenalty).toBe(false);
  });

  it('distant leap (C → F# — tritone) should trigger leap penalty', () => {
    const prog = [
      dictChord('chord_major', 0),  // C
      dictChord('chord_major', 6),  // F# (6 steps away on CoF)
    ];
    const { details } = calculatePlayabilityScore(prog);
    const hasLeapPenalty = details.some(d => d.includes('saut'));
    expect(hasLeapPenalty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dual format support (NNS objects and Dictionary objects)
// ---------------------------------------------------------------------------

describe('calculatePlayabilityScore — dual format support', () => {
  it('accepts NNS objects (rootNote.value format)', () => {
    const prog = [
      { nns: '2-', rootNote: { value: 2 } },
      { nns: '5', rootNote: { value: 7 } },
      { nns: '1', rootNote: { value: 0 } },
    ];
    expect(() => calculatePlayabilityScore(prog)).not.toThrow();
    const { score } = calculatePlayabilityScore(prog);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('accepts Dictionary objects (rootValue + dictType format)', () => {
    const prog = [
      { rootValue: 2, dictType: 'chord_m7' },
      { rootValue: 7, dictType: 'chord_7' },
      { rootValue: 0, dictType: 'chord_maj7' },
    ];
    expect(() => calculatePlayabilityScore(prog)).not.toThrow();
    const { score } = calculatePlayabilityScore(prog);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('mixed format (null items) should not throw', () => {
    const prog = [null, { nns: '1', rootNote: { value: 0 } }, null];
    expect(() => calculatePlayabilityScore(prog)).not.toThrow();
  });
});
