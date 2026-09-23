import { Midi } from "@tonejs/midi";
import { stepEvents, LOOP_STEPS } from "./dispatch";

// T1 (VMU-137): what each file holds comes from stepEvents (dispatch.js), the
// same function the playback loop plays. This module used to recompute each
// measure's chord itself (generateChordsFromNNS + resolveNnsToChordType +
// resolveChordSemitones), a second copy of the rule playback's
// resolveMeasureChord already held. It now only translates events into MIDI
// notes.
//
// Where the files differ from what playback plays, it is here, named below.
// Every one of them predates T1 and is kept as it was (ExportGolden.test.js
// proves no byte moved); whether to align them is a decision for later.

/** EXPORT-1: every drum hit is written one step long (playback: kick 8n, snare 16n, hat 32n). */
const EXPORT_DRUM_DURATION_STEPS = 1;

/** EXPORT-2: chord notes are written at velocity 0.8 (playback: Tone's default, 1). */
const EXPORT_CHORD_VELOCITY = 0.8;

/**
 * EXPORT-3: only melodic tracks whose name contains "bass" are written to the
 * bass file (playback plays every melodic track on the bass synth).
 * EXPORT-4: a tonic-fallback note — no measure chord applies — is not written
 * (playback plays it).
 * @param {import("./dispatch").StepEvent} event
 */
function isExportedBassNote(event) {
  return event.track.toLowerCase().includes("bass") && !event.tonicFallback;
}

// 1 step (16th note) duration in seconds
function getStepDuration(bpm) {
  return 15 / bpm;
}

function getStepTime(step, bpm) {
  return step * getStepDuration(bpm);
}

/** The events of `voice` on every step of the loop, in step order. */
function loopEvents(state, voice) {
  const all = [];
  for (let step = 0; step < LOOP_STEPS; step++) {
    stepEvents(state, step).forEach((event) => {
      if (event.voice === voice) all.push({ step, event });
    });
  }
  return all;
}

export function exportDrums(drumTracks, bpm, _genreName) {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  const track = midi.addTrack();
  track.name = "Drums";
  // Channel 10 is standard for drums in GM (0-indexed = 9)
  track.channel = 9;

  // The GM key comes with the event (dispatch.js DRUM_GM_KEY), from the same
  // classification playback uses to pick a synth (VMU-128).
  loopEvents({ brick: null, drums: drumTracks }, "drums").forEach(({ step, event }) => {
    track.addNote({
      midi: event.midi[0],
      time: getStepTime(step, bpm),
      duration: EXPORT_DRUM_DURATION_STEPS * getStepDuration(bpm),
      velocity: event.velocity,
    });
  });

  return midi.toArray();
}

export function exportBass(melodyTracks, brick, progression, bpm) {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  const track = midi.addTrack();
  track.name = "Bass";

  if (!melodyTracks || !brick || !progression) return midi.toArray();

  loopEvents({ brick, melody: melodyTracks, progression }, "melody").forEach(({ step, event }) => {
    if (!isExportedBassNote(event)) return;
    track.addNote({
      midi: event.midi[0],
      time: getStepTime(step, bpm),
      duration: event.durationSteps * getStepDuration(bpm),
      velocity: event.velocity,
    });
  });

  return midi.toArray();
}

export function exportChords(brick, progression, rhythm, octaveOffset, bpm, _genreName) {
  const midi = new Midi();
  midi.header.setTempo(bpm);

  const track = midi.addTrack();
  track.name = "Chords";

  if (!progression || progression.length === 0 || !brick) return midi.toArray();

  // VMU-125: callers should pass the rhythm actually played (customRhythm ||
  // activeBrick.chordRhythm || [0], computed in useStudioMode.js). Falling
  // back to brick.chordRhythm here only covers callers that predate that
  // parameter; it ignores any per-session override, which is the bug.
  // EXPORT-5: an empty rhythm also falls back here, where playback, handed
  // the same empty rhythm, would play no chord at all.
  const effectiveRhythm = rhythm && rhythm.length > 0 ? rhythm : (brick.chordRhythm || [0]);

  loopEvents({ brick, progression, rhythm: effectiveRhythm, octaveOffset }, "chords").forEach(({ step, event }) => {
    event.midi.forEach((note) => {
      track.addNote({
        midi: note,
        time: getStepTime(step, bpm),
        duration: event.durationSteps * getStepDuration(bpm),
        velocity: EXPORT_CHORD_VELOCITY,
      });
    });
  });

  return midi.toArray();
}

export function triggerMidiDownload(midiArrayBuffer, filename) {
  const blob = new Blob([midiArrayBuffer], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
