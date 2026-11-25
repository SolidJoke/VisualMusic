// @ts-check
/**
 * groove.js — swing and humanisation (VMU-223).
 *
 * A loop that is perfectly straight sounds mechanical. Two settings make it
 * breathe, and both are decided HERE, once, as pure functions of (settings,
 * track, absolute step): playback, the grid's lit cell and the MIDI export all
 * read the same answer, so what is seen = what is heard = what is exported.
 * `Tone.Transport.swing` is deliberately NOT used: it moves the sound and the
 * export would never see it.
 *
 * SWING (one setting for the whole Studio, 50 to 75 %, 50 = straight).
 * Two 16th notes make a pair, 2 steps long. Swing is the share of the pair the
 * FIRST note takes: s = 50 % is two equal notes, s = 66 % is the "triplet
 * feel" (2/3 + 1/3), s = 75 % is a dotted 16th followed by a 32nd. The second
 * note of the pair therefore starts
 *
 *     offsetSteps = 2 × s − 1        (s = swing / 100, in steps of a 16th)
 *
 * steps late: 0 at 50 %, 0.32 at 66 %, 0.5 at 75 %. The second notes are the
 * odd steps counted from 0 — 1, 3, 5... — the "e" and the "a" of 1-e-&-a. The
 * even steps (0, 2, 4...) never move with the swing alone. It is the same for
 * every track.
 *
 * HUMANISATION (one setting, 0 to 100 %, 0 = none). Each hit gets a small
 * error of time and of force, drawn from the Studio's seed, one pair of draws
 * per (seed, track, ABSOLUTE step) — the loop sounds the same at every pass
 * and the file holds the same numbers. With h = humanize / 100:
 *
 *     jitterMs        = h × 10 ms × (2 u1 − 1)           within ± 10 ms
 *     velocityScale   = 1 + h × 0.15 × (2 u2 − 1)        within ± 15 %
 *     velocity        = clamp(base × velocityScale, 0.05, 1)
 *
 * u1, u2 are in [0, 1): the stream of `createRng(seed).fork("humanize:" +
 * trackId)`, read at positions 2×step and 2×step + 1. The jitter is in
 * milliseconds, not in steps, so it does not grow when the tempo slows down.
 * The first step of the loop is never early (nothing can sound before it).
 * A chord is ONE hit: it has one draw, shared by its notes.
 *
 * Nothing here plays or draws: no React, no Tone, no clock, no Math.random.
 *
 * @module core/groove
 */
import { createRng } from "./random";
import { MAX_STEPS } from "./timeline";

export const SWING_MIN = 50;
export const SWING_MAX = 75;
export const SWING_DEFAULT = 50;
export const HUMANIZE_DEFAULT = 0;
/** The largest error of time humanisation adds, at 100 %, in milliseconds. */
export const HUMANIZE_MAX_MS = 10;
/** The largest relative error of force humanisation adds, at 100 %. */
export const HUMANIZE_MAX_VELOCITY = 0.15;
/** A hit never gets quieter than this (0 would be a note that does not sound). */
const MIN_VELOCITY = 0.05;

/**
 * @typedef {Object} Groove
 * @property {number} swing 50..75, percent
 * @property {number} humanize 0..100, percent
 * @property {number} seed the Studio's seed (core/chance.js ChanceSettings.seed)
 */

/**
 * What the groove adds to one hit.
 *
 * @typedef {Object} HitGroove
 * @property {number} offsetSteps swing delay, in 16th-note steps (0 or 2s − 1)
 * @property {number} jitterMs humanisation error of time, ms (may be negative)
 * @property {number} velocity the force to play and to write, 0..1
 * @property {number} velocityScale the factor the force was multiplied by (1 = unchanged)
 */

/** @param {unknown} value @returns {number} 50..75, whole percent */
export function clampSwing(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return SWING_DEFAULT;
  return Math.min(SWING_MAX, Math.max(SWING_MIN, n));
}

/** @param {unknown} value @returns {number} 0..100, whole percent */
export function clampHumanize(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return HUMANIZE_DEFAULT;
  return Math.min(100, Math.max(0, n));
}

/**
 * The groove to attach to a document, or null when nothing is set: the
 * document then is exactly the one it was before VMU-223 (the goldens).
 *
 * @param {number} swing
 * @param {number} humanize
 * @param {number} seed
 * @returns {Groove | null}
 */
export function grooveOf(swing, humanize, seed) {
  const s = clampSwing(swing);
  const h = clampHumanize(humanize);
  return s === SWING_DEFAULT && h === HUMANIZE_DEFAULT ? null : { swing: s, humanize: h, seed };
}

/**
 * The swing delay of a step, in steps: (2 × swing − 1) on the odd steps, 0 on
 * the even ones.
 *
 * @param {number} step absolute step (0-based)
 * @param {number} swing percent
 * @returns {number}
 */
export function swingOffsetSteps(step, swing) {
  if (step % 2 === 0) return 0;
  return 2 * (clampSwing(swing) / 100) - 1;
}

/** The two streams of a (seed, track): [time, force] per absolute step. Kept: the loop asks every step at every pass. */
const streams = new Map();

/**
 * @param {number} seed
 * @param {string} trackId
 * @returns {number[]} 2 × MAX_STEPS numbers in [0, 1)
 */
function streamFor(seed, trackId) {
  const key = `${seed}|${trackId}`;
  let stream = streams.get(key);
  if (!stream) {
    const rng = createRng(seed).fork(`humanize:${trackId}`);
    stream = Array.from({ length: 2 * MAX_STEPS }, () => rng.next());
    if (streams.size > 256) streams.clear();
    streams.set(key, stream);
  }
  return stream;
}

/**
 * What the groove does to the hit of `trackId` on absolute `step`.
 *
 * @param {Groove | null | undefined} groove
 * @param {{ trackId: string, step: number, velocity: number }} hit
 * @returns {HitGroove}
 */
export function eventGroove(groove, { trackId, step, velocity }) {
  if (!groove) return { offsetSteps: 0, jitterMs: 0, velocity, velocityScale: 1 };
  const offsetSteps = swingOffsetSteps(step, groove.swing);
  const h = clampHumanize(groove.humanize) / 100;
  if (h === 0) return { offsetSteps, jitterMs: 0, velocity, velocityScale: 1 };

  const stream = streamFor(groove.seed, trackId);
  const slot = (Math.trunc(step) % MAX_STEPS) * 2;
  const rawMs = h * HUMANIZE_MAX_MS * (2 * stream[slot] - 1);
  const jitterMs = step === 0 ? Math.max(0, rawMs) : rawMs;
  const velocityScale = 1 + h * HUMANIZE_MAX_VELOCITY * (2 * stream[slot + 1] - 1);
  return {
    offsetSteps,
    jitterMs,
    velocity: Math.min(1, Math.max(MIN_VELOCITY, velocity * velocityScale)),
    velocityScale,
  };
}

/** Seconds of one 16th-note step at `bpm`. */
export function stepSeconds(bpm) {
  return 15 / bpm;
}

/**
 * How many seconds after its step's own moment a hit sounds (swing + jitter).
 * Playback adds it to the step's Tone time; the export adds it to the step's
 * time in the file. The same function, so the two cannot disagree.
 *
 * @param {{ offsetSteps?: number, jitterMs?: number }} event a StepEvent (dispatch.js)
 * @param {number} bpm
 * @returns {number}
 */
export function offsetSeconds(event, bpm) {
  return (event.offsetSteps ?? 0) * stepSeconds(bpm) + (event.jitterMs ?? 0) / 1000;
}

/**
 * How many seconds after its own moment the CELL of `step` lights: the swing
 * alone, which every hit of the step shares (the jitter is each hit's own).
 *
 * @param {Groove | null | undefined} groove
 * @param {number} step absolute
 * @param {number} bpm
 * @returns {number}
 */
export function stepOffsetSeconds(groove, step, bpm) {
  if (!groove) return 0;
  return swingOffsetSteps(step, groove.swing) * stepSeconds(bpm);
}
