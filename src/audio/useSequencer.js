// @ts-check
import { useState, useEffect, useRef, useMemo } from "react";
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
import { resolveChordAt, stepEvents } from "./dispatch";
import { playStepEvents } from "./playStep";
import { describeChord, loopSteps, timelineFromSelection } from "../core/timeline";

/** The synths the Studio loop plays a step on (playStep.js). */
const STUDIO_SYNTHS = { kickSynth, snareSynth, hatSynth, bassSynth, playDictionaryNote };

/** Defaults of the pre-T3 selection options: nothing selected (frozen: shared by every call). */
const NOTHING = /** @type {any[]} */ (Object.freeze([]));

/**
 * The Studio's playback loop. It plays a timeline document (core/timeline.js)
 * over the document's own length: `timeline`, which useStudioMode builds.
 *
 * Callers that predate T3 pass the style's selection instead —
 * `activeDrums`, `activeMelody`, `activeProgression`, `activeRhythm`, the
 * shape useStudioMode handed over before — and the loop fills the document
 * from it with the function the Studio fills it with
 * (`timelineFromSelection`). The tests drive the hook that way, among them
 * PlaybackGolden.test.jsx, which is frozen. `timeline` has no default on
 * purpose: HookOptionContracts.test.js then requires the app's call site to
 * pass it, where forgetting it would leave the Studio playing an empty
 * selection.
 *
 * @param {Object} options
 * @param {string} options.appMode
 * @param {any} options.activeBrick the style; its genre preset is applied on the first play
 * @param {import("../core/timeline").TimelineDoc} options.timeline what the loop plays
 * @param {any[]} [options.activeDrums] pre-T3 selection, when there is no `timeline`
 * @param {any[]} [options.activeMelody] pre-T3 selection, when there is no `timeline`
 * @param {any[]} [options.activeProgression] pre-T3 selection, when there is no `timeline`
 * @param {any} [options.activeRhythm] pre-T3 selection, when there is no `timeline`
 * @param {number} options.currentRootValue
 * @param {Function} options.setCurrentlyPlayingNotes
 * @param {number} [options.chordOctaveOffset]
 */
export function useSequencer({
  appMode,
  activeBrick,
  timeline,
  activeDrums = NOTHING,
  activeMelody = NOTHING,
  activeProgression = NOTHING,
  activeRhythm = null,
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

  // Pre-T3 callers: the document their selection fills (see above). A
  // missing rhythm plays as [0], as it always has.
  const selectionTimeline = useMemo(
    () =>
      timeline
        ? null
        : timelineFromSelection({
            brick: activeBrick,
            drums: activeDrums,
            melody: activeMelody,
            progression: activeProgression,
            rhythm: activeRhythm || [0],
          }),
    [timeline, activeBrick, activeDrums, activeMelody, activeProgression, activeRhythm],
  );

  const timelineRef = useRef(timeline || selectionTimeline);
  const rootRef = useRef(currentRootValue);
  const appModeRef = useRef(appMode);
  const brickRef = useRef(activeBrick);
  const octaveRef = useRef(chordOctaveOffset);

  timelineRef.current = timeline || selectionTimeline;
  rootRef.current = currentRootValue;
  appModeRef.current = appMode;
  brickRef.current = activeBrick;
  octaveRef.current = chordOctaveOffset;

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
    // VMU-129: index (in the document) of the chord last published via
    // setCurrentPlayingChord, so the state update (and the Draw-scheduled
    // callback it costs) only fires when the chord changes, not every step.
    let lastPublishedChordIndex = null;

    const repeat = (time) => {
      Tone.Draw.schedule(() => setCurrentStep(stepCounter), time);

      try {
        if (appModeRef.current === "dictionary") {
          stepCounter = (stepCounter + 1) % 16;
          return;
        }

        const doc = timelineRef.current;
        const octaveOffset = octaveRef.current;

        // --- The chord of the moment (VMU-129) ---
        // The same chord stepEvents plays below (dispatch.js resolveChordAt,
        // core/timeline.js chordAt), published — once per chord, not per
        // step — so the instruments can follow the chord actually playing
        // instead of the last clicked one. Shown the way the app shows a
        // chord (describeChord), with the pitches the chord row plays.
        const playing = resolveChordAt(doc, stepCounter, octaveOffset);
        const playingIndex = playing ? playing.index : null;
        if (playingIndex !== lastPublishedChordIndex) {
          lastPublishedChordIndex = playingIndex;
          const forDisplay = playing
            ? { ...describeChord(doc.key, playing.chord), absolutePitches: playing.absolutePitches }
            : null;
          Tone.Draw.schedule(() => setCurrentPlayingChord(forDisplay), time);
        }

        // --- What plays on this step: drums, chord, melodic tracks ---
        // Decided by stepEvents (dispatch.js), the same function the MIDI
        // export and the audio harness read; this loop only plays it.
        const events = stepEvents(doc, stepCounter, { octaveOffset, rootValue: rootRef.current });
        const frameNotes = playStepEvents(STUDIO_SYNTHS, events, time);

        if (frameNotes.length > 0) {
          Tone.Draw.schedule(() => setCurrentlyPlayingNotes(frameNotes), time);
          Tone.Draw.schedule(() => setCurrentlyPlayingNotes([]), time + 0.15);
        }
      } catch (err) {
        console.error("Error in useSequencer repeat loop:", err);
      } finally {
        // The document's window: 64 steps at 4 measures, 128 at 8.
        stepCounter = (stepCounter + 1) % loopSteps(timelineRef.current);
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
    currentPlayingChord
  };
}
