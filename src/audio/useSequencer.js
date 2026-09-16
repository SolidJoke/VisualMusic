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
import {
  getAbsoluteNoteValue,
  generateChordsFromNNS,
  resolveNnsToChordType,
  resolveChordSemitones,
  PITCH_MAP,
  getBassNote,
  getLeadingTone,
  midiToNoteName
} from "../core/theory";
import { classifyDrumTrack, shouldPlayChordStep } from "./trackMapping";

const noteNamesArray = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

/**
 * Resolves the chord that owns the current step's measure — the one thing
 * both the chord track and the bass track (VMU-129) must agree on. Pure:
 * same inputs, same chord, so it is the single place stepCounter is turned
 * into "which chord of the progression is this", instead of the chord and
 * bass branches each recomputing it (and risking disagreeing).
 *
 * `absolutePitches` are the actual MIDI notes this measure's chord is
 * played at (root position, the octave the Studio octave offset selects) —
 * the same values the chord track sends to the synth, so a consumer that
 * only wants to *display* the chord never has to re-derive them from
 * `chord.nns` and re-guess the octave.
 *
 * @param {number} stepCounter absolute 16th-note step (0..63 across the 4-measure loop)
 * @param {any[]} progression NNS degrees of the current progression
 * @param {any} brick active style (rootValue, scaleKey)
 * @param {number} octaveOffset Studio "Octave Base" setting
 * @returns {{ chordIndex: number, chord: any, absolutePitches: number[] } | null}
 */
export function resolveMeasureChord(stepCounter, progression, brick, octaveOffset) {
  if (!progression || progression.length === 0 || !brick) return null;
  const chordIndex = Math.floor(stepCounter / 16) % progression.length;
  const nns = progression[chordIndex];
  const chords = generateChordsFromNNS(brick.rootValue, brick.scaleKey, [nns]);
  if (chords.length === 0) return null;

  const chord = chords[0];
  const chordType = resolveNnsToChordType(chord.nns);
  const semitones = resolveChordSemitones(chordType)?.semitones || [0, 4, 7];
  // MIDI (C4 = 60), the convention every display uses.
  const baseOctave = 4 + (octaveOffset || 0);
  const absolutePitches = semitones.map((s) => chord.rootNote.value + s + (baseOctave + 1) * 12);

  return { chordIndex, chord, absolutePitches };
}

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

        const drums = drumRef.current;
        const melodies = melodyRef.current;
        const progression = progressionRef.current;
        const rootVal = rootRef.current;
        const brick = brickRef.current;
        const octaveOffset = octaveRef.current;

        let frameNotes = [];

        // --- Measure chord (VMU-129) ---
        // Computed once per step, here — the single source both the chord
        // track (below) and the bass track read from, instead of each
        // recomputing chordIndex/currentNns/chords on its own. Published
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

        // --- 1. Drums ---
        if (drums && drums.length > 0) {
          drums.forEach((track) => {
            const relativeStep = stepCounter % 16;
            if (track.activeSteps.includes(relativeStep)) {
              let vel = track.lowVelocitySteps && track.lowVelocitySteps.includes(relativeStep) ? 0.3 : 0.8;
              // Shared with MidiExporter.js so playback and export can't
              // diverge on what a track name plays as (VMU-128).
              const category = classifyDrumTrack(track.name);

              if (category === "kick") {
                kickSynth.triggerAttackRelease("C1", "8n", time, vel);
              } else if (category === "snare") {
                snareSynth.triggerAttackRelease("16n", time, vel);
              } else {
                hatSynth.triggerAttackRelease("32n", time, vel);
              }
            }
          });
        }

        // --- 2. Chords (Harmonic progression) ---
        if (measureChord) {
          const rhythm = rhythmRef.current || [0];

          // Shared with MidiExporter.js (VMU-125) so an exported chord track
          // can't drift from what this loop actually plays.
          if (shouldPlayChordStep(rhythm, stepCounter)) {
             const notesToPlay = measureChord.absolutePitches.map((p) => midiToNoteName(p));
             const duration = rhythm.length > 1 ? "16n" : "4n";
             playDictionaryNote("piano", notesToPlay, duration, time);
             frameNotes = [...frameNotes, ...measureChord.absolutePitches];
          }
        }

        // --- 3. Melodies / Bass ---
        if (melodies && melodies.length > 0) {
          melodies.forEach((track) => {
            const relativeStep = stepCounter % 16;
            if (track.activeSteps.includes(relativeStep)) {
              let vel = track.lowVelocitySteps && track.lowVelocitySteps.includes(relativeStep) ? 0.4 : 0.9;
              const isBass = track.name.toLowerCase().includes("bass");
              let octave = isBass ? 2 : 4;
              let finalNoteName;
              let absNote;

              if (isBass && measureChord) {
                 const currentChordRoot = measureChord.chord.rootNote.value;
                 const intervalLabel = (track.pitchSteps && track.pitchSteps[relativeStep]) || 'R';

                 if (relativeStep === 15 && progression.length > 1) {
                    const nextChordIndex = (measureChord.chordIndex + 1) % progression.length;
                    const nextChords = generateChordsFromNNS(brick.rootValue, brick.scaleKey, [progression[nextChordIndex]]);
                    if (nextChords.length > 0) {
                      const resolved = getLeadingTone(nextChords[0].rootNote.value, octave);
                      finalNoteName = resolved.name;
                      absNote = resolved.midi;
                    }
                 }

                 if (!finalNoteName) {
                   const resolved = getBassNote(currentChordRoot, intervalLabel, octave);
                   finalNoteName = resolved.name;
                   absNote = resolved.midi;
                 }
              }

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
          Tone.Draw.schedule(() => setCurrentlyPlayingNotes(frameNotes), time);
          Tone.Draw.schedule(() => setCurrentlyPlayingNotes([]), time + 0.15);
        }
      } catch (err) {
        console.error("Error in useSequencer repeat loop:", err);
      } finally {
        stepCounter = (stepCounter + 1) % 64;
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
