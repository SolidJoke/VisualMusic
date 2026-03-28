/**
 * InstrumentPresets.test.js — Validates preset structure and completeness
 */
import { describe, it, expect } from "vitest";
import {
  DRUM_PRESETS,
  BASS_PRESETS,
  GENRE_GROUPS,
  getPresetsForGroup,
} from "../InstrumentPresets.js";

describe("InstrumentPresets", () => {
  it("defines presets for all 6 genre groups", () => {
    const expectedGroups = ["electronic", "jazz", "rock", "pop", "urban", "world"];
    expectedGroups.forEach((group) => {
      expect(DRUM_PRESETS[group]).toBeDefined();
      expect(BASS_PRESETS[group]).toBeDefined();
    });
  });

  it("GENRE_GROUPS lists all groups", () => {
    expect(GENRE_GROUPS).toContain("electronic");
    expect(GENRE_GROUPS).toContain("jazz");
    expect(GENRE_GROUPS).toContain("rock");
    expect(GENRE_GROUPS).toContain("pop");
    expect(GENRE_GROUPS).toContain("urban");
    expect(GENRE_GROUPS).toContain("world");
    expect(GENRE_GROUPS.length).toBe(6);
  });

  it("each drum preset has kick, snare, hat, rim", () => {
    GENRE_GROUPS.forEach((group) => {
      const preset = DRUM_PRESETS[group];
      expect(preset.kick).toBeDefined();
      expect(preset.kick.pitchDecay).toBeTypeOf("number");
      expect(preset.kick.octaves).toBeTypeOf("number");
      expect(preset.kick.volume).toBeTypeOf("number");

      expect(preset.snare).toBeDefined();
      expect(preset.snare.noiseType).toBeTypeOf("string");
      expect(preset.snare.decay).toBeTypeOf("number");

      expect(preset.hat).toBeDefined();
      expect(preset.hat.filterFreq).toBeTypeOf("number");

      expect(preset.rim).toBeDefined();
      expect(preset.rim.frequency).toBeTypeOf("number");
    });
  });

  it("each bass preset has required fields", () => {
    const requiredFields = [
      "oscillator", "filterFreq", "filterQ", "subOscGain",
      "attack", "decay", "sustain", "release", "volume",
    ];

    GENRE_GROUPS.forEach((group) => {
      const preset = BASS_PRESETS[group];
      requiredFields.forEach((field) => {
        expect(preset[field]).toBeDefined();
      });
    });
  });

  it("getPresetsForGroup falls back to pop for unknown genre", () => {
    const result = getPresetsForGroup("unknown_genre");
    expect(result.drums).toEqual(DRUM_PRESETS.pop);
    expect(result.bass).toEqual(BASS_PRESETS.pop);
  });

  it("getPresetsForGroup returns correct preset for known genre", () => {
    const result = getPresetsForGroup("jazz");
    expect(result.drums).toEqual(DRUM_PRESETS.jazz);
    expect(result.bass).toEqual(BASS_PRESETS.jazz);
  });

  it("drum volumes are within reasonable dBFS range", () => {
    GENRE_GROUPS.forEach((group) => {
      const preset = DRUM_PRESETS[group];
      expect(preset.kick.volume).toBeGreaterThanOrEqual(-20);
      expect(preset.kick.volume).toBeLessThanOrEqual(6);
      expect(preset.hat.volume).toBeGreaterThanOrEqual(-20);
      expect(preset.hat.volume).toBeLessThanOrEqual(0);
    });
  });
});
