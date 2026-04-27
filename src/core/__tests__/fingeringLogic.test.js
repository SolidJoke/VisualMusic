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
      const result = getGuitarFingering(0, 'chord_major');
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
      const result = getGuitarFingering(4, 'chord_major');
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[5][0]).toBe('O');
      expect(map[4][2]).toBe(2);
    });

    it('should return an open Em shape for E minor (rootValue=4)', () => {
      const result = getGuitarFingering(4, 'chord_minor');
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[2][0]).toBe('O');
      expect(map[5][0]).toBe('O');
    });

    it('should return a barre shape for F major (rootValue=5)', () => {
      const result = getGuitarFingering(5, 'chord_major');
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[5][1]).toBe(1);
      expect(map[0][1]).toBe(1);
    });

    it('should return an A-shape barre for Bb major (rootValue=10)', () => {
      const result = getGuitarFingering(10, 'chord_major');
      expect(result).not.toBeNull();
      const map = result.fingeringMap;
      expect(map[4][1]).toBe(1);
      expect(Object.values(map[5]).every(v => v === 'X')).toBe(true);
    });

    it('should use "O" label for all open strings in open shapes', () => {
      const openRoots = [0, 2, 4, 7, 9];
      openRoots.forEach(root => {
        ['chord_major', 'chord_minor'].forEach(chordType => {
          const res = getGuitarFingering(root, chordType);
          Object.values(res.fingeringMap).forEach(stringMap => {
            if (stringMap[0] !== undefined && stringMap[0] !== 'X') {
              expect(stringMap[0]).toBe('O');
            }
          });
        });
      });
    });

    it('should handle all 12 root values without crashing', () => {
      for (let root = 0; root < 12; root++) {
        const major = getGuitarFingering(root, 'chord_major');
        const minor = getGuitarFingering(root, 'chord_minor');
        expect(major.fingeringMap).toBeDefined();
        expect(minor.fingeringMap).toBeDefined();
      }
    });

    it('should respect forced rootString parameter (voicing anchoring)', () => {
      // F major rootValue = 5
      const onE = getGuitarFingering(5, 'chord_major', 5);
      expect(onE.fingeringMap[5][1]).toBe(1);
      const onA = getGuitarFingering(5, 'chord_major', 4);
      expect(onA.fingeringMap[4][8]).toBe(1);
      const onD = getGuitarFingering(5, 'chord_major', 3);
      expect(onD.fingeringMap[3][3]).toBe(1);
    });

    it('should return maj7 barre shape', () => {
      // Fmaj7 rootValue=5, anchored on E string
      const res = getGuitarFingering(5, 'chord_maj7', 5);
      const map = res.fingeringMap;
      expect(map[5][1]).toBe(1);
      expect(map[3][2]).toBe(2); // maj7 shape E has fret f+1, finger 2
    });

    it('should return m7 barre shape', () => {
      // Gm7 rootValue=7, anchored on E string
      const res = getGuitarFingering(7, 'chord_m7', 5);
      const map = res.fingeringMap;
      expect(map[5][3]).toBe(1); // G
      expect(map[3][3]).toBe(1); // m7 shape E has fret f, finger 1
    });
  });

  describe('getBassFingering', () => {
    it('should return root on E string for E bass (rootValue=4)', () => {
      const result = getBassFingering(4, 'chord_major');
      expect(result).not.toBeNull();
      // E is open on bass E string -> fret 0
      expect(result[3][0]).toBe(1);
    });

    it('should return root + 5th + octave for major chords', () => {
      const result = getBassFingering(0, 'chord_major'); // C
      expect(result).not.toBeNull();
      // Root on E string: C = fret 8 on E string ((0 - 4 + 12) % 12 = 8)
      expect(result[3][8]).toBe(1);
      // 5th on A string: fret 10
      expect(result[2][10]).toBe(3);
      // Octave on D string: (0 - 2 + 12) % 12 = 10, finger 4
      expect(result[1][10]).toBe(4);
    });

    it('should handle maj7 bass shape', () => {
      const result = getBassFingering(0, 'chord_maj7'); // Cmaj7
      expect(result).not.toBeNull();
      expect(result[3][8]).toBe(1); // Root
      expect(result[1][9]).toBe(2); // maj7 on D string is root + 1
    });

    it('should handle dom7 bass shape', () => {
      const result = getBassFingering(0, 'chord_7'); // C7
      expect(result).not.toBeNull();
      expect(result[3][8]).toBe(1); // Root
      expect(result[1][8]).toBe(1); // b7 on D string is same fret as root
    });

    it('should handle m7b5 bass shape with dim5', () => {
      const result = getBassFingering(0, 'chord_m7b5'); // Cm7b5
      expect(result).not.toBeNull();
      expect(result[3][8]).toBe(1); // Root
      expect(result[2][9]).toBe(2); // dim5 on A string is root + 1
      expect(result[1][8]).toBe(1); // b7 on D string
    });
  });
});
