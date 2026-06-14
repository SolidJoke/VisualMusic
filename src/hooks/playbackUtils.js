// src/hooks/playbackUtils.js
//
// Pure utility functions shared by usePlaybackHandlers.
// Extracted to eliminate 3x code duplication and enable unit testing.

import { getAbsoluteNoteValue } from "../core/theory";
import { TUNINGS } from "../core/tunings";

/**
 * Returns the string tuning array for a given instrument, falling back to
 * standard tuning if activeBrick doesn't define one.
 * @param {'guitar'|'bass'} instrument
 * @param {object} activeBrick
 * @returns {string[]} e.g. ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
 */
export function getInstrumentTuning(instrument, activeBrick) {
  if (instrument === 'bass') {
    return activeBrick?.bassStrings || TUNINGS.BASS_STANDARD;
  }
  return activeBrick?.guitarStrings || TUNINGS.GUITAR_STANDARD;
}

/**
 * Converts a fingeringMap (string→fret→finger) to an array of absolute MIDI pitches,
 * skipping muted strings ('X').
 * Used for chord playback on guitar and bass.
 *
 * @param {object} fingeringMap - e.g. { 0: { 2: 1 }, 1: { 2: 2 } }
 * @param {string[]} reversedTuning - open string MIDI names, reversed (high→low index)
 * @param {string} [instrument] - optional, for attaching to returned objects
 * @returns {Array<{absoluteValue: number, stringIndex: number, fret: number, instrument?: string}>}
 */
export function fingeringMapToAbsolutePitches(fingeringMap, reversedTuning, instrument = null) {
  const pitches = [];
  Object.entries(fingeringMap).forEach(([strIdxStr, fretMap]) => {
    const strIdx = parseInt(strIdxStr, 10);
    const openNote = getAbsoluteNoteValue(reversedTuning[strIdx]);
    Object.entries(fretMap).forEach(([fretStr, finger]) => {
      if (finger !== 'X') {
        const fret = parseInt(fretStr, 10);
        pitches.push({
          absoluteValue: openNote + fret,
          stringIndex: strIdx,
          fret,
          ...(instrument ? { instrument } : {})
        });
      }
    });
  });
  return pitches.sort((a, b) => a.absoluteValue - b.absoluteValue);
}

/**
 * Builds an ascending-then-descending sequence from a notes array.
 * e.g. [A, B, C, D] → [A, B, C, D, C, B, A]
 * Used for scale playback (play up then back down).
 *
 * @param {Array} notes
 * @returns {Array}
 */
export function buildAscDescSequence(notes) {
  const result = [...notes];
  for (let i = notes.length - 2; i >= 0; i--) {
    result.push(notes[i]);
  }
  return result;
}
