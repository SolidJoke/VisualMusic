// @ts-check
import { useCallback } from "react";
import * as Tone from 'tone';
import { resolveNnsToChordType, getClosestInversionN, resolveChordSemitones, midiToNoteName } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { getGuitarFingering, getBassFingering } from "../core/fingeringLogic";
import { getInstrumentTuning, fingeringMapToAbsolutePitches } from "./playbackUtils";
import { applyShellVoicing } from "../core/voicingEngine";

/**
 * @param {Object} options
 * @param {'piano'|'guitar'|'bass'} options.playbackInstrument
 * @param {any} options.selectedRootStringGuitar
 * @param {any} options.selectedRootStringBass
 * @param {any} options.activeBrick
 * @param {number} [options.chordOctaveOffset]
 * @param {any[]} options.currentAbsoluteNotes
 * @param {Function} options.setCurrentAbsoluteNotes
 * @param {Function} options.setCurrentlyPlayingNotes
 * @param {Function} options.setClickedChord
 * @param {any} options.scheduler
 * @param {boolean} [options.useShellVoicings]
 */
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
  scheduler,
  useShellVoicings = false,
}) {
  const handleChordClick = useCallback(async (c, chordIndexInProgression) => {
    await scheduler.ensureAudioReady();
    if (setClickedChord) setClickedChord(c);
    const rootVal = c.rootNote.value;
    const chordType = resolveNnsToChordType(c.nns);
    
    let absolutePitches = [];
    // VMU-180: what the neck flashes, tagged with its instrument and place so the
    // piano (which flashes every untagged pitch as its own) stays still. Stays
    // null when the notes do not come from a grip: they are then bare pitches.
    let flashedNotes = null;
    
    if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
      // VMU-201 — the neck keeps its octave-0 shape whatever "Octave des
      // accords" says; the piano path below still follows the setting.
      const localFingering = (playbackInstrument === "guitar")
        ? getGuitarFingering(rootVal, chordType, selectedRootStringGuitar, 0)
        : getBassFingering(rootVal, chordType, selectedRootStringBass, 0);

      const fingeringMap = localFingering?.fingeringMap;
      
      if (fingeringMap) {
        const tuning = getInstrumentTuning(playbackInstrument, activeBrick);
        const reversedTuning = [...tuning].reverse();
        const grip = fingeringMapToAbsolutePitches(fingeringMap, reversedTuning, playbackInstrument);
        absolutePitches = grip.map(p => p.absoluteValue);
        if (grip.length > 0) flashedNotes = grip;
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
       // MIDI, like the pitches it filters — only its pitch class matters here.
       const baseMidiRoot = (4 + 1 + (chordOctaveOffset || 0)) * 12 + rootVal;
       absolutePitches = applyShellVoicing(absolutePitches, baseMidiRoot);
    }

    // Synth names are always scientific pitch in US spelling. Spelling them in
    // the UI notation sent "Do4" in EU mode, which Tone reads as NaN — silence.
    const notesToPlay = absolutePitches.map((n) => midiToNoteName(n));

    const currentToken = scheduler.startPlaybackSession();
    const scheduleTime = Tone.now() + 0.5;
    playDictionaryNote(playbackInstrument, notesToPlay, "2n");
    setCurrentAbsoluteNotes(absolutePitches);
    setCurrentlyPlayingNotes(flashedNotes ?? absolutePitches);
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
    scheduler,
  ]);

  return { handleChordClick };
}
