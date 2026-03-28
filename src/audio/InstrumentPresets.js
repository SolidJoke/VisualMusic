/**
 * InstrumentPresets.js — Genre-specific instrument configurations
 *
 * Each preset controls the timbral characteristics of drums and bass
 * to match the sonic identity of a music genre family.
 *
 * @module InstrumentPresets
 */

/**
 * Drum presets by genre group.
 * Keys match brick._group values from bricks.js.
 */
export const DRUM_PRESETS = {
  electronic: {
    kick: { pitchDecay: 0.05, octaves: 6, volume: -2 },
    snare: {
      noiseType: "white",
      membraneFreq: 200,
      membranePitchDecay: 0.01,
      noiseVolume: -10,
      membraneVolume: -14,
      decay: 0.15,
    },
    hat: { filterFreq: 8000, filterType: "highpass", decay: 0.04, volume: -12 },
    rim: { frequency: 800, decay: 0.03, volume: -10 },
  },
  jazz: {
    kick: { pitchDecay: 0.12, octaves: 3, volume: -4 },
    snare: {
      noiseType: "pink",
      membraneFreq: 180,
      membranePitchDecay: 0.02,
      noiseVolume: -14,
      membraneVolume: -16,
      decay: 0.25,
    },
    hat: { filterFreq: 6000, filterType: "highpass", decay: 0.06, volume: -14 },
    rim: { frequency: 1200, decay: 0.02, volume: -8 },
  },
  rock: {
    kick: { pitchDecay: 0.08, octaves: 5, volume: -1 },
    snare: {
      noiseType: "white",
      membraneFreq: 250,
      membranePitchDecay: 0.015,
      noiseVolume: -8,
      membraneVolume: -12,
      decay: 0.2,
    },
    hat: { filterFreq: 7000, filterType: "highpass", decay: 0.05, volume: -10 },
    rim: { frequency: 900, decay: 0.025, volume: -9 },
  },
  pop: {
    kick: { pitchDecay: 0.06, octaves: 5, volume: -2 },
    snare: {
      noiseType: "white",
      membraneFreq: 220,
      membranePitchDecay: 0.012,
      noiseVolume: -9,
      membraneVolume: -13,
      decay: 0.18,
    },
    hat: { filterFreq: 7500, filterType: "highpass", decay: 0.045, volume: -11 },
    rim: { frequency: 1000, decay: 0.025, volume: -9 },
  },
  urban: {
    kick: { pitchDecay: 0.15, octaves: 8, volume: 0 }, // 808-style
    snare: {
      noiseType: "white",
      membraneFreq: 160,
      membranePitchDecay: 0.02,
      noiseVolume: -8,
      membraneVolume: -10,
      decay: 0.3,
    },
    hat: { filterFreq: 9000, filterType: "highpass", decay: 0.03, volume: -12 },
    rim: { frequency: 1100, decay: 0.02, volume: -8 },
  },
  world: {
    kick: { pitchDecay: 0.1, octaves: 4, volume: -3 },
    snare: {
      noiseType: "pink",
      membraneFreq: 200,
      membranePitchDecay: 0.018,
      noiseVolume: -12,
      membraneVolume: -14,
      decay: 0.22,
    },
    hat: { filterFreq: 5500, filterType: "highpass", decay: 0.06, volume: -13 },
    rim: { frequency: 1000, decay: 0.03, volume: -9 },
  },
};

/**
 * Bass synth presets by genre group.
 */
export const BASS_PRESETS = {
  electronic: {
    oscillator: "sawtooth",
    filterFreq: 400,
    filterQ: 4,
    subOscGain: 0.6,
    attack: 0.005,
    decay: 0.12,
    sustain: 0.1,
    release: 0.08,
    volume: -4,
  },
  jazz: {
    oscillator: "sine",
    filterFreq: 600,
    filterQ: 1,
    subOscGain: 0.3,
    attack: 0.03,
    decay: 0.3,
    sustain: 0.4,
    release: 0.3,
    volume: -6,
  },
  rock: {
    oscillator: "square",
    filterFreq: 500,
    filterQ: 2,
    subOscGain: 0.5,
    attack: 0.01,
    decay: 0.15,
    sustain: 0.2,
    release: 0.1,
    volume: -4,
  },
  pop: {
    oscillator: "triangle",
    filterFreq: 550,
    filterQ: 1.5,
    subOscGain: 0.4,
    attack: 0.015,
    decay: 0.2,
    sustain: 0.3,
    release: 0.15,
    volume: -5,
  },
  urban: {
    oscillator: "sine",
    filterFreq: 300,
    filterQ: 5,
    subOscGain: 0.8, // Heavy sub for 808
    attack: 0.01,
    decay: 0.4,
    sustain: 0.0,
    release: 0.3,
    volume: -2,
  },
  world: {
    oscillator: "triangle",
    filterFreq: 500,
    filterQ: 1.5,
    subOscGain: 0.4,
    attack: 0.02,
    decay: 0.2,
    sustain: 0.3,
    release: 0.2,
    volume: -5,
  },
};

/**
 * Piano synth preset (enriched fallback when Sampler isn't loaded).
 */
export const PIANO_PRESET = {
  oscillator: { type: "triangle" },
  envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 1.2 },
  volume: -6,
};

/**
 * Resolve preset for a given genre group, with fallback.
 *
 * @param {'electronic'|'jazz'|'rock'|'pop'|'urban'|'world'} group
 * @returns {{ drums: object, bass: object }}
 */
export function getPresetsForGroup(group) {
  return {
    drums: DRUM_PRESETS[group] || DRUM_PRESETS.pop,
    bass: BASS_PRESETS[group] || BASS_PRESETS.pop,
  };
}

/**
 * List of all supported genre groups.
 */
export const GENRE_GROUPS = Object.keys(DRUM_PRESETS);
