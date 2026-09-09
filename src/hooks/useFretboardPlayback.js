// @ts-check
import { useCallback, useRef } from "react";
import * as Tone from 'tone';
import { NOTES, SCALES, resolveScaleIntervals, getAbsoluteNoteValue, resolveChordSemitones } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { getInstrumentTuning, fingeringMapToAbsolutePitches, buildScaleBoxSequence } from "./playbackUtils";

/**
 * @param {Object} options
 * @param {'piano'|'guitar'|'bass'} options.playbackInstrument
 * @param {Function} options.setPlaybackInstrument
 * @param {string} options.appMode
 * @param {any} options.dictRoot
 * @param {string} options.dictType
 * @param {any[]} options.activeNotes
 * @param {any} options.guitarFingering
 * @param {any} options.bassFingering
 * @param {any} options.activeBrick
 * @param {number} options.currentBpm
 * @param {any} options.lastClickedContext
 * @param {Function} options.setCurrentlyPlayingNotes
 * @param {Function} options.setContextualScaleAbsoluteValues
 * @param {Function} options.setLastClickedContext
 * @param {Function} options.setSinglePlayContext
 * @param {Function} options.setScaleAnchor
 * @param {any} options.scheduler
 */
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

            // Root up to the next root an octave higher, then back down.
            // Extracted to playbackUtils so the pitch arithmetic is unit-tested:
            // the inline version added a fret number to a note NAME, producing
            // strings like 'G33' and throwing on every scale-root click.
            absolutePitches = buildScaleBoxSequence(
              currentFingering.scaleFrets,
              reversedTuning,
              absNote % 12,
              inst
            );
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
          Tone.getDraw().schedule(() => {
            if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
          }, Tone.now() + 0.5);
          return;
        }

        // Scale: animate note by note
        const scaleObjs = absolutePitches
          .slice(0, Math.floor(absolutePitches.length / 2) + 1)
          .map((p, i) => ({ absoluteValue: typeof p === 'object' ? p.absoluteValue : p, order: i + 1 }));
        setContextualScaleAbsoluteValues(scaleObjs);
        setLastClickedContext(context);
        setSinglePlayContext(null);

        const sequenceBaseTime = Tone.now();
        absolutePitches.forEach((p, index) => {
          const scheduleTime = sequenceBaseTime + index * stepTime;
          const pitch = typeof p === 'object' ? p.absoluteValue : p;
          const noteNameParts = NOTES[pitch % 12];
          const noteNameStr = `${noteNameParts.us}${Math.floor(pitch / 12)}`;
          playDictionaryNote(playbackInstrument, noteNameStr, "8n", scheduleTime);
          Tone.getDraw().schedule(() => {
            if (!scheduler.isCurrentSession(currentToken)) return;
            setCurrentlyPlayingNotes([p]);
          }, scheduleTime);
          const clearDelay = Math.max(stepTime - 0.05, 0.05);
          Tone.getDraw().schedule(() => {
            if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
          }, scheduleTime + clearDelay);
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
    Tone.getDraw().schedule(() => {
      if (scheduler.isCurrentSession(currentToken)) {
        setCurrentlyPlayingNotes([]);
        setSinglePlayContext(null);
      }
    }, Tone.now() + 0.5);
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
