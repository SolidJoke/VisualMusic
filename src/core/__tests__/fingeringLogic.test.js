// src/core/__tests__/fingeringLogic.test.js
import { describe, it, expect } from 'vitest';
import { getGuitarFingering, getBassFingering, FINGER_LABELS } from '../fingeringLogic';

describe('fingeringLogic', () => {

  describe('FINGER_LABELS', () => {
    it('should have numeric and anatomic mappings', () => {
      expect(FINGER_LABELS.numeric[1]).toBe('1');
      expect(FINGER_LABELS.anatomic[1]).toBe('I');
      expect(FINGER_LABELS.anatomic[2]).toBe('M');
      expect(FINGER_LABELS.anatomic[3]).toBe('A');
      expect(FINGER_LABELS.anatomic[4]).toBe('m');
    });
  });

  describe('getGuitarFingering', () => {
    it('should return an open C shape for C major (rootValue=0)', () => {
      const result = getGuitarFingering(0, false);
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      // Open C: string 5 (low E) should be muted (X everywhere)
      expect(map[5]).toBeDefined();
      expect(Object.values(map[5]).every(v => v === 'X')).toBe(true);
      // String 4 (A) should have fret 3, finger 3
      expect(map[4][3]).toBe(3);
      // String 2 (G) should be open (fret 0, O)
      expect(map[2][0]).toBe('O');
    });

    it('should return an open E shape for E major (rootValue=4)', () => {
      const result = getGuitarFingering(4, false);
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[5][0]).toBe('O');
      expect(map[4][2]).toBe(2);
    });

    it('should return an open Em shape for E minor (rootValue=4)', () => {
      const result = getGuitarFingering(4, true);
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[2][0]).toBe('O');
      expect(map[5][0]).toBe('O');
    });

    it('should return a barre shape for F major (rootValue=5)', () => {
      const result = getGuitarFingering(5, false);
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[5][1]).toBe(1);
      expect(map[0][1]).toBe(1);
    });

    it('should return a minor barre shape for F minor (rootValue=5)', () => {
      const result = getGuitarFingering(5, true);
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[2][1]).toBe(1);
    });

    it('should return an A-shape barre for Bb major (rootValue=10)', () => {
      const result = getGuitarFingering(10, false);
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[4][1]).toBe(1);
      expect(Object.values(map[5]).every(v => v === 'X')).toBe(true);
    });

    it('should return open D shape for D major (rootValue=2)', () => {
      const result = getGuitarFingering(2, false);
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(Object.values(map[5]).every(v => v === 'X')).toBe(true);
      expect(Object.values(map[4]).every(v => v === 'X')).toBe(true);
    });

    it('should handle all 12 root values without crashing', () => {
      for (let root = 0; root < 12; root++) {
        const major = getGuitarFingering(root, false);
        const minor = getGuitarFingering(root, true);
        expect(major.fingeringMap).toBeDefined();
        expect(minor.fingeringMap).toBeDefined();
      }
    });

    it('should respect forced rootString parameter (voicing anchoring)', () => {
      // F major rootValue = 5
      // Anchored on E string (5): Fret 1
      const onE = getGuitarFingering(5, false, 5);
      expect(onE.fingeringMap[5][1]).toBe(1);
      // Anchored on A string (4): Fret 8
      const onA = getGuitarFingering(5, false, 4);
      expect(onA.fingeringMap[4][8]).toBe(1);
      // Anchored on D string (3): Fret 3
      const onD = getGuitarFingering(5, false, 3);
      expect(onD.fingeringMap[3][3]).toBe(1);
    });
  });

  describe('getBassFingering', () => {
    it('should return root on E string for E bass (rootValue=4)', () => {
      const result = getBassFingering(4, false);
      expect(result).not.toBeNull();
      // E is open on bass E string -> fret 0
      expect(result[3][0]).toBe(1);
    });

    it('should return root + 5th + octave for major chords', () => {
      const result = getBassFingering(0, false); // C
      expect(result).not.toBeNull();
      // Root on E string: C = fret 8 on E string ((0 - 4 + 12) % 12 = 8)
      expect(result[3][8]).toBe(1);
      // 5th on A string: fret 10
      expect(result[2][10]).toBe(3);
      // Octave on D string: (0 - 2 + 12) % 12 = 10, finger 4
      expect(result[1][10]).toBe(4);
    });

    it('should add minor 3rd and octave for minor chords', () => {
      const result = getBassFingering(9, true); // Am
      expect(result).not.toBeNull();
      // Root A on E string: (9 - 4 + 12) % 12 = 5
      expect(result[3][5]).toBe(1);
      // 5th on A: fret 7
      expect(result[2][7]).toBe(3);
      // Minor 3rd (C=0) on A string: (9 + 3 - 9 + 12) % 12 = 3, finger 2
      expect(result[2][3]).toBe(2);
      // Octave on D string: (9 - 2 + 12) % 12 = 7, finger 4
      expect(result[1][7]).toBe(4);
    });

    it('should handle all 12 root values without crashing', () => {
      for (let root = 0; root < 12; root++) {
        const major = getBassFingering(root, false);
        const minor = getBassFingering(root, true);
        expect(major).not.toBeNull();
        expect(minor).not.toBeNull();
      }
    });
  });
});
