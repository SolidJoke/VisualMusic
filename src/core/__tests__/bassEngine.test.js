import { describe, it, expect } from 'vitest';
import { suggestBassPattern } from '../bassEngine';

describe('bassEngine', () => {
    it('should suggest a basic root-based pattern for unknown genres', () => {
        const chords = [
            { rootNote: { value: 0 }, nns: '1' },
            { rootNote: { value: 7 }, nns: '5' }
        ];
        const result = suggestBassPattern('unknown', chords);
        
        expect(result.name).toBe('Bass');
        expect(result.activeSteps).toContain(0);
        expect(result.activeSteps).toContain(8);
        expect(result.pitchSteps[0]).toBe('R');
        expect(result.pitchSteps[8]).toBe('R');
    });

    it('should suggest a walking bass pattern for jazz', () => {
        const chords = [
            { rootNote: { value: 2 }, nns: '2-' },
            { rootNote: { value: 7 }, nns: '5' }
        ];
        const result = suggestBassPattern('jazz', chords);
        
        // Walking bass usually has 4 beats per measure (0, 4, 8, 12)
        expect(result.activeSteps).toEqual([0, 4, 8, 12]);
        // Typical walking pattern: R - 2 - 3 - 5 or similar
        expect(result.pitchSteps[0]).toBe('R');
    });

    it('should suggest a disco pattern with octaves', () => {
        const chords = [
            { rootNote: { value: 4 }, nns: '1-' }
        ];
        const result = suggestBassPattern('electronic', chords);
        
        // Disco often hits 8th notes (0, 2, 4, 6...)
        expect(result.activeSteps).toContain(0);
        expect(result.activeSteps).toContain(2);
        // Octave jumps
        expect(result.pitchSteps[2]).toBe('8va');
    });
});
