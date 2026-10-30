// @ts-check
/**
 * Arpeggio planning — a chord's notes as a rising sequence of steps.
 *
 * A monophonic instrument cannot sound a chord: the bass synth
 * (bassSynthDictionary, AudioEngine.js) keeps ONE oscillator, and
 * playDictionaryNote plays the lowest note of an array on it. Drawing C2 G2 C3
 * and hearing one note would break the rule that what an instrument shows is
 * what it plays. The owner's decision (2026-10-30): the bass plays the drawn
 * notes one after the other, lowest to highest — the mechanism the scales
 * already use — each one lit while it sounds.
 *
 * This module only plans the sequence: which note starts when, and when its
 * light goes out. Playing and scheduling stay with the callers
 * (useDictionaryPlayback.js, useStudioPlayback.js), which already know their
 * session token and their voices.
 */

/**
 * @typedef {Object} ArpeggioStep
 * @property {number | {absoluteValue: number}} note the input note, unchanged:
 *   a tagged realization object keeps its tag so the right neck lights it.
 * @property {number} time audio-clock time at which the note starts.
 * @property {number} clearAt audio-clock time at which its light goes out.
 */

/**
 * Plans a rising arpeggio: the notes sorted by pitch, one per step, starting at
 * `startTime` and spaced by `stepTime`.
 *
 * Duplicated pitches are kept: two strings can produce the same pitch, and the
 * player hears both attacks. The clear date follows the scale branch's rule
 * (useDictionaryPlayback.js): a note's light stays on until just before the
 * next step, never less than 0.05 s, so a very fast step still leaves a
 * visible flash.
 *
 * @param {Array<number | {absoluteValue: number}>} notes
 * @param {number} startTime audio-clock time of the first note.
 * @param {number} stepTime seconds between two consecutive notes.
 * @returns {ArpeggioStep[]} one step per note, low to high; `[]` for no notes.
 */
export function planArpeggio(notes, startTime, stepTime) {
  if (!Array.isArray(notes) || notes.length === 0) return [];
  const pitchOf = (note) =>
    note !== null && typeof note === "object" ? note.absoluteValue : note;
  return [...notes]
    .sort((a, b) => pitchOf(a) - pitchOf(b))
    .map((note, index) => {
      const time = startTime + index * stepTime;
      return { note, time, clearAt: time + Math.max(stepTime - 0.05, 0.05) };
    });
}
