import { useCallback } from "react";
import { NOTES, SCALES, CHORDS, resolveScaleIntervals, getAbsoluteNoteValue, resolveChordSemitones, getChordNotesAbsolute } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { logScalePosition, logPlaybackSequence, logNotePlay } from "../core/debugScale";
import { getInstrumentTuning, fingeringMapToAbsolutePitches, buildAscDescSequence } from "./playbackUtils";
import { calcActivePath } from "../core/fretboardLogic";

export function useDictionaryPlayback({
  dictRoot,
  dictType,
  dictOctave = 0,
  playbackInstrument,
  guitarFingering,
  bassFingering,
  activeBrick,
  activeNotes,
  chordOctaveOffset = 0,
  currentBpm,
  lastClickedContext,
  setCurrentlyPlayingNotes,
  scheduler,
}) {
  const playDictionaryAudio = useCallback(async () => {
    await scheduler.ensureAudioReady();

    let notesToPlay = [];
    let absolutePitches = [];

    if (dictType?.includes("scale")) {
      const currentFingering = (playbackInstrument === "guitar") ? guitarFingering
        : (playbackInstrument === "bass") ? bassFingering : null;

      if (currentFingering?.scaleFrets && (playbackInstrument === "guitar" || playbackInstrument === "bass")) {
        const tuning = getInstrumentTuning(playbackInstrument, activeBrick);
        const reversedTuning = [...tuning].reverse();

        const allBoxNotes = currentFingering.scaleFrets.map(sf => {
          const openNote = getAbsoluteNoteValue(reversedTuning[sf.stringIndex]);
          return {
            absoluteValue: openNote + sf.fret,
            stringIndex: sf.stringIndex,
            fret: sf.fret,
            instrument: playbackInstrument
          };
        }).sort((a, b) => {
          if (b.stringIndex !== a.stringIndex) return b.stringIndex - a.stringIndex;
          return a.fret - b.fret;
        });

        const seenPitches = new Set();
        const boxNotes = allBoxNotes.filter(n => {
          if (seenPitches.has(n.absoluteValue)) return false;
          seenPitches.add(n.absoluteValue);
          return true;
        });

        logScalePosition(playbackInstrument, currentFingering.positionIndex ?? 0, currentFingering.scaleFrets, reversedTuning);

        absolutePitches = buildAscDescSequence(boxNotes);

        logPlaybackSequence(absolutePitches);

        notesToPlay = absolutePitches.map(p => {
          const noteName = NOTES[p.absoluteValue % 12].us;
          return `${noteName}${Math.floor(p.absoluteValue / 12)}`;
        });
      } else {
        const scaleData = resolveScaleIntervals(dictType);
        const intervals = scaleData ? scaleData.intervals : SCALES.scale_major.intervals;
        const baseOctave = 4 + (dictOctave || 0);
        let currentPitch = Number(dictRoot) + (baseOctave + 1) * 12;
        absolutePitches.push(currentPitch);

        intervals.forEach((interval) => {
          currentPitch += interval;
          absolutePitches.push(currentPitch);
        });

        absolutePitches = buildAscDescSequence(absolutePitches);

        notesToPlay = absolutePitches.map((p) => {
          const val = typeof p === "object" ? p.absoluteValue : p;
          const noteName = NOTES[val % 12].us;
          return `${noteName}${Math.floor(val / 12)}`;
        });
      }
    } else if (dictType?.includes("chord")) {
      const currentFingering = (playbackInstrument === "guitar") ? guitarFingering : (playbackInstrument === "bass" ? bassFingering : null);
      const fingeringMap = currentFingering?.fingeringMap;
      
      if (fingeringMap && (playbackInstrument === "guitar" || playbackInstrument === "bass")) {
        const tuning = getInstrumentTuning(playbackInstrument, activeBrick);
        const reversedTuning = [...tuning].reverse();
        absolutePitches = fingeringMapToAbsolutePitches(fingeringMap, reversedTuning, playbackInstrument);
      }

      if (absolutePitches.length === 0) {
        const chordData = resolveChordSemitones(dictType);
        const semitones = chordData ? chordData.semitones : CHORDS["chord_major"].semitones;
        const baseOctave = 4 + (chordOctaveOffset || 0);
        absolutePitches = getChordNotesAbsolute(Number(dictRoot), semitones, baseOctave);
      }

      notesToPlay = absolutePitches.map((p) => {
        const val = typeof p === "object" ? p.absoluteValue : p;
        const noteName = NOTES[val % 12].us;
        return `${noteName}${Math.floor(val / 12)}`;
      });
    } else {
      const baseOctave = 4;
      absolutePitches = activeNotes.map((n) => n.value + baseOctave * 12);
      notesToPlay = absolutePitches.map((p) => {
        const val = typeof p === "object" ? p.absoluteValue : p;
        const noteName = NOTES[val % 12].us;
        return `${noteName}${Math.floor(val / 12)}`;
      });
    }

    const currentToken = scheduler.startPlaybackSession();
    
    setCurrentlyPlayingNotes([]);

    if (dictType?.includes("chord")) {
      playDictionaryNote(playbackInstrument, notesToPlay, "2n");
      setCurrentlyPlayingNotes(absolutePitches);
      setTimeout(() => {
        if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
      }, 500);
    } else if (dictType?.includes("scale")) {
      const noteDuration = 60 / currentBpm;
      const stepTime = noteDuration / 2;
      
      if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
        const currentFingering = playbackInstrument === "guitar" ? guitarFingering : bassFingering;
        
        if (!currentFingering?.scaleFrets) {
          const tuning = getInstrumentTuning(playbackInstrument, activeBrick);

          if (currentFingering?.isScaleBox) {
            const reversedTuning = [...tuning].reverse();
            const startFret = currentFingering.startFret;
            const endFret = currentFingering.endFret;
            const scalePitchClasses = absolutePitches.map(p => typeof p === 'object' ? p.absoluteValue % 12 : p % 12);
            
            let boxNotes = [];
            for (let sIdx = reversedTuning.length - 1; sIdx >= 0; sIdx--) {
              const openNote = getAbsoluteNoteValue(reversedTuning[sIdx]);
              for (let fret = startFret; fret <= endFret; fret++) {
                const absPitch = openNote + fret;
                if (scalePitchClasses.includes(absPitch % 12)) {
                  boxNotes.push({ absoluteValue: absPitch, stringIndex: sIdx, fret, instrument: playbackInstrument });
                }
              }
            }
            boxNotes.sort((a, b) => a.absoluteValue - b.absoluteValue);
            const newPitches = [...boxNotes];
            for (let i = boxNotes.length - 2; i >= 0; i--) newPitches.push(boxNotes[i]);
            absolutePitches = newPitches;
          } else {
            const path = calcActivePath({
              contextualScaleAbsoluteValues: absolutePitches.map(p => ({ absoluteValue: typeof p === 'object' ? p.absoluteValue : p })),
              dictType,
              lastClickedContext: lastClickedContext || { instrument: playbackInstrument, stringIndex: 0, fret: 0 },
              instrument: playbackInstrument,
              strings: [...tuning].reverse(),
              numFrets: 22
            });

            absolutePitches = absolutePitches.map((pitch, idx) => {
               const match = path[idx];
               return match ? { ...match, instrument: playbackInstrument } : pitch;
            });
          }
        }
      }
      
      absolutePitches.forEach((pitchOrObj, index) => {
        const pitch = typeof pitchOrObj === 'object' ? pitchOrObj.absoluteValue : pitchOrObj;
        setTimeout(() => {
          if (!scheduler.isCurrentSession(currentToken)) return;
          
          const noteNameParts = NOTES[pitch % 12];
          const noteName = `${noteNameParts.us}${Math.floor(pitch / 12)}`;
          playDictionaryNote(playbackInstrument, noteName, "8n");
          
          const pathItem = (playbackInstrument === "guitar" || playbackInstrument === "bass")
            && typeof pitchOrObj === 'object'
            ? pitchOrObj
            : null;

          logNotePlay(pathItem ?? pitchOrObj, index);

          setCurrentlyPlayingNotes(pathItem ? [pathItem] : [pitch]);
          
          setTimeout(() => {
            if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
          }, Math.max(stepTime * 1000 - 50, 50));
          
        }, index * stepTime * 1000);
      });
    } else {
      const currentRootValue = Number(dictRoot);
      const noteNameParts = NOTES[currentRootValue % 12];
      const noteName = `${noteNameParts.us}4`;
      const absNote = getAbsoluteNoteValue(noteName);
      playDictionaryNote(playbackInstrument, noteName, "2n");
      setCurrentlyPlayingNotes([absNote]);
      setTimeout(() => {
        if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
      }, 500);
    }
  }, [
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
  ]);

  return { playDictionaryAudio };
}
