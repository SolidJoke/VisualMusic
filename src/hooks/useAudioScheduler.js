import { useRef, useCallback } from "react";
import { startAudioEngine, setMasterVolume } from "../audio/AudioEngine";

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
      await startAudioEngine();
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
