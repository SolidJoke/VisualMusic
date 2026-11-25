// @ts-check
/**
 * generate/registry.js — the Studio's generators, IN THE ORDER THEY APPLY
 * (VMU-234). The order is part of what plays:
 *
 *   1. progression  the edited chords, laid in the style's tonic;
 *   2. chance       thins the hits (never the chords);
 *   3. transpose    moves the chords and the key to the chosen tonic;
 *   4. groove       rides on the finished document.
 *
 * A new generator is added HERE, at its place, and nowhere else:
 * hooks/useStudioMode.js reads this list for the played document, the marks,
 * "has edits", "hear the original", the change of style and the history.
 * src/core/generate/__tests__/registry.extension.test.js holds that promise.
 *
 * What is NOT a generator: the four Math & Rythmes overrides (customDrums,
 * customRhythm, customProgression, suggestedBassTrack — the copy's drift,
 * VMU-211, among them). They are cells the user placed, read by
 * core/timeline.js buildStudioTimeline to build the SOURCE document the chain
 * starts from — what a frozen generator will turn into (contract.js §
 * FREEZING). Nor is core/compositionEngine.js: it maps a pattern to a pattern
 * (GCD, Euclid, rotation, phasing, isorhythm) for the panels that compose
 * those overrides; it never sees a document. It stays a library the
 * generators may call.
 *
 * @module core/generate/registry
 */
import { chanceGenerator, grooveGenerator, progressionGenerator, transposeGenerator } from "./generators";

/** @type {ReadonlyArray<import("./contract").Generator>} */
export const GENERATORS = Object.freeze([progressionGenerator, chanceGenerator, transposeGenerator, grooveGenerator]);
