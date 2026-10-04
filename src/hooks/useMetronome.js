// @ts-check
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { startMetronome, stopMetronome } from "../audio/metronome";
import { subscribe, getTransportState } from "../audio/transportOwner";

/**
 * React-facing wrapper around src/audio/metronome.js (VMU-056).
 *
 * Owns only the on/off UI state (no persistence — VMU-050 is a separate
 * ticket, so this always mounts off). All scheduling state (the transport
 * event id) lives in metronome.js itself, and whether the transport is
 * allowed to stop lives in `transportOwner.js` (VMU-163-fix2, decision 4) —
 * which is what let this hook drop the `isPlaying` it used to thread through
 * to `stopMetronome` just to answer "is it safe to stop the transport": the
 * owner already knows, because useSequencer.js reports Play/Stop to that same
 * module. `startMetronome`/`stopMetronome` stay idempotent regardless of how
 * many times this hook re-renders.
 *
 * @param {Object} options
 * @param {() => Promise<void>} options.ensureAudioReady the same audio-context
 *   unlock every other click-triggered sound in the app goes through
 *   (useAudioScheduler, via usePlaybackHandlers) — turning the metronome on
 *   before Play has ever been pressed needs it too.
 */
export function useMetronome({ ensureAudioReady }) {
  // T2 (VMU-025, decision 4): on/off is the transport owner's own flag, read
  // here — the hook no longer keeps a second copy that a missed update could
  // leave showing "on" while the owner thinks "off" (or the reverse).
  const { metronomeOn } = useSyncExternalStore(subscribe, getTransportState, getTransportState);

  const toggleMetronome = useCallback(async () => {
    // Read at call time, for the same reason useSequencer.togglePlayback does.
    if (getTransportState().metronomeOn) {
      stopMetronome();
    } else {
      await ensureAudioReady();
      startMetronome();
    }
  }, [ensureAudioReady]);

  // Safety net, not the source of truth: if whatever renders this hook
  // unmounts while the metronome is on, do not leave a dangling schedule (or
  // a transport this module started) behind. Harmless no-op when nothing is
  // scheduled — metronome.js guards both checks internally.
  useEffect(() => {
    return () => {
      stopMetronome();
    };
  }, []);

  return { metronomeOn, toggleMetronome };
}
