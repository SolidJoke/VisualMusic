// @ts-check
// src/core/realization.js
//
// Block 2 of the pipeline: *realization*.
//
//   1. theory       root + type            -> intervals            (theory.js)
//   2. realization   intervals + octave + instrument -> concrete pitches AND
//                    the positions that produce them                (here)
//   3. playback      consumes a realization
//   4. display       consumes THE SAME realization
//
// Blocks 3 and 4 used to compute their own pitches from unrelated inputs. The
// Dictionary display folded every chord tone into one octave
// (`(root + semitone) % 12 + (octave + 1) * 12`) while playback, for a guitar
// or a bass with a fingering, derived pitches from the positions on the neck —
// a real voicing spanning two octaves. Two sources, two truths: the keyboard
// lit C4-E4-G4 while the guitar sounded C3-E3-G3-C4-E4, and a scale box played
// a full octave below the highlighted scale.
//
// A realization is therefore a single array of notes, and both what is heard
// and what is lit up read from it. A note carries its absolute MIDI value, its
// pitch class, its interval label, and — when the instrument is fretted — the
// string and fret that produce it. Nothing downstream recomputes a pitch.

import { getAbsoluteNoteValue } from "./theory";
import { getChordIntervalLabel } from "./harmonyEngine";

/**
 * @typedef {Object} RealizedNote
 * @property {number} value pitch class, 0-11
 * @property {number} absoluteValue absolute MIDI pitch
 * @property {string|number|null} order interval label relative to the root
 * @property {number} [stringIndex] fretted instruments only
 * @property {number} [fret] fretted instruments only
 * @property {string} [instrument] fretted instruments only
 */

/**
 * Interval label of a pitch relative to a root pitch class.
 * The root itself is labelled 1 whatever octave it lands in, so the low C of a
 * guitar voicing and the C an octave up both read as the root.
 *
 * @param {number} absoluteValue
 * @param {number} rootPitchClass 0-11
 * @returns {string|number}
 */
function intervalLabel(absoluteValue, rootPitchClass) {
  const semitone = (absoluteValue - rootPitchClass + 144) % 12;
  return semitone === 0 ? 1 : getChordIntervalLabel(-1, semitone);
}

/**
 * Realizes a chord grip: the fingered positions ARE the chord, in the register
 * the player would actually hear.
 *
 * Two fingeringMap shapes reach this code — V1 `{ [fret]: finger }` as
 * fingeringLogic builds it, and V2 `{ fret, status }` as useMusicEngine
 * re-exposes it. Both are read here; reading V2 as V1 turned the key "fret"
 * into `parseInt("fret")` = NaN and crashed every guitar chord (fixed in #100,
 * kept covered by the tests below).
 *
 * @param {Object} fingeringMap
 * @param {string[]} reversedTuning open-string note names, high string first
 * @param {number} rootPitchClass
 * @param {string} instrument
 * @returns {RealizedNote[]} sorted low to high
 */
export function realizeChordFromFingering(fingeringMap, reversedTuning, rootPitchClass, instrument) {
  /** @type {RealizedNote[]} */
  const notes = [];

  Object.entries(fingeringMap).forEach(([stringIndexKey, fretMap]) => {
    const stringIndex = parseInt(stringIndexKey, 10);
    const openNote = getAbsoluteNoteValue(reversedTuning[stringIndex]);

    /** @param {number} fret */
    const push = (fret) => {
      const absoluteValue = openNote + fret;
      notes.push({
        value: absoluteValue % 12,
        absoluteValue,
        order: intervalLabel(absoluteValue, rootPitchClass),
        stringIndex,
        fret,
        instrument,
      });
    };

    if (fretMap && typeof fretMap === "object" && "status" in fretMap) {
      const fret = Number(fretMap.fret);
      if (fretMap.status !== "muted" && Number.isFinite(fret) && fret >= 0) push(fret);
      return;
    }

    Object.entries(fretMap ?? {}).forEach(([fretKey, finger]) => {
      const fret = parseInt(fretKey, 10);
      if (finger !== "X" && Number.isFinite(fret)) push(fret);
    });
  });

  return notes.sort((a, b) => a.absoluteValue - b.absoluteValue);
}

/**
 * Realizes a scale box: the notes of the displayed position, low to high, one
 * entry per distinct pitch.
 *
 * A box repeats pitches across strings — the same E exists on two strings in
 * most positions. Playing and lighting up a duplicate twice would put the same
 * key on the keyboard in two states, so duplicates collapse onto their lowest
 * position, which is the one a player reaches first going up the box.
 *
 * @param {Array<{stringIndex: number, fret: number}>} scaleFrets
 * @param {string[]} reversedTuning
 * @param {number} rootPitchClass
 * @param {string} instrument
 * @returns {RealizedNote[]} sorted low to high, deduplicated by pitch
 */
export function realizeScaleFromBox(scaleFrets, reversedTuning, rootPitchClass, instrument) {
  const seen = new Set();
  return scaleFrets
    .map(({ stringIndex, fret }) => {
      const absoluteValue = getAbsoluteNoteValue(reversedTuning[stringIndex]) + fret;
      return {
        value: absoluteValue % 12,
        absoluteValue,
        order: intervalLabel(absoluteValue, rootPitchClass),
        stringIndex,
        fret,
        instrument,
      };
    })
    .sort((a, b) => a.absoluteValue - b.absoluteValue)
    .filter((n) => {
      if (seen.has(n.absoluteValue)) return false;
      seen.add(n.absoluteValue);
      return true;
    });
}

/**
 * The realization for the current Dictionary selection.
 *
 * When the instrument being played is fretted and a fingering is displayed, the
 * grip on the neck is the realization: it is what the player would hear, and
 * what the neck is already showing. Otherwise — piano, or no fingering
 * available — the theoretical notes stand as the realization unchanged.
 *
 * The point of this single entry is that `source` is decided **once**. Having
 * playback and display each decide it independently is what produced the
 * divergence this module exists to remove.
 *
 * @param {Object} params
 * @param {'piano'|'guitar'|'bass'} params.instrument
 * @param {any} params.fingering fingering for `instrument`, or null
 * @param {string[]} params.tuning open-string note names, low string first
 * @param {number} params.rootPitchClass
 * @param {RealizedNote[]} params.theoreticalNotes fallback realization
 * @returns {{ notes: RealizedNote[], source: 'fingering'|'theory' }}
 */
export function realizeDictionarySelection({
  instrument,
  fingering,
  tuning,
  rootPitchClass,
  theoreticalNotes,
}) {
  const fretted = instrument === "guitar" || instrument === "bass";
  if (!fretted || !fingering) {
    return { notes: theoreticalNotes ?? [], source: "theory" };
  }

  // Fretboard indices count from the highest-pitched string.
  const reversedTuning = [...tuning].reverse();

  if (fingering.scaleFrets?.length) {
    const notes = realizeScaleFromBox(fingering.scaleFrets, reversedTuning, rootPitchClass, instrument);
    if (notes.length) return { notes, source: "fingering" };
  }

  if (fingering.fingeringMap) {
    const notes = realizeChordFromFingering(fingering.fingeringMap, reversedTuning, rootPitchClass, instrument);
    if (notes.length) return { notes, source: "fingering" };
  }

  return { notes: theoreticalNotes ?? [], source: "theory" };
}
