import { useCallback, useRef } from "react";
import { NOTES, SCALES, resolveScaleIntervals, getAbsoluteNoteValue, resolveChordSemitones } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { getInstrumentTuning, fingeringMapToAbsolutePitches } from "./playbackUtils";
import { calcActivePath } from "../core/fretboardLogic";

export function useFretboardPlayback({
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
}) {
  const playSingleNoteRef = useRef(null);

  const playSingleNote = useCallback(async (noteName, context = null) => {
    await scheduler.ensureAudioReady();

    const absNote = getAbsoluteNoteValue(noteName);

    const currentToken = scheduler.startPlaybackSession();

    setCurrentlyPlayingNotes([]);

    if (appMode === "dictionary" && (dictType?.includes("scale") || dictType?.includes("chord"))) {
      if (absNote % 12 === Number(dictRoot)) {
        let absolutePitches = [];
        if (dictType?.includes("scale")) {
          const scaleData = resolveScaleIntervals(dictType);
          const intervals = scaleData ? scaleData.intervals : SCALES.scale_major.intervals;
          let currentPitch = absNote;
          absolutePitches.push(currentPitch);
          intervals.forEach((interval) => {
            currentPitch += interval;
            absolutePitches.push(currentPitch);
          });
          for (let i = absolutePitches.length - 2; i >= 0; i--) {
            absolutePitches.push(absolutePitches[i]);
          }
        } else {
          const inst = context?.instrument || playbackInstrument;
          const currentFingering = inst === "guitar" ? guitarFingering : (inst === "bass" ? bassFingering : null);

          if (currentFingering?.fingeringMap && (inst === "guitar" || inst === "bass")) {
            const tuning = getInstrumentTuning(inst, activeBrick);
            const reversedTuning = [...tuning].reverse();
            absolutePitches = fingeringMapToAbsolutePitches(currentFingering.fingeringMap, reversedTuning);
          }

          if (absolutePitches.length === 0) {
            const chordData = resolveChordSemitones(dictType);
            const semitones = chordData ? chordData.semitones : [0, 4, 7];
            absolutePitches = semitones.map(s => absNote + s);
          }
          
          if (playbackInstrument === "guitar" || playbackInstrument === "bass") {
            const tuning = getInstrumentTuning(playbackInstrument, activeBrick);
            
            const path = calcActivePath({
              contextualScaleAbsoluteValues: absolutePitches.map(p => ({ absoluteValue: p })),
              dictType,
              lastClickedContext: lastClickedContext || context || { instrument: playbackInstrument, stringIndex: 0, fret: 0 },
              instrument: playbackInstrument,
              strings: [...tuning].reverse(),
              numFrets: 22
            });

            absolutePitches = absolutePitches.map((pitch, idx) => {
               const match = path[idx];
               return match || pitch;
            });
          }
        }

        const noteDuration = 60 / currentBpm;
        const stepTime = noteDuration / 2;

        if (dictType?.includes("chord")) {
          const notesToPlay = absolutePitches.map(p => {
            const val = typeof p === 'object' ? p.absoluteValue : p;
            const noteName = NOTES[val % 12].us;
            return `${noteName}${Math.floor(val / 12)}`;
          });
          playDictionaryNote(playbackInstrument, notesToPlay, "2n");
          setCurrentlyPlayingNotes(absolutePitches);
          setTimeout(() => {
            if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
          }, 500);
          return;
        }

        const scaleObjs = absolutePitches
          .slice(0, Math.floor(absolutePitches.length / 2) + 1)
          .map((p, i) => ({ absoluteValue: p, order: i + 1 }));
        setContextualScaleAbsoluteValues(scaleObjs);
        setLastClickedContext(context);
        setSinglePlayContext(null);

        absolutePitches.forEach((p, index) => {
          setTimeout(() => {
            if (!scheduler.isCurrentSession(currentToken)) return;

            const pitch = typeof p === 'object' ? p.absoluteValue : p;
            const noteNameParts = NOTES[pitch % 12];
            const noteName = `${noteNameParts.us}${Math.floor(pitch / 12)}`;
            playDictionaryNote(playbackInstrument, noteName, "8n");
            
            setCurrentlyPlayingNotes([p]);
            
            setTimeout(() => {
              if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
            }, Math.max(stepTime * 1000 - 50, 50));

          }, index * stepTime * 1000);
        });
        return;
      } else if (dictType?.includes("scale") && context?.instrument && setScaleAnchor) {
        const isNoteInScale = activeNotes.some(n => n.value === absNote % 12);
        if (isNoteInScale) {
          setScaleAnchor(prev => {
            if (prev && prev.stringIndex === context.stringIndex && prev.fret === context.fret) {
              return null;
            }
            return {
              stringIndex: context.stringIndex,
              fret: context.fret,
              absoluteValue: absNote
            };
          });
        }
      }
    }

    playDictionaryNote(playbackInstrument, noteName, "8n");
    setContextualScaleAbsoluteValues([]);
    setLastClickedContext(null);
    setSinglePlayContext(context ?? null);
    setCurrentlyPlayingNotes([absNote]);
    setTimeout(() => {
      if (scheduler.isCurrentSession(currentToken)) {
        setCurrentlyPlayingNotes([]);
        setSinglePlayContext(null);
      }
    }, 500);
  }, [
    playbackInstrument,
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
  ]);

  playSingleNoteRef.current = playSingleNote;

  const autoPlayNote = useCallback((noteName, context = null) => {
    if (context?.instrument && context.instrument !== playbackInstrument) {
      setPlaybackInstrument(context.instrument);
    }
    playSingleNoteRef.current?.(noteName, context);
  }, [playbackInstrument, setPlaybackInstrument]);

  return {
    playSingleNote,
    autoPlayNote,
  };
}
