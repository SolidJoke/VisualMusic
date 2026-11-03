// @ts-check
/**
 * guitarGrip.js — the guitar grip a chord draws, as the cells the loop must
 * sound (VMU-209).
 *
 * The neck draws a chord's default shape with fingeringLogic.getGuitarFingering
 * (root pitch class, chord type, the chosen root string, octave 0), then turns
 * that fingering into cells with loopNotePlace.shapeCellsFromFingering and the
 * neck's string order (the low-to-high tuning reversed). The loop's guitar
 * voice must be the very same cells, so it goes through the same two functions
 * here — drawing and sound cannot diverge: a cell the neck lights is a note the
 * loop plays, at the same string and fret.
 *
 * @module core/guitarGrip
 */
import { getGuitarFingering } from "./fingeringLogic";
import { shapeCellsFromFingering } from "./loopNotePlace";
import { TUNINGS } from "./tunings";

/**
 * The cells the guitar neck draws for a chord, in the neck's string indexing
 * (index 0 = the highest string), each with the MIDI pitch it sounds.
 *
 * @param {Object} args
 * @param {number} args.rootPc the chord root's pitch class (0-11), as
 *   fingeringLogic.getGuitarFingering takes it
 * @param {string} args.chordType the chord type fingeringLogic shapes
 *   (e.g. "chord_major"), the same value the neck passes
 * @param {number|null} [args.rootString] the chosen root string, exactly what
 *   the Studio's position selector keeps; null lets fingeringLogic choose
 * @param {string[]} [args.tuning] the guitar's low-to-high tuning; defaults to
 *   standard (the neck's default when the style has no guitarStrings)
 * @returns {Array<{ stringIndex: number, fret: number, absoluteValue: number }>}
 */
export function guitarGripCells({
  rootPc,
  chordType,
  rootString = null,
  tuning = TUNINGS.GUITAR_STANDARD,
}) {
  const fingering = getGuitarFingering(rootPc, chordType, rootString, 0);
  const strings = [...tuning].reverse();
  return shapeCellsFromFingering(fingering, strings);
}
