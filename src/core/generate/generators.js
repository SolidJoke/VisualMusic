// @ts-check
/**
 * generate/generators.js — the Studio's four generators, each one a thin
 * adapter over the module that already holds its rules (VMU-234). The rules
 * themselves do not move: progressionEdit.js, chance.js, keyChoice.js and
 * groove.js stay the place to read them. The contract is generate/contract.js.
 *
 * @module core/generate/generators
 */
import { defineGenerator } from "./contract";
import { applyEditedChords } from "../progressionEdit";
import { applyChance, emptyChance, isNeutral } from "../chance";
import { effectiveRoot, transposeTimeline } from "../keyChoice";
import { grooveOf, HUMANIZE_DEFAULT, SWING_DEFAULT } from "../groove";
import { newSeed } from "../random";

/** The variation a theme plays: "B", or "A" for anything else. */
export function variationOf(theme) {
  return theme === "B" ? "B" : "A";
}

/**
 * VMU-127 — the progression edited chord by chord, one list per variation
 * (`CustomChords | null`). The list of the variation that plays is laid over
 * the window it sets, in the STYLE's tonic (the key comes later).
 */
export const progressionGenerator = defineGenerator({
  id: "progression",
  kind: "edit",
  reads: ["theme", "cycleSteps"],
  initial: () => null,
  isActive: (customChords) => Boolean(customChords && (customChords.A || customChords.B)),
  // The edits were made on the old style's chords: they do not carry over.
  forNewStyle: () => null,
  apply: (doc, customChords, { theme, cycleSteps }) => {
    const edited = customChords?.[variationOf(theme)] ?? null;
    return { doc: edited ? applyEditedChords(doc, edited, cycleSteps) : doc };
  },
});

/**
 * VMU-221 — a chance per cell, a density per track, and the Studio's seed
 * (`ChanceSettings`). Applied after the progression, before the key; the
 * removed hits are the grid's marks.
 */
export const chanceGenerator = defineGenerator({
  id: "chance",
  kind: "edit",
  reads: [],
  initial: () => emptyChance(newSeed()),
  isActive: (chance) => !isNeutral(chance),
  // The chances and densities are keyed by the style's tracks: they do not
  // carry over. The seed does (the version stays the version).
  forNewStyle: (chance) => (isNeutral(chance) ? chance : emptyChance(chance.seed)),
  apply: (doc, chance) => applyChance(doc, chance),
});

/**
 * VMU-219 — the key: the user's tonic (0-11), or null to follow the style's
 * own. Kept across a change of style.
 */
export const transposeGenerator = defineGenerator({
  id: "transpose",
  kind: "play",
  reads: ["styleRoot"],
  initial: () => null,
  isActive: (keyChoice) => keyChoice !== null && keyChoice !== undefined,
  apply: (doc, keyChoice, { styleRoot }) => ({
    doc: transposeTimeline(doc, effectiveRoot(styleRoot, keyChoice) - styleRoot),
  }),
});

/**
 * VMU-223 — the swing and the humanisation (`{ swing, humanize }`), laid on
 * the document last so that playback, the grid and the export read one
 * placement. No groove at 50 % and 0 %: the document is then untouched.
 */
export const grooveGenerator = defineGenerator({
  id: "groove",
  kind: "play",
  reads: ["seed"],
  initial: () => ({ swing: SWING_DEFAULT, humanize: HUMANIZE_DEFAULT }),
  isActive: ({ swing, humanize }) => grooveOf(swing, humanize, 0) !== null,
  apply: (doc, { swing, humanize }, { seed }) => {
    const groove = grooveOf(swing, humanize, seed);
    return { doc: groove ? { ...doc, groove } : doc };
  },
});
