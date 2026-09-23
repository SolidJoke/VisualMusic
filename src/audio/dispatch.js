// @ts-check
/**
 * dispatch.js — what plays on one step of the Studio loop, decided once
 * (T1: VMU-137, entry of VMU-116).
 *
 * The decision used to be written three times: in useSequencer's `repeat`
 * callback (what is heard), in MidiExporter.js (what is downloaded — which
 * recomputed each measure's chord on its own, VMU-137), and in the audio
 * harness's `default-progression` scenario (what is measured). Three copies
 * of one rule is how VMU-125 and VMU-128 happened. Now all three call
 * `stepEvents` and only *translate* its answer: into Tone calls, into MIDI
 * notes, into the harness's offline render.
 *
 * `stepEvents` describes the step **as playback plays it**. Where a consumer
 * deliberately does something else — the export's drum lengths, its chord
 * velocity, the tracks it leaves out — that difference lives in that
 * consumer's translation, named there, not in here. Those differences are
 * pre-existing and kept as they were by T1; aligning them is a later
 * decision, not a refactor.
 *
 * Pure: no Tone, no React, no clock, no randomness — the same state and step
 * always give equal events, and the state is never mutated. Dispatch.test.js
 * checks that nothing it imports, transitively, imports Tone.
 *
 * @module audio/dispatch
 */
import {
  generateChordsFromNNS,
  resolveNnsToChordType,
  resolveChordSemitones,
  getBassNote,
  getLeadingTone,
} from "../core/theory";
import { realizeChord, realizeNote } from "../core/noteEngine";
import { classifyDrumTrack, shouldPlayChordStep } from "./trackMapping";

/** The loop is 4 measures of 16 sixteenth-note steps (T3 will make the length a parameter). */
export const STEPS_PER_MEASURE = 16;
export const LOOP_MEASURES = 4;
export const LOOP_STEPS = STEPS_PER_MEASURE * LOOP_MEASURES;

/**
 * GM percussion key of each drum category (channel 10). A key, not a pitch:
 * the Studio's drum synths are unpitched, except the kick, which the
 * playback translation always plays as "C1".
 */
export const DRUM_GM_KEY = { kick: 36, snare: 38, hat: 42 };

/**
 * How long each drum category rings in playback, in steps: kick "8n", snare
 * "16n", hat "32n" (useSequencer.js, unchanged since before T1).
 */
export const DRUM_DURATION_STEPS = { kick: 2, snare: 1, hat: 0.5 };

/**
 * One thing that sounds on a step.
 *
 * @typedef {Object} StepEvent
 * @property {"drums"|"chords"|"melody"} voice the Studio layer it belongs to
 * @property {"kick"|"snare"|"hat"|"piano"|"bass"} instrument the Studio voice
 *   that plays it. Every melodic track plays on the bass synth, whatever its
 *   name — that is what playback has always done.
 * @property {number[]} midi MIDI numbers, C4 = 60. Chords: every note, root
 *   position. Melody: one note. Drums: the GM key (DRUM_GM_KEY), not a pitch.
 * @property {number} durationSteps how long it sounds, in 16th-note steps, as
 *   playback plays it (0.5 = a 32nd note).
 * @property {number} velocity 0..1, as playback plays it. Chords are 1: the
 *   piano is triggered without a velocity, and 1 is Tone's default
 *   (node_modules/tone/build/esm/instrument/Sampler.js, Monophonic.js).
 * @property {string} track name of the track it comes from ("Chords" for
 *   the chord layer).
 * @property {boolean} [tonicFallback] melody only: true when the note is the
 *   sequencer's tonic because no chord applies — the track is not named
 *   "bass", or no measure chord was resolved (no progression, no style).
 */

/**
 * The state a step is decided from — what the Studio hands the sequencer.
 *
 * @typedef {Object} StepState
 * @property {any} brick active style (`rootValue`, `scaleKey`)
 * @property {any[]} [drums] drum tracks (`name`, `activeSteps`, `lowVelocitySteps`)
 * @property {any[]} [melody] melodic tracks (`name`, `activeSteps`,
 *   `lowVelocitySteps`, `pitchSteps`)
 * @property {string[]} [progression] NNS degrees, one per measure, cycling
 * @property {number[]} [rhythm] chord rhythm in effect; `[0]` when absent
 * @property {number} [octaveOffset] Studio "Octave Base" setting, 0 = C4
 * @property {number} [rootValue] the sequencer's root (0-11), used only by
 *   the tonic fallback
 */

/**
 * Resolves the chord that owns the current step's measure — the one thing
 * both the chord track and the bass track (VMU-129) must agree on. Pure:
 * same inputs, same chord, so it is the single place a step is turned into
 * "which chord of the progression is this".
 *
 * `absolutePitches` are the actual MIDI notes this measure's chord is
 * played at (root position, the octave the Studio octave offset selects) —
 * the same values the chord track sends to the synth, so a consumer that
 * only wants to *display* the chord never has to re-derive them from
 * `chord.nns` and re-guess the octave. Computed by noteEngine's realizeChord
 * (VMU-140), which gives the same numbers the hand-written
 * `root + semitone + (octave + 1) * 12` gave before T1 — the goldens prove it.
 *
 * Moved here from useSequencer.js by T1; useSequencer.js re-exports it, so
 * its importers (DAWHelper.jsx, the tests and their mocks) are unchanged.
 *
 * @param {number} stepCounter absolute 16th-note step (0..63 across the 4-measure loop)
 * @param {any[]} progression NNS degrees of the current progression
 * @param {any} brick active style (rootValue, scaleKey)
 * @param {number} octaveOffset Studio "Octave Base" setting
 * @returns {{ chordIndex: number, chord: any, absolutePitches: number[] } | null}
 */
export function resolveMeasureChord(stepCounter, progression, brick, octaveOffset) {
  if (!progression || progression.length === 0 || !brick) return null;
  const chordIndex = Math.floor(stepCounter / STEPS_PER_MEASURE) % progression.length;
  const nns = progression[chordIndex];
  const chords = generateChordsFromNNS(brick.rootValue, brick.scaleKey, [nns]);
  if (chords.length === 0) return null;

  const chord = chords[0];
  const chordType = resolveNnsToChordType(chord.nns);
  const semitones = resolveChordSemitones(chordType)?.semitones || [0, 4, 7];
  // MIDI (C4 = 60), the convention every display uses.
  const baseOctave = 4 + (octaveOffset || 0);
  const absolutePitches = realizeChord(chord.rootNote.value, semitones, baseOctave);

  return { chordIndex, chord, absolutePitches };
}

/**
 * The bass note of a melodic track named "bass" on a step that has a
 * measure chord: the leading tone into the next chord on the last step of
 * the measure (when the progression has more than one chord), otherwise the
 * track's interval (`pitchSteps`, root by default) above the chord's root.
 *
 * @returns {number} MIDI
 */
function bassNote(track, relativeStep, measureChord, state, octave) {
  const { progression, brick } = state;
  if (relativeStep === STEPS_PER_MEASURE - 1 && progression.length > 1) {
    const nextChordIndex = (measureChord.chordIndex + 1) % progression.length;
    const nextChords = generateChordsFromNNS(brick.rootValue, brick.scaleKey, [progression[nextChordIndex]]);
    if (nextChords.length > 0) return getLeadingTone(nextChords[0].rootNote.value, octave).midi;
  }
  const intervalLabel = (track.pitchSteps && track.pitchSteps[relativeStep]) || "R";
  return getBassNote(measureChord.chord.rootNote.value, intervalLabel, octave).midi;
}

/**
 * Everything that sounds on `step`, in the order playback triggers it:
 * drums (track order), then the chord, then melodic tracks (track order).
 *
 * @param {StepState} state
 * @param {number} step absolute 16th-note step, 0..LOOP_STEPS-1
 * @returns {StepEvent[]}
 */
export function stepEvents(state, step) {
  const { brick, drums, melody, progression, octaveOffset, rootValue } = state;
  const relativeStep = step % STEPS_PER_MEASURE;
  const measureChord = resolveMeasureChord(step, progression || [], brick, octaveOffset || 0);
  /** @type {StepEvent[]} */
  const events = [];

  (drums || []).forEach((track) => {
    if (!track.activeSteps?.includes(relativeStep)) return;
    const category = classifyDrumTrack(track.name);
    events.push({
      voice: "drums",
      instrument: category,
      midi: [DRUM_GM_KEY[category]],
      durationSteps: DRUM_DURATION_STEPS[category],
      velocity: track.lowVelocitySteps && track.lowVelocitySteps.includes(relativeStep) ? 0.3 : 0.8,
      track: track.name,
    });
  });

  if (measureChord) {
    const rhythm = state.rhythm || [0];
    if (shouldPlayChordStep(rhythm, step)) {
      events.push({
        voice: "chords",
        instrument: "piano",
        midi: [...measureChord.absolutePitches],
        // Rhythms of more than one hit play each hit for a 16th note, a
        // single hit rings for a quarter note.
        durationSteps: rhythm.length > 1 ? 1 : 4,
        velocity: 1,
        track: "Chords",
      });
    }
  }

  (melody || []).forEach((track) => {
    if (!track.activeSteps?.includes(relativeStep)) return;
    const isBass = track.name.toLowerCase().includes("bass");
    const octave = isBass ? 2 : 4;
    const tonicFallback = !(isBass && measureChord);
    const note = tonicFallback
      ? realizeNote(Number(rootValue) % 12, octave)
      : bassNote(track, relativeStep, measureChord, state, octave);
    events.push({
      voice: "melody",
      instrument: "bass",
      midi: [note],
      durationSteps: 1,
      velocity: track.lowVelocitySteps && track.lowVelocitySteps.includes(relativeStep) ? 0.4 : 0.9,
      track: track.name,
      tonicFallback,
    });
  });

  return events;
}
