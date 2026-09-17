// @ts-check
import { useCallback } from "react";
import * as Tone from 'tone';
import { CHORDS, getAbsoluteNoteValue, resolveChordSemitones, getChordNotesAbsolute, getChordAbsolute, midiToNoteName, computeAbsoluteNote } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { logPlaybackSequence, logNotePlay } from "../core/debugScale";
import { getInstrumentTuning, buildAscDescSequence } from "./playbackUtils";
import { realizeDictionarySelection } from "../core/realization";
import { realizeScale, realizeNote } from "../core/noteEngine";
import { calcActivePath } from "../core/fretboardLogic";

/**
 * @param {Object} options
 * @param {any} options.dictRoot
 * @param {string} options.dictType
 * @param {number} [options.dictOctave]
 * @param {'piano'|'guitar'|'bass'} options.playbackInstrument
 * @param {any} options.guitarFingering
 * @param {any} options.bassFingering
 * @param {any} options.activeBrick
 * @param {any[]} options.activeNotes
 * @param {number} options.currentBpm
 * @param {any} options.lastClickedContext
 * @param {Function} options.setCurrentlyPlayingNotes
 * @param {any} options.scheduler
 */
export function useDictionaryPlayback({
  dictRoot,
  dictType,
  dictOctave = 0,
  playbackInstrument,
  guitarFingering,
  bassFingering,
  activeBrick,
  activeNotes,
  currentBpm,
  lastClickedContext,
  setCurrentlyPlayingNotes,
  scheduler,
}) {
  const playDictionaryAudio = useCallback(async () => {
    await scheduler.ensureAudioReady();

    let notesToPlay = [];
    let absolutePitches = [];

    // Block 2 — realization (core/realization.js). Playback and display each
    // call this with the same inputs, so neither depends on the other's output
    // and the two cannot drift apart. Reading the display's notes instead would
    // have made this hook wrong in isolation: given a grip but theoretical
    // notes, it would play the theory and ignore the neck.
    const currentFingering =
      playbackInstrument === "guitar" ? guitarFingering
      : playbackInstrument === "bass" ? bassFingering
      : null;
    const { notes: realizedNotes } = realizeDictionarySelection({
      instrument: playbackInstrument,
      fingering: currentFingering,
      tuning: getInstrumentTuning(playbackInstrument === "bass" ? "bass" : "guitar", activeBrick),
      rootPitchClass: Number(dictRoot) % 12,
      theoreticalNotes: activeNotes,
    });

    if (dictType?.includes("scale")) {
      // The scale as it exists on the instrument that owns playback, ascending.
      // This branch used to rebuild the box here, with its own sort and its own
      // dedup — a second implementation that drifted from the displayed one and
      // played a full octave below it.
      if (realizedNotes.length) {
        absolutePitches = buildAscDescSequence(realizedNotes);
        logPlaybackSequence(absolutePitches);
        notesToPlay = absolutePitches.map((p) => midiToNoteName(typeof p === "object" ? p.absoluteValue : p));
      } else {
        // Nothing selected yet: derive from theory so the hook still plays.
        // VMU-140 — realizeScale (core/noteEngine.js) replaces a hand-rolled
        // cumulative-interval walk that lived here. That walk started at the
        // root's own absolute pitch and only ever added (never re-derived a
        // pitch class), so it was already correct for any root — but it
        // duplicated exactly the formula the engine now owns in one place;
        // numerically identical output, one fewer place to get it wrong next.
        const baseOctave = 4 + (dictOctave || 0);
        absolutePitches = realizeScale(Number(dictRoot), dictType, baseOctave);
        if (absolutePitches.length === 0) {
          // Defensive: this branch only runs when dictType already contains
          // "scale", so it should always resolve — kept as a fallback to
          // major (the previous behaviour) rather than playing nothing.
          absolutePitches = realizeScale(Number(dictRoot), "scale_major", baseOctave);
        }
        absolutePitches = buildAscDescSequence(absolutePitches);
        notesToPlay = absolutePitches.map((p) => midiToNoteName(typeof p === "object" ? p.absoluteValue : p));
      }
    } else if (dictType?.includes("chord")) {
      // Same rule as scales: the realization decides. A grip on the neck is
      // played in the register the player would hear it; piano falls through to
      // the theoretical chord.
      if (realizedNotes.length) {
        absolutePitches = realizedNotes.map((n) =>
          typeof n === "object" && n !== null ? n : { absoluteValue: n }
        );
      }

      if (absolutePitches.length === 0) {
        // The Dictionary's own octave selector, not the Studio's. This read
        // `chordOctaveOffset`, the offset StudioPanel owns, so moving the
        // Dictionary octave changed the keyboard and left the sound behind
        // (VMU-085).
        const baseOctave = 4 + (dictOctave || 0);
        absolutePitches = getChordAbsolute(Number(dictRoot), dictType, baseOctave);
        if (!absolutePitches || absolutePitches.length === 0) {
          const chordData = resolveChordSemitones(dictType);
          const semitones = chordData ? chordData.semitones : CHORDS["chord_major"].semitones;
          absolutePitches = getChordNotesAbsolute(Number(dictRoot), semitones, baseOctave);
        }
      }

      notesToPlay = absolutePitches.map((p) => midiToNoteName(typeof p === "object" ? p.absoluteValue : p));
    } else {
      // Play the note at the absolute pitch it is displayed at. This used
      // `n.value + 4 * 12` — pitch class plus a fixed octave in the pre-MIDI
      // convention — which sounded right at octave 0 by accident and ignored
      // the octave selector. useDictionaryMode already provides absoluteValue;
      // realizeNote(n.value, 4) is the VMU-140 stand-in for the rare case it
      // doesn't, kept at the same fixed octave 4 the fallback always used —
      // this path still ignores the octave selector, unchanged from before.
      absolutePitches = activeNotes.map((n) => n.absoluteValue ?? realizeNote(n.value, 4));
      notesToPlay = absolutePitches.map((p) => midiToNoteName(typeof p === "object" ? p.absoluteValue : p));
    }

    const currentToken = scheduler.startPlaybackSession();
    
    setCurrentlyPlayingNotes([]);

    if (dictType?.includes("chord")) {
      playDictionaryNote(playbackInstrument, notesToPlay, "2n");
      setCurrentlyPlayingNotes(absolutePitches);
      Tone.getDraw().schedule(() => {
        if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
      }, Tone.now() + 0.5);
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
      
      const sequenceBaseTime = Tone.now();
      absolutePitches.forEach((pitchOrObj, index) => {
        const pitch = typeof pitchOrObj === 'object' ? pitchOrObj.absoluteValue : pitchOrObj;
        const scheduleTime = sequenceBaseTime + index * stepTime;
        const noteNameStr = midiToNoteName(pitch);
        playDictionaryNote(playbackInstrument, noteNameStr, "8n", scheduleTime);
        const pathItem = (playbackInstrument === "guitar" || playbackInstrument === "bass")
          && typeof pitchOrObj === 'object'
          ? pitchOrObj
          : null;
        logNotePlay(pathItem ?? pitchOrObj, index);
        Tone.getDraw().schedule(() => {
          if (!scheduler.isCurrentSession(currentToken)) return;
          setCurrentlyPlayingNotes(pathItem ? [pathItem] : [pitch]);
        }, scheduleTime);
        const clearDelay = Math.max(stepTime - 0.05, 0.05);
        Tone.getDraw().schedule(() => {
          if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
        }, scheduleTime + clearDelay);
      });
    } else {
      // Single note: play the pitch computed above from activeNotes — the one
      // on screen. This rebuilt the name as `${root}4`, octave 4 hard-coded,
      // and ignored that pitch: the octave selector moved the highlighted key
      // but never the sound. Without an active note, fall back to the root at
      // the dictionary octave, not at a fixed one.
      const first = absolutePitches[0];
      const absNote = first !== undefined
        ? (typeof first === "object" ? first.absoluteValue : first)
        : computeAbsoluteNote(Number(dictRoot), dictOctave || 0);
      playDictionaryNote(playbackInstrument, midiToNoteName(absNote), "2n");
      setCurrentlyPlayingNotes([absNote]);
      Tone.getDraw().schedule(() => {
        if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
      }, Tone.now() + 0.5);
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
    currentBpm,
    lastClickedContext,
    setCurrentlyPlayingNotes,
    scheduler,
  ]);

  return { playDictionaryAudio };
}
