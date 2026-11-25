// @ts-check
/**
 * generate/contract.js — the one contract every Studio generator follows
 * (VMU-234).
 *
 * The Studio's transformations were added one at a time — the edited
 * progression (VMU-127), the chance (VMU-221), the key (VMU-219), the groove
 * (VMU-223) — and each was wired into hooks/useStudioMode.js by hand: its own
 * memo, its own place in the order, its own line in the history's snapshot,
 * its own rule for "hear the original" and for the grid's marks. This module
 * is what they now share, so that the next ones (VMU-222 Varier/Figer, VMU-224
 * the arpeggiator, VMU-220 the sections) plug in by being added to the
 * registry (generate/registry.js), and nowhere else.
 *
 * A GENERATOR is plain data plus one pure function:
 *
 *   id         the key of its settings in the Studio's settings object, and
 *              its name in the registry;
 *   kind       "edit": an edit of the style. "Hear the original" skips it and
 *              it counts in "has edits" (the progression, the chance).
 *              "play": a setting of play. It always applies and it is no edit
 *              (the key, the groove);
 *   reads      the context keys `apply` reads (a closed list: the stage is
 *              recomputed only when one of them, its settings or its input
 *              document changes — see runGenerators' cache);
 *   initial()  its neutral settings, once, at the Studio's opening;
 *   isActive(settings)          whether it changes anything (for "has edits");
 *   forNewStyle(settings)?      the settings a change of style leaves (absent:
 *                               kept). Must return the SAME object when
 *                               nothing changes;
 *   apply(doc, settings, context) -> { doc, dropped?, modified? }
 *
 * `apply` is pure: no React, no Tone, no clock, no Math.random. Its only
 * randomness is `context.seed`, the Studio's seed (VMU-221), so the same
 * (document, settings, seed) always gives the same document: what is seen =
 * what is heard = what is exported. It returns the VERY SAME document object
 * when it changes nothing — the playback and the panels key on identity.
 * `dropped` and `modified` map a track id to the absolute steps it removed or
 * changed; the grid marks them (only the chance removes hits today).
 *
 * The chain (runGenerators) applies the registry in its order, each stage on
 * the previous one's document, and merges the marks into one list.
 *
 * FREEZING ("Figer", VMU-222 — prepared, NOT implemented). Today a generator's
 * output exists only while its settings do: change the seed and the chance
 * draws again. Freezing will turn that output into cells the user edits by
 * hand. The contract it will add, optional on each generator:
 *
 *   materialize(doc, settings, context) -> { overrides, settings }
 *
 * where `doc` is the stage's INPUT document, `overrides` the Studio override
 * patch (customDrums / customRhythm / suggestedBassTrack / the edited chords,
 * the shapes core/timeline.js already reads) that reproduces the stage's
 * OUTPUT on that input, and `settings` the generator's neutral settings. The
 * Studio applies both in one batch — one step of the history, undone
 * together — so the loop sounds the same before and after, and the result is
 * now editable cell by cell. A generator without `materialize` cannot be
 * frozen (a "play" generator such as the key never needs to be). The rule a
 * test will hold: run(input) before === run(input with the patch, neutral
 * settings) after, byte for byte at the export.
 *
 * @module core/generate/contract
 */

/**
 * @typedef {import("../timeline").TimelineDoc} TimelineDoc
 * @typedef {Object<string, number[]>} StepMarks track id -> absolute steps
 */

/**
 * What every stage may read. A generator lists the keys it reads in `reads`.
 *
 * @typedef {Object} GeneratorContext
 * @property {string} theme the variation that plays ("A" or "B")
 * @property {number} styleRoot the style's own tonic (0-11)
 * @property {number} cycleSteps the longest active Math & Rythmes cycle (0 = none)
 * @property {number} seed the Studio's seed (core/chance.js ChanceSettings.seed)
 */

/**
 * @typedef {Object} GeneratorResult
 * @property {TimelineDoc} doc the same object when nothing changed
 * @property {StepMarks} [dropped] the hits it removed
 * @property {StepMarks} [modified] the hits it changed
 */

/**
 * @typedef {Object} Generator
 * @property {string} id
 * @property {"edit"|"play"} kind
 * @property {Array<keyof GeneratorContext>} reads
 * @property {() => any} initial
 * @property {(settings: any) => boolean} isActive
 * @property {(settings: any) => any} [forNewStyle]
 * @property {(doc: TimelineDoc, settings: any, context: GeneratorContext) => GeneratorResult} apply
 */

/** No mark (a constant: a stable identity for the readers). */
export const NO_MARKS = Object.freeze({});

/**
 * Checks a generator against the contract (the registry runs it at load, so a
 * malformed one fails the tests, not the user).
 *
 * @param {any} generator
 * @returns {Generator}
 */
export function defineGenerator(generator) {
  const fail = (what) => {
    throw new Error(`generator ${generator?.id ?? "?"}: ${what}`);
  };
  if (!generator || typeof generator.id !== "string" || !generator.id) fail("needs an id");
  if (generator.kind !== "edit" && generator.kind !== "play") fail('kind must be "edit" or "play"');
  if (!Array.isArray(generator.reads)) fail("needs the list of context keys it reads");
  for (const fn of ["initial", "isActive", "apply"]) {
    if (typeof generator[fn] !== "function") fail(`needs ${fn}()`);
  }
  if (generator.forNewStyle !== undefined && typeof generator.forNewStyle !== "function") fail("forNewStyle must be a function");
  return Object.freeze(generator);
}

/** `marks` added to `into` (a new object only when there is something). */
function mergeMarks(into, marks) {
  if (!marks || Object.keys(marks).length === 0) return into;
  // A single source keeps its own object: a stage served from the cache gives
  // the readers the very same marks.
  if (into === NO_MARKS) return marks;
  const merged = { ...into };
  for (const [trackId, steps] of Object.entries(marks)) {
    merged[trackId] = merged[trackId] ? [...new Set([...merged[trackId], ...steps])].sort((a, b) => a - b) : steps;
  }
  return merged;
}

/**
 * A memo of the stages, one entry per generator id: the chain recomputes a
 * stage only when its input document, its settings or a context key it reads
 * changed (by identity). The result is identical with or without it; it only
 * keeps the identities stable, as the hook's separate memos did.
 *
 * @typedef {Map<string, { input: TimelineDoc, settings: any, context: any[], result: GeneratorResult }>} StageCache
 */

/**
 * @returns {StageCache}
 */
export function createStageCache() {
  return new Map();
}

/**
 * The registry applied in order.
 *
 * @param {TimelineDoc} doc the source document (the style with its overrides)
 * @param {Object<string, any>} settings generator id -> its settings
 * @param {GeneratorContext} context
 * @param {{ registry: ReadonlyArray<Generator>, skipEdits?: boolean, cache?: StageCache }} options
 *   `skipEdits`: "hear the original" — the "edit" generators are left out.
 * @returns {{ doc: TimelineDoc, dropped: StepMarks, modified: StepMarks }}
 */
export function runGenerators(doc, settings, context, { registry, skipEdits = false, cache }) {
  let current = doc;
  /** @type {StepMarks} */
  let dropped = NO_MARKS;
  /** @type {StepMarks} */
  let modified = NO_MARKS;
  for (const generator of registry) {
    if (skipEdits && generator.kind === "edit") continue;
    const own = settings[generator.id];
    const read = generator.reads.map((key) => context[key]);
    const cached = cache?.get(generator.id);
    const hit =
      cached &&
      cached.input === current &&
      cached.settings === own &&
      cached.context.length === read.length &&
      cached.context.every((value, i) => Object.is(value, read[i]));
    const result = hit ? cached.result : generator.apply(current, own, context);
    if (!hit && cache) cache.set(generator.id, { input: current, settings: own, context: read, result });
    current = result.doc;
    dropped = mergeMarks(dropped, result.dropped);
    modified = mergeMarks(modified, result.modified);
  }
  return { doc: current, dropped, modified };
}
