import { describe, it, expect } from "vitest";
import { DEFAULT_MIXER_LEVELS } from "../InstrumentPresets.js";
import { STUDIO_DEFAULTS, DICTIONARY_DEFAULTS } from "../measure/offlineRender.js";

/**
 * MixerDefaults.test.js — VMU-171 (Gabriel, 2026-10-03; coordinator's
 * decision 2): one mixer setting per mode, Studio and Dictionary, each
 * defined once and read by both the app and the offline harness.
 *
 * Defaults: what Gabriel hears online today (every node at 0 dB — he finds
 * the drums balanced) plus bass +3 dB and guitar +1.5 dB, which he finds too
 * quiet against the piano. Same starting point in both modes; he refines with
 * the sliders and his values become the new defaults.
 */
const EXPECTED = { kick: 0, snare: 0, hat: 0, bass: 3, piano: 0, guitar: 1.5 };

describe("default mixer levels, one per mode (VMU-171)", () => {
  it("defines a Studio and a Dictionary setting, with Gabriel's starting point", () => {
    expect(Object.keys(DEFAULT_MIXER_LEVELS).sort()).toEqual(["dictionary", "studio"]);
    expect(DEFAULT_MIXER_LEVELS.studio).toEqual(EXPECTED);
    expect(DEFAULT_MIXER_LEVELS.dictionary).toEqual(EXPECTED);
  });

  it("the harness renders with the very same objects, not copies", () => {
    expect(STUDIO_DEFAULTS.instrumentVolumes).toBe(DEFAULT_MIXER_LEVELS.studio);
    expect(DICTIONARY_DEFAULTS.instrumentVolumes).toBe(DEFAULT_MIXER_LEVELS.dictionary);
  });
});
