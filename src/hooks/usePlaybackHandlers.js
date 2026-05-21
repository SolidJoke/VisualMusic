import { useAudioScheduler } from "./useAudioScheduler";
import { useDictionaryPlayback } from "./useDictionaryPlayback";
import { useStudioPlayback } from "./useStudioPlayback";
import { useFretboardPlayback } from "./useFretboardPlayback";

export function usePlaybackHandlers({
  isAudioReady,
  setIsAudioReady,
  masterVolume,
  currentBpm,
  activeNotes,
  appMode,
  currentAbsoluteNotes,
  setCurrentAbsoluteNotes,
  setCurrentlyPlayingNotes,
  setContextualScaleAbsoluteValues,
  lastClickedContext,
  setLastClickedContext,
  setSinglePlayContext,
  dictRoot,
  dictType,
  playbackInstrument,
  setPlaybackInstrument,
  guitarFingering,
  bassFingering,
  activeBrick,
  setClickedChord,
  chordOctaveOffset,
  selectedRootStringGuitar,
  selectedRootStringBass,
  setScaleAnchor,
  scaleAnchor,
  notation = 'us',
  dictOctave = 0
}) {
  const scheduler = useAudioScheduler({
    isAudioReady,
    setIsAudioReady,
    masterVolume,
  });

  const { playDictionaryAudio } = useDictionaryPlayback({
    dictRoot,
    dictType,
    dictOctave,
    playbackInstrument,
    guitarFingering,
    bassFingering,
    activeBrick,
    activeNotes,
    chordOctaveOffset,
    currentBpm,
    lastClickedContext,
    setCurrentlyPlayingNotes,
    scheduler,
  });

  const { handleChordClick } = useStudioPlayback({
    playbackInstrument,
    selectedRootStringGuitar,
    selectedRootStringBass,
    activeBrick,
    chordOctaveOffset,
    currentAbsoluteNotes,
    setCurrentAbsoluteNotes,
    setCurrentlyPlayingNotes,
    setClickedChord,
    notation,
    scheduler,
  });

  const { playSingleNote, autoPlayNote } = useFretboardPlayback({
    playbackInstrument,
    setPlaybackInstrument,
    appMode,
    dictRoot,
    dictType,
    activeNotes,
    guitarFingering,
    bassFingering,
    activeBrick,
    currentBpm,
    lastClickedContext,
    setCurrentlyPlayingNotes,
    setContextualScaleAbsoluteValues,
    setLastClickedContext,
    setSinglePlayContext,
    setScaleAnchor,
    scheduler,
  });

  return {
    handleChordClick,
    playDictionaryAudio,
    playSingleNote,
    autoPlayNote,
    ensureAudioReady: scheduler.ensureAudioReady,
  };
}
