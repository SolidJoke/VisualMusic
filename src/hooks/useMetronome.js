// @ts-check
import { useState, useCallback, useEffect, useRef } from "react";
import { startMetronome, stopMetronome } from "../audio/metronome";

/**
 * React-facing wrapper around src/audio/metronome.js (VMU-056).
 *
 * Owns only the on/off UI state (no persistence — VMU-050 is a separate
 * ticket, so this always mounts off). All scheduling state (the transport
 * event id, whether this module started the transport) lives in the module
 * itself, which is what keeps `startMetronome`/`stopMetronome` idempotent
 * regardless of how many times this hook re-renders.
 *
 * @param {Object} options
 * @param {boolean} options.isPlaying the sequencer's own isPlaying (useSequencer),
 *   read here only to tell stopMetronome whether an extinction is allowed to
 *   stop the transport — never used to start or stop playback itself.
 * @param {() => Promise<void>} options.ensureAudioReady the same audio-context
 *   unlock every other click-triggered sound in the app goes through
 *   (useAudioScheduler, via usePlaybackHandlers) — turning the metronome on
 *   before Play has ever been pressed needs it too.
 */
export function useMetronome({ isPlaying, ensureAudioReady }) {
  const [metronomeOn, setMetronomeOn] = useState(false);

  // Read, not depended-on: stopMetronome must see the *current* isPlaying at
  // the moment it runs (toggle click, or unmount), not the value from
  // whichever render created the callback. Synced via an effect, not written
  // directly in the render body — a ref mutation during render is only safe
  // for the narrow "nothing else reads it until after this render" case, and
  // eslint-plugin-react-hooks (v7, React Compiler-based rules) flags it here.
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const toggleMetronome = useCallback(async () => {
    if (metronomeOn) {
      stopMetronome({ isSequencerPlaying: isPlayingRef.current });
      setMetronomeOn(false);
    } else {
      await ensureAudioReady();
      startMetronome();
      setMetronomeOn(true);
    }
  }, [metronomeOn, ensureAudioReady]);

  // Safety net, not the source of truth: if whatever renders this hook
  // unmounts while the metronome is on, do not leave a dangling schedule (or
  // a transport this module started) behind. Harmless no-op when nothing is
  // scheduled — metronome.js guards both checks internally.
  useEffect(() => {
    return () => {
      stopMetronome({ isSequencerPlaying: isPlayingRef.current });
    };
  }, []);

  return { metronomeOn, toggleMetronome };
}
