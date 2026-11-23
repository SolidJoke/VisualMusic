// @ts-check
/**
 * phasingDrift.js — "Deux copies qui glissent": the copy moves one case every
 * N turns, by itself (VMU-211).
 *
 * In Steve Reich's Clapping Music and Piano Phase the copy does not stay at a
 * fixed distance from the phrase: it slips one case every so many repetitions,
 * until it falls back on the phrase. Until now the recipe only held the copy at
 * a fixed offset (the slider).
 *
 * The drift is laid out in advance, in the copy's own track: no state moves
 * while the music plays, so what the panel exports is what is heard, and the
 * undo history is not filled case after case. A "turn" is one pass of the
 * phrase's circle (`subdivisions` steps). At turn `t` the copy is moved by
 *
 *     (start + floor(t / every)) mod subdivisions
 *
 * cases. The copy is back on its start offset after `subdivisions * every`
 * turns, that is a cycle of `subdivisions * subdivisions * every` steps.
 *
 * THE CUT RULE (when that cycle does not fit): the loop holds 128 steps at
 * most (8 measures, core/timeline.js MAX_STEPS). A longer cycle is cut at
 * exactly 128 steps: the copy drifts through those 128 steps — the last turn
 * may be cut half-way — then starts again from the start offset at the loop's
 * first step. `cut` tells the panel to say so.
 *
 * "Off" (`every = 0`) is the former behaviour, to the case: the phrase rotated
 * by `start`, one circle long.
 *
 * Everything here is pure: no React, no Tone, no clock.
 *
 * @module core/phasingDrift
 */
import { MAX_STEPS } from "./timeline";
import { rotate } from "./compositionEngine";

/** The values of "une case tous les N tours": 0 is Off. */
export const PHASING_EVERY_CHOICES = [0, 1, 2, 4];

/** `value` as a non-negative integer. */
function wholeNumber(value) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * The copy's whole cycle, in steps, and whether it had to be cut.
 *
 * @param {number} subdivisions steps of one turn (the circle's n)
 * @param {number} every turns per case; 0 = Off
 * @returns {{ cycleLength: number, cut: boolean }}
 */
export function driftCycle(subdivisions, every) {
  const n = wholeNumber(subdivisions);
  const e = wholeNumber(every);
  if (!n) return { cycleLength: 0, cut: false };
  if (!e) return { cycleLength: n, cut: false };
  const full = n * n * e;
  return full > MAX_STEPS ? { cycleLength: MAX_STEPS, cut: true } : { cycleLength: full, cut: false };
}

/**
 * The copy's hits on a whole cycle, for the sequencer's override.
 *
 * @param {number[]} pattern the phrase's binary pattern (length = subdivisions)
 * @param {number} start the slider's offset: where the copy starts
 * @param {number} every turns per case; 0 = Off (the fixed copy)
 * @returns {{ activeSteps: number[], cycleLength: number, cut: boolean }}
 */
export function driftCopy(pattern, start, every) {
  const n = pattern ? pattern.length : 0;
  const { cycleLength, cut } = driftCycle(n, every);
  if (!n) return { activeSteps: [], cycleLength: 0, cut: false };

  // One rotation per offset, built once.
  /** @type {number[][]} */
  const rotations = Array.from({ length: n }, (_, offset) => rotate(pattern, offset));

  /** @type {number[]} */
  const activeSteps = [];
  for (let step = 0; step < cycleLength; step += 1) {
    const offset = driftOffsetAtStep({ subdivisions: n, start, every, cycleLength }, step);
    if (rotations[offset][step % n] === 1) activeSteps.push(step);
  }
  return { activeSteps, cycleLength, cut };
}

/**
 * The copy's offset at an absolute loop step: what the wheel and the grid show
 * while that step plays. The loop step is folded on the copy's cycle exactly as
 * the sequencer folds it (`step % cycleLength`, core/timeline.js).
 *
 * @param {{ subdivisions: number, start: number, every: number, cycleLength: number }} cfg
 * @param {number} step the loop's absolute step; below 0 = not playing
 * @returns {number} an offset in 0 .. subdivisions - 1
 */
export function driftOffsetAtStep({ subdivisions, start, every, cycleLength }, step) {
  const n = wholeNumber(subdivisions);
  if (!n) return 0;
  const first = ((Math.trunc(Number(start)) || 0) % n + n) % n;
  const e = wholeNumber(every);
  if (!e || !(step >= 0)) return first;
  const folded = cycleLength > 0 ? step % cycleLength : step;
  const turn = Math.floor(folded / n);
  return (first + Math.floor(turn / e)) % n;
}
