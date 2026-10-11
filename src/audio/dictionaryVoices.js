// @ts-check
/**
 * Voices — what one Dictionary note put into the audio graph, and how to take
 * it back (VMU-187).
 *
 * Gabriel, 2026-10-10: "Si on appuie 2x sur le bouton lecture d'un instrument
 * (exemple guitare), alors on lance 2x la lecture de la gamme: il faudrait
 * arreter la lecture de la premiere lecture au moment de lancer la lecture de
 * la seconde."
 *
 * A scale is scheduled whole, up front (useDictionaryPlayback.js: one
 * playDictionaryNote(..., time) per note, each at Tone.now() + i * step). The
 * playback session token (useAudioScheduler) is read by the DISPLAY callbacks
 * only, so a second press left every note of the first scale in the audio
 * graph, and a second scale on top of them. Chords and single notes had the
 * same hole, for a shorter time (a 2n): the `releaseAll()` the engine calls
 * before them finds nothing to release, because Tone.Sampler drops a note from
 * its map of active sources the moment that note's release is scheduled, and
 * `triggerAttackRelease` schedules it at once.
 *
 * So the engine hands each note back as a VOICE — `{ stop(at) }` — and the
 * hook remembers the voices of the playback it started; the next playback
 * stops them all, at the same instant, before it schedules anything. This is
 * deliberately NOT done inside `playDictionaryNote`: the Studio's sequencer
 * calls it too (playStep.js, for the piano), and nothing the Studio schedules
 * may be taken back by a Dictionary button. Only what the Dictionary hook
 * itself played is remembered.
 *
 * A voice's `stop(at)` leaves what already sounds a short fade (the sampler's
 * own release, the synth's envelope release) and removes what has not started
 * yet. Each engine has its own way of doing that:
 *
 *  - Tone.Sampler (piano, guitar): one ToneBufferSource per note. The sampler
 *    keeps no handle on it once the release is scheduled, so the source is
 *    taken right after `triggerAttack` from the sampler's private
 *    `_activeSources` map (Tone 15, Sampler.ts) — the one use of a private
 *    name in the engine, guarded below and measured by
 *    scripts/dictionary_replay_probe.mjs. A source that has not started is
 *    disposed (out of the graph, as Tone itself does when a note ends); one
 *    that sounds is stopped at `at`, which fades it over the sampler's release.
 *  - Tone.MonoSynth (bass): ONE oscillator and three signals (pitch, amplitude,
 *    filter) carry every note of the scale. Cancelling what each signal has
 *    scheduled from `at` on, then releasing, is all there is to take back.
 *  - Tone.PolySynth (the fallback while samples load, or if they fail): its
 *    future attacks are JS timeouts Tone does not expose, so only what already
 *    sounds can be released. Known limit; the samplers are the normal case.
 */
import * as Tone from "tone";

/**
 * @typedef {Object} DictionaryVoice
 * @property {(at: number) => void} stop Takes the note back as of audio-clock
 *   time `at`: what has not started never will, what sounds is released.
 *   Idempotent, and harmless after the note has ended.
 */

/** @type {Set<DictionaryVoice>} */
const remembered = new Set();

/**
 * Keeps `voice` until the next Dictionary playback. Anything falsy (an engine
 * that played nothing, a test double) is ignored.
 * @param {DictionaryVoice | null | undefined} voice
 */
export function rememberDictionaryVoice(voice) {
  if (voice) remembered.add(voice);
}

/**
 * Stops every remembered voice, now, and forgets them. Called by the hook
 * right before it schedules a playback, so that "play" always means "play this
 * and nothing else of the Dictionary". Nothing remembered, nothing to do (and
 * no read of the audio clock).
 */
export function stopDictionaryVoices() {
  if (remembered.size === 0) return;
  // The instant the press is handled, not Tone.now(): now() is that plus the
  // scheduling look-ahead, and a note starting inside it would be "already
  // sounding" for no good reason.
  const at = Tone.immediate();
  const voices = [...remembered];
  remembered.clear();
  for (const voice of voices) {
    try {
      voice.stop(at);
    } catch (error) {
      // A voice that cannot be stopped must not make the next playback silent.
      console.error("[dictionaryVoices] a voice could not be stopped:", error);
    }
  }
}

/**
 * Several voices as one.
 * @param {DictionaryVoice[]} voices
 * @returns {DictionaryVoice}
 */
export function combineVoices(voices) {
  return { stop: (at) => voices.forEach((voice) => voice.stop(at)) };
}

let warnedAboutSamplerInternals = false;

/**
 * The source Tone just made for `note` in `sampler.triggerAttack`: the last one
 * in the sampler's active map under that MIDI number. Undefined (once, loudly)
 * if Tone no longer keeps its sources there — the voice then stops nothing, and
 * the probe turns red.
 * @param {any} sampler a Tone.Sampler
 * @param {string} note
 * @returns {any}
 */
function newestSourceOf(sampler, note) {
  const active = sampler._activeSources;
  if (!(active instanceof Map)) {
    if (!warnedAboutSamplerInternals) {
      warnedAboutSamplerInternals = true;
      console.error("[dictionaryVoices] Tone.Sampler no longer keeps its sources in _activeSources: a Dictionary replay cannot take back the sampler's notes.");
    }
    return undefined;
  }
  const sources = active.get(Tone.Frequency(note).toMidi());
  return sources && sources.length ? sources[sources.length - 1] : undefined;
}

/**
 * Plays `notes` on a Tone.Sampler exactly as `sampler.triggerAttackRelease(notes,
 * duration, time, velocity)` does — same attack, same release date, same sources
 * — and keeps hold of the sources. (`triggerAttackRelease` is `triggerAttack`
 * then `triggerRelease(notes, time + duration)`; the release drains the
 * sampler's own record of them, so they have to be taken in between.)
 *
 * @param {any} sampler a Tone.Sampler
 * @param {string | string[]} notes
 * @param {string | number} duration
 * @param {number | undefined} time audio-clock start; undefined = now
 * @param {number} [velocity]
 * @returns {DictionaryVoice}
 */
export function triggerSamplerVoice(sampler, notes, duration, time, velocity) {
  const names = Array.isArray(notes) ? notes : [notes];
  const start = sampler.toSeconds(time);
  const end = start + sampler.toSeconds(duration);
  sampler.triggerAttack(names, start, velocity);
  const held = names
    .map((note) => newestSourceOf(sampler, note))
    .filter(Boolean)
    .map((source) => ({ source, start, end }));
  sampler.triggerRelease(names, end);
  return {
    stop(at) {
      for (const { source, start: from, end: to } of held) {
        if (source.disposed) continue; // already over, and cleaned up by Tone
        if (to <= at) continue; // over by `at`: its own release is all that is left
        if (from >= at) source.dispose(); // has not started: out of the graph
        else source.stop(at); // sounds: fades over the sampler's release
      }
    },
  };
}

/**
 * A Tone.MonoSynth's one voice: every note of a scale rides the same oscillator,
 * pitch signal, amplitude envelope and filter envelope, so taking the notes
 * back is cancelling what those have scheduled from `at` on and releasing
 * whatever sounds.
 * @param {any} synth a Tone.MonoSynth
 * @returns {DictionaryVoice}
 */
export function monoSynthVoice(synth) {
  return {
    stop(at) {
      synth.frequency.cancelScheduledValues(at);
      synth.envelope.cancel(at);
      synth.filterEnvelope.cancel(at);
      synth.triggerRelease(at);
    },
  };
}

/**
 * A Tone.PolySynth: releases what sounds. Its attacks scheduled in the future
 * are Tone-internal timeouts and are not taken back (see the header).
 * @param {any} synth a Tone.PolySynth
 * @returns {DictionaryVoice}
 */
export function polySynthVoice(synth) {
  return { stop: (at) => synth.releaseAll(at) };
}
