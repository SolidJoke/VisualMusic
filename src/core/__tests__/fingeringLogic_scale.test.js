import { describe, it, expect } from 'vitest';
import { getAvailableScaleFingerings } from '../fingeringLogic.js';
import { getAbsoluteNoteValue } from '../theory.js';

const guitarStrings = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const bassStrings   = ['E1', 'A1', 'D2', 'G2'];

describe('Scale deduplication by absolute pitch', () => {
  it('C major guitar pos 0 has more than 7 notes (contains multiple octaves)', () => {
    const positions = getAvailableScaleFingerings(0, 'scale_major', 'guitar', guitarStrings);
    const pos0 = positions[0];
    expect(pos0.scaleFrets.length).toBeGreaterThan(7);
  });

  it('Deduplicates exact same pitch (e.g. B3 on B-string Fret 0 vs G-string Fret 4)', () => {
    const positions = getAvailableScaleFingerings(0, 'scale_major', 'guitar', guitarStrings);
    // Find position that contains fret 0 and fret 4 (pos 0 does)
    const pos0 = positions[0];
    
    // We expect B3 to be present exactly once.
    // E4=64, B3=59, G3=55, D3=50, A2=45, E2=40
    // B3 can be played on stringIndex=1 (B string) fret 0, or stringIndex=2 (G string) fret 4
    
    let countB3 = 0;
    let b3String = -1;
    pos0.scaleFrets.forEach(sf => {
      const openVal = [64, 59, 55, 50, 45, 40][sf.stringIndex];
      const absPitch = openVal + sf.fret;
      if (absPitch === 59) {
        countB3++;
        b3String = sf.stringIndex;
      }
    });
    
    expect(countB3).toBe(1);
    expect(b3String).toBe(1); // Keeps the highest string (B string)
  });
});
