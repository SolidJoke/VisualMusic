// @ts-check
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
  playDictionaryNote,
  getPianoSynth,
  getGuitarSynth
} from "./AudioEngine";
import { resolveMeasureChord, stepEvents, LOOP_STEPS } from "./dispatch";
import { playStepEvents } from "./playStep";

// T1: resolveMeasureChord moved to dispatch.js with the rest of "what plays
// on this step". Re-exported so its importers — DAWHelper.jsx, the tests,
// and AppRoot.test.jsx's mock of this module — keep working unchanged.
export { resolveMeasureChord };

/** The synths the Studio loop plays a step on (playStep.js). */
const STUDIO_SYNTHS = { kickSynth, snareSynth, hatSynth, bassSynth, playDictionaryNote };

/**
 * @param {Object} options
 * @param {string} options.appMode
 * @param {any} options.activeBrick
 * @param {any[]} options.activeDrums
 * @param {any[]} options.activeMelody
 * @param {any[]} options.activeProgression
 * @param {any} options.activeRhythm
 * @param {number} options.currentRootValue
 * @param {Function} options.setCurrentlyPlayingNotes
 * @param {number} [options.chordOctaveOffset]
 */
export function useSequencer({
  appMode,
  activeBrick,
  activeDrums,
  activeMelody,
  activeProgression,
  activeRhythm,
  currentRootValue,
  setCurrentlyPlayingNotes,
  chordOctaveOffset = 0
}) {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(-12);
  const [currentBpm, setCurrentBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPianoReady, setIsPianoReady] = useState(false);
  // VMU-129: the chord this measure of the loop is playing, published once
  // per measure so useMusicEngine can make the instruments follow it during
  // playback instead of the last clicked chord. Same shape as clickedChord
  // ({ rootNote: { value }, nns, ... }) plus absolutePitches. Null at rest.
  const [currentPlayingChord, setCurrentPlayingChord] = useState(null);
  
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
    Tone.Destination.volume.rampTo(masterVolume, 0.05);
  }, [masterVolume]);

  useEffect(() => {
    let stepCounter = 0;
    // VMU-129: chordIndex of the measure last published via
    // setCurrentPlayingChord, so the state update (and the Draw-scheduled
    // callback it costs) only fires at a measure boundary, not every step.
    let lastPublishedChordIndex = null;

    const repeat = (time) => {
      Tone.Draw.schedule(() => setCurrentStep(stepCounter), time);

      try {
        if (appModeRef.current === "dictionary") {
          stepCounter = (stepCounter + 1) % 16;
          return;
        }

        const progression = progressionRef.current;
        const brick = brickRef.current;
        const octaveOffset = octaveRef.current;

        // --- Measure chord (VMU-129) ---
        // The same resolveMeasureChord stepEvents reads below, published
        // (once per measure, not per step) so the instruments can follow
        // the chord actually playing instead of the last clicked one.
        const measureChord = resolveMeasureChord(stepCounter, progression, brick, octaveOffset);
        const measureChordIndex = measureChord ? measureChord.chordIndex : null;
        if (measureChordIndex !== lastPublishedChordIndex) {
          lastPublishedChordIndex = measureChordIndex;
          const forDisplay = measureChord
            ? { ...measureChord.chord, absolutePitches: measureChord.absolutePitches }
            : null;
          Tone.Draw.schedule(() => setCurrentPlayingChord(forDisplay), time);
        }

        // --- What plays on this step: drums, chord, melodic tracks ---
        // Decided by stepEvents (dispatch.js), the same function the MIDI
        // export and the audio harness read; this loop only plays it.
        const events = stepEvents(
          {
            brick,
            drums: drumRef.current,
            melody: melodyRef.current,
            progression,
            rhythm: rhythmRef.current || [0],
            octaveOffset,
            rootValue: rootRef.current,
          },
          stepCounter,
        );
        const frameNotes = playStepEvents(STUDIO_SYNTHS, events, time);

        if (frameNotes.length > 0) {
          Tone.Draw.schedule(() => setCurrentlyPlayingNotes(frameNotes), time);
          Tone.Draw.schedule(() => setCurrentlyPlayingNotes([]), time + 0.15);
        }
      } catch (err) {
        console.error("Error in useSequencer repeat loop:", err);
      } finally {
        stepCounter = (stepCounter + 1) % LOOP_STEPS;
      }
    };

    let repeatId = null;

    if (isPlaying) {
      repeatId = Tone.Transport.scheduleRepeat(repeat, "16n");
    } else {
      if (repeatId !== null) Tone.Transport.clear(repeatId);
      setCurrentStep(-1);
      stepCounter = 0;
      // At rest, useMusicEngine falls back to clickedChord on its own
      // (isPlaying is false) — this reset is hygiene, not a behavior gate.
      setCurrentPlayingChord(null);
    }

    return () => {
      if (repeatId !== null) Tone.Transport.clear(repeatId);
    };
  }, [isPlaying, setCurrentlyPlayingNotes]);

  const togglePlayback = async () => {
    if (!isAudioReady) {
      await Tone.start();
      // Apply lookAhead buffer here — must be set AFTER Tone.start() to be effective.
      // Reduces audio glitches under high CPU load (scheduling safety margin).
      Tone.context.lookAhead = 0.1;
      // Set initial volume directly (no rampTo needed: audio context just started, no audible click risk)
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
      try {
        bassSynth.triggerRelease();
        const piano = getPianoSynth();
        if (piano?.releaseAll) piano.releaseAll();
        const guitar = getGuitarSynth();
        if (guitar?.releaseAll) guitar.releaseAll();
      } catch (e) {
        // synth may not be initialized yet
      }
    } else {
      Tone.Transport.stop();
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  /**
   * Sets the transport tempo.
   *
   * Takes a number. It used to take a change event and read `e.target.value`,
   * and the two call sites disagreed: SequencerPanel passed the number — so
   * every BPM touch on the phone and tablet layouts threw "Cannot read
   * properties of undefined (reading 'value')" and the slider snapped back —
   * while Sidebar wrapped its number in a fake `{target:{value}}` to satisfy a
   * signature it did not need. A number is what both callers actually had.
   *
   * @param {number} bpm
   */
  const handleBpmChange = (bpm) => {
    const newBpm = Number(bpm);
    if (!Number.isFinite(newBpm)) return;
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
    activeChordTrack,
    currentPlayingChord
  };
}
