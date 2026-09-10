// @ts-check
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

    // Two shapes reach this function. V1, as fingeringLogic builds it:
    // { [fret]: finger }. V2, as useMusicEngine re-exposes it to the app:
    // { fret, status: 'open' | 'played' | 'muted', finger? }. Read as V1, a V2
    // entry turned the key "fret" into parseInt("fret") — NaN — so every guitar
    // and bass chord played from the dictionary threw on NOTES[NaN].
    if (fretMap && typeof fretMap === 'object' && 'status' in fretMap) {
      const fret = Number(fretMap.fret);
      if (fretMap.status !== 'muted' && Number.isFinite(fret) && fret >= 0) {
        pitches.push({
          absoluteValue: openNote + fret,
          stringIndex: strIdx,
          fret,
          ...(instrument ? { instrument } : {})
        });
      }
      return;
    }

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

/**
 * Builds the playback sequence for a displayed scale box: from the root up to
 * the next root an octave higher, then back down to the root.
 *
 * `reversedTuning` holds open-string NOTE NAMES (`['E4','B3',...]`, high→low
 * index), so every entry must go through getAbsoluteNoteValue() before any
 * arithmetic. Adding a fret number to the name directly yields a string —
 * `'G3' + 3` is `'G33'` — which then makes every `% 12` NaN and every
 * `NOTES[pitch % 12]` lookup undefined. That was the defect this function
 * replaces (useFretboardPlayback threw on every scale-root click).
 *
 * @param {Array<{stringIndex: number, fret: number}>} scaleFrets
 * @param {string[]} reversedTuning - open string note names, high→low index
 * @param {number} rootPitchClass - 0-11, the pitch class to start and end on
 * @param {string} [instrument]
 * @returns {Array<{absoluteValue: number, stringIndex: number, fret: number, instrument?: string}>}
 */
export function buildScaleBoxSequence(scaleFrets, reversedTuning, rootPitchClass, instrument = null) {
  if (!scaleFrets?.length) return [];

  const allNotes = scaleFrets
    .map((sf) => ({
      absoluteValue: getAbsoluteNoteValue(reversedTuning[sf.stringIndex]) + sf.fret,
      stringIndex: sf.stringIndex,
      fret: sf.fret,
      ...(instrument ? { instrument } : {})
    }))
    .sort((a, b) => a.absoluteValue - b.absoluteValue);

  // Anchor on the root. getAvailableScaleFingerings already slices the box from
  // root to root, but this function must not depend on that staying true.
  const startIdx = allNotes.findIndex((n) => n.absoluteValue % 12 === rootPitchClass);
  const rootIdx = startIdx >= 0 ? startIdx : 0;

  let endIdx = allNotes.findIndex((n, idx) => idx > rootIdx && n.absoluteValue % 12 === rootPitchClass);
  if (endIdx === -1) endIdx = allNotes.length - 1;

  const ascending = allNotes.slice(rootIdx, endIdx + 1);
  const descending = ascending.slice(0, ascending.length - 1).reverse();
  return [...ascending, ...descending];
}
