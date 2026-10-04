import { describe, it, expect } from "vitest";
import { DEFAULT_MIXER_LEVELS } from "../InstrumentPresets.js";
import { STUDIO_DEFAULTS, DICTIONARY_DEFAULTS } from "../measure/offlineRender.js";

/**
 * MixerDefaults.test.js — VMU-171 (Gabriel, 2026-10-03; coordinator's
 * decision 2): one mixer setting per mode, Studio and Dictionary, each
 * defined once and read by both the app and the offline harness.
 *
 * Defaults: the balance Gabriel asked for — bass 3 dB and guitar 1.5 dB above
 * the piano, drums level with it (he finds them balanced) — with headroom
 * (VMU-024): everything else lowered rather than bass and guitar raised. The
 * first attempt (0/0/0/+3/0/+1.5) measured +2.69 dBFS at the chain input, 185
 * samples above 0 dBFS and 8 large sample jumps on the default progression.
 * Same starting point in both modes; he refines with the sliders and his
 * values become the new defaults.
 */
const EXPECTED = { kick: -3, snare: -3, hat: -3, bass: 0, piano: -3, guitar: -1.5 };

describe("the relative balance is the one asked for (VMU-171)", () => {
  it("bass +3 dB and guitar +1.5 dB over the piano, drums level with it, in both modes", () => {
    for (const mode of ["studio", "dictionary"]) {
      const l = DEFAULT_MIXER_LEVELS[mode];
      expect(l.bass - l.piano, mode).toBe(3);
      expect(l.guitar - l.piano, mode).toBe(1.5);
      expect([l.kick, l.snare, l.hat], mode).toEqual([l.piano, l.piano, l.piano]);
      // Headroom: no fader above 0 dB by default.
      expect(Math.max(...Object.values(l)), mode).toBeLessThanOrEqual(0);
    }
  });
});

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
