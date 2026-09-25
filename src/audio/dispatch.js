// @ts-check
/**
 * dispatch.js — what plays on one step of the Studio loop, decided once
 * (T1: VMU-137, entry of VMU-116), read off the timeline document (T3).
 *
 * The decision used to be written three times: in useSequencer's `repeat`
 * callback (what is heard), in MidiExporter.js (what is downloaded — which
 * recomputed each measure's chord on its own, VMU-137), and in the audio
 * harness's `default-progression` scenario (what is measured). Three copies
 * of one rule is how VMU-125 and VMU-128 happened. Now all three call
 * `stepEvents` and only *translate* its answer: into Tone calls, into MIDI
 * notes, into the harness's offline render.
 *
 * T3: what it reads is the timeline document (core/timeline.js) — absolute
 * cells over up to 8 measures, chords laid end to end — instead of
 * one-measure patterns and a progression taken modulo its length. The
 * chord of a step is `chordAt`'s; the pitches go through noteEngine. At 4
 * measures, on a document a style filled, the events are the ones the pre-T3
 * dispatch produced, event for event (ExportGolden.test.js,
 * PlaybackGolden.test.jsx, `npm run audio:check`).
 *
 * `stepEvents` describes the step **as playback plays it**. Where a consumer
 * deliberately does something else — the export's drum lengths, its chord
 * velocity, the tracks it leaves out — that difference lives in that
 * consumer's translation, named there, not in here. Those differences are
 * pre-existing and kept as they were by T1 and T3; aligning them is a later
 * decision, not a refactor.
 *
 * Pure: no Tone, no React, no clock, no randomness — the same document and
 * step always give equal events, and the document is never mutated.
 * Dispatch.test.js checks that nothing it imports, transitively, imports Tone.
 *
 * @module audio/dispatch
 */
import { getBassNote, getLeadingTone, resolveChordSemitones } from "../core/theory";
import { realizeChord, realizeNote } from "../core/noteEngine";
import { chordAt, DRUM_ROLES, MELODIC_ROLES, STEPS_PER_MEASURE } from "../core/timeline";

/** 16 sixteenth-note steps per measure. The loop's length is the document's (core/timeline.js `loopSteps`). */
export { STEPS_PER_MEASURE };

/**
 * GM percussion key of each drum category (channel 10). A key, not a pitch:
 * the Studio's drum synths are unpitched, except the kick, which the
 * playback translation always plays as "C1".
 */
export const DRUM_GM_KEY = { kick: 36, snare: 38, hat: 42 };

/**
 * How long each drum category rings in playback, in steps: kick "8n", snare
 * "16n", hat "32n" (useSequencer.js, unchanged since before T1). A cell's
 * own `len`, when it has one, wins.
 */
export const DRUM_DURATION_STEPS = { kick: 2, snare: 1, hat: 0.5 };

/** A melodic note without a `len` lasts one step; a chord hit without one, a quarter note. */
const MELODIC_DURATION_STEPS = 1;
const CHORD_DURATION_STEPS = 4;

/**
 * One thing that sounds on a step.
 *
 * @typedef {Object} StepEvent
 * @property {"drums"|"chords"|"melody"} voice the Studio layer it belongs to
 * @property {"kick"|"snare"|"hat"|"piano"|"bass"} instrument the Studio voice
 *   that plays it. Every melodic track plays on the bass synth, whatever its
 *   role — that is what playback has always done.
 * @property {import("../core/timeline").TrackRole} role the role of the row
 *   it comes from, as the document stores it ("bass" and "melody" rows both
 *   play on the bass synth; the export keeps only the first, EXPORT-3).
 * @property {number[]} midi MIDI numbers, C4 = 60. Chords: every note, root
 *   position. Melody: one note. Drums: the GM key (DRUM_GM_KEY), not a pitch.
 * @property {number} durationSteps how long it sounds, in 16th-note steps, as
 *   playback plays it (0.5 = a 32nd note).
 * @property {number} velocity 0..1, as playback plays it. Chords are 1: the
 *   piano is triggered without a velocity, and 1 is Tone's default
 *   (node_modules/tone/build/esm/instrument/Sampler.js, Monophonic.js).
 * @property {string} track name of the row it comes from ("Chords" for the
 *   chord row).
 * @property {boolean} [tonicFallback] melody only: true when the note is the
 *   sequencer's tonic because no chord applies — the row is a melody, not a
 *   bass line, or the document has no chord at all (no progression, no
 *   style).
 */

/**
 * What a step is played with that is not the document's: Studio settings.
 *
 * @typedef {Object} PlayOptions
 * @property {number} [octaveOffset] Studio "Octave Base" setting, 0 = C4
 * @property {number} [rootValue] the sequencer's root (0-11), used only by
 *   the tonic fallback
 */

/**
 * The chord covering `step` (`chordAt`) and the MIDI notes the chord row
 * plays it at: root position, in the octave the Studio octave offset selects,
 * computed by noteEngine's realizeChord (VMU-140) — the same numbers the
 * pre-T3 `resolveMeasureChord` gave (the goldens prove it). The chord
 * published to the instruments during playback carries these, so a consumer
 * that only wants to *display* the chord never re-derives them.
 *
 * @param {import("../core/timeline").TimelineDoc} doc
 * @param {number} step absolute step on the timeline
 * @param {number} [octaveOffset] Studio "Octave Base" setting
 * @returns {{ index: number, chord: import("../core/timeline").TimelineChord, startStep: number, endStep: number, absolutePitches: number[] } | null}
 *   null when no chord covers the step.
 */
export function resolveChordAt(doc, step, octaveOffset = 0) {
  const span = chordAt(doc, step);
  if (!span) return null;
  const semitones = resolveChordSemitones(span.chord.type)?.semitones || [0, 4, 7];
  // MIDI (C4 = 60), the convention every display uses.
  const baseOctave = 4 + (octaveOffset || 0);
  return { ...span, absolutePitches: realizeChord(span.chord.rootPc, semitones, baseOctave) };
}

/**
 * Whether the document's chords ever change. A document whose chords are all
 * one chord — a one-chord progression, repeated — has nothing for the bass to
 * lead into (before T3: `progression.length > 1`).
 *
 * @param {import("../core/timeline").TimelineDoc} doc
 */
function chordsChange(doc) {
  const [first] = doc.chords;
  return doc.chords.some((chord) => chord.rootPc !== first.rootPc || chord.type !== first.type);
}

/**
 * The note of a bass row's cell on a step a chord covers: the leading tone
 * into the chord that follows in the document (the first one after the
 * last) on the chord's last step, when the chords ever change; otherwise the
 * cell's interval (`pitch`, the root by default) above the chord's root.
 *
 * "The chord that follows in the document" is what the pre-T3 loop led into
 * as well — the next degree of the progression, even on the loop's last
 * measure, where a 3-chord progression over 4 measures restarts on its first
 * chord while the bass leads into its second.
 *
 * @returns {number} MIDI
 */
function bassNote(doc, cell, step, span, octave) {
  if (step === span.endStep - 1 && chordsChange(doc)) {
    const next = doc.chords[span.index + 1] || doc.chords[0];
    return getLeadingTone(next.rootPc, octave).midi;
  }
  return getBassNote(span.chord.rootPc, cell.pitch || "R", octave).midi;
}

/**
 * Everything that sounds on `step`, in the order playback triggers it: drum
 * rows (document order), then the chord, then melodic rows (document order).
 *
 * A step no chord covers plays neither the chord nor the bass (T3 brief,
 * decision 4). The one exception is a document with no chord at all, whose
 * bass rows keep playing the sequencer's tonic, as they always have without
 * a progression (PlaybackGolden.test.jsx, "empty-progression").
 *
 * @param {import("../core/timeline").TimelineDoc} doc
 * @param {number} step absolute step on the timeline, 0..loopSteps(doc)-1
 * @param {PlayOptions} [options]
 * @returns {StepEvent[]}
 */
export function stepEvents(doc, step, options = {}) {
  const { octaveOffset, rootValue } = options;
  const span = resolveChordAt(doc, step, octaveOffset);
  const cellOf = (track) => track.steps[step] || null;
  /** @type {StepEvent[]} */
  const events = [];

  doc.tracks.forEach((track) => {
    const cell = cellOf(track);
    if (!cell || !DRUM_ROLES.includes(track.role)) return;
    const drum = /** @type {"kick"|"snare"|"hat"} */ (track.role);
    events.push({
      voice: "drums",
      instrument: drum,
      role: drum,
      midi: [DRUM_GM_KEY[drum]],
      durationSteps: cell.len ?? DRUM_DURATION_STEPS[drum],
      velocity: cell.vel === "ghost" ? 0.3 : 0.8,
      track: track.name,
    });
  });

  if (span) {
    doc.tracks.forEach((track) => {
      const cell = cellOf(track);
      if (!cell || track.role !== "chordHits") return;
      events.push({
        voice: "chords",
        instrument: "piano",
        role: track.role,
        midi: [...span.absolutePitches],
        durationSteps: cell.len ?? CHORD_DURATION_STEPS,
        velocity: 1,
        track: track.name,
      });
    });
  }

  doc.tracks.forEach((track) => {
    const cell = cellOf(track);
    if (!cell || !MELODIC_ROLES.includes(track.role)) return;
    const isBass = track.role === "bass";
    if (isBass && !span && doc.chords.length > 0) return; // decision 4: no chord, no bass
    const octave = isBass ? 2 : 4;
    const tonicFallback = !(isBass && span);
    const note = tonicFallback
      ? realizeNote(Number(rootValue) % 12, octave)
      : bassNote(doc, cell, step, span, octave);
    events.push({
      voice: "melody",
      instrument: "bass",
      role: track.role,
      midi: [note],
      durationSteps: cell.len ?? MELODIC_DURATION_STEPS,
      velocity: cell.vel === "ghost" ? 0.4 : 0.9,
      track: track.name,
      tonicFallback,
    });
  });

  return events;
}
