// @ts-check
import { useState, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
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
import { DEFAULT_MIXER_LEVELS } from "./InstrumentPresets";
import { resolveChordAt, stepEvents } from "./dispatch";
import { playStepEvents } from "./playStep";
import { describeChord, loopSteps, timelineFromSelection } from "../core/timeline";
import {
  playMusic,
  stopMusic,
  setTempo,
  unlockAudio,
  subscribe as subscribeTransport,
  getTransportState,
} from "./transportOwner";

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
  // T2 (VMU-025, decision 4): whether the music plays and the tempo are the
  // transport owner's state, read here — no React copy of either to keep in
  // step with it (transportOwner.js, "One copy of the state").
  const { musicPlaying: isPlaying, bpm: currentBpm } = useSyncExternalStore(
    subscribeTransport,
    getTransportState,
    getTransportState, // server snapshot: AppRoot.test.jsx renders to a string
  );
  const [masterVolume, setMasterVolume] = useState(-12);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPianoReady, setIsPianoReady] = useState(false);
  // VMU-129: the chord this measure of the loop is playing, published once
  // per measure so useMusicEngine can make the instruments follow it during
  // playback instead of the last clicked chord. Same shape as clickedChord
  // ({ rootNote: { value }, nns, ... }) plus absolutePitches. Null at rest.
  const [currentPlayingChord, setCurrentPlayingChord] = useState(null);
  
  const [instrumentVolumes, setInstrumentVolumes] = useState(() => ({ ...DEFAULT_MIXER_LEVELS }));

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
  };

  // T2 / VMU-153, decision 3: the mixer nodes play at the levels the mixer
  // displays — always, not only once a slider has moved. This effect is the
  // one place the displayed levels reach `AudioEngine.instrumentVols`: at
  // mount (the nodes are built at 0 dB, AudioEngine.js), after every slider
  // move, and after anything else that ever sets `instrumentVolumes`.
  //
  // At mount it runs before the audio context is unlocked; Tone schedules
  // the value on the context's own timeline, which then starts from it. The
  // first application is a set, not the slider's 50 ms ramp: a ramp
  // scheduled on a context that has not started yet would still be running
  // under the first notes of the first Play. Only the levels that changed
  // since the last application are sent.
  const appliedLevelsRef = useRef(/** @type {Record<string, number>} */ ({}));
  useEffect(() => {
    const applied = appliedLevelsRef.current;
    for (const [instrument, db] of Object.entries(instrumentVolumes)) {
      if (applied[instrument] === db) continue;
      setInstrumentVolume(instrument, db, instrument in applied ? undefined : 0);
      applied[instrument] = db;
    }
  }, [instrumentVolumes]);

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
      // Unlocks the context and sets its lookAhead (transportOwner.js, the
      // only writer of either since T2, decision 2).
      await unlockAudio();
      // Set initial volume directly (no rampTo needed: audio context just started, no audible click risk)
      Tone.Destination.volume.value = masterVolume;
      // The tempo is already on the transport (setTempo writes it at once);
      // re-applied through the same owner after the unlock, as this first
      // Play always did, so nothing depends on a write made while the
      // context was still suspended.
      setTempo(getTransportState().bpm);
      initPianoSampler(() => setIsPianoReady(true));
      initGuitarSampler();
      if (appMode === "studio" && brickRef.current) {
         applyGenrePreset(brickRef.current._group);
      }
      setIsAudioReady(true);
    }

    // Read from the owner now, not from this render's `isPlaying`: two clicks
    // made before the first `await` above resolved share one render, so a
    // captured value made both of them Play and left one step repeat
    // registered forever (TransportStateAgreement.test.jsx, race case).
    if (getTransportState().musicPlaying) {
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
   * Goes through the transport owner (T2, decision 1), which writes the
   * transport and the displayed value in one call; non-numbers are ignored
   * there.
   *
   * @param {number} bpm
   */
  const handleBpmChange = (bpm) => {
    setTempo(bpm);
  };

  return {
    isAudioReady,
    setIsAudioReady,
    isPlaying,
    masterVolume,
    setMasterVolume,
    currentBpm,
    // Kept under its old name for AppDesktop's style change (the style
    // imposes its tempo); it is the owner's setTempo, not a React setter.
    setCurrentBpm: setTempo,
    instrumentVolumes,
    handleInstrumentVolumeChange,
    currentStep,
    togglePlayback,
    handleBpmChange,
    isPianoReady,
    currentPlayingChord
  };
}
