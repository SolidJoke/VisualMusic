import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";
import {
  kickSynth,
  snareSynth,
  hatSynth,
  bassSynth,
  initPianoSampler,
  initGuitarSampler,
  applyGenrePreset,
  setInstrumentVolume,
  playDictionaryNote
} from "./AudioEngine";
import { 
  getAbsoluteNoteValue, 
  NOTES, 
  generateChordsFromNNS,
  resolveNnsToChordType,
  resolveChordSemitones
} from "../core/theory";

const noteNamesArray = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export const PITCH_MAP = {
  'R': 0,
  '2': 2,
  'b3': 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  '5': 7,
  'b6': 8,
  '6': 9,
  'b7': 10,
  '7': 11,
  '8va': 12,
  'octave': 12
};

/**
 * Resolves a bass note based on the current chord root and a relative interval label.
 * @param {number} chordRootValue - MIDI value of the chord's root note (0-11)
 * @param {string} intervalLabel - Interval label from PITCH_MAP (e.g., 'R', '5', 'b3')
 * @param {number} baseOctave - Target octave for the bass (default 2)
 * @returns {{ name: string, midi: number }}
 */
export function getBassNote(chordRootValue, intervalLabel = 'R', baseOctave = 2, notation = 'us') {
  const semitones = PITCH_MAP[intervalLabel] || 0;
  const midiNote = (chordRootValue % 12) + semitones + (baseOctave + 1) * 12;
  const noteName = notation === 'eu' ? NOTES[midiNote % 12].eu : NOTES[midiNote % 12].us;
  return {
    name: `${noteName}${Math.floor(midiNote / 12) - 1}`,
    midi: midiNote
  };
}

/**
 * Calculates a leading tone (usually 1 semitone below or above) to the next chord's root.
 * @param {number} nextChordRootValue - MIDI value of the next chord's root (0-11)
 * @param {number} baseOctave - Target octave
 * @returns {{ name: string, midi: number }}
 */
export function getLeadingTone(nextChordRootValue, baseOctave = 2, notation = 'us') {
  // Use a chromatic approach from below (most common in jazz/blues)
  const targetMidi = (nextChordRootValue % 12) + (baseOctave + 1) * 12;
  const leadingMidi = targetMidi - 1; 
  const noteName = notation === 'eu' ? NOTES[leadingMidi % 12].eu : NOTES[leadingMidi % 12].us;
  return {
    name: `${noteName}${Math.floor(leadingMidi / 12) - 1}`,
    midi: leadingMidi
  };
}

export function useSequencer({
  appMode,
  activeBrick,
  activeDrums,
  activeMelody,
  activeProgression,
  activeRhythm,
  currentRootValue,
  setCurrentlyPlayingNotes,
  chordOctaveOffset = 0,
  notation = 'us'
}) {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(-12);
  const [currentBpm, setCurrentBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPianoReady, setIsPianoReady] = useState(false);
  
  const [instrumentVolumes, setInstrumentVolumes] = useState({
    kick: -3,
    snare: -5,
    hat: -8,
    bass: -6,
    piano: 0,
    guitar: 0,
  });

  const drumRef = useRef(activeDrums);
  const melodyRef = useRef(activeMelody);
  const progressionRef = useRef(activeProgression);
  const rootRef = useRef(currentRootValue);
  const appModeRef = useRef(appMode);
  const brickRef = useRef(activeBrick);
  const octaveRef = useRef(chordOctaveOffset);
  const rhythmRef = useRef(activeRhythm);

  drumRef.current = activeDrums;
  melodyRef.current = activeMelody;
  progressionRef.current = activeProgression;
  rootRef.current = currentRootValue;
  appModeRef.current = appMode;
  brickRef.current = activeBrick;
  octaveRef.current = chordOctaveOffset;
  rhythmRef.current = activeRhythm;

  // Generate a virtual track for chords based on current rhythm
  const activeChordTrack = {
    name: "Chords",
    activeSteps: rhythmRef.current 
      ? Array.from({ length: 16 }).flatMap((_, beat) => 
          rhythmRef.current.map(stepInBeat => beat * 4 + stepInBeat)
        )
      : [0, 4, 8, 12] // Default 4/4 hits
  };

  const handleInstrumentVolumeChange = (instrument, value) => {
    const val = Number(value);
    setInstrumentVolumes((prev) => ({ ...prev, [instrument]: val }));
    setInstrumentVolume(instrument, val);
  };

  useEffect(() => {
    Tone.Destination.volume.value = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    let stepCounter = 0;

    const repeat = (time) => {
      Tone.Draw.schedule(() => setCurrentStep(stepCounter), time);

      if (appModeRef.current === "dictionary") {
        stepCounter = (stepCounter + 1) % 16;
        return;
      }

      const drums = drumRef.current;
      const melodies = melodyRef.current;
      const progression = progressionRef.current;
      const rootVal = rootRef.current;
      const brick = brickRef.current;
      const octaveOffset = octaveRef.current;

      let frameNotes = [];

      // --- 1. Drums ---
      if (drums && drums.length > 0) {
        drums.forEach((track) => {
          const relativeStep = stepCounter % 16;
          if (track.activeSteps.includes(relativeStep)) {
            let vel =
              track.lowVelocitySteps && track.lowVelocitySteps.includes(relativeStep)
                ? 0.3
                : 0.8;
            let name = track.name.toLowerCase();

            if (name.includes("kick")) {
              kickSynth.triggerAttackRelease("C1", "8n", time, vel);
            } else if (
              name.includes("snare") ||
              name.includes("clap") ||
              name.includes("rim")
            ) {
              snareSynth.triggerAttackRelease("16n", time, vel);
            } else {
              hatSynth.triggerAttackRelease("32n", time, vel);
            }
          }
        });
      }

      // --- 2. Chords (Harmonic progression) ---
      if (progression && progression.length > 0 && brick) {
        const chordIndex = Math.floor(stepCounter / 16) % progression.length;
        const currentNns = progression[chordIndex];
        const rhythm = rhythmRef.current || [0];
        
        const isAbsolute16 = rhythm.some(step => step > 3);
        const shouldPlay = isAbsolute16 
          ? rhythm.includes(stepCounter % 16) 
          : rhythm.includes(stepCounter % 4);
          
        if (shouldPlay) {
           const chords = generateChordsFromNNS(brick.rootValue, brick.modeName, [currentNns]);
           if (chords.length > 0) {
             const c = chords[0];
             const rootValChord = c.rootNote.value;
             const chordType = resolveNnsToChordType(c.nns);
             const semitones = resolveChordSemitones(chordType)?.semitones || [0, 4, 7];
             const baseOctave = 4 + (octaveOffset || 0);
             const absPitches = semitones.map(s => rootValChord + s + baseOctave * 12);
             
             const notesToPlay = absPitches.map(p => `${notation === 'eu' ? NOTES[p % 12].eu : NOTES[p % 12].us}${Math.floor(p / 12)}`);
             const duration = rhythm.length > 1 ? "16n" : "4n";
             playDictionaryNote("piano", notesToPlay, duration, time);
             frameNotes = [...frameNotes, ...absPitches];
           }
        }
      }

      // --- 3. Melodies / Bass ---
      if (melodies && melodies.length > 0) {
        melodies.forEach((track) => {
          const relativeStep = stepCounter % 16;
          if (track.activeSteps.includes(relativeStep)) {
            let vel =
              track.lowVelocitySteps && track.lowVelocitySteps.includes(relativeStep)
                ? 0.4
                : 0.9;

            const isBass = track.name.toLowerCase().includes("bass");
            let octave = isBass ? 2 : 4;
            let finalNoteName;
            let absNote;

            // Bass Intelligence: Follow chord progression + Leading Tones
            if (isBass && progression && progression.length > 0 && brick) {
               const chordIndex = Math.floor(stepCounter / 16) % progression.length;
               const currentNns = progression[chordIndex];
               const chords = generateChordsFromNNS(brick.rootValue, brick.modeName, [currentNns]);
               
               if (chords.length > 0) {
                 const currentChordRoot = chords[0].rootNote.value;
                 const intervalLabel = (track.pitchSteps && track.pitchSteps[relativeStep]) || 'R';
                 
                 // Leading tone logic on the last step of the measure
                 if (relativeStep === 15 && progression.length > 1) {
                    const nextChordIndex = (chordIndex + 1) % progression.length;
                    const nextChords = generateChordsFromNNS(brick.rootValue, brick.modeName, [progression[nextChordIndex]]);
                    if (nextChords.length > 0) {
                      const resolved = getLeadingTone(nextChords[0].rootNote.value, octave, notation);
                      finalNoteName = resolved.name;
                      absNote = resolved.midi;
                    }
                 }

                 if (!finalNoteName) {
                   const resolved = getBassNote(currentChordRoot, intervalLabel, octave, notation);
                   finalNoteName = resolved.name;
                   absNote = resolved.midi;
                 }
               }
            }

            // Fallback (or non-bass melody)
            if (!finalNoteName) {
              finalNoteName = `${noteNamesArray[rootVal % 12]}${octave}`;
              absNote = getAbsoluteNoteValue(finalNoteName);
            }

            bassSynth.triggerAttackRelease(finalNoteName, "16n", time, vel);
            frameNotes.push(absNote);
          }
        });
      }

      if (frameNotes.length > 0) {
        Tone.Draw.schedule(() => {
          setCurrentlyPlayingNotes(frameNotes);
          setTimeout(() => setCurrentlyPlayingNotes([]), 150);
        }, time);
      }

      stepCounter = (stepCounter + 1) % 64;
    };

    if (isPlaying) {
      Tone.Transport.scheduleRepeat(repeat, "16n");
    } else {
      Tone.Transport.cancel();
      setCurrentStep(-1);
      stepCounter = 0;
    }

    return () => Tone.Transport.cancel();
  }, [isPlaying, setCurrentlyPlayingNotes]);

  const togglePlayback = async () => {
    if (!isAudioReady) {
      await Tone.start();
      Tone.Destination.volume.value = masterVolume;
      Tone.Transport.bpm.value = currentBpm;
      initPianoSampler(() => setIsPianoReady(true));
      initGuitarSampler();
      if (appMode === "studio" && brickRef.current) {
         applyGenrePreset(brickRef.current._group);
      }
      setIsAudioReady(true);
    }

    if (isPlaying) {
      Tone.Transport.stop();
      setIsPlaying(false);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  const handleBpmChange = (e) => {
    const newBpm = Number(e.target.value);
    setCurrentBpm(newBpm);
    Tone.Transport.bpm.value = newBpm;
  };

  return {
    isAudioReady,
    setIsAudioReady,
    isPlaying,
    masterVolume,
    setMasterVolume,
    currentBpm,
    setCurrentBpm,
    instrumentVolumes,
    handleInstrumentVolumeChange,
    currentStep,
    togglePlayback,
    handleBpmChange,
    isPianoReady,
    activeChordTrack
  };
}
