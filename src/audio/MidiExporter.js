import { Midi } from "@tonejs/midi";
import { 
  generateChordsFromNNS,
  resolveNnsToChordType,
  resolveChordSemitones,
  getBassNote,
  getLeadingTone
} from "../core/theory";

// 1 step (16th note) duration in seconds
function getStepDuration(bpm) {
  return 15 / bpm;
}

function getStepTime(step, bpm) {
  return step * getStepDuration(bpm);
}

export function exportDrums(drumTracks, bpm, genreName) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  
  const track = midi.addTrack();
  track.name = "Drums";
  // Channel 10 is standard for drums in GM (0-indexed = 9)
  track.channel = 9;

  drumTracks.forEach(dTrack => {
    const name = dTrack.name.toLowerCase();
    let midiNote = 36; // Kick
    if (name.includes("snare") || name.includes("clap") || name.includes("rim")) {
      midiNote = 38;
    } else if (name.includes("hat")) {
      midiNote = 42;
    }

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
        const chords = generateChordsFromNNS(brick.rootValue, brick.modeName, [currentNns]);
        
        if (chords.length > 0) {
          const currentChordRoot = chords[0].rootNote.value;
          const intervalLabel = (mTrack.pitchSteps && mTrack.pitchSteps[relativeStep]) || 'R';
          let finalMidi;

          // Leading tone on step 15
          if (relativeStep === 15 && progression.length > 1) {
            const nextChordIndex = (chordIndex + 1) % progression.length;
            const nextChords = generateChordsFromNNS(brick.rootValue, brick.modeName, [progression[nextChordIndex]]);
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

export function exportChords(brick, progression, octaveOffset, bpm, genreName) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  
  const track = midi.addTrack();
  track.name = "Chords";

  if (!progression || progression.length === 0 || !brick) return midi.toArray();

  const rhythm = brick.chordRhythm || [0];
  const stepDuration = getStepDuration(bpm);
  const duration = rhythm.length > 1 ? stepDuration : stepDuration * 4;

  for (let stepCounter = 0; stepCounter < 64; stepCounter++) {
    const chordIndex = Math.floor(stepCounter / 16) % progression.length;
    const currentNns = progression[chordIndex];
    
    if (rhythm.includes(stepCounter % 4)) {
      const chords = generateChordsFromNNS(brick.rootValue, brick.modeName, [currentNns]);
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
