import { Midi } from "@tonejs/midi";
import {
  generateChordsFromNNS,
  resolveNnsToChordType,
  resolveChordSemitones,
  getBassNote,
  getLeadingTone
} from "../core/theory";
import { classifyDrumTrack, shouldPlayChordStep } from "./trackMapping";

// 1 step (16th note) duration in seconds
function getStepDuration(bpm) {
  return 15 / bpm;
}

function getStepTime(step, bpm) {
  return step * getStepDuration(bpm);
}

export function exportDrums(drumTracks, bpm, _genreName) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  
  const track = midi.addTrack();
  track.name = "Drums";
  // Channel 10 is standard for drums in GM (0-indexed = 9)
  track.channel = 9;

  drumTracks.forEach(dTrack => {
    // Same classification playback uses to pick a synth (VMU-128: this used
    // to default anything unmatched, e.g. "Crash", to a kick note instead of
    // the hi-hat fallback playback actually uses for it).
    const category = classifyDrumTrack(dTrack.name);
    const midiNote = category === "kick" ? 36 : category === "snare" ? 38 : 42;

    const duration = getStepDuration(bpm);

    // Expand the 16-step pattern to 64 steps (4 measures)
    for (let measure = 0; measure < 4; measure++) {
      if (dTrack.activeSteps) {
        dTrack.activeSteps.forEach(step => {
          const absoluteStep = measure * 16 + step;
          const time = getStepTime(absoluteStep, bpm);
          const isGhost = dTrack.lowVelocitySteps && dTrack.lowVelocitySteps.includes(step);
          const velocity = isGhost ? 0.3 : 0.8;
          
          track.addNote({
            midi: midiNote,
            time: time,
            duration: duration,
            velocity: velocity
          });
        });
      }
    }
  });

  return midi.toArray();
}

export function exportBass(melodyTracks, brick, progression, bpm) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  
  const track = midi.addTrack();
  track.name = "Bass";

  if (!melodyTracks || !brick || !progression) return midi.toArray();

  melodyTracks.forEach(mTrack => {
    if (!mTrack.name.toLowerCase().includes("bass")) return;
    
    const octave = 2;
    const duration = getStepDuration(bpm);

    // Expand to 64 steps (4 measures)
    for (let stepCounter = 0; stepCounter < 64; stepCounter++) {
      const relativeStep = stepCounter % 16;
      const isActive = mTrack.activeSteps && mTrack.activeSteps.includes(relativeStep);
      
      if (isActive) {
        const chordIndex = Math.floor(stepCounter / 16) % progression.length;
        const currentNns = progression[chordIndex];
        // VMU-128: was brick.modeName, a field no style has (playback reads
        // brick.scaleKey — see useSequencer.js). Left undefined, the lookup
        // into SCALES[undefined] crashed for every style.
        const chords = generateChordsFromNNS(brick.rootValue, brick.scaleKey, [currentNns]);

        if (chords.length > 0) {
          const currentChordRoot = chords[0].rootNote.value;
          const intervalLabel = (mTrack.pitchSteps && mTrack.pitchSteps[relativeStep]) || 'R';
          let finalMidi;

          // Leading tone on step 15
          if (relativeStep === 15 && progression.length > 1) {
            const nextChordIndex = (chordIndex + 1) % progression.length;
            const nextChords = generateChordsFromNNS(brick.rootValue, brick.scaleKey, [progression[nextChordIndex]]);
            if (nextChords.length > 0) {
              finalMidi = getLeadingTone(nextChords[0].rootNote.value, octave).midi;
            }
          }

          if (finalMidi === undefined) {
            finalMidi = getBassNote(currentChordRoot, intervalLabel, octave).midi;
          }

          const time = getStepTime(stepCounter, bpm);
          const isGhost = mTrack.lowVelocitySteps && mTrack.lowVelocitySteps.includes(relativeStep);
          const velocity = isGhost ? 0.4 : 0.9;
          
          track.addNote({
            midi: finalMidi,
            time: time,
            duration: duration,
            velocity: velocity
          });
        }
      }
    }
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
  const effectiveRhythm = rhythm && rhythm.length > 0 ? rhythm : (brick.chordRhythm || [0]);
  const stepDuration = getStepDuration(bpm);
  const duration = effectiveRhythm.length > 1 ? stepDuration : stepDuration * 4;

  for (let stepCounter = 0; stepCounter < 64; stepCounter++) {
    const chordIndex = Math.floor(stepCounter / 16) % progression.length;
    const currentNns = progression[chordIndex];

    // Same predicate as playback (useSequencer.js) so a custom absolute-step
    // rhythm (e.g. [0, 6, 10]) is honored here exactly as it is heard.
    if (shouldPlayChordStep(effectiveRhythm, stepCounter)) {
      const chords = generateChordsFromNNS(brick.rootValue, brick.scaleKey, [currentNns]);
      if (chords.length > 0) {
        const c = chords[0];
        const rootValChord = c.rootNote.value;
        const chordType = resolveNnsToChordType(c.nns);
        const semitones = resolveChordSemitones(chordType)?.semitones || [0, 4, 7];
        const baseOctave = 4 + (octaveOffset || 0);
        
        const time = getStepTime(stepCounter, bpm);

        semitones.forEach(s => {
          const midiNote = (rootValChord % 12) + s + (baseOctave + 1) * 12;
          
          track.addNote({
            midi: midiNote,
            time: time,
            duration: duration,
            velocity: 0.8
          });
        });
      }
    }
  }

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
