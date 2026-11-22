// src/core/__tests__/random.test.js
// VMU-218: seeded, reproducible randomness. Contract tests for src/core/random.js.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    createRng,
    normalizeSeed,
    newSeed,
    formatSeed,
    parseSeed,
} from '../random.js';

const draw = (rng, n) => Array.from({ length: n }, () => rng.next());

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createRng: determinism', () => {
    it('same seed gives the same 1000 draws', () => {
        expect(draw(createRng(12345), 1000)).toEqual(draw(createRng(12345), 1000));
    });

    it('neighbouring seeds give different sequences', () => {
        const a = draw(createRng(1), 20);
        const b = draw(createRng(2), 20);
        expect(a).not.toEqual(b);
        expect(a.filter((v, i) => v === b[i])).toHaveLength(0);
    });

    it('the string "42" and the number 42 are the same seed', () => {
        expect(draw(createRng('42'), 10)).toEqual(draw(createRng(42), 10));
    });

    it('reference values for seed 1 (the reproducibility contract)', () => {
        // Written in stone on purpose. If these change, every saved seed changes meaning.
        expect(draw(createRng(1), 5)).toEqual([
            0.6270739405881613,
            0.002735721180215478,
            0.5274470399599522,
            0.9810509674716741,
            0.9683778982143849,
        ]);
    });

    it('every value is in [0, 1)', () => {
        for (const v of draw(createRng(99), 5000)) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });

    it('does not read Math.random (drawing with it forbidden must still work)', () => {
        const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
            throw new Error('Math.random called');
        });
        expect(() => draw(createRng(7), 100)).not.toThrow();
        expect(() => createRng(7).fork('x').shuffle([1, 2, 3])).not.toThrow();
        expect(spy).not.toHaveBeenCalled();
    });
});

describe('int(min, max)', () => {
    it('stays within bounds (both included) and reaches both bounds', () => {
        const rng = createRng(3);
        const seen = new Set();
        for (let i = 0; i < 10000; i++) {
            const v = rng.int(3, 7);
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(3);
            expect(v).toBeLessThanOrEqual(7);
            seen.add(v);
        }
        expect(seen.has(3)).toBe(true);
        expect(seen.has(7)).toBe(true);
    });

    it('a degenerate range always returns its single value', () => {
        const rng = createRng(4);
        for (let i = 0; i < 50; i++) expect(rng.int(5, 5)).toBe(5);
    });

    it('max < min throws', () => {
        expect(() => createRng(1).int(7, 3)).toThrow(RangeError);
    });

    it('roughly uniform: chi-square on 10 bins stays under a wide threshold', () => {
        const rng = createRng(2026);
        const bins = new Array(10).fill(0);
        const N = 10000;
        for (let i = 0; i < N; i++) bins[rng.int(0, 9)]++;
        const expected = N / 10;
        const chi2 = bins.reduce((s, o) => s + (o - expected) ** 2 / expected, 0);
        // df = 9. Critical value at p = 0.001 is 27.88; we use a wide threshold.
        expect(chi2).toBeLessThan(27.88);
    });
});

describe('pick, chance, shuffle', () => {
    it('pick returns an element of the array and throws on empty', () => {
        const rng = createRng(5);
        const arr = ['a', 'b', 'c'];
        for (let i = 0; i < 200; i++) expect(arr).toContain(rng.pick(arr));
        expect(() => createRng(5).pick([])).toThrow(RangeError);
    });

    it('chance(0) is never true, chance(1) is always true', () => {
        const rng = createRng(6);
        for (let i = 0; i < 500; i++) {
            expect(rng.chance(0)).toBe(false);
            expect(rng.chance(1)).toBe(true);
        }
    });

    it('shuffle returns a permutation, copies, and does not mutate the input', () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8];
        const frozen = input.slice();
        const out = createRng(8).shuffle(input);
        expect(input).toEqual(frozen);
        expect(out).not.toBe(input);
        expect([...out].sort((a, b) => a - b)).toEqual(frozen);
    });

    it('shuffle is deterministic for a given seed', () => {
        const arr = Array.from({ length: 20 }, (_, i) => i);
        expect(createRng(9).shuffle(arr)).toEqual(createRng(9).shuffle(arr));
    });
});

describe('fork(label)', () => {
    it('is stable: same label, same stream', () => {
        expect(draw(createRng(7).fork('piste-1'), 50)).toEqual(draw(createRng(7).fork('piste-1'), 50));
    });

    it('is independent of the order of creation', () => {
        const r1 = createRng(7);
        const a1 = draw(r1.fork('a'), 30);
        const b1 = draw(r1.fork('b'), 30);

        const r2 = createRng(7);
        const b2 = draw(r2.fork('b'), 30);
        const a2 = draw(r2.fork('a'), 30);

        expect(a2).toEqual(a1);
        expect(b2).toEqual(b1);
    });

    it('is independent of how much the parent has already drawn', () => {
        const fresh = draw(createRng(7).fork('a'), 30);
        const used = createRng(7);
        draw(used, 200);
        expect(draw(used.fork('a'), 30)).toEqual(fresh);
    });

    it('different labels give different streams', () => {
        const a = draw(createRng(7).fork('a'), 20);
        const b = draw(createRng(7).fork('b'), 20);
        expect(a).not.toEqual(b);
    });
});

describe('normalizeSeed', () => {
    it('turns numbers and strings into unsigned 32-bit integers', () => {
        expect(normalizeSeed(42)).toBe(42);
        expect(normalizeSeed('42')).toBe(42);
        expect(normalizeSeed(-1)).toBe(4294967295);
        expect(normalizeSeed(4294967296 + 5)).toBe(5);
        expect(normalizeSeed(3.9)).toBe(3);
        const h = normalizeSeed('chorus');
        expect(Number.isInteger(h) && h >= 0 && h <= 0xffffffff).toBe(true);
        expect(normalizeSeed('chorus')).toBe(h);
    });

    it('rejects NaN, Infinity and other types', () => {
        expect(() => normalizeSeed(NaN)).toThrow(TypeError);
        expect(() => normalizeSeed(Infinity)).toThrow(TypeError);
        expect(() => normalizeSeed(null)).toThrow(TypeError);
    });
});

describe('newSeed', () => {
    it('returns an unsigned 32-bit integer', () => {
        for (let i = 0; i < 20; i++) {
            const s = newSeed();
            expect(Number.isInteger(s)).toBe(true);
            expect(s).toBeGreaterThanOrEqual(0);
            expect(s).toBeLessThanOrEqual(0xffffffff);
        }
    });
});

describe('formatSeed / parseSeed', () => {
    it('round-trips exactly, including the edges of the 32-bit range', () => {
        const samples = [0, 1, 35, 36, 1295, 1296, 123456789, 0xfffffffe, 0xffffffff];
        for (const s of samples) {
            expect(parseSeed(formatSeed(s))).toBe(s);
        }
    });

    it('round-trips 1000 deterministic seeds', () => {
        const rng = createRng(31337);
        for (let i = 0; i < 1000; i++) {
            const s = rng.int(0, 0xffffffff);
            expect(parseSeed(formatSeed(s))).toBe(s);
        }
    });

    it('is always 7 characters, zero-padded', () => {
        expect(formatSeed(0)).toBe('0000000');
        expect(formatSeed(1)).toBe('0000001');
        expect(formatSeed(0xffffffff)).toHaveLength(7);
    });

    it('parses typed input: case and surrounding spaces are ignored', () => {
        expect(parseSeed(' 1Z141Z3 ')).toBe(0xffffffff);
        expect(parseSeed('0000001')).toBe(1);
    });

    it('rejects invalid text', () => {
        expect(() => parseSeed('')).toThrow(SyntaxError);
        expect(() => parseSeed('ab!c')).toThrow(SyntaxError);
        expect(() => parseSeed('abcdefgh')).toThrow(SyntaxError); // 8 characters
        expect(() => parseSeed('zzzzzzz')).toThrow(RangeError); // beyond 32 bits
    });
});
