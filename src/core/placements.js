// @ts-check
// src/core/placements.js
//
// INST-B1 — where on its own neck an instrument plays the current selection.
//
// A guitar or a bass can play the same chord, scale or note in several places.
// `listPlacements` lists them, ordered from the nut to the body, so that a
// "position" control (the column heads of L1b-1, and today the Position arrows
// and the positions window of the classic page) only has to step through the
// list: nothing in the interface recomputes a shape, a fret or a label.
//
// The shapes themselves are fingeringLogic.js's (open shape, E / A / D shapes,
// one root-fifth-octave per bass string, scale boxes, every place of a note):
// this module does not build or change any shape (that is VMU-115). It only
// orders them, tells which one is shown when none is chosen, and measures each
// one — its fret bounds and the span it sounds.
//
// The piano has no list: its placement is the octave of its notes, the common
// Dictionary octave (useDictionaryMode's dictOctave), which B1 does not move.

import {
  getAvailableGuitarFingerings,
  getAvailableBassFingerings,
  getAvailableScaleFingerings,
  getAvailableSingleNoteFingerings,
  getGuitarFingering,
  getBassFingering,
  INSTRUMENT_RANGES,
} from "./fingeringLogic";
import { realizeScaleFromBox, realizationRange } from "./realization";
import { getAbsoluteNoteValue } from "./theory";
import { TUNINGS } from "./tunings";

/**
 * @typedef {Object} Selection
 * @property {string} type dictType: "chord_*", "scale_*" or "single_note"
 * @property {'chord'|'scale'|'note'} [family] overrides what `type` says
 *   (the Studio's chord, whatever key its type resolves to)
 * @property {number|string} [root] pitch class of the root, 0-11
 * @property {number} [octave] the common octave, -3..+3: it does not move a
 *   shape; it decides only which shape is the default (see `isDefault`)
 * @property {number|null} [rootString] "Fondamentale sur Mi / La / Re": the
 *   string the default chord shape puts its root on (guitar 5/4/3, bass 3/2/1),
 *   null = let the shape choose
 * @property {number|null} [notePitch] single note only: its absolute pitch
 */

/**
 * @typedef {Object} Instrument
 * @property {'guitar'|'bass'|'piano'} id
 * @property {string[]} [tuning] open strings, low string first (standard if absent)
 * @property {string} [notation] note names in the labels: "us" (C D E) or "eu" (Do Re Mi)
 */

/**
 * @typedef {Object} Placement
 * @property {number} index rank in the list, 0 = nearest the nut
 * @property {string|number} id the shape's own id in fingeringLogic.js
 *   ("open", 5, 4, 3, "pos_4", "note_1_1"), kept for tracing only
 * @property {string} label fingeringLogic.js's label, unchanged
 * @property {number|null} lowFret lowest fret it plays (0 = open string)
 * @property {number|null} highFret highest fret it plays
 * @property {{low: number, high: number}|null} range the span it sounds
 * @property {boolean} isDefault the placement shown when none is chosen
 * @property {any} fingering what the neck draws: fingeringLogic.js's chord or
 *   note fingering, or a scale box { scaleFrets, isScaleMode, startFret, endFret }
 * @property {string} [stringName] single note: the string's name
 * @property {number} [fret] single note: the fret
 */

/**
 * The family of a Dictionary type, tested in useMusicEngine's order: a type
 * naming a scale is a scale, then the single note, then a chord.
 * @param {string|null|undefined} type
 * @returns {'scale'|'note'|'chord'|null}
 */
export function familyOf(type) {
  if (typeof type !== "string") return null;
  if (type.includes("scale")) return "scale";
  if (type === "single_note") return "note";
  if (type.includes("chord")) return "chord";
  return null;
}

/**
 * C-06 — the common Dictionary octave picks a scale box.
 *
 * Today one octave segment serves three instruments with three meanings; for a
 * scale on the guitar or the bass it is converted, linearly, into the rank of
 * a box: -3 = the first box (nearest the nut), +3 = the last. This link used
 * to be written inline twice in useMusicEngine.js; it is named here, called
 * from one place only (listPlacements, to mark the default box), so that it
 * can be removed in one place.
 *
 * It disappears with the common octave segment, when each column head carries
 * its own position control (L1b-1 / B2).
 *
 * @param {number} octave -3..+3 (clamped)
 * @param {number} count number of boxes
 * @returns {number|null} rank of the box, or null when there is none
 */
export function scalePositionForOctave(octave, count) {
  if (!(count > 0)) return null;
  const octaveNorm = Math.max(-3, Math.min(3, Number(octave ?? 0)));
  const posIdx = Math.round((octaveNorm + 3) / 6 * (count - 1));
  return Math.max(0, Math.min(count - 1, posIdx));
}

/**
 * Whether a change of the common octave clears a chosen placement.
 *
 * - scale: yes — C-06, the octave picks the box (kept as it is until the octave
 *   segment goes, with scalePositionForOctave);
 * - single note: yes — the octave changes the note itself, so its places on the
 *   neck are other cells;
 * - chord: no — the octave does not move a shape (it only decides which shape
 *   is the default), so a shape the player chose stays.
 *
 * @param {string|null|undefined} type
 */
export function octaveClearsPlacement(type) {
  const family = familyOf(type);
  return family === "scale" || family === "note";
}

/** The cells a fingering plays, as { stringIndex, fret } (fret >= 0). */
function cellsOf(fingering) {
  if (Array.isArray(fingering?.scaleFrets)) {
    return fingering.scaleFrets.map(({ stringIndex, fret }) => ({ stringIndex, fret }));
  }
  const cells = [];
  for (const [stringKey, fretMap] of Object.entries(fingering?.fingeringMap ?? {})) {
    for (const [fretKey, finger] of Object.entries(fretMap ?? {})) {
      const fret = parseInt(fretKey, 10);
      // A shape built below the nut (fret -1, fingeringLogic.js's m7b5 / dim7
      // shapes at fret 0) is neither drawn nor played: useMusicEngine.js's
      // toV2 keeps it, realization.js drops any fret < 0.
      if (finger !== "X" && Number.isFinite(fret) && fret >= 0) {
        cells.push({ stringIndex: parseInt(stringKey, 10), fret });
      }
    }
  }
  return cells;
}

/** Two fingering maps hold the same strings, frets and fingers. */
function sameMap(a, b) {
  const canonical = (map) => JSON.stringify(
    Object.keys(map ?? {}).sort().map((s) => [s, Object.entries(map[s] ?? {}).sort()])
  );
  return canonical(a) === canonical(b);
}

/**
 * The positions of a selection on one fretted instrument, from the nut to the
 * body: by lowest fret played, then highest fret, then the shapes' own order
 * (stable, deterministic). Same shapes as fingeringLogic.js lists — only the
 * order is this module's.
 *
 * @param {Selection|null} selection null: nothing to place (no list)
 * @param {Instrument} instrument
 * @returns {Placement[]}
 */
export function listPlacements(selection, instrument) {
  const id = instrument?.id;
  if (id !== "guitar" && id !== "bass") return [];
  const { type, root = 0, octave = 0, rootString = null, notePitch = null } = selection ?? {};
  const family = selection?.family ?? familyOf(type);
  const tuning = instrument.tuning?.length
    ? instrument.tuning
    : (id === "bass" ? TUNINGS.BASS_STANDARD : TUNINGS.GUITAR_STANDARD);
  const notation = instrument.notation ?? "us";
  const reversedTuning = [...tuning].reverse();
  const rootValue = Number(root);

  /** @type {Array<{id: any, label: string, fingering: any, extra?: Object}>} */
  let shapes = [];
  /** @type {any} */
  let defaultShape = null;

  if (family === "scale") {
    const boxes = getAvailableScaleFingerings(rootValue, type, id, tuning);
    shapes = boxes.map((box) => ({
      id: box.id,
      label: box.label,
      fingering: { scaleFrets: box.scaleFrets, isScaleMode: true, startFret: box.startFret, endFret: box.endFret },
    }));
    // C-06: the box the octave picks, by rank in fingeringLogic's own order
    // (the order of the windows), exactly as useMusicEngine.js picked it.
    const rank = scalePositionForOctave(octave, shapes.length);
    defaultShape = rank === null ? null : shapes[rank];
  } else if (family === "note") {
    if (notePitch === null || notePitch === undefined || !Number.isFinite(Number(notePitch))) return [];
    shapes = getAvailableSingleNoteFingerings(Number(notePitch), id, notation).map((p) => ({
      id: p.id,
      label: p.label,
      fingering: p.fingering,
      extra: { stringName: p.stringName, fret: p.fret },
    }));
    // No default: with no place chosen, the neck lights every place of the note.
  } else if (family === "chord") {
    const list = id === "guitar"
      ? getAvailableGuitarFingerings(rootValue, type, octave, notation)
      : getAvailableBassFingerings(rootValue, type, octave, notation);
    shapes = list.map((p) => ({ id: p.id, label: p.label, fingering: p.fingering }));
    // The default is the shape the neck has always shown with no index chosen:
    // fingeringLogic.js's own choice, from the root string and the octave.
    const shown = id === "guitar"
      ? getGuitarFingering(rootValue, type, rootString, octave)
      : getBassFingering(rootValue, type, rootString, octave);
    defaultShape = shapes.find((s) => sameMap(s.fingering?.fingeringMap, shown?.fingeringMap)) ?? null;
  } else {
    return [];
  }

  const rootPitchClass = ((rootValue % 12) + 12) % 12;
  const measured = shapes.map((shape, order) => {
    const cells = cellsOf(shape.fingering);
    const frets = cells.map((c) => c.fret);
    // The span it sounds, through the same function that realizes a box for
    // playback and display (open string + fret, one entry per pitch).
    const notes = realizeScaleFromBox(cells, reversedTuning, rootPitchClass, id);
    return {
      shape,
      order,
      lowFret: frets.length ? Math.min(...frets) : null,
      highFret: frets.length ? Math.max(...frets) : null,
      range: realizationRange(notes),
    };
  });

  const key = (/** @type {number|null} */ fret) => (fret === null ? Infinity : fret);
  measured.sort((a, b) =>
    key(a.lowFret) - key(b.lowFret) || key(a.highFret) - key(b.highFret) || a.order - b.order
  );

  return measured.map((m, index) => ({
    index,
    id: m.shape.id,
    label: m.shape.label,
    lowFret: m.lowFret,
    highFret: m.highFret,
    range: m.range,
    isDefault: m.shape === defaultShape,
    fingering: m.shape.fingering,
    ...(m.shape.extra ?? {}),
  }));
}

/**
 * The placement to show: the chosen index when it points into the list, the
 * default otherwise (null for a single note: every place of it is lit).
 *
 * @param {Placement[]} placements
 * @param {number|null|undefined} index
 * @returns {Placement|null}
 */
export function resolvePlacement(placements, index) {
  if (!Array.isArray(placements) || placements.length === 0) return null;
  if (Number.isInteger(index) && /** @type {number} */ (index) >= 0 && /** @type {number} */ (index) < placements.length) {
    return placements[/** @type {number} */ (index)];
  }
  return placements.find((p) => p.isDefault) ?? null;
}

/**
 * The pitches an instrument reaches in a tuning: its lowest open string up to
 * its highest open string plus the frets of the neck. The number of frets is
 * read from INSTRUMENT_RANGES and the standard tuning (86 - E4 = 22 on the
 * guitar, 65 - G2 = 22 on the bass), so a standard tuning gives exactly
 * INSTRUMENT_RANGES, and Drop D reaches D2.
 *
 * @param {'guitar'|'bass'} instrumentId
 * @param {string[]} [tuning] open strings, any order
 * @returns {{min: number, max: number}|null}
 */
export function tessitura(instrumentId, tuning) {
  const range = INSTRUMENT_RANGES[instrumentId];
  if (!range) return null;
  const standard = instrumentId === "bass" ? TUNINGS.BASS_STANDARD : TUNINGS.GUITAR_STANDARD;
  const neckFrets = range.max - Math.max(...standard.map(getAbsoluteNoteValue));
  const opens = (tuning?.length ? tuning : standard).map(getAbsoluteNoteValue);
  return { min: Math.min(...opens), max: Math.max(...opens) + neckFrets };
}

/**
 * Whether a realization holds a pitch outside a tessitura: the out-of-range
 * warning, computed on what is actually played (INST-B1), not on the frets
 * shifted by the common octave.
 *
 * @param {Array<{absoluteValue: number}|number>|null|undefined} notes
 * @param {{min: number, max: number}|null} range
 */
export function isOutsideTessitura(notes, range) {
  if (!range || !notes?.length) return false;
  return notes.some((n) => {
    const v = typeof n === "number" ? n : n?.absoluteValue;
    return Number.isFinite(v) && (v < range.min || v > range.max);
  });
}
