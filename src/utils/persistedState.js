// @ts-check
// VMU-050 (first slice) - the app reopens on the last selection.
//
// ONE versioned key in localStorage holding ONE JSON object:
//
//   visualmusic.state.v1 = { v: 1, appMode, lang, notation,
//                            playbackInstrumentByMode, brickId,
//                            chordOctaveOffset, dictRoot, dictType, dictOctave }
//
// `playbackInstrumentByMode` is `{ studio, dictionary }` — one instrument per
// mode (VMU-209). A pre-VMU-209 entry's single `playbackInstrument` is migrated
// to both modes on read; it is never written back as the old field.
//
// It keeps CONTENT (what the user was looking at), nothing about what they
// understood, nothing personal, no identifier. NOT kept in this slice: the
// tempo (the style imposes it on every mount), the volume, the metronome, and
// the edits (progression, rhythm, drums, bass line) - see the VMU-050 report.
//
// Two rules that matter more than the feature:
//   1. This module is never the reason the app fails to open. Storage missing,
//      blocked (private window, site data refused), full, holding corrupted
//      JSON or a version nobody knows: every one of these reads as "nothing
//      stored" and writes nothing, SILENTLY (no console output, no throw).
//   2. Reading is field by field. A value out of its list or its bounds is
//      dropped; the other fields are kept. A stored value is never trusted.
//
// There is no module-level cache: every call reads storage again, so tests
// (and two tabs) cannot see a stale copy.
import { BRICKS } from "../core/bricks";
import { CHORDS, SCALES } from "../core/theory";
import { translations } from "../i18n/translations";

export const STORAGE_KEY = "visualmusic.state.v1";
const VERSION = 1;

/** @param {unknown} v @param {number} lo @param {number} hi */
const isIntIn = (v, lo, hi) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

const PLAYBACK_INSTRUMENTS = ["piano", "guitar", "bass"];

/** @param {unknown} v */
const isValidInstrument = (v) => typeof v === "string" && PLAYBACK_INSTRUMENTS.includes(v);

/** @param {unknown} v */
const isPlaybackInstrumentByMode = (v) =>
  typeof v === "object" && v !== null && !Array.isArray(v) &&
  isValidInstrument(/** @type {Record<string, unknown>} */ (v).studio) &&
  isValidInstrument(/** @type {Record<string, unknown>} */ (v).dictionary);

/** @param {object} table @param {string} key */
const has = (table, key) => Object.prototype.hasOwnProperty.call(table, key);

/**
 * The kept fields, each with its validator. A field is stored and restored only
 * if its validator says yes; the Studio's style is kept by its English name
 * (the stable name the code already keys on, e.g. suggestBassPattern), never by
 * its index in the list, which moves whenever a style is added or reordered.
 * @type {Record<string, (v: unknown) => boolean>}
 */
const FIELDS = {
  appMode: (v) => v === "studio" || v === "dictionary",
  lang: (v) => typeof v === "string" && has(translations, v),
  notation: (v) => v === "eu" || v === "us",
  playbackInstrumentByMode: isPlaybackInstrumentByMode,
  brickId: (v) => typeof v === "string" && BRICKS.some((b) => b.name.en === v),
  chordOctaveOffset: (v) => isIntIn(v, -3, 3),
  dictRoot: (v) => isIntIn(v, 0, 11),
  dictType: (v) => typeof v === "string" && (v === "single_note" || has(CHORDS, v) || has(SCALES, v)),
  dictOctave: (v) => isIntIn(v, -3, 3),
};

/**
 * Keeps the valid known fields of a candidate object, drops everything else.
 * @param {unknown} candidate
 * @returns {Record<string, any>}
 */
function sanitize(candidate) {
  /** @type {Record<string, any>} */
  const out = {};
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return out;
  const source = /** @type {Record<string, unknown>} */ (candidate);
  for (const key of Object.keys(FIELDS)) {
    if (has(source, key) && FIELDS[key](source[key])) out[key] = source[key];
  }
  return out;
}

/**
 * VMU-209 — a pre-VMU-209 entry carried one `playbackInstrument` for both
 * modes. Read it as that instrument in each mode, unless the entry already
 * carries the per-mode shape (`playbackInstrumentByMode`), which wins.
 * @param {Record<string, any>} valid the sanitized known fields
 * @param {unknown} raw the parsed, unsanitized object
 * @returns {Record<string, any>}
 */
function migrateLegacyInstrument(valid, raw) {
  if (has(valid, "playbackInstrumentByMode")) return valid;
  const legacy = raw && typeof raw === "object" && !Array.isArray(raw)
    ? /** @type {Record<string, unknown>} */ (raw).playbackInstrument
    : undefined;
  if (!isValidInstrument(legacy)) return valid;
  return { ...valid, playbackInstrumentByMode: { studio: legacy, dictionary: legacy } };
}

/**
 * The stored object's valid fields, or {} for anything wrong with storage.
 * @returns {Record<string, any>}
 */
export function loadPersisted() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.v !== VERSION) return {};
    return migrateLegacyInstrument(sanitize(parsed), parsed);
  } catch {
    return {};
  }
}

/**
 * Merges `partial` over what is stored and writes it back. Invalid fields are
 * not written. Any storage failure is swallowed: the app simply forgets.
 * @param {unknown} partial
 */
export function savePersisted(partial) {
  try {
    const next = { v: VERSION, ...loadPersisted(), ...sanitize(partial) };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable or full: nothing to do, the app runs as before */
  }
}

/**
 * The Studio's style by its stable name: its index in BRICKS, or -1 when unknown.
 * @param {unknown} id
 */
export function brickIndexOf(id) {
  return BRICKS.findIndex((b) => b.name.en === id);
}

/**
 * The stable name of the style at `index`, or undefined.
 * @param {number} index
 * @returns {string | undefined}
 */
export function brickIdAt(index) {
  const brick = BRICKS.at(Number(index));
  return brick ? brick.name.en : undefined;
}
