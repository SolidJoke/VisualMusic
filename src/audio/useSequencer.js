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
} from "./AudioEngine";
import { getAbsoluteNoteValue, NOTES } from "../core/theory";

const noteNamesArray = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export function useSequencer({
  appMode,
  activeBrick,
  activeDrums,
  activeMelody,
  currentRootValue,
  setCurrentlyPlayingNotes,
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
  const rootRef = useRef(currentRootValue);
  const appModeRef = useRef(appMode);

  drumRef.current = activeDrums;
  melodyRef.current = activeMelody;
  rootRef.current = currentRootValue;
  appModeRef.current = appMode;

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
      const rootVal = rootRef.current;

      if (drums && drums.length > 0) {
        drums.forEach((track) => {
          if (track.activeSteps.includes(stepCounter)) {
            let vel =
              track.lowVelocitySteps && track.lowVelocitySteps.includes(stepCounter)
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

      if (melodies && melodies.length > 0) {
        melodies.forEach((track) => {
          if (track.activeSteps.includes(stepCounter)) {
            let vel =
              track.lowVelocitySteps && track.lowVelocitySteps.includes(stepCounter)
                ? 0.4
                : 0.9;
            let octave = track.name.toLowerCase().includes("bass") ? 2 : 4;
            let noteName = `${noteNamesArray[rootVal % 12]}${octave}`;
            bassSynth.triggerAttackRelease(noteName, "16n", time, vel);
            Tone.Draw.schedule(() => {
              const absNote = getAbsoluteNoteValue(noteName);
              setCurrentlyPlayingNotes([absNote]);
              setTimeout(() => setCurrentlyPlayingNotes([]), 150);
            }, time);
          }
        });
      }

      stepCounter = (stepCounter + 1) % 16;
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
      if (appMode === "studio" && typeof activeBrick !== "undefined" && activeBrick) {
         applyGenrePreset(activeBrick._group);
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
    isPianoReady
  };
}
