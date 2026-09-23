// @ts-check
/**
 * playStep.js — the playback translation of `stepEvents` (T1): one step's
 * events turned into calls on the Studio's synths.
 *
 * Shared by the two things that play a step — useSequencer's `repeat` loop
 * and the audio harness's `default-progression` scenario — so what the
 * harness measures is what the app plays by construction, not by a copy kept
 * in step by hand. The synths are passed in rather than imported: the
 * harness must use the AudioEngine instance it built on its offline context,
 * and this module stays free of Tone.
 *
 * The calls, their order and their arguments are exactly those the loop made
 * before T1 (PlaybackGolden.test.jsx, `npm run audio:check`).
 *
 * @module audio/playStep
 */
import { midiToNoteName } from "../core/theory";

/**
 * The AudioEngine exports a step is played on.
 *
 * @typedef {Object} StepSynths
 * @property {any} kickSynth
 * @property {any} snareSynth
 * @property {any} hatSynth
 * @property {any} bassSynth
 * @property {Function} playDictionaryNote
 */

/**
 * Tone note value of a duration in 16th-note steps. Only the durations
 * `stepEvents` produces today; anything else is a new musical decision and
 * throws rather than guessing a rounding.
 */
const NOTE_VALUE_OF_STEPS = { 0.5: "32n", 1: "16n", 2: "8n", 4: "4n" };

/** @param {number} steps */
export function toneDuration(steps) {
  const value = NOTE_VALUE_OF_STEPS[steps];
  if (!value) throw new Error(`playStep: no Tone note value for ${steps} steps`);
  return value;
}

/**
 * Plays one step's events at `time`. Drums: the kick synth is pitched and
 * always plays C1; snare and hat are noise, unpitched. The chord goes through
 * `playDictionaryNote`, which takes no velocity — the piano sounds at Tone's
 * default, the `velocity: 1` the event already states. Every melodic track
 * plays on the bass synth. Durations are the event's, as Tone note values.
 *
 * @param {StepSynths} synths
 * @param {import("./dispatch").StepEvent[]} events
 * @param {number} time Tone time of the step
 * @returns {number[]} the MIDI notes sounded, chord notes then melodic notes
 *   (drums excluded) — what the loop lights on screen and the harness reports
 */
export function playStepEvents(synths, events, time) {
  const notes = [];
  events.forEach((event) => {
    const duration = toneDuration(event.durationSteps);
    if (event.voice === "drums") {
      if (event.instrument === "kick") synths.kickSynth.triggerAttackRelease("C1", duration, time, event.velocity);
      else if (event.instrument === "snare") synths.snareSynth.triggerAttackRelease(duration, time, event.velocity);
      else synths.hatSynth.triggerAttackRelease(duration, time, event.velocity);
    } else if (event.voice === "chords") {
      const notesToPlay = event.midi.map((p) => midiToNoteName(p));
      synths.playDictionaryNote("piano", notesToPlay, duration, time);
      notes.push(...event.midi);
    } else {
      synths.bassSynth.triggerAttackRelease(midiToNoteName(event.midi[0]), duration, time, event.velocity);
      notes.push(event.midi[0]);
    }
  });
  return notes;
}
