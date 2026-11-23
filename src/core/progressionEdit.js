// @ts-check
/**
 * progressionEdit.js — the progression, edited chord by chord (VMU-127, lot 1).
 *
 * Until now the Studio's progression came from the style, and "changing it"
 * meant replacing it with a Quick Start: no chord could be changed or inserted,
 * and every chord lasted one measure. This module is the whole of the editing
 * rule; the Studio's state (hooks/useStudioMode.js) only holds the result, one
 * list per variation (`customChords`).
 *
 * The model is a list of **edited chords**, `{ nns, durationSteps }`:
 *
 *   nns            the degree, as the Studio's progression writes it ("1", "6-",
 *                  "b7", "5"). Resolved in the STYLE's key, by the very rule a
 *                  style's progression is resolved with (timeline.js
 *                  chordsFromProgression); the effective key then moves it like
 *                  any other chord (keyChoice.js transposeTimeline). A degree,
 *                  not an absolute chord, so a key change carries the edit along.
 *   durationSteps  16 (one measure) or 8 (half a measure).
 *
 * The chords are laid end to end from step 0. Their length — the smallest of
 * the document's lengths (1, 2, 4, 8 measures) that holds them — and the Math &
 * Rythmes cycles decide the loop's window: the larger of the two. When the
 * window is longer than the chords (a half measure inserted, a Math cycle of 8
 * measures), the chords are **repeated** to fill it, the rule a style already
 * follows (a 3-chord style over 4 measures plays its first chord again). The
 * repeats are part of the document, so what the chord row shows, what plays and
 * what is exported is one and the same list (useStudioMode's `timeline`).
 *
 * Every operation returns a new list, or the very same list when it is refused
 * (an index out of range, a duration that is neither 16 nor 8, more than 128
 * steps, the last chord removed): a caller compares identities to know whether
 * anything changed. Nothing here plays or draws: no React, no Tone, no clock.
 * timeline.js and theory.js are read, never changed.
 *
 * @module core/progressionEdit
 */
import {
  MAX_STEPS,
  STEPS_PER_MEASURE,
  TIMELINE_LENGTHS,
  chordAt,
  chordsFromProgression,
  chordsInWindow,
  describeChord,
  loopSteps,
  setChords,
  setLength,
} from "./timeline";

/** The two durations an edited chord may have, in steps: one measure, half a measure. */
export const CHORD_DURATIONS = [STEPS_PER_MEASURE, STEPS_PER_MEASURE / 2];

/**
 * @typedef {Object} EditedChord
 * @property {string} nns the degree, read in the style's key
 * @property {number} durationSteps 16 or 8
 */

/**
 * The edits of the Studio, one list per variation, each absent when that
 * variation plays its own progression.
 *
 * @typedef {{ A?: EditedChord[], B?: EditedChord[] }} CustomChords
 */

/** @param {EditedChord[]} list @returns {number} */
export function totalSteps(list) {
  return list.reduce((sum, chord) => sum + chord.durationSteps, 0);
}

/**
 * The smallest length of the document (1, 2, 4 or 8 measures) holding `steps`
 * steps; 8 for anything longer (the document has nothing past 128 steps).
 *
 * @param {number} steps
 * @returns {number}
 */
export function lengthForSteps(steps) {
  return TIMELINE_LENGTHS.find((len) => len * STEPS_PER_MEASURE >= steps) ?? TIMELINE_LENGTHS[TIMELINE_LENGTHS.length - 1];
}

/**
 * The length of the chords: the smallest document length that holds them.
 *
 * @param {EditedChord[]} list
 * @returns {number} measures, one of TIMELINE_LENGTHS
 */
export function chordsLength(list) {
  return lengthForSteps(totalSteps(list));
}

/**
 * The loop's window once the progression is edited: the larger of the chords'
 * length and the length that holds the longest Math & Rythmes cycle. Without an
 * edit the window stays loopWindow.js's (never under 4 measures): the edit is
 * what lets the loop be 1 or 2 measures long.
 *
 * @param {EditedChord[]} list
 * @param {number} [cycleSteps] the longest active cycle, in steps (0 = none)
 * @returns {number} measures, one of TIMELINE_LENGTHS
 */
export function editedLoopLength(list, cycleSteps = 0) {
  const cycle = Number.isFinite(cycleSteps) && cycleSteps > 0 ? lengthForSteps(cycleSteps) : 0;
  return Math.max(chordsLength(list), cycle);
}

/**
 * What is wrong with a list, null when nothing is.
 *
 * @param {any} list
 * @returns {string|null}
 */
export function editedChordsError(list) {
  if (!Array.isArray(list) || list.length === 0) return "a progression holds at least one chord";
  for (const chord of list) {
    if (!chord || typeof chord.nns !== "string" || chord.nns === "") return "every chord has a degree (nns)";
    if (!CHORD_DURATIONS.includes(chord.durationSteps)) return `a chord lasts ${CHORD_DURATIONS.join(" or ")} steps`;
  }
  if (totalSteps(list) > MAX_STEPS) return `the chords last more than ${MAX_STEPS} steps`;
  return null;
}

/** @param {EditedChord[]} list @param {number} index */
function isIndex(list, index) {
  return Number.isInteger(index) && index >= 0 && index < list.length;
}

/**
 * The list with the chord at `index` replaced by `nns`, for the same duration.
 *
 * @param {EditedChord[]} list
 * @param {number} index
 * @param {string} nns
 * @returns {EditedChord[]}
 */
export function replaceChord(list, index, nns) {
  if (!isIndex(list, index) || typeof nns !== "string" || nns === "") return list;
  if (list[index].nns === nns) return list;
  return list.map((chord, i) => (i === index ? { ...chord, nns } : chord));
}

/**
 * The list with a chord inserted right after `index` (-1: at the start). The
 * chords after it move later. Refused when the chords would pass 128 steps.
 *
 * @param {EditedChord[]} list
 * @param {number} index
 * @param {string} nns
 * @param {number} [durationSteps] 16 (default) or 8
 * @returns {EditedChord[]}
 */
export function insertChordAfter(list, index, nns, durationSteps = STEPS_PER_MEASURE) {
  if (!(index === -1 || isIndex(list, index))) return list;
  if (typeof nns !== "string" || nns === "" || !CHORD_DURATIONS.includes(durationSteps)) return list;
  if (totalSteps(list) + durationSteps > MAX_STEPS) return list;
  return [...list.slice(0, index + 1), { nns, durationSteps }, ...list.slice(index + 1)];
}

/**
 * The list without the chord at `index`; the chords after it move earlier.
 * Refused for the last chord left: a progression holds at least one.
 *
 * @param {EditedChord[]} list
 * @param {number} index
 * @returns {EditedChord[]}
 */
export function removeChord(list, index) {
  if (!isIndex(list, index) || list.length <= 1) return list;
  return list.filter((_, i) => i !== index);
}

/**
 * The list with the chord at `index` lasting `durationSteps` (16 or 8). The
 * chords after it move. Refused when the chords would pass 128 steps.
 *
 * @param {EditedChord[]} list
 * @param {number} index
 * @param {number} durationSteps
 * @returns {EditedChord[]}
 */
export function setChordDuration(list, index, durationSteps) {
  if (!isIndex(list, index) || !CHORD_DURATIONS.includes(durationSteps)) return list;
  const current = list[index].durationSteps;
  if (current === durationSteps) return list;
  if (totalSteps(list) - current + durationSteps > MAX_STEPS) return list;
  return list.map((chord, i) => (i === index ? { ...chord, durationSteps } : chord));
}

/**
 * The chords laid end to end, repeated, over exactly `steps` steps: the last
 * one is cut where `steps` ends (always on a half measure, since every
 * duration is one). The repeats carry their source's degree.
 *
 * @param {EditedChord[]} list
 * @param {number} steps
 * @returns {EditedChord[]}
 */
function cycleOver(list, steps) {
  /** @type {EditedChord[]} */
  const out = [];
  if (list.length === 0) return out;
  for (let at = 0, i = 0; at < steps; i++) {
    const source = list[i % list.length];
    const durationSteps = Math.min(source.durationSteps, steps - at);
    out.push({ nns: source.nns, durationSteps });
    at += durationSteps;
  }
  return out;
}

/**
 * The list resized to exactly `lengthMeasures` measures (the length setting):
 * longer, the chords are copied after themselves until the length is full, as
 * a duplicated loop in a DAW; shorter, the end is cut (a chord across the cut
 * keeps the half measure before it). The same list when it already fits.
 *
 * @param {EditedChord[]} list
 * @param {number} lengthMeasures one of TIMELINE_LENGTHS
 * @returns {EditedChord[]}
 */
export function resizeChords(list, lengthMeasures) {
  if (!TIMELINE_LENGTHS.includes(lengthMeasures) || list.length === 0) return list;
  const steps = lengthMeasures * STEPS_PER_MEASURE;
  if (totalSteps(list) === steps) return list;
  return cycleOver(list, steps);
}

/**
 * The progression a document plays, as an edit's starting point: the chords
 * that start inside its window, in order, each cut at the window's end. A
 * first editing gesture copies what plays — the style's chords, a Quick
 * Start's, the repeats a longer window adds — so that the gesture changes the
 * one thing it is about.
 *
 * @param {import("./timeline").TimelineDoc} doc
 * @returns {EditedChord[]}
 */
export function progressionFromDoc(doc) {
  const end = loopSteps(doc);
  return chordsInWindow(doc).map(({ chord, startStep, endStep }) => ({
    // A style's chord keeps its degree as the style wrote it; any other is
    // named from the key (timeline.js describeChord, the DAW helper's reading).
    nns: chord.nns || describeChord(doc.key, chord).nns,
    durationSteps: Math.min(endStep, end) - startStep,
  }));
}

/**
 * The document's chords for an edited list: each degree resolved in `key`
 * (chordsFromProgression's rule, the one a style's progression goes through),
 * repeated to fill the window `lengthMeasures`, then that window repeated over
 * the document's 8 measures — so the chord after the window's last one is the
 * window's first, the chord the loop goes back to (the bass's leading tone
 * reads it, dispatch.js).
 *
 * @param {import("./timeline").TimelineKey|null} key
 * @param {EditedChord[]} list
 * @param {number} lengthMeasures one of TIMELINE_LENGTHS
 * @returns {import("./timeline").TimelineChord[]}
 */
export function filledChords(key, list, lengthMeasures) {
  if (!key || list.length === 0) return [];
  /** @type {Map<string, import("./timeline").TimelineChord>} */
  const resolved = new Map();
  const resolve = (/** @type {string} */ nns) => {
    if (!resolved.has(nns)) resolved.set(nns, chordsFromProgression(key, [nns])[0]);
    return /** @type {import("./timeline").TimelineChord} */ (resolved.get(nns));
  };
  const window = cycleOver(list, lengthMeasures * STEPS_PER_MEASURE);
  const chords = window.map(({ nns, durationSteps }) => ({ ...resolve(nns), durationSteps }));
  const copies = MAX_STEPS / (lengthMeasures * STEPS_PER_MEASURE);
  return Array.from({ length: copies }, () => chords.map((chord) => ({ ...chord }))).flat();
}

/**
 * The Studio's document with an edited progression: its window set to
 * `editedLoopLength`, its chords to `filledChords`. Everything else — rows,
 * key, origin, the style's `base` — is the document's own. Applied to the
 * document in the STYLE's key, before the effective key moves it.
 *
 * @param {import("./timeline").TimelineDoc} doc
 * @param {EditedChord[]} list
 * @param {number} [cycleSteps] the longest active Math & Rythmes cycle (0 = none)
 * @returns {import("./timeline").TimelineDoc}
 */
export function applyEditedChords(doc, list, cycleSteps = 0) {
  const lengthMeasures = editedLoopLength(list, cycleSteps);
  return setChords(setLength(doc, lengthMeasures), filledChords(doc.key, list, lengthMeasures));
}

/**
 * The chord the chord row lights during playback: the one covering the step
 * that plays (timeline.js chordAt) — the very rule dispatch.js sounds it by.
 *
 * @param {import("./timeline").TimelineDoc} doc
 * @param {number} step
 * @returns {number|null} its index in the document's chords, null for none
 */
export function playingChordIndex(doc, step) {
  if (!Number.isInteger(step) || step < 0) return null;
  const span = chordAt(doc, step);
  return span ? span.index : null;
}

/**
 * Whether the chord at `index` of the window is a repeat (a copy the window
 * adds after the edited chords) rather than one of them.
 *
 * @param {EditedChord[]|null|undefined} list
 * @param {number} index
 */
export function isRepeat(list, index) {
  return Boolean(list) && index >= /** @type {EditedChord[]} */ (list).length;
}
