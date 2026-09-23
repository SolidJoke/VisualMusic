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
import { DRUM_PRESETS, BASS_PRESETS, BASS_BASE_VOLUME_DB, PIANO_PRESET } from "./InstrumentPresets";
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
// pianoReverb/guitarReverb exported for the offline measurement harness only
// (VMU-144 phase B, same convention as masterLimiter/guitarFallback above):
// Tone.Reverb generates its impulse response asynchronously (its own
// `.ready` promise), and the harness awaits both before triggering any note,
// so two reverbs generating concurrently cannot race against each other and
// produce a non-deterministic tail. Nothing in the app reads these exports —
// production code never needed to wait on `.ready` because nothing plays a
// note before the whole module (including these two `new Tone.Reverb(...)`
// calls) has finished evaluating, by which point generation is already well
// under way in the background regardless.
export const pianoReverb = new Tone.Reverb({ decay: 1.5, wet: 0.15 }).connect(instrumentVols.piano);
// Chorus is disabled for natural piano sound
const pianoChorus = new Tone.Chorus({ frequency: 0.5, delayTime: 3.5, depth: 0.15, wet: 0.1 }).connect(pianoReverb);

export const guitarReverb = new Tone.Reverb({ decay: 2.0, wet: 0.2 }).connect(instrumentVols.guitar);
const guitarChorus = new Tone.Chorus({ frequency: 2, delayTime: 2.5, depth: 0.3, wet: 0.15 }).connect(guitarReverb);
guitarChorus.start();

// ─── Guitar ──────────────────────────────────────────────────────────

// VMU-144 phase B: no `volume` here before this ticket (found in phase A) —
// this synth inherited Tone's own 0 dB default rather than a decided level.
// GUITAR_FALLBACK_VOLUME_DB is exported so the offline harness's
// "guitar-fallback-note" scenario (offlineRender.js) can be a permanent
// check against it, and so its value is documented in exactly one place.
// Measured (VMU-144 phase B, "guitar-fallback-note" scenario at C3, 0 dB
// default): -25.21 LUFS, 5.14 LU louder than the sampler's now-corrected C3
// (-30.35 LUFS, GUITAR_SAMPLE_GAIN_DB above). -5.1 dB brings it within the
// coordinator's ±1.5 LU of the sampler (brief item 3), not of the fallback's
// own uncorrected number.
// Recomputed 2026-09-23 (deterministic harness, coordinator follow-up):
// forced fallback at C3, 0 dB default, reads -24.76 LUFS; the sampler at C3
// with the recomputed GUITAR_SAMPLE_GAIN_DB above reads -29.83 LUFS.
// -5.1 dB brings the fallback within the coordinator's ±1.5 LU of the
// sampler (brief item 3) — coincides with the pre-determinism value to one
// decimal place, recomputed independently rather than assumed unchanged.
export const GUITAR_FALLBACK_VOLUME_DB = -5.1;
const guitarFallback = new Tone.PolySynth(Tone.FMSynth, {
  volume: GUITAR_FALLBACK_VOLUME_DB,
  harmonicity: 3.0,
  modulationIndex: 10,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 2, sustain: 0.1, release: 2 },
  modulation: { type: "square" },
  modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
}).connect(guitarChorus);
// Exported for the offline measurement harness only (VMU-144 phase B item 3),
// the same convention `masterLimiter` already uses above: the harness needs
// to trigger this voice directly, bypassing `getGuitarSynth()`'s
// sampler-or-fallback choice, to measure the fallback itself regardless of
// sampler load state. Nothing in the app reads this export.
export { guitarFallback };

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

// VMU-144 phase B item 2 — guitar's 13 sampled notes (AudioEngine.js urls
// above), as MIDI numbers, for guitarSampleVelocity's nearest-neighbour
// lookup below. C2 E2 G2 C3 E3 G3 C4 E4 G4 C5 E5 G5 C6.
const GUITAR_SAMPLE_MIDI = [36, 40, 43, 48, 52, 55, 60, 64, 67, 72, 76, 79, 84];

/**
 * Per-sample gain correction, in dB, keyed by MIDI note (one of the 13
 * sampled notes above only). VMU-144 phase B item 2: guitar's raw samples
 * are not equally loud — measured in the phase B relevé
 * (`npm run audio:measure -- --scenario=vmu144-releve-guitar-<note>`, full
 * 13-row table and the piano reference it is computed against in the
 * report). Each value here is pianoLufs(note) - guitarLufs(note): the boost
 * (positive) or cut (negative) so guitar reads within the coordinator's
 * ±1.5 LU of piano on the same note. Single owner of guitar's per-note level
 * (VMU-024) — every other note Tone.Sampler plays (pitch-shifted from one of
 * these 13) inherits its nearest sample's correction via
 * guitarSampleVelocity below, not a second table.
 *
 * Recomputed 2026-09-23 (coordinator follow-up) from a fully deterministic
 * relevé — `scripts/audio_measure.mjs` now seeds `Math.random` before any
 * module loads (mulberry32, HARNESS_RANDOM_SEED), and `offlineRender.js`
 * awaits both reverbs' `.ready` before any scenario plays a note, removing
 * the two sources of run-to-run jitter that affected the first version of
 * this table (confirmed: 5 consecutive `npm run audio:check` runs now read
 * identical LUFS on every VMU-144 line, see the report). The earlier
 * per-note "nudges" (G2, C3, G5, C6, widened for observed variance) are
 * gone — there is no variance left to widen against.
 */
const GUITAR_SAMPLE_GAIN_DB = {
  // C2 is guitar's lowest sample but below guitar's own playable range
  // (E2-C6 = MIDI 40-84, playDictionaryNote's filter above) — MIDI 36 < 40,
  // so a C2 request is always filtered to silence before it would ever reach
  // this table. No correction is possible to measure (relevé: -200 LUFS,
  // filtered) or needed (unreachable). Kept at 0, not omitted, so a future
  // change to the range filter does not silently pick up an unvetted value.
  36: 0, // C2 — unreachable via playDictionaryNote, see above
  40: 15.2, // E2
  43: 15.6, // G2
  48: 5.0, // C3
  52: 10.2, // E3
  55: 5.7, // G3
  60: 14.3, // C4
  64: 15.1, // E4
  67: 18.0, // G4
  72: 7.9, // C5
  76: 18.8, // E5
  79: 22.6, // G5
  84: 16.7, // C6
};

/**
 * Which of guitar's 13 sampled notes Tone.Sampler will actually use to play
 * `midi` — the same rule as Tone's own private `Sampler._findClosest`
 * (node_modules/tone/Tone/instrument/Sampler.ts): expanding search radius,
 * checking the interval above before below at each step, so an exact tie
 * (a note exactly between two samples) resolves to the higher one. Not
 * calling `_findClosest` itself: it is a private method on the sampler
 * instance, not exported, and this needs to run before the sampler has
 * necessarily loaded.
 * @param {number} midi
 * @returns {number} one of GUITAR_SAMPLE_MIDI
 */
function nearestGuitarSampleMidi(midi) {
  for (let interval = 0; interval < 96; interval++) {
    if (GUITAR_SAMPLE_MIDI.includes(midi + interval)) return midi + interval;
    if (GUITAR_SAMPLE_MIDI.includes(midi - interval)) return midi - interval;
  }
  return GUITAR_SAMPLE_MIDI[0]; // unreachable for any note in guitar's filtered range (E2-C6, playDictionaryNote)
}

/**
 * Linear gain to pass as `triggerAttackRelease`'s velocity for `noteName`,
 * from its nearest sample's correction (GUITAR_SAMPLE_GAIN_DB above). dB to
 * linear amplitude: 10^(db/20) — not clamped to <=1 here; see this
 * function's call site (playDictionaryNote) for why an amplifying velocity
 * is safe on this path.
 * @param {string} noteName
 * @returns {number}
 */
function guitarSampleVelocity(noteName) {
  const midi = Tone.Frequency(noteName).toMidi();
  const nearest = nearestGuitarSampleMidi(midi);
  const correctionDb = GUITAR_SAMPLE_GAIN_DB[nearest] ?? 0;
  return Math.pow(10, correctionDb / 20);
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
    // bassSynthDictionary is MonoSynth; we only play the root/lowest note of a chord
    // Sort array by midi value to find the lowest note
    const lowestNote = filteredNotes.sort((a,b) => Tone.Frequency(a).toMidi() - Tone.Frequency(b).toMidi())[0];
    // VMU-144 phase B: this used to trigger `bassSynth`, the same instance
    // Studio's sequencer plays through and `applyGenrePreset` mutates. Phase B
    // measurement (2026-09-22): after applying the jazz preset, this same C2
    // note measured ~9 LU *louder* in Dictionary — not from the 2 dB `volume`
    // difference, but from jazz's much longer envelope sustain/release
    // changing how loud the held note is throughout its 1 s duration. A
    // volume-only compensation cannot fix that; only a voice `applyGenrePreset`
    // never touches can. `bassSynthDictionary` below is built once, fixed,
    // and is never passed to `applyGenrePreset` — Studio's own `bassSynth`
    // (useSequencer.js) is untouched, so nothing about the Studio mixer or
    // its genre-dependent bass timbre changes (VMU-025, tranche T2, out of
    // scope here).
    bassSynthDictionary.triggerAttackRelease(lowestNote, duration, time);
  } else if (instrument === "guitar") {
    const gSynth = getGuitarSynth();
    if (!time && gSynth.releaseAll) gSynth.releaseAll();
    if (gSynth === guitarSampler) {
      // VMU-144 phase B item 2: guitar's 13 raw samples (AudioEngine.js
      // urls, initGuitarSampler) are not equally loud — measured in the
      // phase B relevé, see GUITAR_SAMPLE_GAIN_DB below for the source and
      // the numbers. Tone.Sampler's `velocity` (triggerAttackRelease's 4th
      // arg) scales that one voice's output gain directly — a plain
      // GainNode.gain value, not clamped to <=1 (OneShotSource._startGain,
      // node_modules/tone/Tone/source/OneShotSource.ts) — so it can boost a
      // quiet sample as well as cut a loud one. It is a single scalar per
      // call, not one per note, so a chord's notes are triggered one at a
      // time here rather than as one array call, each at the same `time`.
      filteredNotes.forEach((n) => {
        gSynth.triggerAttackRelease(n, duration, time, guitarSampleVelocity(n));
      });
    } else {
      gSynth.triggerAttackRelease(filteredNotes, duration, time);
    }
  } else {
    const pSynth = getPianoSynth();
    if (!time && pSynth.releaseAll) pSynth.releaseAll();
    pSynth.triggerAttackRelease(filteredNotes, duration, time);
  }
}

// ─── Bass ────────────────────────────────────────────────────────────

let currentBassPreset = BASS_PRESETS.electronic;

/**
 * One `Tone.MonoSynth` builder, so Studio's genre-reactive `bassSynth` and
 * Dictionary's fixed `bassSynthDictionary` (VMU-144 phase B) are built from
 * identical code and cannot drift apart in shape, only in the `volumeDb`
 * and `preset` each is given.
 * @param {number} volumeDb
 * @param {object} preset one of BASS_PRESETS's entries (timbre only; its
 *   volumeOffsetDb is not read here — callers pass the resolved volumeDb)
 */
function buildMonoBassSynth(volumeDb, preset) {
  return new Tone.MonoSynth({
    volume: volumeDb,
    oscillator: { type: preset.oscillator },
    envelope: {
      attack: preset.attack,
      decay: preset.decay,
      sustain: preset.sustain,
      release: preset.release,
    },
    filterEnvelope: {
      attack: preset.attack,
      decay: preset.decay,
      sustain: preset.sustain,
      baseFrequency: preset.filterFreq,
      octaves: 4,
    },
  }).connect(instrumentVols.bass);
}

// Studio's bass voice (useSequencer.js). `applyGenrePreset` below mutates its
// volume *and* timbre on every genre change — unchanged by VMU-144, per the
// brief ("ne touche pas au niveau affiché / appliqué du mixeur du Studio",
// VMU-025 tranche T2). BASS_BASE_VOLUME_DB === currentBassPreset's own
// volumeOffsetDb (0) resolved against it, i.e. exactly -4 dB, the same
// number this synth has always been constructed with.
export const bassSynth = buildMonoBassSynth(
  BASS_BASE_VOLUME_DB + currentBassPreset.volumeOffsetDb,
  currentBassPreset,
);

// Dictionary's bass voice (playDictionaryNote below). VMU-144 phase B item 4:
// "un gain de lecture fixe, indépendant du genre" — built once, at
// BASS_BASE_VOLUME_DB and the `electronic` preset's timbre, and never handed
// to applyGenrePreset, so nothing about it ever changes after this line runs.
// A separate instance rather than a runtime volume-compensation on the
// shared `bassSynth` because compensation would only fix the `volume`
// parameter: measured 2026-09-22, applying the jazz preset changed this same
// note's loudness by ~9 LU, almost all of it from jazz's envelope
// (sustain 0.4 vs electronic's 0.1), which no amount of volume compensation
// corrects.
export const bassSynthDictionary = buildMonoBassSynth(BASS_BASE_VOLUME_DB, BASS_PRESETS.electronic);

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

  // Update bass — Studio's bassSynth only (bassSynthDictionary is never
  // passed to applyGenrePreset, VMU-144 phase B). volumeOffsetDb is relative
  // to BASS_BASE_VOLUME_DB (InstrumentPresets.js); resolving it here
  // reproduces exactly the absolute dB each preset used before this ticket
  // (checked by InstrumentPresets.test.js), so Studio's bass level per genre
  // is unchanged.
  bassSynth.set({
    volume: BASS_BASE_VOLUME_DB + bassP.volumeOffsetDb,
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
