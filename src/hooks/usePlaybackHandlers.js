// @ts-check
import { useAudioScheduler } from "./useAudioScheduler";
import { useDictionaryPlayback } from "./useDictionaryPlayback";
import { useStudioPlayback } from "./useStudioPlayback";
import { useFretboardPlayback } from "./useFretboardPlayback";

/**
 * @param {Object} options
 * @param {boolean} options.isAudioReady
 * @param {Function} options.setIsAudioReady
 * @param {number} options.masterVolume
 * @param {number} options.currentBpm
 * @param {any[]} options.activeNotes
 * @param {string} options.appMode
 * @param {any[]} options.currentAbsoluteNotes
 * @param {Function} options.setCurrentAbsoluteNotes
 * @param {Function} options.setCurrentlyPlayingNotes
 * @param {Function} options.setContextualScaleAbsoluteValues
 * @param {any} options.lastClickedContext
 * @param {Function} options.setLastClickedContext
 * @param {Function} options.setSinglePlayContext
 * @param {any} options.dictRoot
 * @param {string} options.dictType
 * @param {'piano'|'guitar'|'bass'} options.playbackInstrument
 * @param {Function} options.setPlaybackInstrument
 * @param {any} options.guitarFingering
 * @param {any} options.bassFingering
 * @param {any} options.activeBrick
 * @param {Function} options.setClickedChord
 * @param {number} options.chordOctaveOffset
 * @param {any} options.selectedRootStringGuitar
 * @param {any} options.selectedRootStringBass
 * @param {Function} options.setScaleAnchor
 * @param {any} options.scaleAnchor
 * @param {string} [options.notation]
 * @param {number} [options.dictOctave]
 * @param {boolean} [options.useShellVoicings]
 */
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
  dictOctave = 0,
  useShellVoicings = false
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
    useShellVoicings
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
