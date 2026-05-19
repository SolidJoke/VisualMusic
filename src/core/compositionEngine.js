/**
 * Composition Engine - Mathematical & Algorithmic Composition Utilities
 * Focuses on Euclidean rhythms, phasing, isorhythms, and dualities.
 * All algorithms are pure functions and fully unit-tested.
 */

/**
 * Computes the Greatest Common Divisor (GCD/PGCD) of two numbers
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

/**
 * Computes the Least Common Multiple (LCM/PPCM) of two numbers
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Generates an Euclidean Rhythm E(k, n) using a robust Bjorklund algorithm.
 * Distributes k pulses as evenly as possible into n subdivisions.
 *
 * @param {number} k Number of active pulses
 * @param {number} n Total number of subdivisions
 * @returns {number[]} Binary pattern (e.g. [1, 0, 0, 1, 0, 0, 1, 0])
 */
export function euclideanRhythm(k, n) {
  if (n <= 0) return [];
  const pulses = Math.max(0, Math.min(k, n));
  if (pulses === 0) return Array(n).fill(0);
  if (pulses === n) return Array(n).fill(1);

  // Initialize n groups: first k are [1], remaining n-k are [0]
  let groups = [];
  for (let i = 0; i < n; i++) {
    groups.push(i < pulses ? [1] : [0]);
  }

  while (true) {
    // Find index of first group that is not equal to groups[0]
    let diffIndex = -1;
    for (let i = 1; i < groups.length; i++) {
      if (!arraysEqual(groups[i], groups[0])) {
        diffIndex = i;
        break;
      }
    }

    // If all groups are identical, we are done
    if (diffIndex === -1) {
      break;
    }

    const left = groups.slice(0, diffIndex);
    const right = groups.slice(diffIndex);

    // If the remaining groups to distribute are <= 1, we stop to avoid uneven clustering
    if (right.length <= 1) {
      break;
    }

    let newGroups = [];
    const minLength = Math.min(left.length, right.length);
    
    for (let i = 0; i < minLength; i++) {
      newGroups.push([...left[i], ...right[i]]);
    }

    // Add leftovers
    if (left.length > right.length) {
      for (let i = minLength; i < left.length; i++) {
        newGroups.push(left[i]);
      }
    } else if (right.length > left.length) {
      for (let i = minLength; i < right.length; i++) {
        newGroups.push(right[i]);
      }
    }

    groups = newGroups;
  }

  return groups.flat();
}

/**
 * Determines if a rhythm E(k, n) is periodic (has a GCD > 1)
 * @param {number} k
 * @param {number} n
 * @returns {boolean}
 */
export function isPeriodic(k, n) {
  if (n <= 0) return false;
  return gcd(k, n) > 1;
}

/**
 * Returns the complementary pattern (inverting 0 and 1)
 * @param {number[]} pattern
 * @returns {number[]}
 */
export function complement(pattern) {
  return pattern.map(val => (val === 1 ? 0 : 1));
}

/**
 * Shifts the pattern by a given offset (rotation)
 * @param {number[]} pattern
 * @param {number} offset
 * @returns {number[]}
 */
export function rotate(pattern, offset) {
  if (!pattern || pattern.length === 0) return [];
  const len = pattern.length;
  // Handle negative offsets and large offsets gracefully
  const shift = ((offset % len) + len) % len;
  if (shift === 0) return [...pattern];
  return [...pattern.slice(len - shift), ...pattern.slice(0, len - shift)];
}

/**
 * Checks if a pattern is auto-complementary.
 * A pattern is auto-complementary if its complement is a cyclic shift (rotation) of itself.
 * @param {number[]} pattern
 * @returns {boolean}
 */
export function isAutoComplementary(pattern) {
  if (!pattern || pattern.length === 0) return false;
  const comp = complement(pattern);
  const compStr = comp.join('');
  const doublePatStr = [...pattern, ...pattern].join('');
  
  // If the complement is a substring of the doubled pattern, it is a cyclic shift
  return doublePatStr.includes(compStr);
}

/**
 * Historical and global standard Euclidean presets
 */
export const EUCLIDEAN_PRESETS = {
  tresillo: { k: 3, n: 8, label: 'Tresillo', genre: 'Tango / Cubain' },
  cinquillo: { k: 5, n: 8, label: 'Cinquillo', genre: 'Danzón Cubain' },
  venda: { k: 5, n: 12, label: 'Venda', genre: 'Afrique du Sud' },
  bembe: { k: 7, n: 12, label: 'Bembé', genre: 'Yoruba' },
  bossaNova: { k: 5, n: 16, label: 'Bossa Nova', genre: 'Brésil' },
  samba: { k: 7, n: 16, label: 'Samba', genre: 'Brésil' },
};

/**
 * High-level orchestration helper for Euclidean patterns.
 * Generates patterns, indices, complements and rotations in one call.
 * 
 * @param {number} n Subdivisions
 * @param {number} k Pulses
 * @param {number} r Rotation offset
 * @returns {Object} { pattern, complement, indices, complementIndices }
 */
export function generateEuclideanRhythm(n, k, r = 0) {
  const basePattern = euclideanRhythm(k, n);
  const pattern = rotate(basePattern, r);
  const compPattern = complement(pattern);

  const indices = [];
  const complementIndices = [];

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === 1) indices.push(i);
    if (compPattern[i] === 1) complementIndices.push(i);
  }

  return {
    pattern,
    complement: compPattern,
    indices,
    complementIndices
  };
}

/**
 * Checks if a pattern is self-complementary (alias for isAutoComplementary).
 * @param {number[]} pattern 
 * @returns {boolean}
 */
export function isSelfComplementary(pattern) {
  return isAutoComplementary(pattern);
}

/**
 * Generates phasing states for a given motif.
 * A phasing state is a cyclic shift (rotation) of the motif.
 * 
 * @param {number[]} motif The base rhythmic pattern
 * @param {number|null} steps Number of phasing steps to generate. Defaults to the motif length.
 * @returns {number[][]} Array of phasing states (each is a rotated pattern)
 */
export function generatePhasingStates(motif, steps = null) {
  if (!motif || motif.length === 0) return [];
  const count = steps !== null ? steps : motif.length;
  const states = [];
  for (let i = 0; i < count; i++) {
    states.push(rotate(motif, i));
  }
  return states;
}

/**
 * Generates an isorhythm by superposing a rhythmic pattern (talea) and a melodic pattern (color).
 * The cycle completes when both patterns realign, which corresponds to the LCM of their active parameters.
 * 
 * @param {number[]} talea Binary pattern representing rhythmic subdivisions (e.g., [1, 0, 1])
 * @param {string[]} color List of melodic pitches (e.g., ["C4", "E4", "G4"])
 * @returns {Object} An object containing the generated sequence and structural metadata
 */
export function generateIsorhythm(talea, color) {
  if (!talea || talea.length === 0) return { sequence: [], totalSteps: 0 };
  if (!color || color.length === 0) {
    return {
      sequence: talea.map(val => (val === 1 ? "C4" : null)),
      totalSteps: talea.length,
      taleaLength: talea.length,
      colorLength: 0,
      pulses: talea.filter(v => v === 1).length
    };
  }

  const pulses = talea.filter(v => v === 1).length;
  if (pulses === 0) {
    return {
      sequence: Array(talea.length).fill(null),
      totalSteps: talea.length,
      taleaLength: talea.length,
      colorLength: color.length,
      pulses: 0
    };
  }

  // Number of active events until complete realignment is LCM(pulses, color.length)
  const activeEventsCount = lcm(pulses, color.length);
  // Total steps in the grid is (activeEventsCount / pulses) * talea.length
  const totalSteps = (activeEventsCount / pulses) * talea.length;

  const sequence = [];
  let colorIndex = 0;

  for (let i = 0; i < totalSteps; i++) {
    const stepInTalea = i % talea.length;
    if (talea[stepInTalea] === 1) {
      sequence.push(color[colorIndex % color.length]);
      colorIndex++;
    } else {
      sequence.push(null);
    }
  }

  return {
    sequence,
    totalSteps,
    taleaLength: talea.length,
    colorLength: color.length,
    pulses
  };
}

/**
 * Renders a forced metric realignment of a rhythmic motif on a rigid boundary (e.g. 16 or 32 steps).
 * Inspired by Meshuggah's metric structures (e.g. Rational Gaze, Bleed).
 * Uses the formula B = M * Q + R.
 * 
 * @param {number[]} motif Binary rhythm motif (e.g. [1, 0, 1, 0, 0])
 * @param {number} boundary Standard metric boundary (e.g. 16)
 * @returns {number[]} The realigned binary pattern of exactly `boundary` steps
 */
export function forcedRealignment(motif, boundary) {
  if (!motif || motif.length === 0) return Array(boundary).fill(0);
  if (boundary <= 0) return [];

  const result = [];
  for (let i = 0; i < boundary; i++) {
    result.push(motif[i % motif.length]);
  }
  return result;
}

// =============================================================================
// COMP-08 — Polyrythmie Algébrique (Théorie d'Andrew Milne)
// Balanced Rhythms: polygones réguliers dont le barycentre = centre du cercle
// =============================================================================

/**
 * Computes the prime factors of a number.
 * Used to determine polyrythmic thresholds (e.g. n=12 positive, n=30 negative).
 * @param {number} n - Integer >= 2
 * @returns {number[]} Sorted array of prime factors (with repetition)
 */
export function primeFactors(n) {
  if (!Number.isInteger(n) || n < 2) return [];
  const factors = [];
  let remaining = n;
  for (let p = 2; p * p <= remaining; p++) {
    while (remaining % p === 0) {
      factors.push(p);
      remaining = remaining / p;
    }
  }
  if (remaining > 1) factors.push(remaining);
  return factors;
}

/**
 * Determines if a rhythm is "balanced" according to Andrew Milne's theory.
 * A balanced rhythm is one whose centre of mass (barycenter) is the geometric
 * centre of the circle. This holds when the pulses form a sum of regular polygons.
 *
 * Algorithm: Project each active pulse onto the unit circle and check if the
 * vector sum (centroid) is approximately zero (within a floating-point tolerance).
 *
 * @param {number[]} pattern - Binary array (e.g. [1, 0, 0, 1, 0, 0])
 * @returns {{ isBalanced: boolean, centroid: {x: number, y: number}, offset: number }}
 */
export function isBalanced(pattern) {
  if (!pattern || pattern.length === 0) {
    return { isBalanced: true, centroid: { x: 0, y: 0 }, offset: 0 };
  }
  const n = pattern.length;
  const pulses = pattern.filter(v => v === 1).length;
  if (pulses === 0) {
    return { isBalanced: true, centroid: { x: 0, y: 0 }, offset: 0 };
  }
  if (pulses === n) {
    return { isBalanced: true, centroid: { x: 0, y: 0 }, offset: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    if (pattern[i] === 1) {
      const angle = (2 * Math.PI * i) / n;
      sumX += Math.cos(angle);
      sumY += Math.sin(angle);
    }
  }

  const centroidX = sumX / pulses;
  const centroidY = sumY / pulses;
  const offset = Math.sqrt(centroidX * centroidX + centroidY * centroidY);

  // Tolerance: consider balanced if centroid is within 1% of radius from center
  const BALANCE_THRESHOLD = 0.01;
  return {
    isBalanced: offset < BALANCE_THRESHOLD,
    centroid: { x: centroidX, y: centroidY },
    offset
  };
}

/**
 * Generates a balanced rhythm as the algebraic sum or difference of regular polygons.
 * Each operation adds (+) or subtracts (-) the pulses of a regular k-gon at a given offset.
 *
 * Based on Andrew Milne's theory: "Perfectly Balanced Rhythms are those expressible
 * as the sum of perfectly balanced sub-patterns". E(k,n) is balanced when n/gcd(k,n) is prime.
 *
 * @param {number} n - Total number of subdivisions
 * @param {Array<{k: number, offset?: number, op?: '+' | '-'}>} operations - List of polygon operations
 * @returns {{ pattern: number[], polygons: Array<{k: number, offset: number, op: string, indices: number[]}> }}
 */
export function generateBalancedRhythm(n, operations = []) {
  if (n <= 0) return { pattern: [], polygons: [] };
  if (operations.length === 0) return { pattern: Array(n).fill(0), polygons: [] };

  // Vote system: each step accumulates +1 for additions, -1 for subtractions
  const votes = Array(n).fill(0);
  const polygons = [];

  for (const op of operations) {
    const k = Math.max(1, Math.min(op.k || 1, n));
    const offset = op.offset || 0;
    const sign = op.op === '-' ? -1 : 1;
    const indices = [];

    for (let i = 0; i < k; i++) {
      // Evenly distribute k pulses around n steps, with optional rotation offset
      const stepIndex = Math.round(((i / k) * n + offset) % n);
      const clamped = ((stepIndex % n) + n) % n;
      votes[clamped] += sign;
      if (sign === 1) indices.push(clamped);
    }

    polygons.push({ k, offset, op: op.op || '+', indices });
  }

  // A step is active if its vote count > 0
  const pattern = votes.map(v => (v > 0 ? 1 : 0));
  return { pattern, polygons };
}
