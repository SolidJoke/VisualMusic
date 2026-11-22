// @ts-check
// src/core/__tests__/propertyHelpers.js
//
// Hand-written property-test helpers (VMU-218). No dependency (no fast-check).
// Each helper throws on violation, so it works inside `expect(() => ...)` and
// with plain `it` blocks. On failure, forAllSeeds names the seed that broke, so
// the case can be replayed exactly.

import { createRng, formatSeed } from '../random.js';

/** Fixed master seed: the seeds forAllSeeds draws are the same on every run. */
const MASTER_SEED = 20260522;

/**
 * Runs fn on n deterministic seeds. If fn throws for some seed, the error says
 * which seed (and its short form) failed, so the case can be replayed.
 * @param {number} n number of seeds
 * @param {(seed: number) => void} fn property to check for each seed
 * @returns {void}
 */
export function forAllSeeds(n, fn) {
    if (!Number.isInteger(n) || n < 1) throw new RangeError('forAllSeeds: n must be a positive integer');
    const master = createRng(MASTER_SEED);
    for (let i = 0; i < n; i++) {
        const seed = master.int(0, 0xffffffff);
        try {
            fn(seed);
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            throw new Error(
                `property failed on seed ${seed} (${formatSeed(seed)}), case ${i + 1}/${n}: ${reason}`,
                { cause: err },
            );
        }
    }
}

/**
 * Every note must belong to the scale.
 * @param {number[]} notes MIDI pitches or pitch classes
 * @param {number} rootValue pitch class of the root (0-11)
 * @param {number[]} scaleIntervals cumulative semitones from the root, root included
 *   (the shape resolveScaleSemitones returns in src/core/theory.js)
 * @returns {void}
 */
export function assertInScale(notes, rootValue, scaleIntervals) {
    // allowed: absolute pitch classes of the scale. Each note is reduced to its
    // absolute pitch class too, so both sides are in the same frame.
    const allowed = new Set(scaleIntervals.map((s) => (((rootValue + s) % 12) + 12) % 12));
    const outside = notes.filter((n) => !allowed.has(((n % 12) + 12) % 12));
    if (outside.length > 0) {
        throw new Error(`notes outside the scale: ${outside.join(', ')} (root ${rootValue}, scale ${scaleIntervals.join(' ')})`);
    }
}

/**
 * No jump between two consecutive notes may exceed `semitones`.
 * @param {number[]} notes pitches in playing order
 * @param {number} semitones largest allowed leap, in absolute value
 * @returns {void}
 */
export function assertMaxLeap(notes, semitones) {
    for (let i = 1; i < notes.length; i++) {
        const leap = Math.abs(notes[i] - notes[i - 1]);
        if (leap > semitones) {
            throw new Error(`leap of ${leap} semitones between notes ${i - 1} and ${i} (${notes[i - 1]} -> ${notes[i]}), max ${semitones}`);
        }
    }
}

/**
 * More density never gives fewer notes.
 * @param {(density: number) => (number[] | number)} fn returns the notes (or their count) for a density
 * @param {number[]} densities strictly ascending densities to test
 * @returns {void}
 */
export function assertDensityMonotone(fn, densities) {
    for (let i = 1; i < densities.length; i++) {
        if (!(densities[i] > densities[i - 1])) {
            throw new RangeError(`densities must be strictly ascending: ${densities.join(', ')}`);
        }
    }
    let previous = -Infinity;
    for (const d of densities) {
        const out = fn(d);
        const count = Array.isArray(out) ? out.length : out;
        if (count < previous) {
            throw new Error(`density ${d} gives ${count} notes, fewer than the previous ${previous}`);
        }
        previous = count;
    }
}
