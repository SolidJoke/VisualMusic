// @ts-check
/**
 * loopNotePlace.js — where the Studio loop shows a bass note that has no cell
 * of its own in the chord shape the bass neck draws (VMU-200).
 *
 * The owner's decision: while the loop plays, the shape stays drawn; a note
 * inside it lights its cell in colour; a note outside it is outlined (a ring,
 * no fill) at ONE place — the playable cell of that pitch nearest the drawn
 * shape. This module is the pure oracle for that place; the neck
 * (core/fretboardUtils.js) applies it, the view only adds a class.
 *
 * String indexing is the neck's own (the one Fretboard renders and the
 * fingering maps use): index 0 is the FIRST string of the `tuning` array the
 * neck was handed — useFretboard's `strings`, the low-to-high tuning reversed,
 * so bass index 0 is G and index 3 is E.
 *
 * @module core/loopNotePlace
 */
import { getAbsoluteNoteValue } from "./theory";

/**
 * One cell of the drawn shape, in the neck's string indexing.
 *
 * @typedef {Object} ShapeCell
 * @property {number} stringIndex
 * @property {number} fret
 * @property {number} absoluteValue
 */

/**
 * @typedef {Object} PlacedNote
 * @property {number} stringIndex
 * @property {number} fret
 * @property {boolean} inShape true when the note is one of the drawn cells
 */

/**
 * The cells a neck draws for a fingering: one per sounding string of the V2
 * fingering map (`{ [string]: { fret, status, finger } }`, useMusicEngine's
 * toV2), or of a legacy raw map (`{ [string]: { [fret]: finger } }`). A muted
 * string and a scale box (`scaleFrets`) draw nothing.
 *
 * @param {any} fingering
 * @param {string[]} tuning open-string names in the neck's string order
 * @returns {ShapeCell[]}
 */
export function shapeCellsFromFingering(fingering, tuning) {
  if (!fingering || fingering.scaleFrets) return [];
  const map = fingering.fingeringMap || fingering;
  if (!map) return [];

  /** @type {ShapeCell[]} */
  const cells = [];
  for (const key of Object.keys(map)) {
    const stringIndex = Number(key);
    if (!Number.isInteger(stringIndex)) continue;
    const data = map[key];
    if (!data) continue;

    let fret;
    if (data.status === "played" || data.status === "open") {
      fret = data.fret;
    } else if (data.status) {
      continue; // muted (or a status this map does not draw)
    } else if (data[0] === "O" || data.O) {
      fret = 0; // legacy open string
    } else {
      const fretKey = Object.keys(data).find((k) => !Number.isNaN(Number(k)));
      if (fretKey === undefined) continue;
      fret = Number(fretKey);
    }

    if (!Number.isInteger(fret) || fret < 0) continue;
    const open = getAbsoluteNoteValue(tuning[stringIndex]);
    if (open === null || open === undefined) continue;
    cells.push({ stringIndex, fret, absoluteValue: open + fret });
  }
  return cells;
}

/**
 * The cell a neck should show for `pitch` while the shape is drawn:
 * - a shape cell sounds `pitch` → that cell, `inShape: true`;
 * - otherwise the playable cell that sounds it with the smallest fret
 *   distance to the shape's fret span `[minFret, maxFret]` (0 inside the
 *   span); ties → the string nearest the shape's strings, then the lower
 *   fret; `inShape: false`;
 * - no playable cell, or no shape → null (the caller keeps today's behaviour).
 *
 * @param {Object} params
 * @param {number} params.pitch absolute MIDI value
 * @param {ShapeCell[]} [params.shapeCells] the cells the neck draws
 * @param {string[]} params.tuning open-string names in the neck's string order
 * @param {number} params.numFrets highest fret the neck shows
 * @returns {PlacedNote|null}
 */
export function placeNearShape({ pitch, shapeCells, tuning, numFrets }) {
  if (!shapeCells || shapeCells.length === 0) return null;

  const inShape = shapeCells.find((cell) => cell.absoluteValue === pitch);
  if (inShape) return { stringIndex: inShape.stringIndex, fret: inShape.fret, inShape: true };

  const frets = shapeCells.map((cell) => cell.fret);
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);

  /** @type {{ stringIndex: number, fret: number, fretDistance: number, stringDistance: number }|null} */
  let best = null;
  for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
    const open = getAbsoluteNoteValue(tuning[stringIndex]);
    if (open === null || open === undefined) continue;
    for (let fret = 0; fret <= numFrets; fret++) {
      if (open + fret !== pitch) continue;

      const fretDistance = fret < minFret ? minFret - fret : fret > maxFret ? fret - maxFret : 0;
      let stringDistance = Infinity;
      for (const cell of shapeCells) {
        stringDistance = Math.min(stringDistance, Math.abs(stringIndex - cell.stringIndex));
      }

      if (
        best === null ||
        fretDistance < best.fretDistance ||
        (fretDistance === best.fretDistance &&
          (stringDistance < best.stringDistance ||
            (stringDistance === best.stringDistance && fret < best.fret)))
      ) {
        best = { stringIndex, fret, fretDistance, stringDistance };
      }
    }
  }

  if (!best) return null;
  return { stringIndex: best.stringIndex, fret: best.fret, inShape: false };
}
