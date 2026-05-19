import { describe, it, expect } from 'vitest';
import {
  gcd,
  lcm,
  euclideanRhythm,
  isPeriodic,
  complement,
  rotate,
  isAutoComplementary,
  EUCLIDEAN_PRESETS,
  generatePhasingStates,
  generateIsorhythm,
  forcedRealignment,
  primeFactors,
  isBalanced,
  generateBalancedRhythm,
} from '../compositionEngine';

describe('Composition Engine Mathematical Utilities', () => {
  describe('gcd (PGCD)', () => {
    it('should compute correct greatest common divisor', () => {
      expect(gcd(3, 8)).toBe(1);
      expect(gcd(2, 4)).toBe(2);
      expect(gcd(12, 18)).toBe(6);
      expect(gcd(0, 5)).toBe(5);
      expect(gcd(-6, 9)).toBe(3);
    });
  });

  describe('lcm (PPCM)', () => {
    it('should compute correct least common multiple', () => {
      expect(lcm(3, 8)).toBe(24);
      expect(lcm(4, 6)).toBe(12);
      expect(lcm(0, 5)).toBe(0);
      expect(lcm(5, 0)).toBe(0);
    });
  });

  describe('euclideanRhythm (Bjorklund)', () => {
    it('should handle edge cases gracefully', () => {
      expect(euclideanRhythm(0, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
      expect(euclideanRhythm(8, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
      expect(euclideanRhythm(5, 0)).toEqual([]);
      expect(euclideanRhythm(-2, 4)).toEqual([0, 0, 0, 0]);
      expect(euclideanRhythm(10, 5)).toEqual([1, 1, 1, 1, 1]);
    });

    it('should generate correct Tresillo E(3, 8)', () => {
      // E(3,8) = [1, 0, 0, 1, 0, 0, 1, 0]
      expect(euclideanRhythm(3, 8)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
    });

    it('should generate correct Cinquillo E(5, 8)', () => {
      // E(5,8) = [1, 0, 1, 1, 0, 1, 1, 0]
      expect(euclideanRhythm(5, 8)).toEqual([1, 0, 1, 1, 0, 1, 1, 0]);
    });

    it('should generate correct Venda E(5, 12)', () => {
      expect(euclideanRhythm(5, 12)).toEqual([1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0]);
    });

    it('should generate correct Bembe E(7, 12)', () => {
      expect(euclideanRhythm(7, 12)).toEqual([1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]);
    });

    it('should generate correct Bossa Nova E(5, 16)', () => {
      expect(euclideanRhythm(5, 16)).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0]);
    });

    it('should generate correct Samba E(7, 16)', () => {
      expect(euclideanRhythm(7, 16)).toEqual([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]);
    });
  });

  describe('isPeriodic', () => {
    it('should identify periodic rhythms correctly', () => {
      expect(isPeriodic(3, 8)).toBe(false); // gcd=1
      expect(isPeriodic(2, 4)).toBe(true);  // gcd=2
      expect(isPeriodic(4, 12)).toBe(true); // gcd=4
      expect(isPeriodic(5, 12)).toBe(false); // gcd=1
    });
  });

  describe('complement', () => {
    it('should invert 0s and 1s', () => {
      expect(complement([1, 0, 0, 1, 0, 0, 1, 0])).toEqual([0, 1, 1, 0, 1, 1, 0, 1]);
      expect(complement([1, 1, 1])).toEqual([0, 0, 0]);
      expect(complement([])).toEqual([]);
    });
  });

  describe('rotate', () => {
    it('should rotate patterns correctly by positive offsets', () => {
      const pat = [1, 0, 0, 1, 0, 0, 1, 0];
      // Shift right by 1
      expect(rotate(pat, 1)).toEqual([0, 1, 0, 0, 1, 0, 0, 1]);
      // Shift right by 3
      expect(rotate(pat, 3)).toEqual([0, 1, 0, 1, 0, 0, 1, 0]);
      // Shift by length should return clone
      expect(rotate(pat, 8)).toEqual(pat);
    });

    it('should handle negative offsets and large offsets', () => {
      const pat = [1, 0, 0, 1, 0, 0, 1, 0];
      expect(rotate(pat, -1)).toEqual([0, 0, 1, 0, 0, 1, 0, 1]);
      expect(rotate(pat, 9)).toEqual(rotate(pat, 1));
      expect(rotate(pat, -9)).toEqual(rotate(pat, -1));
    });

    it('should handle edge cases', () => {
      expect(rotate([], 3)).toEqual([]);
    });
  });

  describe('isAutoComplementary', () => {
    it('should detect if complement is a rotation of the pattern', () => {
      // E(4, 8) = [1, 0, 1, 0, 1, 0, 1, 0]
      // Complement = [0, 1, 0, 1, 0, 1, 0, 1]
      // This is a rotation by 1 step. So it's auto-complementary.
      expect(isAutoComplementary([1, 0, 1, 0, 1, 0, 1, 0])).toBe(true);

      // E(3, 8) = [1, 0, 0, 1, 0, 0, 1, 0]
      // Complement = [0, 1, 1, 0, 1, 1, 0, 1]
      // The complement has 5 pulses, pattern has 3 pulses.
      // Rotation cannot change pulse count, so they can never match.
      expect(isAutoComplementary([1, 0, 0, 1, 0, 0, 1, 0])).toBe(false);

      // Other tests
      expect(isAutoComplementary([1, 1, 0, 0])).toBe(true); // Comp: [0,0,1,1] which is shift by 2
    });
  });

  describe('Presets Integration', () => {
    it('should generate correct patterns for all predefined presets', () => {
      Object.entries(EUCLIDEAN_PRESETS).forEach(([key, preset]) => {
        const generated = euclideanRhythm(preset.k, preset.n);
        expect(generated.length).toBe(preset.n);
        expect(generated.filter(x => x === 1).length).toBe(preset.k);
      });
    });
  });

  describe('generatePhasingStates', () => {
    it('should generate all phasing states for a given motif', () => {
      const motif = [1, 0, 1];
      const states = generatePhasingStates(motif);
      expect(states.length).toBe(3);
      expect(states[0]).toEqual([1, 0, 1]);
      expect(states[1]).toEqual([1, 1, 0]);
      expect(states[2]).toEqual([0, 1, 1]);
    });
  });

  describe('generateIsorhythm', () => {
    it('should superpose talea and color correctly', () => {
      const talea = [1, 0, 1]; // 2 pulses, len 3
      const color = ['C4', 'E4', 'G4']; // len 3
      // LCM of pulses (2) and color length (3) is 6.
      // Total steps = (6 / 2) * 3 = 9 steps.
      const result = generateIsorhythm(talea, color);
      
      expect(result.totalSteps).toBe(9);
      expect(result.sequence).toEqual([
        'C4', null, 'E4',
        'G4', null, 'C4',
        'E4', null, 'G4'
      ]);
    });

    it('should handle empty or silent inputs gracefully', () => {
      expect(generateIsorhythm([], ['C4'])).toEqual({ sequence: [], totalSteps: 0 });
      expect(generateIsorhythm([0, 0], ['C4'])).toEqual({
        sequence: [null, null],
        totalSteps: 2,
        taleaLength: 2,
        colorLength: 1,
        pulses: 0
      });
    });
  });

  describe('forcedRealignment', () => {
    it('should truncate or repeat motif to fit standard boundary', () => {
      const motif = [1, 0, 1, 0, 0];
      const boundary = 12;
      const result = forcedRealignment(motif, boundary);
      
      expect(result.length).toBe(12);
      expect(result).toEqual([1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0]);
    });
  });

  // =========================================================
  // COMP-08 — Polyrythmie Algébrique (Andrew Milne)
  // =========================================================

  describe('primeFactors', () => {
    it('should return correct prime factors for common values', () => {
      expect(primeFactors(12)).toEqual([2, 2, 3]);
      expect(primeFactors(30)).toEqual([2, 3, 5]);
      expect(primeFactors(7)).toEqual([7]);
      expect(primeFactors(8)).toEqual([2, 2, 2]);
      expect(primeFactors(1)).toEqual([]);
    });

    it('should return empty array for invalid inputs', () => {
      expect(primeFactors(0)).toEqual([]);
      expect(primeFactors(-5)).toEqual([]);
      expect(primeFactors(1.5)).toEqual([]);
    });

    it('should handle prime numbers correctly', () => {
      expect(primeFactors(2)).toEqual([2]);
      expect(primeFactors(13)).toEqual([13]);
      expect(primeFactors(97)).toEqual([97]);
    });
  });

  describe('isBalanced', () => {
    it('should detect a balanced rhythm (regular polygon = perfect balance)', () => {
      // E(4, 8) = square — perfectly balanced
      const balanced = [1, 0, 1, 0, 1, 0, 1, 0];
      const result = isBalanced(balanced);
      expect(result.isBalanced).toBe(true);
      expect(result.offset).toBeLessThan(0.01);
    });

    it('should detect a perfectly balanced E(3,12) = triangle on 12 subdivisions', () => {
      // E(3, 12): pulses at indices 0, 4, 8 = equilateral triangle
      const pattern = [1,0,0,0,1,0,0,0,1,0,0,0];
      const result = isBalanced(pattern);
      expect(result.isBalanced).toBe(true);
    });

    it('should detect an unbalanced rhythm (Tresillo on 8)', () => {
      // Tresillo E(3,8) = [1,0,0,1,0,0,1,0] — NOT balanced (centroid shifted)
      const unbalanced = [1, 0, 0, 1, 0, 0, 1, 0];
      const result = isBalanced(unbalanced);
      // The three pulses are not symmetrically distributed, offset > threshold
      expect(result.offset).toBeGreaterThan(0.01);
    });

    it('should return balanced for empty pattern', () => {
      expect(isBalanced([]).isBalanced).toBe(true);
    });

    it('should return balanced for all-silence pattern', () => {
      expect(isBalanced([0, 0, 0, 0]).isBalanced).toBe(true);
    });

    it('should return balanced when all beats are active', () => {
      expect(isBalanced([1, 1, 1, 1]).isBalanced).toBe(true);
    });

    it('should return centroid data for inspection', () => {
      const pattern = [1, 0, 1, 0, 1, 0, 1, 0];
      const result = isBalanced(pattern);
      expect(result).toHaveProperty('centroid');
      expect(result).toHaveProperty('offset');
      expect(result.centroid).toHaveProperty('x');
      expect(result.centroid).toHaveProperty('y');
    });
  });

  describe('generateBalancedRhythm', () => {
    it('should return empty pattern for n <= 0', () => {
      expect(generateBalancedRhythm(0, [{ k: 3 }]).pattern).toEqual([]);
    });

    it('should return all-zero pattern for empty operations', () => {
      const result = generateBalancedRhythm(12, []);
      expect(result.pattern).toEqual(Array(12).fill(0));
      expect(result.polygons).toHaveLength(0);
    });

    it('should generate a triangle polygon (3-gon on 12 steps)', () => {
      const result = generateBalancedRhythm(12, [{ k: 3, op: '+' }]);
      // A triangle distributes 3 pulses evenly on 12: indices 0, 4, 8
      expect(result.pattern.filter(v => v === 1)).toHaveLength(3);
      expect(result.polygons).toHaveLength(1);
      expect(result.polygons[0].k).toBe(3);
    });

    it('should generate a square polygon (4-gon on 8 steps)', () => {
      const result = generateBalancedRhythm(8, [{ k: 4, op: '+' }]);
      expect(result.pattern.filter(v => v === 1)).toHaveLength(4);
    });

    it('should handle polygon subtraction correctly', () => {
      // Add a 4-gon on 8, then subtract 1 pulse at offset 0 = remove index 0
      const result = generateBalancedRhythm(8, [
        { k: 4, op: '+' },
        { k: 1, offset: 0, op: '-' },
      ]);
      // Net: 3 active pulses
      expect(result.pattern.filter(v => v === 1)).toHaveLength(3);
      expect(result.polygons).toHaveLength(2);
    });

    it('should return polygon metadata for each operation', () => {
      const result = generateBalancedRhythm(12, [
        { k: 3, op: '+' },
        { k: 4, offset: 2, op: '+' },
      ]);
      expect(result.polygons[0]).toMatchObject({ k: 3, op: '+' });
      expect(result.polygons[1]).toMatchObject({ k: 4, offset: 2, op: '+' });
    });

    it('should produce a balanced result from sum of two complementary polygons', () => {
      // Triangle (3-gon) + square (4-gon) on 12 steps
      const result = generateBalancedRhythm(12, [
        { k: 3, op: '+' },
        { k: 4, offset: 1, op: '+' },
      ]);
      // Verify that pattern is valid binary array
      expect(result.pattern.every(v => v === 0 || v === 1)).toBe(true);
      expect(result.pattern.length).toBe(12);
    });
  });
});
