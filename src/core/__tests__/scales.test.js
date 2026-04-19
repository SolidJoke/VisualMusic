// src/core/__tests__/scales.test.js
import { describe, it, expect } from 'vitest';
import {
    SCALES,
    SCALE_CATEGORIES,
    getScaleNotesGeneric,
    resolveScaleIntervals,
    NOTES,
    MODES,
} from '../theory';

// =============================================================
// A.3 — SCALES dictionary & generic scale functions unit tests
// =============================================================

describe('SCALES dictionary integrity', () => {
    const scaleEntries = Object.entries(SCALES);

    it('should contain at least 15 scale definitions', () => {
        expect(scaleEntries.length).toBeGreaterThanOrEqual(15);
    });

    it.each(scaleEntries)(
        '%s intervals must sum to 12 semitones',
        (key, scale) => {
            const sum = scale.intervals.reduce((a, b) => a + b, 0);
            expect(sum).toBe(12);
        }
    );

    it.each(scaleEntries)(
        '%s noteCount must match intervals length',
        (key, scale) => {
            expect(scale.noteCount).toBe(scale.intervals.length);
        }
    );

    it.each(scaleEntries)(
        '%s must have a valid category',
        (key, scale) => {
            expect(Object.keys(SCALE_CATEGORIES)).toContain(scale.category);
        }
    );

    it.each(scaleEntries)(
        '%s key must match its dictionary key',
        (key, scale) => {
            expect(scale.key).toBe(key);
        }
    );

    it.each(scaleEntries)(
        '%s must have emotion in 4 languages (fr, en, pt, zh)',
        (key, scale) => {
            expect(scale.emotion).toHaveProperty('fr');
            expect(scale.emotion).toHaveProperty('en');
            expect(scale.emotion).toHaveProperty('pt');
            expect(scale.emotion).toHaveProperty('zh');
        }
    );

    it.each(scaleEntries)(
        '%s must have description in 4 languages',
        (key, scale) => {
            expect(scale.description).toHaveProperty('fr');
            expect(scale.description).toHaveProperty('en');
            expect(scale.description).toHaveProperty('pt');
            expect(scale.description).toHaveProperty('zh');
        }
    );

    // Cross-check: SCALES entries for major/minor must match MODES
    it('scale_major intervals must match MODES.Ionian', () => {
        expect(SCALES.scale_major.intervals).toEqual(MODES.Ionian.intervals);
    });

    it('scale_minor intervals must match MODES.Aeolian', () => {
        expect(SCALES.scale_minor.intervals).toEqual(MODES.Aeolian.intervals);
    });

    it('scale_dorian intervals must match MODES.Dorian', () => {
        expect(SCALES.scale_dorian.intervals).toEqual(MODES.Dorian.intervals);
    });
});

describe('SCALE_CATEGORIES', () => {
    it('should contain 5 categories', () => {
        expect(Object.keys(SCALE_CATEGORIES).length).toBe(5);
    });

    it('each category should have a labelKey and order', () => {
        Object.values(SCALE_CATEGORIES).forEach(cat => {
            expect(cat).toHaveProperty('labelKey');
            expect(cat).toHaveProperty('order');
            expect(typeof cat.order).toBe('number');
        });
    });
});

describe('getScaleNotesGeneric', () => {
    it('should return 7 notes for a heptatonic scale (C major)', () => {
        const notes = getScaleNotesGeneric(0, [2, 2, 1, 2, 2, 2, 1]);
        expect(notes).toHaveLength(7);
        // C major: C, D, E, F, G, A, B
        expect(notes.map(n => n.us)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    });

    it('should return 5 notes for a pentatonic scale (C major penta)', () => {
        const notes = getScaleNotesGeneric(0, [2, 2, 3, 2, 3]);
        expect(notes).toHaveLength(5);
        // C major pentatonic: C, D, E, G, A
        expect(notes.map(n => n.us)).toEqual(['C', 'D', 'E', 'G', 'A']);
    });

    it('should return 5 notes for A minor pentatonic', () => {
        // A = value 9, minor pentatonic intervals: 3-2-2-3-2
        const notes = getScaleNotesGeneric(9, [3, 2, 2, 3, 2]);
        expect(notes).toHaveLength(5);
        // A minor pentatonic: A, C, D, E, G
        expect(notes.map(n => n.us)).toEqual(['A', 'C', 'D', 'E', 'G']);
    });

    it('should return 6 notes for a blues scale (A minor blues)', () => {
        // A minor blues: A, C, D, D#, E, G — intervals: 3-2-1-1-3-2
        const notes = getScaleNotesGeneric(9, [3, 2, 1, 1, 3, 2]);
        expect(notes).toHaveLength(6);
        expect(notes.map(n => n.us)).toEqual(['A', 'C', 'D', 'D#', 'E', 'G']);
    });

    it('should return 12 notes for a chromatic scale', () => {
        const notes = getScaleNotesGeneric(0, [1,1,1,1,1,1,1,1,1,1,1,1]);
        expect(notes).toHaveLength(12);
        // Should be all 12 notes starting from C
        expect(notes.map(n => n.us)).toEqual(
            ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        );
    });

    it('should return 6 notes for whole tone scale (C)', () => {
        const notes = getScaleNotesGeneric(0, [2, 2, 2, 2, 2, 2]);
        expect(notes).toHaveLength(6);
        // C whole tone: C, D, E, F#, G#, A#
        expect(notes.map(n => n.us)).toEqual(['C', 'D', 'E', 'F#', 'G#', 'A#']);
    });

    it('should assign correct order numbers starting from 1', () => {
        const notes = getScaleNotesGeneric(0, [2, 2, 3, 2, 3]);
        expect(notes.map(n => n.order)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle non-zero root values (E major)', () => {
        // E = value 4, major intervals: 2-2-1-2-2-2-1
        const notes = getScaleNotesGeneric(4, [2, 2, 1, 2, 2, 2, 1]);
        expect(notes.map(n => n.us)).toEqual(['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#']);
    });

    // Verify Hirajoshi (exotic 5-note scale)
    it('should return correct notes for C Hirajoshi', () => {
        // C Hirajoshi: C, D, D#, G, G# — intervals: 2-1-4-1-4
        const notes = getScaleNotesGeneric(0, [2, 1, 4, 1, 4]);
        expect(notes).toHaveLength(5);
        expect(notes.map(n => n.us)).toEqual(['C', 'D', 'D#', 'G', 'G#']);
    });

    // Verify harmonic minor (the augmented 2nd interval)
    it('should return correct notes for A harmonic minor', () => {
        // A harm. minor: A, B, C, D, E, F, G# — intervals: 2-1-2-2-1-3-1
        const notes = getScaleNotesGeneric(9, [2, 1, 2, 2, 1, 3, 1]);
        expect(notes).toHaveLength(7);
        expect(notes.map(n => n.us)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#']);
    });
});

describe('resolveScaleIntervals', () => {
    it('should return intervals for scale_major', () => {
        const result = resolveScaleIntervals('scale_major');
        expect(result).not.toBeNull();
        expect(result.intervals).toEqual([2, 2, 1, 2, 2, 2, 1]);
        expect(result.noteCount).toBe(7);
    });

    it('should return intervals for scale_pentatonic_minor', () => {
        const result = resolveScaleIntervals('scale_pentatonic_minor');
        expect(result).not.toBeNull();
        expect(result.intervals).toEqual([3, 2, 2, 3, 2]);
        expect(result.noteCount).toBe(5);
    });

    it('should return intervals for scale_blues_minor', () => {
        const result = resolveScaleIntervals('scale_blues_minor');
        expect(result).not.toBeNull();
        expect(result.intervals).toEqual([3, 2, 1, 1, 3, 2]);
        expect(result.noteCount).toBe(6);
    });

    it('should return null for chord types', () => {
        expect(resolveScaleIntervals('chord_major')).toBeNull();
        expect(resolveScaleIntervals('chord_minor')).toBeNull();
    });

    it('should return null for single_note', () => {
        expect(resolveScaleIntervals('single_note')).toBeNull();
    });

    it('should return null for undefined/null', () => {
        expect(resolveScaleIntervals(null)).toBeNull();
        expect(resolveScaleIntervals(undefined)).toBeNull();
    });

    it('should return intervals for all SCALES entries', () => {
        Object.keys(SCALES).forEach(key => {
            const result = resolveScaleIntervals(key);
            expect(result).not.toBeNull();
            expect(result.intervals).toEqual(SCALES[key].intervals);
        });
    });
});
