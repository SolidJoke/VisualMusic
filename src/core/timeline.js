// @ts-check
/**
 * timeline.js — the Studio's timeline document (T3). INTERFACE ONLY.
 *
 * This commit carries the tests that describe the document
 * (src/core/__tests__/Timeline.test.js, src/audio/__tests__/SequencerTimeline.test.jsx)
 * and the interface they call, so that each of them runs and fails on its
 * own: every function below throws. The implementation is the next commit.
 *
 * @module core/timeline
 */

/**
 * @typedef {Object} TimelineCell one active step
 * @property {"normal"|"ghost"} vel
 * @property {string} [pitch] melodic rows: interval above the chord's root ("R", "5", "b7", "8va", ...)
 * @property {number} [len] duration in steps; absent = the role's default
 */

/**
 * @typedef {Object} TimelineTrack
 * @property {string} id
 * @property {string} name
 * @property {"kick"|"snare"|"hat"|"chordHits"|"bass"|"melody"} role
 * @property {(TimelineCell|null)[]} steps 128 cells (8 measures x 16 steps)
 * @property {("style"|"math"|"edit")[]} provenance one entry per measure (8)
 */

/**
 * @typedef {Object} TimelineChord
 * @property {number} rootPc 0-11
 * @property {string} type a CHORDS key of theory.js, e.g. "chord_minor"
 * @property {number} durationSteps a multiple of 8
 */

/**
 * @typedef {Object} TimelineDoc
 * @property {1} schemaVersion
 * @property {{ rootValue: number, scaleKey: string } | null} key
 * @property {1|2|4|8} lengthMeasures
 * @property {TimelineChord[]} chords one after the other, from step 0
 * @property {TimelineTrack[]} tracks
 * @property {{ brickIndex: number, variation: "A"|"B" } | null} origin
 * @property {{ chords: TimelineChord[], tracks: TimelineTrack[] }} base
 */

/** @param {string} name */
function notYet(name) {
  return new Error(`T3: timeline.${name} is not implemented yet`);
}

/**
 * @param {{ brickIndex?: number, theme?: "A"|"B", overrides?: Object, lengthMeasures?: number }} _options
 * @returns {TimelineDoc}
 */
export function buildStudioTimeline(_options) {
  throw notYet("buildStudioTimeline");
}

/**
 * @param {TimelineDoc} _doc @param {string} _trackId @param {number} _step @param {TimelineCell|null} _cell
 * @returns {TimelineDoc}
 */
export function setCell(_doc, _trackId, _step, _cell) {
  throw notYet("setCell");
}

/** @param {TimelineDoc} _doc @param {number} _lengthMeasures @returns {TimelineDoc} */
export function setLength(_doc, _lengthMeasures) {
  throw notYet("setLength");
}

/** @param {TimelineDoc} _doc @param {TimelineChord[]} _chords @returns {TimelineDoc} */
export function setChords(_doc, _chords) {
  throw notYet("setChords");
}

/**
 * @param {TimelineDoc} _doc @param {number} _step
 * @returns {{ index: number, chord: TimelineChord, startStep: number, endStep: number } | null}
 */
export function chordAt(_doc, _step) {
  throw notYet("chordAt");
}

/** @param {TimelineDoc} _doc @returns {number} */
export function loopSteps(_doc) {
  throw notYet("loopSteps");
}
