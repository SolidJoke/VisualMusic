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
 * Bass's one fixed, genre-independent reference gain (VMU-144 phase B,
 * brief item 4: "un gain de lecture fixe, indépendant du genre"). Equal to
 * the `electronic` preset's former absolute `volume` (-4 dB) — the value the
 * app has shipped with by default since `bassSynth` was first constructed —
 * so this change does not, by itself, move anything audible; it is the
 * single owner every genre preset's `volumeOffsetDb` below is now relative
 * to, and what `AudioEngine.js`'s Dictionary-only bass voice
 * (`bassSynthDictionary`) is fixed at, forever, regardless of genre.
 */
export const BASS_BASE_VOLUME_DB = -4;

/**
 * Bass synth presets by genre group.
 *
 * `volumeOffsetDb` (VMU-144 phase B) is relative to BASS_BASE_VOLUME_DB, not
 * an absolute level — applied only by `applyGenrePreset` (AudioEngine.js),
 * itself only ever called while `appMode === "studio"` (AppDesktop.jsx,
 * useSequencer.js). Each value below reproduces exactly the absolute dB this
 * preset used before this ticket (BASS_BASE_VOLUME_DB + offset === the old
 * `volume`), checked by InstrumentPresets.test.js so Studio's own bass level
 * per genre cannot silently drift — this ticket does not touch it
 * (VMU-025, tranche T2).
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
    volumeOffsetDb: 0, // -4 dB absolute, unchanged
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
    volumeOffsetDb: -2, // -6 dB absolute, unchanged
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
    volumeOffsetDb: 0, // -4 dB absolute, unchanged
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
    volumeOffsetDb: -1, // -5 dB absolute, unchanged
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
    volumeOffsetDb: 2, // -2 dB absolute, unchanged
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
    volumeOffsetDb: -1, // -5 dB absolute, unchanged
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
 * The mixer's levels on a cold start, one setting per mode (VMU-171), in dB
 * per `AudioEngine.instrumentVols` node — what each mode's mixer shows, what
 * useSequencer applies to the nodes while that mode is active (T2 /
 * VMU-153), and what the offline harness renders with (`offlineRender.js`:
 * STUDIO_DEFAULTS for the Studio loop, DICTIONARY_DEFAULTS for the
 * Dictionary's single notes and chords). One definition, so the three cannot
 * drift apart again; before T2 the app displayed -3 / -5 / -8 / -6 while its
 * nodes stayed at 0 dB.
 *
 * Values (Gabriel, 2026-10-03, with headroom): the balance he asked for —
 * bass 3 dB and guitar 1.5 dB above the piano, which he found too quiet
 * against it, and drums level with the piano, which he finds balanced —
 * reached by lowering the rest (VMU-024 gain staging), not by raising bass
 * and guitar. The first attempt (0/0/0/+3/0/+1.5) pushed the chain input of
 * the default progression to +2.69 dBFS, 185 samples above 0 dBFS, 8 large
 * sample jumps (none before). No fader above 0 dB by default; master volume
 * unchanged. Same starting point in both modes; his own slider values are
 * meant to replace these.
 */
const GABRIEL_START_LEVELS = { kick: -3, snare: -3, hat: -3, bass: 0, piano: -3, guitar: -1.5 };

export const DEFAULT_MIXER_LEVELS = Object.freeze({
  studio: Object.freeze({ ...GABRIEL_START_LEVELS }),
  dictionary: Object.freeze({ ...GABRIEL_START_LEVELS }),
});

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
