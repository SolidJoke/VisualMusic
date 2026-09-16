// @ts-check
// VMU-123 — target notes: which notes of the current chord (or, with no
// chord, the current mode) to mark as "aim for these" on an instrument.
//
// Redefined by the product owner on 2026-09-16, after refusing a single
// hard-coded choice: "the right answer depends on the genre" (classical,
// jazz, techno, rock don't share one). Hence a preset selector, named by
// INTENT and never by theory jargon (VMU-136's anti-jargon rule) — the UI
// strings live in i18n/translations.js, this module only computes pitch
// classes.
//
// Hard invariant: a target note is ALWAYS a member of the chord being
// played. This module never returns a pitch class the chord itself does not
// contain — VMU-123 was redefined away from "a scale-degree suggestion"
// toward "notes of the chord". The "never a counterexample" cross-check
// lives in __tests__/targetNotes.test.js (property test over every chord
// type and preset).
import { resolveChordSemitones, SCALES } from "./theory";

export const TARGET_NOTES_PRESETS = ["off", "majorMinor", "color", "skeleton"];

// Interval classes (semitones from the chord root, mod 12) that count as
// "the 3rd", "the 5th", "the 7th" of a chord — independent of quality, so a
// diminished chord's b5 and an augmented chord's #5 both count as "the 5th",
// and a minor chord's b3 counts as "the 3rd" exactly like a major chord's
// natural 3rd. This mirrors how CHORDS semitones are authored in theory.js.
const THIRD_INTERVALS = [3, 4];
const FIFTH_INTERVALS = [6, 7, 8];
const SEVENTH_INTERVALS = [9, 10, 11]; // 9 covers a diminished 7th (bb7)

function pickByInterval(semitones, wantedIntervals) {
  return semitones.filter((s) => wantedIntervals.includes(((s % 12) + 12) % 12));
}

/**
 * Target notes of a CHORD for a given preset — always a subset of the
 * chord's own notes (pitch classes 0-11), in the order the chord's own
 * semitone table lists them (root-ward first).
 *
 * @param {number} rootValue - chromatic root of the chord (0-11, C=0)
 * @param {string} chordType - a CHORDS key, e.g. "chord_major", "chord_m7"
 * @param {string} preset - one of TARGET_NOTES_PRESETS
 * @returns {number[]} pitch classes (0-11), possibly empty
 */
export function getChordTargetNotes(rootValue, chordType, preset) {
  if (!preset || preset === "off") return [];

  const chordData = resolveChordSemitones(chordType);
  const semitones = chordData ? chordData.semitones : null;
  if (!semitones || semitones.length === 0) return [];

  const root = ((Number(rootValue) % 12) + 12) % 12;
  const toPitchClasses = (wantedIntervals) =>
    pickByInterval(semitones, wantedIntervals).map((s) => (root + s) % 12);

  switch (preset) {
    case "majorMinor":
      return toPitchClasses(THIRD_INTERVALS);

    case "skeleton":
      return [...toPitchClasses([0]), ...toPitchClasses(FIFTH_INTERVALS)];

    case "color": {
      const thirds = toPitchClasses(THIRD_INTERVALS);
      const sevenths = toPitchClasses(SEVENTH_INTERVALS);
      return sevenths.length > 0 ? [...thirds, ...sevenths] : thirds;
    }

    default:
      return [];
  }
}

/**
 * Target note with NO chord playing: the mode's characteristic note (the
 * former "Magic Note"), unless the preset is off or the mode/scale declares
 * no `targetInterval` — in which case this returns nothing, never the root.
 *
 * theory.js's `makeScale` defaults `targetInterval` to `null`; naively
 * computing `(root + null) % 12` coerces to the root itself, which is wrong
 * (repo trap noted in the VMU-123 brief). This function checks explicitly.
 *
 * @param {number} rootValue - chromatic root of the scale/mode (0-11)
 * @param {string} scaleKey - a SCALES key, e.g. "scale_major"
 * @param {string} preset - one of TARGET_NOTES_PRESETS
 * @returns {number[]} zero or one pitch class
 */
export function getModeTargetNote(rootValue, scaleKey, preset) {
  if (!preset || preset === "off") return [];

  const scale = scaleKey ? SCALES[scaleKey] : null;
  if (!scale || scale.targetInterval === null || scale.targetInterval === undefined) {
    return [];
  }

  const root = ((Number(rootValue) % 12) + 12) % 12;
  return [(root + scale.targetInterval) % 12];
}
