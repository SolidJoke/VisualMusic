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
import { playMusic, stopMusic } from "./transportOwner";

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
  // The loop's own progress, kept in refs (not local effect variables) so
  // `repeat` below can be registered directly from togglePlayback instead of
  // from an effect (VMU-163-fix2, decision 2 — see that function).
  const stepCounterRef = useRef(0);
  // VMU-129: index (in the document) of the chord last published via
  // setCurrentPlayingChord, so the state update (and the Draw-scheduled
  // callback it costs) only fires when the chord changes, not every step.
  const lastPublishedChordIndexRef = useRef(null);
  // The transport repeat id `playMusic` hands back, so Stop (and the unmount
  // safety net below) can clear exactly this registration.
  const repeatIdRef = useRef(null);
  // Read at call time inside `repeat` (registered once per Play, potentially
  // long-lived) rather than closed over directly, so a later render's new
  // `setCurrentlyPlayingNotes` identity is still the one used — the old
  // effect achieved the same by re-registering on that dependency changing;
  // this hook no longer re-registers on every render.
  const setCurrentlyPlayingNotesRef = useRef(setCurrentlyPlayingNotes);

  timelineRef.current = timeline || selectionTimeline;
  rootRef.current = currentRootValue;
  appModeRef.current = appMode;
  brickRef.current = activeBrick;
  octaveRef.current = chordOctaveOffset;
  setCurrentlyPlayingNotesRef.current = setCurrentlyPlayingNotes;

  const handleInstrumentVolumeChange = (instrument, value) => {
    const val = Number(value);
    setInstrumentVolumes((prev) => ({ ...prev, [instrument]: val }));
    setInstrumentVolume(instrument, val);
  };

  useEffect(() => {
    Tone.Destination.volume.rampTo(masterVolume, 0.05);
  }, [masterVolume]);

  /**
   * The Studio's playback loop callback. Registered on the transport by
   * `togglePlayback` below, not by an effect (VMU-163-fix2, decision 2): it
   * must be scheduled — anchored at tick 0 — *before* the transport
   * (re)starts, in the same synchronous call, so step 0 of the music sounds
   * at tick 0 instead of at the next 16th-note boundary. The pre-fix version
   * lived inside a `useEffect` keyed on `isPlaying`, so the registration
   * happened one render *after* `Tone.Transport.start()` — measured 9.6 ms
   * late in the running app, which is what put the music's own grid out of
   * phase with the metronome's (VMU-163-fix2 brief, sequence 1).
   */
  const repeat = (time) => {
    Tone.Draw.schedule(() => setCurrentStep(stepCounterRef.current), time);

    try {
      if (appModeRef.current === "dictionary") {
        stepCounterRef.current = (stepCounterRef.current + 1) % 16;
        return;
      }

      const doc = timelineRef.current;
      const octaveOffset = octaveRef.current;
      const stepCounter = stepCounterRef.current;

      // --- The chord of the moment (VMU-129) ---
      // The same chord stepEvents plays below (dispatch.js resolveChordAt,
      // core/timeline.js chordAt), published — once per chord, not per
      // step — so the instruments can follow the chord actually playing
      // instead of the last clicked one. Shown the way the app shows a
      // chord (describeChord), with the pitches the chord row plays.
      const playing = resolveChordAt(doc, stepCounter, octaveOffset);
      const playingIndex = playing ? playing.index : null;
      if (playingIndex !== lastPublishedChordIndexRef.current) {
        lastPublishedChordIndexRef.current = playingIndex;
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
        const publish = setCurrentlyPlayingNotesRef.current;
        Tone.Draw.schedule(() => publish(frameNotes), time);
        Tone.Draw.schedule(() => publish([]), time + 0.15);
      }
    } catch (err) {
      console.error("Error in useSequencer repeat loop:", err);
    } finally {
      // The document's window: 64 steps at 4 measures, 128 at 8.
      stepCounterRef.current = (stepCounterRef.current + 1) % loopSteps(timelineRef.current);
    }
  };

  // Safety net, not the source of truth (same pattern as useMetronome.js's
  // own unmount cleanup): if whatever renders this hook unmounts while
  // playing, do not leave a dangling schedule behind. Harmless no-op when
  // nothing is scheduled.
  useEffect(() => {
    return () => {
      if (repeatIdRef.current !== null) {
        stopMusic((transport) => {
          transport.clear(repeatIdRef.current);
          repeatIdRef.current = null;
        });
      }
    };
  }, []);

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
      // transportOwner.stopMusic (VMU-163-fix2, decision 4) stops the
      // transport itself only if the metronome is not keeping it alive
      // (VMU-056) — this used to be an unconditional `Tone.Transport.stop()`,
      // which is exactly what silenced a metronome the button still showed
      // as "on" (VMU-163-fix2 brief, sequence 3).
      stopMusic((transport) => {
        if (repeatIdRef.current !== null) {
          transport.clear(repeatIdRef.current);
          repeatIdRef.current = null;
        }
      });
      setIsPlaying(false);
      setCurrentStep(-1);
      stepCounterRef.current = 0;
      lastPublishedChordIndexRef.current = null;
      // At rest, useMusicEngine falls back to clickedChord on its own
      // (isPlaying is false) — this reset is hygiene, not a behavior gate.
      setCurrentPlayingChord(null);
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
      stepCounterRef.current = 0;
      lastPublishedChordIndexRef.current = null;
      // transportOwner.playMusic (VMU-163-fix2, decisions 1+2) resets the
      // transport to tick 0, then — synchronously, before it (re)starts —
      // registers this loop's own repeat with an explicit start of `0`, so
      // step 0 sounds at tick 0 on the same grid the metronome uses.
      playMusic((transport) => {
        repeatIdRef.current = transport.scheduleRepeat(repeat, "16n", 0);
      });
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
