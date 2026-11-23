// @ts-check
/**
 * chance.js — a chance per cell and a density per track (VMU-221).
 *
 * Euclid, rotation, complement and isorhythm are deterministic: a loop never
 * changes by itself. Here a hit can be made uncertain, and a whole track can be
 * thinned out, so that the loop comes alive without being edited by hand.
 *
 * The settings (`ChanceSettings`) are plain data:
 *
 *   seed      the version of the draw (a 32-bit integer, shown as 7 characters);
 *   chances   per track, per absolute step: 50 or 25 (100 is the default and
 *             is not stored);
 *   density   per track, 0 to 99 (100 is the default and is not stored).
 *
 * The rule of the draw. For each (seed, track) one stream of 128 numbers u in
 * [0, 1) is drawn once, one per ABSOLUTE step of the document (all 8 measures,
 * whatever the loop's window): the loop plays the same version at every pass,
 * and the version does not change when the window does. A hit is kept when
 *
 *     u < chance × density        (chance: 1, 0.5 or 0.25; density: 0 to 1)
 *
 * Because u does not depend on the chance nor the density, raising either one
 * keeps a superset of the hits (the density is monotone), 100 % x 100 % keeps
 * every hit (u < 1) and 0 % keeps none. The stream of a track comes from
 * random.js `fork(trackId)`: adding a track does not shift the others.
 *
 * `applyChance` works on the document AFTER it is built (the way
 * progressionEdit.js does) and returns it with the hits that did not come out
 * removed, plus the list of the removed steps so that the grid can mark them:
 * what is seen, what is heard and what is exported are one and the same list.
 * The chord row is never touched (the chords are the progression's, not a
 * rhythm to thin out). Nothing here plays or draws: no React, no Tone, no
 * clock, no Math.random. timeline.js is read, never changed.
 *
 * @module core/chance
 */
import { DRUM_ROLES, MELODIC_ROLES, MAX_STEPS } from "./timeline";
import { createRng } from "./random";

/** What a cell may be set to, in percent; the first is the default. */
export const CHANCE_LEVELS = [100, 50, 25];

/** The default density of a track, in percent. */
export const DEFAULT_DENSITY = 100;

/**
 * @typedef {Object} ChanceSettings
 * @property {number} seed
 * @property {Object<string, Object<number, 50|25>>} chances track id -> absolute step -> 50 or 25
 * @property {Object<string, number>} density track id -> 0..99
 */

/**
 * @param {number} seed
 * @returns {ChanceSettings}
 */
export function emptyChance(seed) {
  return { seed, chances: {}, density: {} };
}

/**
 * Whether nothing is set: no cell with a chance, no density under 100. The
 * seed alone changes nothing audible.
 *
 * @param {ChanceSettings} settings
 * @returns {boolean}
 */
export function isNeutral(settings) {
  return Object.keys(settings.chances).length === 0 && Object.keys(settings.density).length === 0;
}

/**
 * @param {ChanceSettings} settings
 * @param {number} seed
 * @returns {ChanceSettings}
 */
export function withSeed(settings, seed) {
  return { ...settings, seed };
}

/**
 * @param {ChanceSettings} settings
 * @param {string} trackId
 * @param {number} step absolute
 * @returns {100|50|25}
 */
export function chanceAt(settings, trackId, step) {
  return /** @type {100|50|25} */ (settings.chances[trackId]?.[step] ?? 100);
}

/**
 * @param {ChanceSettings} settings
 * @param {string} trackId
 * @returns {number} 0..100
 */
export function densityOf(settings, trackId) {
  return settings.density[trackId] ?? DEFAULT_DENSITY;
}

/**
 * The cell's chance moves one level on: 100 -> 50 -> 25 -> 100. A cell back at
 * 100 leaves no trace, so a settings object that returns to neutral is equal by
 * value to the one it started from (the history relies on it).
 *
 * @param {ChanceSettings} settings
 * @param {string} trackId
 * @param {number} step absolute
 * @returns {ChanceSettings}
 */
export function cycleChance(settings, trackId, step) {
  const now = chanceAt(settings, trackId, step);
  const next = CHANCE_LEVELS[(CHANCE_LEVELS.indexOf(now) + 1) % CHANCE_LEVELS.length];
  const { [trackId]: own, ...otherTracks } = settings.chances;
  const { [step]: _gone, ...otherSteps } = own ?? {};
  /** @type {Object<number, 50|25>} */
  const rest = next === 100 ? otherSteps : { ...otherSteps, [step]: /** @type {50|25} */ (next) };
  const chances = Object.keys(rest).length === 0 ? otherTracks : { ...otherTracks, [trackId]: rest };
  return { ...settings, chances };
}

/**
 * @param {ChanceSettings} settings
 * @param {string} trackId
 * @param {number} percent clamped to 0..100; 100 leaves no trace
 * @returns {ChanceSettings}
 */
export function setDensity(settings, trackId, percent) {
  const value = Math.min(100, Math.max(0, Math.round(Number(percent))));
  const { [trackId]: _gone, ...others } = settings.density;
  return { ...settings, density: value >= DEFAULT_DENSITY || Number.isNaN(value) ? others : { ...others, [trackId]: value } };
}

/** One number u per absolute step, for this seed and track. */
function drawsFor(seed, trackId) {
  const rng = createRng(seed).fork(trackId);
  return Array.from({ length: MAX_STEPS }, () => rng.next());
}

const PLAYED_ROLES = [...DRUM_ROLES, ...MELODIC_ROLES];

/**
 * The document with the hits that did not come out removed.
 *
 * @param {import("./timeline").TimelineDoc} doc
 * @param {ChanceSettings} settings
 * @returns {{ doc: import("./timeline").TimelineDoc, dropped: Object<string, number[]> }}
 *   `doc` is the very same object when nothing is removed; `dropped` maps a
 *   track id to the absolute steps whose hit was removed (only tracks that lost one).
 */
export function applyChance(doc, settings) {
  /** @type {Object<string, number[]>} */
  const dropped = {};
  if (!doc || isNeutral(settings)) return { doc, dropped };

  let changed = false;
  const tracks = doc.tracks.map((track) => {
    if (!PLAYED_ROLES.includes(track.role)) return track;
    const density = densityOf(settings, track.id) / 100;
    const chances = settings.chances[track.id];
    if (density >= 1 && !chances) return track;

    const draws = drawsFor(settings.seed, track.id);
    /** @type {number[]} */
    const lost = [];
    const steps = track.steps.map((cell, step) => {
      if (!cell) return cell;
      const chance = (chances?.[step] ?? 100) / 100;
      if (draws[step] < chance * density) return cell;
      lost.push(step);
      return null;
    });
    if (lost.length === 0) return track;
    changed = true;
    dropped[track.id] = lost;
    return { ...track, steps };
  });

  return changed ? { doc: { ...doc, tracks }, dropped } : { doc, dropped };
}
