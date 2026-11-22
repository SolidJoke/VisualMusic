// src/core/__tests__/propertyHelpers.test.js
// VMU-218: the property helpers must pass on valid cases AND fail on invalid ones.
// A helper that never fails proves nothing, so each one has a positive control.

import { describe, it, expect } from 'vitest';
import { forAllSeeds, assertInScale, assertMaxLeap, assertDensityMonotone } from './propertyHelpers.js';
import { resolveScaleSemitones } from '../theory.js';

describe('forAllSeeds', () => {
    it('runs fn n times, on distinct seeds', () => {
        const seeds = [];
        forAllSeeds(50, (s) => seeds.push(s));
        expect(seeds).toHaveLength(50);
        expect(new Set(seeds).size).toBe(50);
    });

    it('draws the same seeds on every run', () => {
        const first = [];
        const second = [];
        forAllSeeds(30, (s) => first.push(s));
        forAllSeeds(30, (s) => second.push(s));
        expect(second).toEqual(first);
    });

    it('a failure names the seed that broke (so the case can be replayed)', () => {
        const seeds = [];
        forAllSeeds(10, (s) => seeds.push(s));
        const culprit = seeds[4];
        expect(() =>
            forAllSeeds(10, (s) => {
                if (s === culprit) throw new Error('boom');
            }),
        ).toThrow(new RegExp(`property failed on seed ${culprit} `));
    });

    it('rejects n < 1', () => {
        expect(() => forAllSeeds(0, () => {})).toThrow(RangeError);
    });

    it('positive control: a property that holds passes on every seed', () => {
        expect(() => forAllSeeds(100, (s) => expect(s >>> 0).toBe(s))).not.toThrow();
    });
});

describe('assertInScale', () => {
    const DMAJ_PCS = [2, 4, 6, 7, 9, 11, 1]; // D major, pitch classes

    it('valid: D major notes pass (MIDI, octave-independent)', () => {
        expect(() => assertInScale([62, 64, 66, 67, 69, 71, 73, 74], 2, [0, 2, 4, 5, 7, 9, 11])).not.toThrow();
        expect(() => assertInScale(DMAJ_PCS, 2, [0, 2, 4, 5, 7, 9, 11])).not.toThrow();
    });

    it('valid, from the real dictionary: C major via resolveScaleSemitones', () => {
        const intervals = resolveScaleSemitones('scale_major');
        expect(() => assertInScale([60, 62, 64, 65, 67, 69, 71, 72], 0, intervals)).not.toThrow();
    });

    it('invalid: a fabricated C# in a C major line fails and names the note', () => {
        expect(() => assertInScale([60, 62, 61, 67], 0, [0, 2, 4, 5, 7, 9, 11])).toThrow(/61/);
    });

    it('invalid: wrong root (C major notes checked against D) fails', () => {
        expect(() => assertInScale([60, 64, 67], 2, [0, 2, 4, 5, 7, 9, 11])).toThrow(/outside the scale/);
    });
});

describe('assertMaxLeap', () => {
    it('valid: small steps and a single note pass', () => {
        expect(() => assertMaxLeap([60, 62, 64, 67, 65], 7)).not.toThrow();
        expect(() => assertMaxLeap([60], 0)).not.toThrow();
        expect(() => assertMaxLeap([], 0)).not.toThrow();
    });

    it('valid boundary: a leap exactly equal to the maximum passes', () => {
        expect(() => assertMaxLeap([60, 67], 7)).not.toThrow();
    });

    it('invalid: an octave leap fails when the limit is a fifth', () => {
        expect(() => assertMaxLeap([60, 62, 72], 7)).toThrow(/leap of 10 semitones/);
    });

    it('a downward leap counts in absolute value', () => {
        expect(() => assertMaxLeap([72, 60], 11)).toThrow(/leap of 12/);
    });
});

describe('assertDensityMonotone', () => {
    it('valid: a density that adds notes passes', () => {
        expect(() => assertDensityMonotone((d) => d * 2, [1, 2, 3, 4])).not.toThrow();
    });

    it('valid: equal counts for different densities are allowed (never fewer)', () => {
        expect(() => assertDensityMonotone((d) => (d < 3 ? 4 : 6), [1, 2, 3])).not.toThrow();
    });

    it('invalid: a density that gives fewer notes fails', () => {
        expect(() => assertDensityMonotone((d) => (d === 2 ? 3 : 6), [1, 2, 3])).toThrow(/fewer than the previous/);
    });

    it('accepts a function that returns arrays, counted by length', () => {
        expect(() => assertDensityMonotone((d) => Array(d).fill(0), [1, 2, 3])).not.toThrow();
        expect(() => assertDensityMonotone((d) => Array(4 - d).fill(0), [1, 2, 3])).toThrow(/fewer/);
    });

    it('rejects densities that are not strictly ascending', () => {
        expect(() => assertDensityMonotone((d) => d, [1, 3, 2])).toThrow(RangeError);
    });
});
