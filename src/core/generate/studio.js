// @ts-check
/**
 * generate/studio.js — the Studio's side of the chain (VMU-234): its settings
 * object, the one "has edits" rule, the change of style, and the played
 * document. hooks/useStudioMode.js holds the state and calls these; it never
 * names a generator for any of them.
 *
 * The SETTINGS object maps each generator id to its settings:
 *
 *   { progression: CustomChords|null, chance: ChanceSettings,
 *     transpose: number|null, groove: { swing, humanize } }
 *
 * It is ONE state, so the history captures it in one piece and a gesture
 * (a slider drag) is one step whatever generator it moves.
 *
 * @module core/generate/studio
 */
import { createStageCache, runGenerators } from "./contract";
import { GENERATORS } from "./registry";

export { createStageCache };

/**
 * @param {ReadonlyArray<import("./contract").Generator>} [registry]
 * @returns {Object<string, any>}
 */
export function initialGeneratorSettings(registry = GENERATORS) {
  return Object.fromEntries(registry.map((generator) => [generator.id, generator.initial()]));
}

/**
 * One generator's settings moved by `update`; the SAME object when they do
 * not change (a refused gesture is no step).
 *
 * @param {Object<string, any>} settings
 * @param {string} id
 * @param {(own: any) => any} update
 * @returns {Object<string, any>}
 */
export function updateGeneratorSettings(settings, id, update) {
  const next = update(settings[id]);
  return Object.is(next, settings[id]) ? settings : { ...settings, [id]: next };
}

/**
 * What a change of style leaves: each generator's `forNewStyle`, the others
 * kept. The SAME object when nothing changes.
 *
 * @param {Object<string, any>} settings
 * @param {ReadonlyArray<import("./contract").Generator>} [registry]
 * @returns {Object<string, any>}
 */
export function settingsForNewStyle(settings, registry = GENERATORS) {
  let next = settings;
  for (const generator of registry) {
    if (!generator.forNewStyle) continue;
    next = updateGeneratorSettings(next, generator.id, generator.forNewStyle);
  }
  return next;
}

/**
 * Whether any of the four Math & Rythmes overrides is set.
 *
 * @param {{ customDrums?: any, customRhythm?: any, customProgression?: any, suggestedBassTrack?: any }} overrides
 */
export function hasStyleOverrides(overrides) {
  return Boolean(overrides.customDrums || overrides.customRhythm || overrides.customProgression || overrides.suggestedBassTrack);
}

/**
 * THE "has edits" rule: an override, or an active "edit" generator. "Play"
 * generators (the key, the groove) are no edit. "Hear the original" is
 * offered on it, and leaves out exactly what it counts.
 *
 * @param {Parameters<typeof hasStyleOverrides>[0]} overrides
 * @param {Object<string, any>} settings
 * @param {ReadonlyArray<import("./contract").Generator>} [registry]
 * @returns {boolean}
 */
export function hasModifications(overrides, settings, registry = GENERATORS) {
  return hasStyleOverrides(overrides) || registry.some((g) => g.kind === "edit" && g.isActive(settings[g.id]));
}

/**
 * The Studio's seed. It lives in the chance's settings (VMU-221, where it was
 * born; the grid shows it there) and the humanisation draws from it too.
 *
 * @param {Object<string, any>} settings
 * @returns {number}
 */
export function studioSeed(settings) {
  return settings.chance?.seed ?? 0;
}

/**
 * The document that plays, is drawn and is exported, with the marks the grid
 * shows. `source` is the style with its overrides — or, to hear the original,
 * the style alone, and `hearOriginal` then leaves the "edit" generators out.
 *
 * @param {import("../timeline").TimelineDoc} source
 * @param {Object<string, any>} settings
 * @param {{ theme: string, styleRoot: number, cycleSteps: number }} where
 * @param {{ hearOriginal?: boolean, cache?: import("./contract").StageCache, registry?: ReadonlyArray<import("./contract").Generator> }} [options]
 */
export function playedDocument(source, settings, { theme, styleRoot, cycleSteps }, { hearOriginal = false, cache, registry = GENERATORS } = {}) {
  const context = { theme, styleRoot, cycleSteps, seed: studioSeed(settings) };
  return runGenerators(source, settings, context, { registry, skipEdits: hearOriginal, cache });
}
