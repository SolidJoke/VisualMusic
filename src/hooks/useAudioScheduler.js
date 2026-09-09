// @ts-check
import { useRef, useCallback } from "react";
import { initAudio, setMasterVolume } from "../audio/AudioEngine";

/**
 * @param {Object} options
 * @param {boolean} options.isAudioReady
 * @param {Function} options.setIsAudioReady
 * @param {number} options.masterVolume
 */
export function useAudioScheduler({
  isAudioReady,
  setIsAudioReady,
  masterVolume,
}) {
  const playTokenRef = useRef(0);

  const startPlaybackSession = useCallback(() => {
    playTokenRef.current += 1;
    return playTokenRef.current;
  }, []);

  const isCurrentSession = useCallback((token) => {
    return playTokenRef.current === token;
  }, []);

  const ensureAudioReady = useCallback(async () => {
    if (!isAudioReady) {
      await initAudio();
      setMasterVolume(masterVolume);
      setIsAudioReady(true);
    }
  }, [isAudioReady, setIsAudioReady, masterVolume]);

  return {
    startPlaybackSession,
    isCurrentSession,
    ensureAudioReady,
  };
}
