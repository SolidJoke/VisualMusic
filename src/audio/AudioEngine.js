/**
 * AudioEngine.js — Centralized audio synth management for VisualMusic
 *
 * All synths route through a real peak limiter (~-1 dBFS ceiling) before
 * reaching Tone.Destination. This is a non-negotiable safety guard: it must
 * cap loud signals and must never make a quiet signal louder.
 *
 * Architecture:
 * - Piano: Tone.Sampler (Salamander samples, served from /samples/piano/)
 *   with PolySynth fallback
 * - Bass: MonoSynth with sub-oscillator, genre-configurable
 * - Drums: Layered synths (Membrane + Noise for snare, etc.)
 * - All synths → limiter → destination
 *
 * @module AudioEngine
 */
import * as Tone from "tone";
import { DRUM_PRESETS, BASS_PRESETS, PIANO_PRESET } from "./InstrumentPresets";
import { log } from "../utils/debug";

// ─── Safety & Analysis: Hard Limiter and FFT ──────────────────────────
// VMU-020 — this used to be a `Tone.Compressor` named `masterLimiter` and
// documented above as a brickwall limiter, which it was not: threshold -6 dB,
// ratio 20:1, attack 1 ms, release 100 ms, knee 3 — a slow-recovering
// compressor that pumped on every kick, not a ceiling.
//
// A real limiter has two properties: it never makes a quiet signal louder,
// and it never lets a loud signal through above its ceiling. One node cannot
// cheaply guarantee both on top of the browser's native
// `DynamicsCompressorNode` (which both `Tone.Compressor` and `Tone.Limiter`
// wrap), so this is two stages, each responsible for one property, both
// measured with the VMU-026 harness (2026-09-16):
//
// 1. `limiterCompressor` + `outputTrim` — gentle, mostly-transparent gain
//    reduction for material that gets loud but not extreme, so ordinary
//    playback is not hard-clipped every time a chord peaks. Chrome's
//    `DynamicsCompressorNode` applies a small *level-independent* gain even
//    on a signal 39 dB below threshold, where no compression can occur:
//    +0.03 dB for these settings (`npm run audio:measure --
//    --scenario=output-link-probe-quiet`). `outputTrim` cancels it with
//    margin, so this stage alone never amplifies.
// 2. `outputCeiling` — a `Tone.WaveShaper` hard-clamped to CEILING_LINEAR
//    (-1 dBFS). Unlike the compressor, this is a static function of the
//    instantaneous sample, not an envelope follower with attack/release: it
//    cannot overshoot, however extreme or sudden the input. Needed because
//    stage 1 alone does not: the harness's own "output-link-probe" scenario
//    (`src/audio/measure/offlineRender.js`) takes an arbitrary `levelDb`, and
//    at +12 dBFS — well beyond the two levels the shipped checks use — this
//    stage alone rendered a peak of +11.06 dBFS with 37457 of 52920 samples
//    clipped, confirmed with and without stage 2 in the chain. A wide, gentle
//    knee (Tone.Limiter's default, kept for stage 1 precisely
//    because it is what makes the residual gain above small enough to trim)
//    barely engages on a single sustained tone; a narrow/hard knee tuned to
//    engage harder was tried and made the residual static gain worse instead
//    (+0.5 to +1.2 dB at -40 dBFS, failing property 1). Stage 2 is what
//    "plafonne, n'amplifie jamais" actually requires, unconditionally; stage 1
//    is the "compression, named as such" the ticket allows on top of it.
const limiterCompressor = new Tone.Limiter(-1);
const outputTrim = new Tone.Volume(-0.1);

/** -1 dBFS as a linear amplitude, the hard ceiling `outputCeiling` clamps to. */
const CEILING_LINEAR = Math.pow(10, -1 / 20);
const outputCeiling = new Tone.WaveShaper(
  (x) => Math.max(-CEILING_LINEAR, Math.min(CEILING_LINEAR, x)),
  8192
);

limiterCompressor.connect(outputTrim);
outputTrim.connect(outputCeiling);

// Exported for the offline measurement harness (VMU-026) only: it taps this
// node's output to measure how much the last link of the chain changes gain,
// which is the number VMU-020 and VMU-024 are about. Nothing in the app reads
// it. The alternative was for the harness to rebuild a mirror of this node,
// which would have measured the mirror settings instead of these ones.
export const masterLimiter = outputCeiling;

export const masterAnalyser = new Tone.Analyser({
  type: "fft",
  size: 64, // 64 bins for a chunky, sleek visualizer
});

// ─── Mixing Nodes ────────────────────────────────────────────────────
export const instrumentVols = {
  piano: new Tone.Volume(0).connect(masterAnalyser),
  bass: new Tone.Volume(0).connect(masterAnalyser),
  kick: new Tone.Volume(0).connect(masterAnalyser),
  snare: new Tone.Volume(0).connect(masterAnalyser),
  hat: new Tone.Volume(0).connect(masterAnalyser),
  guitar: new Tone.Volume(0).connect(masterAnalyser)
};

/**
 * Set the volume (in dB) for a specific instrument.
 * range: roughly -30 to 6
 */
export function setInstrumentVolume(instrument, dbValue) {
  if (instrumentVols[instrument]) {
    instrumentVols[instrument].volume.rampTo(dbValue, 0.05);
  }
}

/**
 * Sets the master BPM of the audio engine transport.
 * @param {number} bpm - The BPM to set
 * @returns {void}
 */
export function setBpm(bpm) {
  Tone.Transport.bpm.value = bpm;
}

/**
 * Note on Tone.js Lazy Loading:
 * Full lazy loading of the Tone.js module is not easily applicable here
 * because Tone objects (like Tone.Compressor, Tone.Analyser, Synths, etc.)
 * are instantiated at the module level immediately on load.
 * Refactoring this to be entirely lazy-loaded would require non-trivial
 * structural changes across more than 5 files to resolve interdependencies.
 *
 * Instead, we use `initAudio()` below to asynchronously unlock the
 * Web Audio Context via `Tone.start()` at the first interaction.
 */
export function preloadSamplers() {
  // Fetching and decoding need no user gesture: decodeAudioData resolves on a
  // suspended AudioContext (measured 2026-09-12 — 19 files, 1361 kB, 73 ms to
  // decode, context state never leaves "suspended"). Starting here, at mount,
  // means the buffers are ready by the time anything is clicked. Left to
  // initAudio() alone, the first note fired before onload and got the fallback.
  initPianoSampler();
  initGuitarSampler();
}

export async function initAudio() {
  await Tone.start();
  Tone.context.lookAhead = 0.1; // 100ms buffer — réduit les glitches sous charge CPU
  // Bring the samplers up here rather than in the sequencer only. Every audible
  // interaction funnels through this call (useAudioScheduler.ensureAudioReady),
  // so initialising elsewhere left the Dictionary, the fretboard and single
  // notes permanently on the PolySynth fallback. Both inits are idempotent.
  initPianoSampler();
  initGuitarSampler();
  return Tone;
}

/**
 * Sets the master output volume in decibels.
 * @param {number} vol - Volume in dB
 * @returns {void}
 */
export function setMasterVolume(vol) {
  // Still the deprecated Tone.Destination export, deliberately: useSequencer
  // ramps the same property the same way, and the offline harness never calls
  // this. Migrating both to getDestination() belongs with VMU-025, which is
  // about giving master volume a single owner.
  Tone.Destination.volume.rampTo(vol, 0.05);
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
/** Loading has finished, successfully or not — a late listener fires immediately. */
let guitarLoadSettled = false;
/** @type {Function[]} listeners queued while loading is in flight */
const guitarReadyCallbacks = [];

/** Drains the queued listeners exactly once, whatever the outcome. */
function settleGuitarLoad() {
  guitarLoadSettled = true;
  while (guitarReadyCallbacks.length) {
    const cb = guitarReadyCallbacks.shift();
    if (cb) cb();
  }
}

/**
 * Initializes the guitar sampler.
 * @param {Function} [onReady] - Callback function executed when sampler is ready or fails
 * @returns {void}
 */
export function initGuitarSampler(onReady) {
  if (guitarLoadSettled) {
    if (onReady) onReady();
    return;
  }
  if (onReady) guitarReadyCallbacks.push(onReady);
  if (guitarSampler) return; // construction already in flight; callback queued above

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
        log('audio', 'Guitar Sampler loaded ✓');
        settleGuitarLoad();
      },
      onerror: (err) => {
        console.warn("[AudioEngine] Guitar Sampler failed to load, using fallback:", err);
        guitarSamplerReady = false;
        settleGuitarLoad();
      },
    }).connect(guitarReverb);
  } catch (err) {
    console.warn("[AudioEngine] Guitar Sampler init error, using fallback:", err);
  }
}

/**
 * Returns the currently active guitar synth (sampler if ready, otherwise fallback).
 * @returns {Object} A Tone.js synth or sampler instance
 */
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
/** Loading has finished, successfully or not — a late listener fires immediately. */
let pianoLoadSettled = false;
/** @type {Function[]} listeners queued while loading is in flight */
const pianoReadyCallbacks = [];

/** Drains the queued listeners exactly once, whatever the outcome. */
function settlePianoLoad() {
  pianoLoadSettled = true;
  while (pianoReadyCallbacks.length) {
    const cb = pianoReadyCallbacks.shift();
    if (cb) cb();
  }
}

/**
 * Initialize the piano sampler. Call once after user gesture (Tone.start).
 * Falls back to PolySynth if loading fails.
 */
export function initPianoSampler(onReady) {
  if (pianoLoadSettled) {
    if (onReady) onReady();
    return;
  }
  if (onReady) pianoReadyCallbacks.push(onReady);
  if (pianoSampler) return; // construction already in flight; callback queued above

  // Salamander Grand Piano, by Alexander Holm — CC BY 3.0.
  // Served from this origin: the previous third-party host
  // (nbrosowsky.github.io) answers 404, and Tone.js reports that through
  // `onerror`, which silently switched every user to the PolySynth fallback.
  // Local files also get the one-year immutable cache of netlify.toml.
  const baseUrl = "/samples/piano/";

  try {
    pianoSampler = new Tone.Sampler({
      urls: {
        A1: "A1.mp3",
        A2: "A2.mp3",
        A3: "A3.mp3",
        A4: "A4.mp3",
        A5: "A5.mp3",
        A6: "A6.mp3",
        C2: "C2.mp3",
        C3: "C3.mp3",
        C4: "C4.mp3",
        C5: "C5.mp3",
        C6: "C6.mp3",
        "D#2": "Ds2.mp3",
        "D#3": "Ds3.mp3",
        "D#4": "Ds4.mp3",
        "D#5": "Ds5.mp3",
        "F#2": "Fs2.mp3",
        "F#3": "Fs3.mp3",
        "F#4": "Fs4.mp3",
        "F#5": "Fs5.mp3",
      },
      baseUrl,
      volume: -3,
      onload: () => {
        pianoSamplerReady = true;
        log('audio', 'Piano Sampler loaded ✓');
        settlePianoLoad();
      },
      onerror: (err) => {
        console.warn("[AudioEngine] Piano Sampler failed to load, using fallback:", err);
        pianoSamplerReady = false;
        settlePianoLoad(); // Treat as "ready" via fallback
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
    const gSynth = getGuitarSynth();
    if (!time && gSynth.releaseAll) gSynth.releaseAll();
    gSynth.triggerAttackRelease(filteredNotes, duration, time);
  } else {
    const pSynth = getPianoSynth();
    if (!time && pSynth.releaseAll) pSynth.releaseAll();
    pSynth.triggerAttackRelease(filteredNotes, duration, time);
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
 * @param {string} group - une cle de DRUM_PRESETS/BASS_PRESETS ; inconnue -> preset 'pop'
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

masterAnalyser.connect(limiterCompressor);
// getDestination(), not the deprecated Tone.Destination export. That export is
// `getContext().destination` evaluated once, when Tone is first imported, so it
// is a snapshot of whichever context existed at that moment. In the app the two
// are the same object. Under an injected context — which is how the VMU-026
// harness renders this graph offline — the snapshot belongs to a foreign
// context, and Web Audio refuses the connection with InvalidAccessError,
// aborting this module's evaluation. One line, and it is the only production
// change the harness needs.
masterLimiter.connect(Tone.getDestination());

// ─── Exports ─────────────────────────────────────────────────────────
