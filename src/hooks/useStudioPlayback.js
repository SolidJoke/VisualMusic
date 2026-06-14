import { useCallback } from "react";
import * as Tone from 'tone';
import { NOTES, resolveNnsToChordType, getClosestInversionN, resolveChordSemitones } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { getGuitarFingering, getBassFingering } from "../core/fingeringLogic";
import { getInstrumentTuning, fingeringMapToAbsolutePitches } from "./playbackUtils";
import { applyShellVoicing } from "../core/voicingEngine";

export function useStudioPlayback({
  playbackInstrument,
  selectedRootStringGuitar,
  selectedRootStringBass,
  activeBrick,
  chordOctaveOffset = 0,
  currentAbsoluteNotes,
  setCurrentAbsoluteNotes,
  setCurrentlyPlayingNotes,
  setClickedChord,
  notation = 'us',
  scheduler,
  useShellVoicings = false,
}) {
  const handleChordClick = useCallback(async (c, chordIndexInProgression) => {
    await scheduler.ensureAudioReady();
    if (setClickedChord) setClickedChord(c);
    const rootVal = c.rootNote.value;
    const chordType = resolveNnsToChordType(c.nns);
    
    let absolutePitches = [];
    
    if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
      const localFingering = (playbackInstrument === "guitar") 
        ? getGuitarFingering(rootVal, chordType, selectedRootStringGuitar)
        : getBassFingering(rootVal, chordType, selectedRootStringBass);

      const fingeringMap = localFingering?.fingeringMap;
      
      if (fingeringMap) {
        const tuning = getInstrumentTuning(playbackInstrument, activeBrick);
        const reversedTuning = [...tuning].reverse();
        absolutePitches = fingeringMapToAbsolutePitches(fingeringMap, reversedTuning)
          .map(p => p.absoluteValue);
      }
    }

    if (absolutePitches.length === 0) {
      const isMinor = c.nns.includes("-");
      const isDim = c.nns.includes("°") || c.nns.includes("b5");
      let thirdInterval = isMinor || isDim ? 3 : 4;
      let fifthInterval = isDim ? 6 : 7;
      const prevNotes = chordIndexInProgression === 0 ? [] : currentAbsoluteNotes;
      
      const baseOctave = 4 + (chordOctaveOffset || 0);
      const chordData = resolveChordSemitones(chordType);
      const semitones = chordData ? chordData.semitones : [0, thirdInterval, fifthInterval];
      
      absolutePitches = getClosestInversionN(prevNotes, rootVal, semitones, chordOctaveOffset || 0);
    }
    
    if (useShellVoicings && playbackInstrument === "piano") {
       // Only apply shell voicings for piano to avoid breaking guitar fingering maps
       const baseMidiRoot = (4 + (chordOctaveOffset || 0)) * 12 + rootVal;
       absolutePitches = applyShellVoicing(absolutePitches, baseMidiRoot);
    }

    const notesToPlay = absolutePitches.map((n) => {
      const noteName = notation === 'eu' ? NOTES[n % 12].eu : NOTES[n % 12].us;
      return `${noteName}${Math.floor(n / 12)}`;
    });

    const currentToken = scheduler.startPlaybackSession();
    const scheduleTime = Tone.now() + 0.5;
    playDictionaryNote(playbackInstrument, notesToPlay, "2n");
    setCurrentAbsoluteNotes(absolutePitches);
    setCurrentlyPlayingNotes(absolutePitches);
    Tone.getDraw().schedule(() => {
      if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
    }, scheduleTime);
  }, [
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
  ]);

  return { handleChordClick };
}
