import { describe, it, expect } from 'vitest';
import { getScaleNotesAdapter, getChordNotesAbsoluteAdapter, resolveChordFromShortNameAdapter } from '../tonal-adapter';
import { NOTES } from '../theory';

describe('Tonal Adapter', () => {
    describe('getScaleNotesAdapter', () => {
        it('should return C major scale correctly', () => {
            const rootC = 0;
            const notes = getScaleNotesAdapter(rootC, 'scale_major');
            
            expect(notes).toHaveLength(7);
            expect(notes[0].us).toBe('C');
            expect(notes[0].order).toBe(1);
            expect(notes[1].us).toBe('D');
            expect(notes[2].us).toBe('E');
            expect(notes[6].us).toBe('B');
            expect(notes[6].order).toBe(7);
        });

        it('should return A natural minor scale correctly', () => {
            const rootA = 9;
            const notes = getScaleNotesAdapter(rootA, 'scale_minor');
            
            expect(notes).toHaveLength(7);
            expect(notes[0].us).toBe('A');
            expect(notes[1].us).toBe('B');
            expect(notes[2].us).toBe('C');
        });

        it('should return empty array for invalid scale', () => {
            expect(getScaleNotesAdapter(0, 'scale_invalid')).toEqual([]);
        });
    });

    describe('getChordNotesAbsoluteAdapter', () => {
        it('should return C major chord absolute notes at octave 4', () => {
            // C4 = 60, E4 = 64, G4 = 67
            const rootC = 0;
            const notes = getChordNotesAbsoluteAdapter(rootC, 'chord_major', 4);
            expect(notes).toEqual([60, 64, 67]);
        });

        it('should return Am7 chord absolute notes at octave 3', () => {
            // A3 = 57, C4 = 60, E4 = 64, G4 = 67
            const rootA = 9;
            const notes = getChordNotesAbsoluteAdapter(rootA, 'chord_m7', 3);
            expect(notes).toEqual([57, 60, 64, 67]);
        });

        it('should return empty array for invalid chord', () => {
            expect(getChordNotesAbsoluteAdapter(0, 'chord_invalid', 4)).toEqual([]);
        });
    });
});
