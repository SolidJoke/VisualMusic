import { useCallback } from "react";

/**
 * Hook to export a debug snapshot of the application state.
 * 
 * @param {Object} params
 * @param {Object} params.appContextState
 * @param {Object} params.musicEngineState
 * @param {Object} params.sequencerState
 * @param {Array} params.errors
 * @returns {Object} { exportDebugSnapshot }
 */
export default function useDebugExport({
  appContextState = {},
  musicEngineState = {},
  sequencerState = {},
  errors = [],
} = {}) {
  const exportDebugSnapshot = useCallback(() => {
    try {
      const appMode = appContextState?.appMode;
      const lang = appContextState?.lang;
      const notation = appContextState?.notation;
      const playbackInstrument = appContextState?.playbackInstrument;
      const showFingering = appContextState?.showFingering;
      const fingeringMode = appContextState?.fingeringMode;
      const uiTheme = appContextState?.uiTheme;
      const layoutMode = appContextState?.layoutMode;

      const dictRoot = musicEngineState?.dictRoot;
      const dictType = musicEngineState?.dictType;
      const activeNotes = musicEngineState?.activeNotes ?? [];
      const currentlyPlayingNotes = musicEngineState?.currentlyPlayingNotes ?? [];
      const guitarFingering = musicEngineState?.guitarFingering ?? null;
      const bassFingering = musicEngineState?.bassFingering ?? null;

      const isAudioReady = sequencerState?.isAudioReady ?? false;
      const isPlaying = sequencerState?.isPlaying ?? false;
      const masterVolume = sequencerState?.masterVolume ?? -12;
      const currentBpm = sequencerState?.currentBpm ?? 120;
      const instrumentVolumes = sequencerState?.instrumentVolumes ?? {};

      const snapshot = {
        timestamp: new Date().toISOString(),
        appVersion: import.meta.env?.VITE_APP_VERSION || "0.0.0",
        context: {
          appMode,
          lang,
          notation,
          playbackInstrument,
          showFingering,
          fingeringMode,
          uiTheme,
          layoutMode,
        },
        musicEngine: {
          dictRoot,
          dictType,
          activeNotes,
          currentlyPlayingNotes,
          guitarFingering,
          bassFingering,
        },
        audio: {
          isAudioReady,
          isPlaying,
          masterVolume,
          currentBpm,
          instrumentVolumes,
        },
        errors: errors ?? [],
      };

      // Trigger file download in the browser
      const dataStr = JSON.stringify(snapshot, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataUri);
      downloadAnchor.setAttribute("download", `visualmusic-debug-${Date.now()}.json`);
      downloadAnchor.style.display = "none";
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      return snapshot;
    } catch (err) {
      console.warn("Failed to export debug snapshot:", err);
      // Return a minimal object if something failed
      return {
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }, [appContextState, musicEngineState, sequencerState, errors]);

  return { exportDebugSnapshot };
}
