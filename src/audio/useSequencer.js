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

export function useSequencer({
  appMode,
  activeBrick,
  activeDrums,
  activeMelody,
  activeProgression,
  currentRootValue,
  setCurrentlyPlayingNotes,
  chordOctaveOffset = 0,
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

  drumRef.current = activeDrums;
  melodyRef.current = activeMelody;
  progressionRef.current = activeProgression;
  rootRef.current = currentRootValue;
  appModeRef.current = appMode;
  brickRef.current = activeBrick;
  octaveRef.current = chordOctaveOffset;

  // Generate a virtual track for chords based on current rhythm
  const activeChordTrack = {
    name: "Chords",
    activeSteps: brickRef.current?.chordRhythm 
      ? Array.from({ length: 16 }).flatMap((_, beat) => 
          brickRef.current.chordRhythm.map(stepInBeat => beat * 4 + stepInBeat)
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
        const rhythm = brick.chordRhythm || [0];
        
        if (rhythm.includes(stepCounter % 4)) {
           const chords = generateChordsFromNNS(brick.rootValue, brick.modeName, [currentNns]);
           if (chords.length > 0) {
             const c = chords[0];
             const rootValChord = c.rootNote.value;
             const chordType = resolveNnsToChordType(c.nns);
             const semitones = resolveChordSemitones(chordType)?.semitones || [0, 4, 7];
             const baseOctave = 4 + (octaveOffset || 0);
             const absPitches = semitones.map(s => rootValChord + s + baseOctave * 12);
             
             const notesToPlay = absPitches.map(p => `${NOTES[p % 12].us}${Math.floor(p / 12)}`);
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
            let octave = track.name.toLowerCase().includes("bass") ? 2 : 4;
            let noteName = `${noteNamesArray[rootVal % 12]}${octave}`;
            bassSynth.triggerAttackRelease(noteName, "16n", time, vel);
            
            const absNote = getAbsoluteNoteValue(noteName);
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
      Tone.Transport.pause();
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
