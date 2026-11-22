// @ts-check
/**
 * VMU-219 — the loop's key.
 *
 * A style fixes its tonic (Ré seven times, Mi six). The user may choose
 * another one — to set the loop to the key of a Live project — and the loop
 * then plays that style's mode on the new tonic. This module is the whole of
 * the rule; the Studio's state (hooks/useStudioMode.js) only holds the
 * choice.
 *
 *   effective tonic   the user's choice, else the style's own. The one value
 *                     the loop, the instruments, the DAW helper, the copied
 *                     progression and the exported file's name are all read
 *                     from.
 *   keyedBrick        the style's brick with the effective tonic: what the
 *                     panels and the instruments read instead of the style's
 *                     own tonic. The very same object when the key is the
 *                     style's, so a style that is not transposed is, to the
 *                     identity, what it was.
 *   transposeTimeline the timeline document moved to the effective tonic:
 *                     key and chord roots only. The chords' types and
 *                     degrees, every row's cells and the drums are the
 *                     style's.
 *   keyChordPills     the seven chords of the key, for the Studio's row of
 *                     pills (prototype/KeyChordsRow.jsx).
 *
 * Nothing here touches theory.js or timeline.js: it reads them.
 */
import { getScaleNotes, generateChordsFromNNS, toRoman } from "./theory";

/**
 * @param {number} styleRoot the style's own tonic, 0-11
 * @param {number|null|undefined} choice the user's choice, 0-11, or none
 * @returns {number}
 */
export function effectiveRoot(styleRoot, choice) {
  return Number.isInteger(choice) ? mod12(/** @type {number} */ (choice)) : styleRoot;
}

/** @param {number} n */
function mod12(n) {
  return ((n % 12) + 12) % 12;
}

/**
 * The style's brick in the key `root`. The same object when `root` is the
 * style's own tonic.
 *
 * @template {{ rootValue: number }} B
 * @param {B} brick
 * @param {number} root 0-11
 * @returns {B}
 */
export function keyedBrick(brick, root) {
  if (!brick || mod12(root) === brick.rootValue) return brick;
  return { ...brick, rootValue: mod12(root) };
}

/**
 * The document, moved by `semitones`: its key and each chord's root (the
 * document's own and its `base` copy, which the style's reset reads), mod 12.
 * Types, degrees ("nns"), rows and window are untouched, so the mode, the
 * rhythm and the drums are the style's. The same document when nothing
 * moves, or when it has no key (no harmony to move).
 *
 * @param {import("./timeline").TimelineDoc} doc
 * @param {number} semitones
 * @returns {import("./timeline").TimelineDoc}
 */
export function transposeTimeline(doc, semitones) {
  const by = mod12(semitones);
  if (by === 0 || !doc || !doc.key) return doc;
  const move = (/** @type {import("./timeline").TimelineChord} */ chord) => ({ ...chord, rootPc: mod12(chord.rootPc + by) });
  return {
    ...doc,
    key: { ...doc.key, rootValue: mod12(doc.key.rootValue + by) },
    chords: doc.chords.map(move),
    base: { ...doc.base, chords: doc.base.chords.map(move) },
  };
}

/**
 * One pill of the key's chords.
 *
 * @typedef {Object} KeyChordPill
 * @property {number} degree 1-7, the step of the mode
 * @property {string} nns the degree as the Studio's progression writes it ("2-", "7°")
 * @property {string} roman the Roman numeral, lower case for a minor or diminished chord ("ii", "vii°")
 * @property {any} chord what generateChordsFromNNS gives: the object the Studio's chord buttons click
 */

/** The triad built on each degree, by its two intervals above the root. */
const TRIAD_MARK = { "4,7": "", "3,7": "-", "3,6": "°", "4,8": "+" };

/**
 * The seven chords of the key: the triad on each degree of the mode, as the
 * Studio's own chord buttons name and play them. The array also carries
 * `mode`: "major" when the tonic chord is a major triad, "minor" otherwise —
 * which family of beginner phrases to read (i18n `keyChordPhrases`).
 *
 * @param {number} rootValue the key's tonic, 0-11
 * @param {string} scaleKey a SCALES key of theory.js
 * @returns {KeyChordPill[] & { mode: "major"|"minor" }}
 */
export function keyChordPills(rootValue, scaleKey) {
  const notes = getScaleNotes(rootValue, scaleKey).map((note) => note.value);
  const marks = notes.map((root, i) => {
    const third = mod12(notes[(i + 2) % notes.length] - root);
    const fifth = mod12(notes[(i + 4) % notes.length] - root);
    return TRIAD_MARK[/** @type {"4,7"} */ (`${third},${fifth}`)] ?? "";
  });
  const pills = marks.map((mark, i) => {
    const nns = `${i + 1}${mark}`;
    const [chord] = generateChordsFromNNS(rootValue, scaleKey, [nns]);
    return { degree: i + 1, nns, roman: toRoman(nns), chord };
  });
  return Object.assign(pills, { mode: /** @type {"major"|"minor"} */ (marks[0] === "" || marks[0] === "+" ? "major" : "minor") });
}
