/**
 * AudioEngine.js — Centralized audio synth management for VisualMusic
 *
 * All synths route through a Hard Limiter (-1 dBFS) before reaching
 * Tone.Destination. This is a non-negotiable safety guard.
 *
 * Architecture:
 * - Piano: Tone.Sampler (Salamander samples) with PolySynth fallback
 * - Bass: MonoSynth with sub-oscillator, genre-configurable
 * - Drums: Layered synths (Membrane + Noise for snare, etc.)
 * - All synths → limiter → destination
 *
 * @module AudioEngine
 */
import * as Tone from "tone";
import { DRUM_PRESETS, BASS_PRESETS, PIANO_PRESET } from "./InstrumentPresets";

// ─── Safety & Analysis: Hard Limiter and FFT ──────────────────────────
const limiter = new Tone.Limiter(-1);
const masterAnalyser = new Tone.Analyser({
  type: "fft",
  size: 64, // 64 bins for a chunky, sleek visualizer
  smoothing: 0.8,
});
limiter.chain(masterAnalyser, Tone.Destination);

// ─── Mixing Nodes ────────────────────────────────────────────────────
export const instrumentVols = {
  piano: new Tone.Volume(0).connect(limiter),
  bass: new Tone.Volume(0).connect(limiter),
  kick: new Tone.Volume(0).connect(limiter),
  snare: new Tone.Volume(0).connect(limiter),
  hat: new Tone.Volume(0).connect(limiter),
  guitar: new Tone.Volume(0).connect(limiter)
};

/**
 * Set the volume (in dB) for a specific instrument.
 * range: roughly -30 to 6
 */
export function setInstrumentVolume(instrument, dbValue) {
  if (instrumentVols[instrument]) {
    instrumentVols[instrument].volume.value = dbValue;
  }
}

// ─── Effects Bus ─────────────────────────────────────────────────────
const pianoReverb = new Tone.Reverb({ decay: 1.5, wet: 0.15 }).connect(instrumentVols.piano);
// Chorus is disabled for natural piano sound
const pianoChorus = new Tone.Chorus({ frequency: 0.5, delayTime: 3.5, depth: 0.15, wet: 0.1 }).connect(pianoReverb);

const guitarReverb = new Tone.Reverb({ decay: 2.0, wet: 0.2 }).connect(instrumentVols.guitar);
const guitarChorus = new Tone.Chorus({ frequency: 2, delayTime: 2.5, depth: 0.3, wet: 0.15 }).connect(guitarReverb);
guitarChorus.start();

// ─── Guitar ──────────────────────────────────────────────────────────

const guitarFallback = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity: 3.0,
  modulationIndex: 10,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 2, sustain: 0.1, release: 2 },
  modulation: { type: "square" },
  modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
}).connect(guitarChorus);

let guitarSampler = null;
let guitarSamplerReady = false;

export function initGuitarSampler(onReady) {
  if (guitarSampler) return;

  try {
    guitarSampler = new Tone.Sampler({
      urls: {
        C2: "C2.mp3", E2: "E2.mp3", G2: "G2.mp3",
        C3: "C3.mp3", E3: "E3.mp3", G3: "G3.mp3",
        C4: "C4.mp3", E4: "E4.mp3", G4: "G4.mp3",
        C5: "C5.mp3", E5: "E5.mp3", G5: "G5.mp3",
        C6: "C6.mp3",
      },
      baseUrl: "/samples/guitar/",
      volume: -2,
      onload: () => {
        guitarSamplerReady = true;
        console.log("[AudioEngine] Guitar Sampler loaded ✓");
        if (onReady) onReady();
      },
      onerror: (err) => {
        console.warn("[AudioEngine] Guitar Sampler failed to load, using fallback:", err);
        guitarSamplerReady = false;
        if (onReady) onReady();
      },
    }).connect(guitarReverb);
  } catch (err) {
    console.warn("[AudioEngine] Guitar Sampler init error, using fallback:", err);
  }
}

export function getGuitarSynth() {
  return guitarSamplerReady && guitarSampler ? guitarSampler : guitarFallback;
}


// ─── Piano ───────────────────────────────────────────────────────────

// Fallback synth: enriched PolySynth with chorus + reverb
const pianoFallback = new Tone.PolySynth(Tone.Synth, {
  oscillator: PIANO_PRESET.oscillator,
  envelope: PIANO_PRESET.envelope,
  volume: PIANO_PRESET.volume,
}).connect(pianoChorus);

// Sampler with Salamander Grand Piano samples (lazy-loaded)
let pianoSampler = null;
let pianoSamplerReady = false;

/**
 * Initialize the piano sampler. Call once after user gesture (Tone.start).
 * Falls back to PolySynth if loading fails.
 */
export function initPianoSampler(onReady) {
  if (pianoSampler) return; // already initialized

  const baseUrl = "https://nbrosowsky.github.io/tonern-piano/Salamander/";

  try {
    pianoSampler = new Tone.Sampler({
      urls: {
        A1: "A1v10.mp3",
        A2: "A2v10.mp3",
        A3: "A3v10.mp3",
        A4: "A4v10.mp3",
        A5: "A5v10.mp3",
        A6: "A6v10.mp3",
        C2: "C2v10.mp3",
        C3: "C3v10.mp3",
        C4: "C4v10.mp3",
        C5: "C5v10.mp3",
        C6: "C6v10.mp3",
        "D#2": "Ds2v10.mp3",
        "D#3": "Ds3v10.mp3",
        "D#4": "Ds4v10.mp3",
        "D#5": "Ds5v10.mp3",
        "F#2": "Fs2v10.mp3",
        "F#3": "Fs3v10.mp3",
        "F#4": "Fs4v10.mp3",
        "F#5": "Fs5v10.mp3",
      },
      baseUrl,
      volume: -3,
      onload: () => {
        pianoSamplerReady = true;
        console.log("[AudioEngine] Piano Sampler loaded ✓");
        if (onReady) onReady();
      },
      onerror: (err) => {
        console.warn("[AudioEngine] Piano Sampler failed to load, using fallback:", err);
        pianoSamplerReady = false;
        if (onReady) onReady(); // Treat as "ready" via fallback
      },
    }).connect(pianoReverb);
  } catch (err) {
    console.warn("[AudioEngine] Piano Sampler init error, using fallback:", err);
  }
}

/**
 * The piano synth to use (sampler if ready, else fallback).
 */
export function getPianoSynth() {
  return pianoSamplerReady && pianoSampler ? pianoSampler : pianoFallback;
}

// Legacy export alias — used by App.jsx chord/scale playback
export const chordSynth = pianoFallback;

// ─── Drums ───────────────────────────────────────────────────────────

let currentDrumPreset = DRUM_PRESETS.electronic;

// Kick: MembraneSynth with pitch envelope
export const kickSynth = new Tone.MembraneSynth({
  pitchDecay: currentDrumPreset.kick.pitchDecay,
  octaves: currentDrumPreset.kick.octaves,
  volume: currentDrumPreset.kick.volume,
}).connect(instrumentVols.kick);

// Snare: layered NoiseSynth + MembraneSynth for body+snap
const snareNoise = new Tone.NoiseSynth({
  volume: currentDrumPreset.snare.noiseVolume,
  noise: { type: currentDrumPreset.snare.noiseType },
  envelope: { attack: 0.003, decay: currentDrumPreset.snare.decay, sustain: 0 },
}).connect(instrumentVols.snare);

const snareBody = new Tone.MembraneSynth({
  pitchDecay: currentDrumPreset.snare.membranePitchDecay,
  octaves: 3,
  volume: currentDrumPreset.snare.membraneVolume,
}).connect(instrumentVols.snare);

// Combined snare trigger
export const snareSynth = {
  triggerAttackRelease: (duration, time, velocity) => {
    snareNoise.triggerAttackRelease(duration, time, velocity);
    snareBody.triggerAttackRelease(
      currentDrumPreset.snare.membraneFreq || 200,
      duration,
      time,
      velocity * 0.7,
    );
  },
};

// Hi-hat: NoiseSynth with configurable filter
const hatFilter = new Tone.Filter(
  currentDrumPreset.hat.filterFreq,
  currentDrumPreset.hat.filterType,
).connect(instrumentVols.hat);

export const hatSynth = new Tone.NoiseSynth({
  volume: currentDrumPreset.hat.volume,
  noise: { type: "white" },
  envelope: {
    attack: 0.001,
    decay: currentDrumPreset.hat.decay,
    sustain: 0,
    release: 0.01,
  },
}).connect(hatFilter);

// ─── Dictionary & Fretboard Playback Router ──────────────────────────

/**
 * Plays a note or chord using the selected instrument, enforcing realistic physical ranges.
 * @param {'piano'|'guitar'|'bass'} instrument 
 * @param {string|string[]} notes 
 * @param {string|number} duration 
 * @param {number} [time]
 */
export function playDictionaryNote(instrument, notes, duration, time) {
  const noteArray = Array.isArray(notes) ? notes : [notes];

  const filteredNotes = noteArray.filter(noteName => {
    try {
      const midi = Tone.Frequency(noteName).toMidi();
      if (instrument === "bass") {
        // Bass range: E1 (28) to G4 (67)
        return midi >= 28 && midi <= 67;
      } else if (instrument === "guitar") {
        // Guitar range: E2 (40) to C6 (84)
        return midi >= 40 && midi <= 84;
      } else if (instrument === "piano") {
        // Piano range: A0 (21) to C8 (108)
        return midi >= 21 && midi <= 108;
      }
      return true;
    } catch {
      return false; // Invalid note format
    }
  });

  if (filteredNotes.length === 0) return; // Physically impossible note = silence

  if (instrument === "bass") {
    // bassSynth is MonoSynth; we only play the root/lowest note of a chord
    // Sort array by midi value to find the lowest note
    const lowestNote = filteredNotes.sort((a,b) => Tone.Frequency(a).toMidi() - Tone.Frequency(b).toMidi())[0];
    bassSynth.triggerAttackRelease(lowestNote, duration, time);
  } else if (instrument === "guitar") {
    getGuitarSynth().triggerAttackRelease(filteredNotes, duration, time);
  } else {
    getPianoSynth().triggerAttackRelease(filteredNotes, duration, time);
  }
}

// ─── Bass ────────────────────────────────────────────────────────────

let currentBassPreset = BASS_PRESETS.electronic;

export const bassSynth = new Tone.MonoSynth({
  volume: currentBassPreset.volume,
  oscillator: { type: currentBassPreset.oscillator },
  envelope: {
    attack: currentBassPreset.attack,
    decay: currentBassPreset.decay,
    sustain: currentBassPreset.sustain,
    release: currentBassPreset.release,
  },
  filterEnvelope: {
    attack: currentBassPreset.attack,
    decay: currentBassPreset.decay,
    sustain: currentBassPreset.sustain,
    baseFrequency: currentBassPreset.filterFreq,
    octaves: 4,
  },
}).connect(instrumentVols.bass);

// ─── Genre Switching ─────────────────────────────────────────────────

/**
 * Apply genre-specific presets to all drum and bass synths.
 *
 * @param {'electronic'|'jazz'|'rock'|'pop'|'urban'|'world'} group
 */
export function applyGenrePreset(group) {
  const drumP = DRUM_PRESETS[group] || DRUM_PRESETS.pop;
  const bassP = BASS_PRESETS[group] || BASS_PRESETS.pop;

  currentDrumPreset = drumP;
  currentBassPreset = bassP;

  // Update kick
  kickSynth.set({
    pitchDecay: drumP.kick.pitchDecay,
    octaves: drumP.kick.octaves,
    volume: drumP.kick.volume,
  });

  // Update snare noise
  snareNoise.set({
    volume: drumP.snare.noiseVolume,
    noise: { type: drumP.snare.noiseType },
    envelope: { decay: drumP.snare.decay },
  });
  snareBody.set({
    pitchDecay: drumP.snare.membranePitchDecay,
    volume: drumP.snare.membraneVolume,
  });

  // Update hat
  hatFilter.set({ frequency: drumP.hat.filterFreq });
  hatSynth.set({
    volume: drumP.hat.volume,
    envelope: { decay: drumP.hat.decay },
  });

  // Update bass
  bassSynth.set({
    volume: bassP.volume,
    oscillator: { type: bassP.oscillator },
    envelope: {
      attack: bassP.attack,
      decay: bassP.decay,
      sustain: bassP.sustain,
      release: bassP.release,
    },
    filterEnvelope: {
      baseFrequency: bassP.filterFreq,
    },
  });
}

// ─── Exports ─────────────────────────────────────────────────────────
export { limiter, masterAnalyser };
