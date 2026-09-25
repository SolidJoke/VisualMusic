// @ts-check
/**
 * timeline.js — the Studio's timeline document (T3).
 *
 * Until T3 the Studio's model was one 16-step pattern per track, repeated,
 * over a loop fixed at 4 measures with one chord per measure (the progression
 * taken modulo its length): past 4 chords nothing was heard or exported, and
 * no measure could differ from another. The timeline document replaces it.
 * It is what playback (useSequencer, through dispatch.js's `stepEvents`), the
 * MIDI export (MidiExporter.js) and the audio harness (offlineRender.js) read.
 *
 * The model is a **sequence of steps** (T3 brief, decision 1): every track is
 * 128 cells — 8 measures x 16 steps — each `null` (silent) or a cell. Editing
 * a cell changes that measure only. A style *fills* the cells by copying its
 * one-measure pattern into all 8 measures, so the length is only a *playback
 * window* over them: going from 8 measures to 4 destroys nothing, and back to
 * 8 finds everything where it was.
 *
 * Chords are laid end to end from step 0, each stored **absolute** — a root
 * pitch class and a chord type, never a degree (decision 2) — for a duration
 * that is a multiple of 8 steps (half a measure). A style repeats its
 * progression until the 8 measures are full, so a 4-chord style over 8
 * measures plays its chords twice. `chordAt` is the one place that says which
 * chord covers a step.
 *
 * Nothing here plays, draws or exports: no Tone, no React, no clock. Every
 * function is pure and every operation returns a new document; cells are
 * never mutated in place.
 *
 * @module core/timeline
 */
import { BRICKS } from "./bricks";
import { NOTES } from "./constants";
import { DIMINISHED_CHORD_TYPES, MINOR_CHORD_TYPES, generateChordsFromNNS, resolveNnsToChordType } from "./theory";
import { classifyDrumTrack, classifyMelodicTrack } from "../audio/trackMapping";

export const TIMELINE_SCHEMA_VERSION = 1;
export const STEPS_PER_MEASURE = 16;
export const MAX_MEASURES = 8;
export const MAX_STEPS = STEPS_PER_MEASURE * MAX_MEASURES;
/** The playback windows a document can have, in measures. */
export const TIMELINE_LENGTHS = [1, 2, 4, 8];
/** Chord durations are multiples of this many steps: half a measure. */
export const CHORD_STEP_GRID = 8;
/**
 * The Studio's length. Fixed at 4 until the timeline screen (V3) offers the
 * 4 / 8 setting; the document already holds all 8 measures.
 */
export const STUDIO_LENGTH_MEASURES = 4;

export const DRUM_ROLES = ["kick", "snare", "hat"];
export const MELODIC_ROLES = ["bass", "melody"];
const ROLES = [...DRUM_ROLES, "chordHits", ...MELODIC_ROLES];
const VELOCITIES = ["normal", "ghost"];
const PROVENANCES = ["style", "math", "edit"];

/** Name and id of the chord row (the name is what the chord events and the piano roll have always shown). */
export const CHORD_TRACK_NAME = "Chords";
const CHORD_TRACK_ID = "chords";

/**
 * One active step.
 *
 * @typedef {Object} TimelineCell
 * @property {"normal"|"ghost"} vel "ghost" is the quieter hit (bricks.json's
 *   `lowVelocitySteps`).
 * @property {string} [pitch] melodic rows: the interval above the chord's root
 *   the note plays, as bricks.json's `pitchSteps` write it ("R", "3", "5",
 *   "b7", "8va", ...). Absent: the root.
 * @property {number} [len] how long it sounds, in steps. Absent: the role's
 *   own duration (dispatch.js: drums by kind, melodic notes 1 step). The chord
 *   row always carries it.
 */

/**
 * @typedef {"kick"|"snare"|"hat"|"chordHits"|"bass"|"melody"} TrackRole
 * @typedef {"style"|"math"|"edit"} Provenance who last wrote a measure of a
 *   track: the style that filled it, one of the Studio's overrides over the
 *   style (the Math & Rythmes panel, the bass suggestion, the rhythm
 *   selector — `StudioOverrides`), or an edit of its cells.
 */

/**
 * @typedef {Object} TimelineTrack
 * @property {string} id stable within the document ("drum-0", "chords", "melody-0", ...)
 * @property {string} name what the style calls it ("Kick", "Hat", "Bass", ...)
 * @property {TrackRole} role what plays it. Computed **once**, when the track
 *   is filled, by trackMapping.js's classifyDrumTrack (drum tracks) and
 *   classifyMelodicTrack (melodic tracks) — never re-derived from the name
 *   afterwards. "chordHits" is the chord row: when the chord of the moment is
 *   struck, and for how long.
 * @property {(TimelineCell|null)[]} steps MAX_STEPS cells, absolute: cell `i`
 *   is step `i` of the timeline (measure `Math.floor(i / 16)`).
 * @property {Provenance[]} provenance one entry per measure, MAX_MEASURES long.
 */

/**
 * @typedef {Object} TimelineChord
 * @property {number} rootPc root pitch class, 0-11 (C = 0).
 * @property {string} type a CHORDS key of theory.js ("chord_major",
 *   "chord_minor", "chord_7", ...).
 * @property {number} durationSteps a positive multiple of CHORD_STEP_GRID.
 * @property {string} [nns] display only: the degree as the style wrote it
 *   ("6-", "b6", "4m", "ii7"). Never read to compute a pitch — rootPc and
 *   type are the chord. Kept because the notation cannot be recovered from
 *   absolute data (in a minor key "6" and "b6" are the same chord — Boom
 *   Bap writes one, Jungle the other; "4m" and "4-" are the same chord),
 *   and what the app shows of a style's chord — the degree in the DAW
 *   helper, the chord published to the
 *   instruments during playback — is the style's own notation. A chord
 *   without it has its degree computed from the key (`describeChord`).
 */

/**
 * @typedef {Object} TimelineKey
 * @property {number} rootValue tonic pitch class, 0-11
 * @property {string} scaleKey a SCALES key of theory.js ("scale_major", ...)
 */

/**
 * @typedef {Object} TimelineDoc
 * @property {1} schemaVersion
 * @property {TimelineKey|null} key null for a document without harmony (no
 *   style: then it has no chord).
 * @property {number} lengthMeasures the playback window, one of TIMELINE_LENGTHS.
 * @property {TimelineChord[]} chords end to end from step 0; steps past the
 *   last one have no chord.
 * @property {TimelineTrack[]} tracks drum rows, then the chord row, then the
 *   melodic rows — the order what plays on a step is listed in.
 * @property {{ brickIndex: number, variation: "A"|"B" } | null} origin the
 *   style and theme that filled the document.
 * @property {{ chords: TimelineChord[], tracks: TimelineTrack[] }} base the
 *   chords and tracks as the style filled them, before the Studio's
 *   overrides and edits.
 */

/**
 * The Studio's replacements over a style (useStudioMode.js), each null when
 * unused.
 *
 * @typedef {Object} StudioOverrides
 * @property {Object<string, number[]>|null} [customDrums] drum track name ->
 *   active steps of one measure (Math & Rythmes panel).
 * @property {number[]|null} [customRhythm] a chord rhythm (the rhythm
 *   selector, the Math & Rythmes panel).
 * @property {string[]|null} [customProgression] NNS degrees (Quick Start).
 * @property {any} [suggestedBassTrack] a one-measure pattern replacing the
 *   melodic track named "Bass" (bass suggestion, Math & Rythmes panel).
 */

/**
 * The tracks and progression a style plays in the Studio, the pre-T3 shape
 * of its state (useStudioMode's `activeTracks`): one-measure patterns, as
 * bricks.json writes them.
 *
 * @typedef {Object} StudioSelection
 * @property {any[]} drums
 * @property {any[]} melody
 * @property {string[]} progression
 * @property {number[]} rhythm
 */

// ─── filling ─────────────────────────────────────────────────────────

/** @param {Provenance} provenance */
function measuresOf(provenance) {
  return Array.from({ length: MAX_MEASURES }, () => provenance);
}

/**
 * The cells of a one-measure pattern — bricks.json's shape: `activeSteps`
 * (steps 0-15), `lowVelocitySteps`, `pitchSteps` — copied into every measure.
 * A step plays when the pattern lists it, exactly as playback matched it
 * (`activeSteps.includes(step % 16)`) before T3.
 *
 * @param {any} pattern
 * @returns {(TimelineCell|null)[]}
 */
function patternCells(pattern) {
  return Array.from({ length: MAX_STEPS }, (_, step) => {
    const inMeasure = step % STEPS_PER_MEASURE;
    if (!pattern.activeSteps?.includes(inMeasure)) return null;
    /** @type {TimelineCell} */
    const cell = { vel: pattern.lowVelocitySteps?.includes(inMeasure) ? "ghost" : "normal" };
    const pitch = pattern.pitchSteps?.[inMeasure];
    if (pitch) cell.pitch = pitch;
    return cell;
  });
}

/**
 * A track filled from a one-measure pattern.
 *
 * @param {any} pattern bricks.json track: `{ name, activeSteps, lowVelocitySteps?, pitchSteps? }`
 * @param {{ id?: string, role: TrackRole, provenance?: Provenance }} options
 * @returns {TimelineTrack}
 */
export function trackFromPattern(pattern, { id = pattern.name, role, provenance = "style" }) {
  return { id, name: pattern.name, role, steps: patternCells(pattern), provenance: measuresOf(provenance) };
}

/**
 * The chord row a chord rhythm plays — bricks.json's `chordRhythm`, the
 * Studio's `customRhythm` — cell by cell.
 *
 * This is the only place a rhythm array is interpreted, once, when the row is
 * filled; the row then *is* the rhythm. The interpretation is the one
 * playback always applied, step by step, until T3 (trackMapping.js's
 * `shouldPlayChordStep`, removed): a rhythm with a value above 3 lists steps
 * of one measure ([0, 6, 10]); otherwise it lists steps of one beat, struck
 * on every beat ([0, 2]). A rhythm of one hit rings for a quarter note (4
 * steps), a rhythm of several hits strikes each for a 16th (1 step). An empty
 * rhythm strikes nothing.
 *
 * @param {number[]} rhythm
 * @returns {(TimelineCell|null)[]}
 */
export function chordHitCells(rhythm) {
  const stepsOfOneMeasure = rhythm.some((step) => step > 3);
  const len = rhythm.length > 1 ? 1 : 4;
  return Array.from({ length: MAX_STEPS }, (_, step) => {
    const hit = stepsOfOneMeasure ? rhythm.includes(step % STEPS_PER_MEASURE) : rhythm.includes(step % 4);
    return hit ? { vel: "normal", len } : null;
  });
}

/**
 * A progression of NNS degrees as the document's chords: one per measure,
 * the progression repeated until the 8 measures are full (4 chords over 8
 * measures: twice). Each degree is resolved once, in `key`, to an absolute
 * root and type, by the same two calls playback made on every step before T3
 * (generateChordsFromNNS, then resolveNnsToChordType on the degree it
 * normalizes), which the Studio's chord buttons also make — theory.js's
 * "CHORD SYMBOLS" reading (VMU-157/158).
 *
 * @param {TimelineKey|null} key
 * @param {string[]|null|undefined} progression
 * @returns {TimelineChord[]}
 */
export function chordsFromProgression(key, progression) {
  if (!key || !progression || progression.length === 0) return [];
  const resolved = progression.map((nns) => {
    const [chord] = generateChordsFromNNS(key.rootValue, key.scaleKey, [nns]);
    return { rootPc: chord.rootNote.value, type: resolveNnsToChordType(chord.nns), durationSteps: STEPS_PER_MEASURE, nns };
  });
  return Array.from({ length: MAX_MEASURES }, (_, measure) => ({ ...resolved[measure % resolved.length] }));
}

/** @param {TimelineChord[]} chords @param {TimelineTrack[]} tracks */
function snapshot(chords, tracks) {
  return {
    chords: chords.map((chord) => ({ ...chord })),
    tracks: tracks.map((track) => ({ ...track, steps: [...track.steps], provenance: [...track.provenance] })),
  };
}

/**
 * The document of a selection — the tracks, progression and rhythm a style
 * plays, in the pre-T3 shape (`StudioSelection`, plus the style for its key).
 *
 * Drum tracks become drum rows (role from classifyDrumTrack), the rhythm the
 * chord row, melodic tracks melodic rows (role from classifyMelodicTrack),
 * the progression the chords. Every row is filled over all 8 measures;
 * `lengthMeasures` only sets the window.
 *
 * @param {Partial<StudioSelection> & { brick?: any }} selection
 *   `rhythm` defaults to [0], what playback used when it had none.
 * @param {Object} [options]
 * @param {number} [options.lengthMeasures]
 * @param {TimelineDoc["origin"]} [options.origin]
 * @param {TimelineDoc["base"]} [options.base] defaults to a copy of this
 *   document's own chords and tracks.
 * @returns {TimelineDoc}
 */
export function timelineFromSelection(selection, options = {}) {
  const { brick = null, drums = [], melody = [], progression = [], rhythm = [0] } = selection;
  const { lengthMeasures = STUDIO_LENGTH_MEASURES, origin = null, base } = options;
  checkLength(lengthMeasures);

  /** @type {TimelineKey|null} */
  const key = brick ? { rootValue: brick.rootValue, scaleKey: brick.scaleKey } : null;
  const chords = chordsFromProgression(key, progression);
  /** @type {TimelineTrack[]} */
  const tracks = [
    ...(drums || []).map((pattern, i) =>
      trackFromPattern(pattern, { id: `drum-${i}`, role: classifyDrumTrack(pattern.name) }),
    ),
    {
      id: CHORD_TRACK_ID,
      name: CHORD_TRACK_NAME,
      role: "chordHits",
      steps: chordHitCells(rhythm || [0]),
      provenance: measuresOf("style"),
    },
    ...(melody || []).map((pattern, i) =>
      trackFromPattern(pattern, { id: `melody-${i}`, role: classifyMelodicTrack(pattern.name) }),
    ),
  ];

  return {
    schemaVersion: TIMELINE_SCHEMA_VERSION,
    key,
    lengthMeasures,
    chords,
    tracks,
    origin,
    base: base ? snapshot(base.chords, base.tracks) : snapshot(chords, tracks),
  };
}

// ─── the Studio's document ───────────────────────────────────────────

/**
 * What a style plays in the Studio for a theme ("B" = its `*Variation`
 * fields, where it has them), before any override. The chord rhythm has no
 * variation.
 *
 * @param {any} brick
 * @param {"A"|"B"|string} theme
 * @returns {StudioSelection}
 */
function styleSelection(brick, theme) {
  const isB = theme === "B";
  return {
    drums: (isB && brick.drumTracksVariation ? brick.drumTracksVariation : brick.drumTracks) || [],
    melody: isB && brick.melodyTracksVariation ? brick.melodyTracksVariation : brick.melodyTracks,
    progression: isB && brick.nnsProgressionVariation ? brick.nnsProgressionVariation : brick.nnsProgression,
    rhythm: brick.chordRhythm || [0],
  };
}

/**
 * A style's selection with the Studio's overrides applied, and the ids of the
 * rows they replaced. The rules are useStudioMode's `activeTracks` memo,
 * moved here unchanged: a suggested bass replaces the melodic track named
 * "Bass"; a custom drum pattern replaces the steps of the drum track of that
 * name (its ghost steps stay) or, if there is none, is appended; a custom
 * progression or rhythm replaces the style's.
 *
 * @param {any} brick
 * @param {StudioSelection} style
 * @param {StudioOverrides} overrides
 * @returns {{ selection: StudioSelection, replaced: Set<string> }}
 */
function applyOverrides(brick, style, overrides) {
  const { customDrums, customRhythm, customProgression, suggestedBassTrack } = overrides;
  const replaced = new Set();

  let melody = style.melody;
  if (suggestedBassTrack) {
    melody = style.melody.map((track, i) => {
      if (track.name !== "Bass") return track;
      replaced.add(`melody-${i}`);
      return suggestedBassTrack;
    });
  }

  let drums = style.drums;
  if (customDrums) {
    drums = style.drums.map((track, i) => {
      if (customDrums[track.name] === undefined) return track;
      replaced.add(`drum-${i}`);
      return { ...track, activeSteps: customDrums[track.name] };
    });
    Object.keys(customDrums).forEach((name) => {
      if (!drums.some((t) => t.name === name)) {
        replaced.add(`drum-${drums.length}`);
        drums.push({ name, activeSteps: customDrums[name] });
      }
    });
  }

  if (customRhythm) replaced.add(CHORD_TRACK_ID);

  return {
    selection: {
      drums,
      melody,
      progression: customProgression || style.progression,
      rhythm: customRhythm || brick.chordRhythm || [0],
    },
    replaced,
  };
}

/**
 * The selection the Studio's panels display — the style's tracks and
 * progression, the Studio's overrides applied. The same rules
 * `buildStudioTimeline` fills the document from.
 *
 * @param {any} brick
 * @param {"A"|"B"|string} theme
 * @param {StudioOverrides} [overrides]
 * @returns {StudioSelection}
 */
export function studioSelection(brick, theme, overrides = {}) {
  return applyOverrides(brick, styleSelection(brick, theme), overrides).selection;
}

/**
 * The Studio's document: the style `brickIndex` fills every cell for the
 * theme, then the Studio's overrides replace what they replace (their rows'
 * provenance is "math"). Its `base` is the style's own fill, overrides
 * excluded. This is what useStudioMode hands playback and the export, and
 * what the audio harness renders.
 *
 * @param {Object} [options]
 * @param {number} [options.brickIndex]
 * @param {"A"|"B"|string} [options.theme]
 * @param {StudioOverrides} [options.overrides]
 * @param {number} [options.lengthMeasures]
 * @returns {TimelineDoc}
 */
export function buildStudioTimeline({ brickIndex = 0, theme = "A", overrides = {}, lengthMeasures = STUDIO_LENGTH_MEASURES } = {}) {
  const brick = BRICKS.at(Number(brickIndex));
  const style = styleSelection(brick, theme);
  const { selection, replaced } = applyOverrides(brick, style, overrides);
  const styleDoc = timelineFromSelection({ brick, ...style }, { lengthMeasures });
  const doc = timelineFromSelection(
    { brick, ...selection },
    {
      lengthMeasures,
      origin: { brickIndex: Number(brickIndex), variation: theme === "B" ? "B" : "A" },
      base: styleDoc.base,
    },
  );
  if (replaced.size === 0) return doc;
  return {
    ...doc,
    tracks: doc.tracks.map((track) => (replaced.has(track.id) ? { ...track, provenance: measuresOf("math") } : track)),
  };
}

// ─── reading ─────────────────────────────────────────────────────────

/**
 * The number of steps the document plays before looping: its window.
 *
 * @param {TimelineDoc} doc
 * @returns {number}
 */
export function loopSteps(doc) {
  return doc.lengthMeasures * STEPS_PER_MEASURE;
}

/**
 * The chord covering `step`, and where it starts and ends — the single source
 * of "which chord is this step in" (dispatch.js's `stepEvents`, the chord
 * published during playback, the DAW helper all read it).
 *
 * `step` is absolute on the timeline, 0 to MAX_STEPS - 1. The window is not
 * applied here: the loop never asks past it, and a chord beyond it is still
 * in the document.
 *
 * @param {TimelineDoc} doc
 * @param {number} step
 * @returns {{ index: number, chord: TimelineChord, startStep: number, endStep: number } | null}
 *   null when no chord covers the step.
 */
export function chordAt(doc, step) {
  if (!Number.isInteger(step) || step < 0) return null;
  let startStep = 0;
  for (let index = 0; index < doc.chords.length; index++) {
    const chord = doc.chords[index];
    const endStep = startStep + chord.durationSteps;
    if (step < endStep) return { index, chord, startStep, endStep };
    startStep = endStep;
  }
  return null;
}

/**
 * The chords the loop plays, in order: those that start inside the window.
 *
 * @param {TimelineDoc} doc
 * @returns {{ index: number, chord: TimelineChord, startStep: number, endStep: number }[]}
 */
export function chordsInWindow(doc) {
  const spans = [];
  for (let step = 0; step < loopSteps(doc); ) {
    const span = chordAt(doc, step);
    if (!span) break;
    spans.push(span);
    step = span.endStep;
  }
  return spans;
}

/**
 * One measure of a track as a one-measure pattern — bricks.json's shape —
 * for what still describes a track one measure at a time (the DAW helper).
 *
 * @param {TimelineTrack} track
 * @param {number} [measure] 0-based
 * @returns {{ name: string, activeSteps: number[], lowVelocitySteps?: number[], pitchSteps?: Object<number, string> }}
 */
export function measurePattern(track, measure = 0) {
  const activeSteps = [];
  const lowVelocitySteps = [];
  /** @type {Object<number, string>} */
  const pitchSteps = {};
  for (let inMeasure = 0; inMeasure < STEPS_PER_MEASURE; inMeasure++) {
    const cell = track.steps[measure * STEPS_PER_MEASURE + inMeasure];
    if (!cell) continue;
    activeSteps.push(inMeasure);
    if (cell.vel === "ghost") lowVelocitySteps.push(inMeasure);
    if (cell.pitch) pitchSteps[inMeasure] = cell.pitch;
  }
  /** @type {{ name: string, activeSteps: number[], lowVelocitySteps?: number[], pitchSteps?: Object<number, string> }} */
  const pattern = { name: track.name, activeSteps };
  if (lowVelocitySteps.length > 0) pattern.lowVelocitySteps = lowVelocitySteps;
  if (Object.keys(pitchSteps).length > 0) pattern.pitchSteps = pitchSteps;
  return pattern;
}

/** How a degree label marks a chord type — marks resolveNnsToChordType reads back as that type. */
const TYPE_MARKS = {
  chord_major: "",
  chord_minor: "-",
  chord_dim: "°",
  chord_aug: "+",
  chord_7: "7",
  chord_maj7: "maj7",
  chord_m7: "m7",
  chord_m9: "m9",
  chord_m7b5: "m7b5",
  chord_dim7: "dim7",
  chord_9: "9",
  chord_add9: "add9",
  chord_sus2: "sus2",
  chord_sus4: "sus4",
};

/**
 * The degree label of `rootPc` in the key, one generateChordsFromNNS reads
 * back as `rootPc`: "4" for a note of the mode; otherwise a flat, else a
 * sharp, degree — flats and sharps being read against the tonic's major
 * scale, whatever the mode (VMU-157): in C minor, "b5" for F#.
 *
 * null when no label names the note: the mode's degrees and the major
 * scale's altered ones leave out, in a minor key, the major sixth (A in C
 * minor: "6" is A flat, "b6" too, "#6" is A sharp).
 *
 * @param {TimelineKey} key
 * @param {number} rootPc
 */
function degreeIn(key, rootPc) {
  const pc = ((rootPc % 12) + 12) % 12;
  const labels = ["", "b", "#"].flatMap((accidental) => [1, 2, 3, 4, 5, 6, 7].map((degree) => `${accidental}${degree}`));
  const readBack = generateChordsFromNNS(key.rootValue, key.scaleKey, labels);
  const at = readBack.findIndex((chord) => chord.rootNote?.value === pc);
  return at >= 0 ? labels[at] : null;
}

/**
 * How a chord of the document is shown: the object generateChordsFromNNS
 * returns (`{ nns, chordNameUS, chordNameEU, rootNote, role }`), the shape
 * the instruments (useMusicEngine, through the chord published during
 * playback) and the DAW helper read.
 *
 * The degree is the key's. A chord that still carries the label its style
 * wrote, when that label read in the key is this very chord, is shown as the
 * style wrote it — exactly what the app showed before T3. Any other chord
 * (an edited one, one set without a label) has its degree computed from the
 * key and its root and type; it has no harmonic-role text (`role: ""`), which
 * only generateChordsFromNNS's degree reading gives.
 *
 * @param {TimelineKey|null} key
 * @param {TimelineChord} chord
 * @returns {{ nns: string, chordNameUS: string, chordNameEU: string, rootNote: any, role: string }}
 */
export function describeChord(key, chord) {
  if (key && chord.nns) {
    const [asWritten] = generateChordsFromNNS(key.rootValue, key.scaleKey, [chord.nns]);
    if (asWritten?.rootNote?.value === chord.rootPc && resolveNnsToChordType(asWritten.nns) === chord.type) {
      return asWritten;
    }
  }
  const rootNote = NOTES.find((note) => note.value === chord.rootPc);
  const suffix = MINOR_CHORD_TYPES.includes(chord.type) ? "m" : DIMINISHED_CHORD_TYPES.includes(chord.type) ? "dim" : "";
  const degree = key ? degreeIn(key, chord.rootPc) : null;
  return {
    nns: `${degree ?? rootNote.us}${TYPE_MARKS[chord.type] ?? ""}`,
    chordNameUS: `${rootNote.us}${suffix}`,
    chordNameEU: `${rootNote.eu}${suffix}`,
    rootNote,
    role: "",
  };
}

// ─── editing ─────────────────────────────────────────────────────────

/** @param {number} lengthMeasures */
function checkLength(lengthMeasures) {
  if (!TIMELINE_LENGTHS.includes(lengthMeasures)) {
    throw new RangeError(`timeline: length must be one of ${TIMELINE_LENGTHS.join(", ")} measures, not ${lengthMeasures}`);
  }
}

/** @param {any} cell @returns {string|null} what is wrong with it, null if nothing */
function cellError(cell) {
  if (cell === null) return null;
  if (typeof cell !== "object") return "a cell is null or an object";
  if (!VELOCITIES.includes(cell.vel)) return `vel must be ${VELOCITIES.join(" or ")}`;
  if (cell.pitch !== undefined && typeof cell.pitch !== "string") return "pitch is an interval label";
  if (cell.len !== undefined && !(typeof cell.len === "number" && cell.len > 0)) return "len is a positive number of steps";
  return null;
}

/** @param {any} chord @returns {string|null} */
function chordError(chord) {
  if (!chord || typeof chord !== "object") return "a chord is an object";
  if (!(Number.isInteger(chord.rootPc) && chord.rootPc >= 0 && chord.rootPc <= 11)) return "rootPc is 0-11";
  if (typeof chord.type !== "string" || !chord.type.startsWith("chord_")) return "type is a CHORDS key";
  if (!(Number.isInteger(chord.durationSteps) && chord.durationSteps > 0 && chord.durationSteps % CHORD_STEP_GRID === 0)) {
    return `durationSteps is a positive multiple of ${CHORD_STEP_GRID}`;
  }
  return null;
}

/**
 * The document with its window set to `lengthMeasures`. Nothing else changes:
 * the cells and chords past the window stay, and come back into play when the
 * window grows again.
 *
 * @param {TimelineDoc} doc
 * @param {number} lengthMeasures one of TIMELINE_LENGTHS
 * @returns {TimelineDoc}
 */
export function setLength(doc, lengthMeasures) {
  checkLength(lengthMeasures);
  return { ...doc, lengthMeasures };
}

/**
 * The document with one cell replaced — that step, of that track, and nothing
 * else: the measure it is in is now an "edit".
 *
 * @param {TimelineDoc} doc
 * @param {string} trackId
 * @param {number} step 0 to MAX_STEPS - 1
 * @param {TimelineCell|null} cell
 * @returns {TimelineDoc}
 */
export function setCell(doc, trackId, step, cell) {
  if (!(Number.isInteger(step) && step >= 0 && step < MAX_STEPS)) {
    throw new RangeError(`timeline: step must be 0-${MAX_STEPS - 1}, not ${step}`);
  }
  const problem = cellError(cell);
  if (problem) throw new TypeError(`timeline: invalid cell (${problem})`);
  const at = doc.tracks.findIndex((track) => track.id === trackId);
  if (at < 0) throw new RangeError(`timeline: no track "${trackId}"`);

  const track = doc.tracks[at];
  const steps = [...track.steps];
  steps[step] = cell === null ? null : { ...cell };
  const provenance = [...track.provenance];
  provenance[Math.floor(step / STEPS_PER_MEASURE)] = "edit";
  const tracks = [...doc.tracks];
  tracks[at] = { ...track, steps, provenance };
  return { ...doc, tracks };
}

/**
 * The document with its chords replaced, end to end from step 0. Each chord
 * lasts a multiple of half a measure; together they fit in the 8 measures.
 * Steps past the last chord have none.
 *
 * @param {TimelineDoc} doc
 * @param {TimelineChord[]} chords
 * @returns {TimelineDoc}
 */
export function setChords(doc, chords) {
  const problems = chords.map(chordError).filter(Boolean);
  if (problems.length > 0) throw new TypeError(`timeline: invalid chord (${problems[0]})`);
  const total = chords.reduce((sum, chord) => sum + chord.durationSteps, 0);
  if (total > MAX_STEPS) throw new RangeError(`timeline: chords last ${total} steps, more than ${MAX_STEPS}`);
  return { ...doc, chords: chords.map((chord) => ({ ...chord })) };
}

/**
 * What is wrong with a document, against schema v1 — an empty list when
 * nothing is.
 *
 * @param {any} doc
 * @returns {string[]}
 */
export function timelineErrors(doc) {
  const errors = [];
  if (!doc || typeof doc !== "object") return ["not a document"];
  if (doc.schemaVersion !== TIMELINE_SCHEMA_VERSION) errors.push(`schemaVersion is ${TIMELINE_SCHEMA_VERSION}`);
  if (!TIMELINE_LENGTHS.includes(doc.lengthMeasures)) errors.push("lengthMeasures is 1, 2, 4 or 8");
  if (doc.key !== null && !(Number.isInteger(doc.key?.rootValue) && typeof doc.key?.scaleKey === "string")) {
    errors.push("key is null or { rootValue, scaleKey }");
  }
  if (doc.origin !== null && !(Number.isInteger(doc.origin?.brickIndex) && ["A", "B"].includes(doc.origin?.variation))) {
    errors.push("origin is null or { brickIndex, variation }");
  }

  const checkChords = (chords, where) => {
    if (!Array.isArray(chords)) return errors.push(`${where}chords is a list`);
    chords.forEach((chord, i) => {
      const problem = chordError(chord);
      if (problem) errors.push(`${where}chords[${i}]: ${problem}`);
    });
    const total = chords.reduce((sum, chord) => sum + (chord?.durationSteps || 0), 0);
    if (total > MAX_STEPS) errors.push(`${where}chords last more than ${MAX_STEPS} steps`);
  };
  const checkTracks = (tracks, where) => {
    if (!Array.isArray(tracks)) return errors.push(`${where}tracks is a list`);
    const ids = new Set();
    tracks.forEach((track, i) => {
      const at = `${where}tracks[${i}]`;
      if (typeof track?.id !== "string" || track.id === "" || ids.has(track.id)) errors.push(`${at}: id is unique`);
      ids.add(track?.id);
      if (typeof track?.name !== "string") errors.push(`${at}: name is a string`);
      if (!ROLES.includes(track?.role)) errors.push(`${at}: role is one of ${ROLES.join(", ")}`);
      if (!Array.isArray(track?.steps) || track.steps.length !== MAX_STEPS) {
        errors.push(`${at}: steps holds ${MAX_STEPS} cells`);
      } else {
        track.steps.forEach((cell, step) => {
          const problem = cellError(cell);
          if (problem) errors.push(`${at}.steps[${step}]: ${problem}`);
        });
      }
      if (
        !Array.isArray(track?.provenance) ||
        track.provenance.length !== MAX_MEASURES ||
        !track.provenance.every((p) => PROVENANCES.includes(p))
      ) {
        errors.push(`${at}: provenance is ${MAX_MEASURES} of ${PROVENANCES.join(", ")}`);
      }
    });
  };

  checkChords(doc.chords, "");
  checkTracks(doc.tracks, "");
  if (!doc.base || typeof doc.base !== "object") {
    errors.push("base is { chords, tracks }");
  } else {
    checkChords(doc.base.chords, "base.");
    checkTracks(doc.base.tracks, "base.");
  }
  return errors;
}
