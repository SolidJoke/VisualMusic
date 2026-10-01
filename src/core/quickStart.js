// @ts-check
/**
 * quickStart.js — a Quick Start as a musician would play it in the style (VMU-161).
 *
 * The Quick Starts (extendedTheoryData.json: `axiomRules.progressions`) write
 * their chords as roman numerals for the major scale: "ii7", "V7", "IMaj7".
 * Read in a modal style, their roots followed the style's mode while their
 * types stayed the major scale's, so on E phrygian "ii7 V7 IMaj7" played
 * F m7, B 7, E maj7 — chords with notes outside the scale (VMU-161: 111 of
 * the 135 style x Quick Start couples).
 *
 * In the Studio a Quick Start is a **pattern of degrees**, not a set of chords:
 * "the 2, the 5, the 1". What a musician does with it in a piece is stack
 * thirds on the notes of the piece's scale, so nothing leaves the scale
 * ("style chords", the default). The one common variation is the cadence:
 * the chord of the 5 made a dominant, to pull back to the 1 ("classic
 * cadence"). The Dictionary keeps the rigour of the written chords and does
 * not read this module.
 *
 * Nothing here plays or draws. The result is a list of NNS degrees — the
 * Studio's `customProgression` — read afterwards by the one reading of symbols
 * (theory.js: parseChordSymbol), never by this module.
 *
 * @module core/quickStart
 */
import { getScaleNotes, parseChordSymbol, resolveChordSemitones } from "./theory";
import { realizeChordFromType } from "./noteEngine";

/** Chord types a stack of thirds can give, triads and sevenths, in the order they are tried. */
const STACKS = {
  triad: ["chord_major", "chord_minor", "chord_dim", "chord_aug"],
  seventh: ["chord_maj7", "chord_m7", "chord_7", "chord_m7b5", "chord_dim7"],
};

/** What follows the degree in an NNS symbol to name each type (theory.js "CHORD SYMBOLS"). */
const NNS_TAIL = {
  chord_major: "",
  chord_minor: "-",
  chord_dim: "°",
  chord_aug: "+",
  chord_maj7: "Maj7",
  chord_m7: "-7",
  chord_7: "7",
  chord_m7b5: "m7b5",
  chord_dim7: "dim7",
};

/** The degree whose chord the classic cadence makes a dominant. */
const DOMINANT_DEGREE = 5;

/**
 * @typedef {Object} QuickStart
 * @property {string} id
 * @property {string} name
 * @property {string[]} degrees NNS or roman degrees, as extendedTheoryData.json writes them.
 */

/**
 * The chord type a stack of thirds on scale degree `index` makes, with the
 * scale's own notes: the chord whose notes are exactly the scale's notes at
 * index, index + 2, index + 4 (and + 6 for a seventh).
 *
 * @param {number[]} scalePcs the scale's pitch classes, in order
 * @param {number} index 0-based degree
 * @param {"triad"|"seventh"} size
 * @returns {string|null} a CHORDS key, null when no known chord is that stack
 */
function stackedType(scalePcs, index, size) {
  const count = size === "seventh" ? 4 : 3;
  const stacked = new Set(Array.from({ length: count }, (_, k) => scalePcs[(index + 2 * k) % scalePcs.length]));
  const rootPc = scalePcs[index];
  return (
    STACKS[size].find((type) => {
      // Pitch classes of the chord's realized notes: a membership test, no pitch is computed.
      const pcs = realizeChordFromType(rootPc, type, 4).map((pitch) => pitch % 12);
      return pcs.length === stacked.size && pcs.every((pc) => stacked.has(pc));
    }) ?? null
  );
}

/**
 * Whether a written Quick Start degree is a seventh chord ("ii7", "IMaj7")
 * rather than a triad ("I", "vi"). Read through parseChordSymbol.
 *
 * @param {NonNullable<ReturnType<typeof parseChordSymbol>>} symbol
 */
function isSeventh(symbol) {
  const chord = symbol.type ? resolveChordSemitones(symbol.type) : null;
  return (chord?.noteCount ?? 0) > 3;
}

/**
 * The degrees the Studio loads for a Quick Start in a style's key.
 *
 * Each degree becomes the chord stacked in the style's scale: a triad when
 * the Quick Start writes triads, a seventh chord when it writes sevenths. With
 * `classicCadence`, the chord of the 5 becomes a dominant instead — major,
 * with the seventh when the Quick Start has sevenths — and nothing else
 * changes; without a 5 the option has no effect. A seventh chord the chord
 * dictionary cannot name is played as its triad. A degree this cannot read, or
 * a scale that is not one of seven notes, is left as written.
 *
 * @param {QuickStart} quickStart
 * @param {{ rootValue: number, scaleKey: string }} key the style's key
 * @param {{ classicCadence?: boolean }} [options]
 * @returns {string[]} NNS degrees, e.g. "2-7", "5", "1Maj7"
 */
export function quickStartProgression(quickStart, key, { classicCadence = false } = {}) {
  const scalePcs = getScaleNotes(key.rootValue, key.scaleKey).map((note) => note.value);
  return quickStart.degrees.map((written) => {
    const symbol = parseChordSymbol(written);
    if (!symbol?.degree || symbol.accidental || scalePcs.length !== 7) return written;
    const size = isSeventh(symbol) ? "seventh" : "triad";
    const type =
      classicCadence && symbol.degree === DOMINANT_DEGREE
        ? size === "seventh"
          ? "chord_7"
          : "chord_major"
        : // A seventh the dictionary has no name for (phrygian dominant's sixth degree stacks a
          // major seventh over an augmented fifth) is played as its triad, which is in the scale.
          (stackedType(scalePcs, symbol.degree - 1, size) ?? stackedType(scalePcs, symbol.degree - 1, "triad"));
    return type ? `${symbol.degree}${NNS_TAIL[type]}` : written;
  });
}

/**
 * The Quick Starts the Studio offers: one per pattern of degrees. "Majeur
 * II-V-I" and "Mineur ii-V-i" are the same pattern (2, 5, 1 in sevenths) —
 * the style says whether it is major or minor — so only the first is kept.
 *
 * @param {QuickStart[]} quickStarts
 * @returns {QuickStart[]}
 */
export function quickStartPatterns(quickStarts) {
  const seen = new Set();
  return quickStarts.filter((quickStart) => {
    const pattern = quickStart.degrees
      .map((written) => {
        const symbol = parseChordSymbol(written);
        return symbol ? `${symbol.accidental}${symbol.degree}${isSeventh(symbol) ? "7" : ""}` : written;
      })
      .join(" ");
    if (seen.has(pattern)) return false;
    seen.add(pattern);
    return true;
  });
}

/**
 * Whether the progression the Studio plays is this Quick Start's, in this
 * key and with this option — what tells which button to show as active.
 *
 * @param {string[]} progression
 * @param {QuickStart} quickStart
 * @param {{ rootValue: number, scaleKey: string }} key
 * @param {{ classicCadence?: boolean }} [options]
 */
export function isQuickStartLoaded(progression, quickStart, key, options) {
  const loaded = quickStartProgression(quickStart, key, options);
  return progression.length === loaded.length && progression.every((degree, i) => degree === loaded[i]);
}
