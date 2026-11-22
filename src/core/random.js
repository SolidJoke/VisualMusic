// @ts-check
// src/core/random.js
//
// Seeded, reproducible randomness for the generators (VMU-218).
//
// Rule: the same seed gives the same result on screen, in sound and in export.
// Everything in this file is deterministic except newSeed(), which is the only
// function allowed to read a non-deterministic source. Nothing else here may
// call Math.random or Date.now (a test checks this).
//
// No dependency. The generator is mulberry32, written here.

const TWO_POW_32 = 4294967296;

/**
 * FNV-1a, 32 bits. Turns a string into a stable 32-bit number.
 * @param {string} text
 * @returns {number} unsigned 32-bit
 */
function fnv1a32(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/**
 * Murmur3 finaliser. Spreads the bits so that close inputs give unrelated outputs.
 * @param {number} h unsigned 32-bit
 * @returns {number} unsigned 32-bit
 */
function avalanche(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

/**
 * Turns a seed into an unsigned 32-bit integer.
 * - finite number: truncated, then taken modulo 2^32;
 * - string of decimal digits: read as that number ("42" and 42 are the same seed);
 * - any other string: hashed (FNV-1a), so a word such as "chorus" is a valid seed.
 * @param {number|string} x
 * @returns {number} unsigned 32-bit integer
 */
export function normalizeSeed(x) {
    if (typeof x === 'number') {
        if (!Number.isFinite(x)) throw new TypeError('seed must be a finite number');
        return Math.trunc(x) >>> 0;
    }
    if (typeof x === 'string') {
        const text = x.trim();
        if (/^\d+$/.test(text)) return Number(text) >>> 0;
        return fnv1a32(text);
    }
    throw new TypeError('seed must be a number or a string');
}

/**
 * @typedef {Object} Rng
 * @property {() => number} next uniform in [0, 1)
 * @property {(min: number, max: number) => number} int integer in [min, max], both included
 * @property {<T>(array: T[]) => T} pick one element of a non-empty array
 * @property {(p: number) => boolean} chance true with probability p (p <= 0 never, p >= 1 always)
 * @property {<T>(array: T[]) => T[]} shuffle returns a shuffled copy; the input is not mutated
 * @property {(label: string) => Rng} fork independent sub-generator derived from the seed and the label
 */

/**
 * Creates a deterministic generator.
 * Same seed, same sequence. The sequence depends on nothing but the seed.
 * @param {number|string} seed
 * @returns {Rng}
 */
export function createRng(seed) {
    return buildRng(normalizeSeed(seed));
}

/**
 * @param {number} baseSeed unsigned 32-bit, already normalised
 * @returns {Rng}
 */
function buildRng(baseSeed) {
    // mulberry32: the state is one 32-bit integer.
    let state = baseSeed >>> 0;

    /** @returns {number} uniform in [0, 1) */
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / TWO_POW_32;
    };

    /**
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    const int = (min, max) => {
        if (!Number.isInteger(min) || !Number.isInteger(max)) {
            throw new TypeError(`int(min, max) needs integers, got ${min}, ${max}`);
        }
        if (max < min) throw new RangeError(`int(min, max): max (${max}) < min (${min})`);
        return min + Math.floor(next() * (max - min + 1));
    };

    /**
     * @template T
     * @param {T[]} array
     * @returns {T}
     */
    const pick = (array) => {
        if (!Array.isArray(array) || array.length === 0) {
            throw new RangeError('pick(array) needs a non-empty array');
        }
        return array[int(0, array.length - 1)];
    };

    /**
     * @param {number} p
     * @returns {boolean}
     */
    const chance = (p) => next() < p;

    /**
     * @template T
     * @param {T[]} array
     * @returns {T[]}
     */
    const shuffle = (array) => {
        const copy = array.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = int(0, i);
            const tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        return copy;
    };

    /**
     * The child seed comes from the BASE seed and the label, never from the
     * current state. So fork('piste-1') gives the same stream whenever it is
     * created, and whatever was drawn before it. Adding a track does not shift
     * the randomness of the others.
     * @param {string} label
     * @returns {Rng}
     */
    const fork = (label) => {
        const childSeed = avalanche(fnv1a32(`${baseSeed}\u0000${String(label)}`));
        return buildRng(childSeed);
    };

    return { next, int, pick, chance, shuffle, fork };
}

/**
 * Picks a fresh seed. This is the ONLY function in this module that reads a
 * non-deterministic source. Call it once, at the moment a user asks for a new
 * result, and keep the returned seed: it is what lets the result come back.
 * @returns {number} unsigned 32-bit integer
 */
export function newSeed() {
    const c = /** @type {any} */ (globalThis).crypto;
    if (c && typeof c.getRandomValues === 'function') {
        const buf = new Uint32Array(1);
        c.getRandomValues(buf);
        return buf[0];
    }
    return Math.floor(Math.random() * TWO_POW_32) >>> 0;
}

const SEED_BASE = 36;
const SEED_WIDTH = 7; // 36^6 < 2^32 <= 36^7: six characters cannot hold every 32-bit seed

/**
 * Short, readable form of a seed: 7 characters in base 36, zero-padded.
 * parseSeed(formatSeed(s)) === s for every unsigned 32-bit s.
 * @param {number|string} seed
 * @returns {string}
 */
export function formatSeed(seed) {
    const n = normalizeSeed(seed);
    return n.toString(SEED_BASE).padStart(SEED_WIDTH, '0');
}

/**
 * Reads a seed written by formatSeed (or typed by hand: case and spaces are ignored).
 * Throws on anything that is not a valid seed.
 * @param {string} text
 * @returns {number} unsigned 32-bit integer
 */
export function parseSeed(text) {
    if (typeof text !== 'string') throw new TypeError('parseSeed needs a string');
    const clean = text.trim().toLowerCase();
    if (!/^[0-9a-z]{1,7}$/.test(clean)) {
        throw new SyntaxError(`not a seed: "${text}"`);
    }
    const n = parseInt(clean, SEED_BASE);
    if (n >= TWO_POW_32) throw new RangeError(`seed out of 32-bit range: "${text}"`);
    return n;
}
