import { useCallback, useRef } from "react";
import { NOTES, SCALES, resolveScaleIntervals, getAbsoluteNoteValue, resolveChordSemitones } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { getInstrumentTuning, fingeringMapToAbsolutePitches } from "./playbackUtils";

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
        // === ROOT NOTE CLICKED: play full scale from scaleFrets ===
        let absolutePitches = [];

        if (dictType?.includes("scale")) {
          const inst = context?.instrument || playbackInstrument;
          const currentFingering = inst === "guitar" ? guitarFingering : (inst === "bass" ? bassFingering : null);

          if (currentFingering?.scaleFrets && currentFingering.scaleFrets.length > 0) {
            // Use the displayed scaleFrets as the source of truth (static = played)
            const tuning = getInstrumentTuning(inst, activeBrick);
            const reversedTuning = [...tuning].reverse();

            // Sort scaleFrets by absolute pitch ascending
            const sorted = [...currentFingering.scaleFrets].sort((a, b) => {
              return (reversedTuning[a.stringIndex] + a.fret) - (reversedTuning[b.stringIndex] + b.fret);
            });

            const allNotes = sorted.map(sf => ({
              absoluteValue: reversedTuning[sf.stringIndex] + sf.fret,
              stringIndex: sf.stringIndex,
              fret: sf.fret,
              instrument: inst,
            }));

            // Find the root note in the box (same pitch class as clicked note)
            const rootPitchClass = absNote % 12;
            const startIdx = allNotes.findIndex(n => n.absoluteValue % 12 === rootPitchClass);
            const rootIdx = startIdx >= 0 ? startIdx : 0;

            // Find the NEXT root note (one octave higher)
            let endIdx = allNotes.findIndex((n, idx) => idx > rootIdx && n.absoluteValue % 12 === rootPitchClass);
            
            // If no higher octave is found in the box, just play to the top of the box
            if (endIdx === -1) {
              endIdx = allNotes.length - 1;
            }

            // Ascending: from root to next root (inclusive)
            const ascending = allNotes.slice(rootIdx, endIdx + 1);
            // Descending: back to root (reverse, excluding top note)
            const descending = ascending.slice(0, ascending.length - 1).reverse();

            absolutePitches = [...ascending, ...descending];
          } else {
            // Fallback: compute from theory (no scaleFrets available, e.g. piano mode)
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
          }
        } else {
          // Chord: existing logic
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

        // Scale: animate note by note
        const scaleObjs = absolutePitches
          .slice(0, Math.floor(absolutePitches.length / 2) + 1)
          .map((p, i) => ({ absoluteValue: typeof p === 'object' ? p.absoluteValue : p, order: i + 1 }));
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

      }
      // === NON-ROOT NOTE CLICKED: play single note only, do NOT change box ===
      // (scaleAnchor is intentionally NOT set here — clicking non-root must not change the displayed box)
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
