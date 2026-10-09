// @ts-check
import { useCallback } from "react";
import * as Tone from 'tone';
import { CHORDS, getAbsoluteNoteValue, resolveChordSemitones, getChordNotesAbsolute, getChordAbsolute, midiToNoteName, computeAbsoluteNote } from "../core/theory";
import { playDictionaryNote } from "../audio/AudioEngine";
import { logPlaybackSequence, logNotePlay } from "../core/debugScale";
import { getInstrumentTuning, buildAscDescSequence } from "./playbackUtils";
import { realizeScale, realizeNote } from "../core/noteEngine";
import { calcActivePath } from "../core/fretboardLogic";

/** The instruments the Dictionary can play, in the order of the instrument bar. */
const INSTRUMENT_IDS = ["piano", "guitar", "bass"];

/**
 * @param {Object} options
 * @param {any} options.dictRoot
 * @param {string} options.dictType
 * @param {number} [options.dictOctave]
 * @param {'piano'|'guitar'|'bass'} options.playbackInstrument the instrument of the
 *   big play button — "the last instrument touched"
 * @param {Function} options.setPlaybackInstrument records that choice
 * @param {any} options.guitarFingering
 * @param {any} options.bassFingering
 * @param {any} options.activeBrick
 * @param {{piano: any[], guitar: any[], bass: any[]}} options.realizationsByInstrument
 *   what each instrument plays for the current selection (useMusicEngine): the
 *   one realization that is both lit up and heard, for all three instruments at
 *   once, whichever is selected
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
  setPlaybackInstrument,
  guitarFingering,
  bassFingering,
  activeBrick,
  realizationsByInstrument,
  currentBpm,
  lastClickedContext,
  setCurrentlyPlayingNotes,
  scheduler,
}) {
  /**
   * Plays the Dictionary selection on one instrument, at once.
   *
   * The instrument is an argument, and so are the notes: `realizationsByInstrument`
   * holds the three realizations of the current selection, so what is played
   * does not depend on which instrument happens to be selected in this render.
   * That is what the tiles' play buttons need. They used to call this right
   * after the selection setter, in the same event, when the callback was still
   * the previous render's and played the previous instrument — hence
   * useSelectThenPlay, which waited a render. With the argument there is nothing
   * to wait for.
   *
   * Playing does not select: `playInstrument` below does both. Without an
   * argument — the big play button — it plays the selected instrument, as before.
   * Anything that is not an instrument id (a click event handed over by an
   * `onClick={playDictionaryAudio}`, say) counts as no argument.
   *
   * @param {'piano'|'guitar'|'bass'} [requested]
   */
  const playDictionaryAudio = useCallback(async (requested = playbackInstrument) => {
    const instrument = INSTRUMENT_IDS.includes(requested) ? requested : playbackInstrument;

    await scheduler.ensureAudioReady();

    let notesToPlay = [];
    let absolutePitches = [];

    // Block 2 — realization (core/realization.js). Playback and display read the
    // SAME array: the one useMusicEngine builds, once, for each instrument. This
    // hook used to run realizeDictionarySelection itself, on the same inputs, so
    // that it stayed right in isolation; with three instruments realized at once
    // and one of them asked for by name, the engine's output is the thing to
    // read, and a second call here would be a second place to teach every time
    // a realization gains an input (an octave, a position).
    const realizedNotes = realizationsByInstrument?.[instrument] ?? [];

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
      absolutePitches = realizedNotes.map((n) => n.absoluteValue ?? realizeNote(n.value, 4));
      notesToPlay = absolutePitches.map((p) => midiToNoteName(typeof p === "object" ? p.absoluteValue : p));
    }

    const currentToken = scheduler.startPlaybackSession();
    
    setCurrentlyPlayingNotes([]);

    if (dictType?.includes("chord")) {
      playDictionaryNote(instrument, notesToPlay, "2n");
      setCurrentlyPlayingNotes(absolutePitches);
      Tone.getDraw().schedule(() => {
        if (scheduler.isCurrentSession(currentToken)) setCurrentlyPlayingNotes([]);
      }, Tone.now() + 0.5);
    } else if (dictType?.includes("scale")) {
      const noteDuration = 60 / currentBpm;
      const stepTime = noteDuration / 2;
      
      if (instrument === "guitar" || instrument === "bass") {
        const currentFingering = instrument === "guitar" ? guitarFingering : bassFingering;

        if (!currentFingering?.scaleFrets) {
          const tuning = getInstrumentTuning(instrument, activeBrick);

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
                  boxNotes.push({ absoluteValue: absPitch, stringIndex: sIdx, fret, instrument });
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
              lastClickedContext: lastClickedContext || { instrument, stringIndex: 0, fret: 0 },
              instrument,
              strings: [...tuning].reverse(),
              numFrets: 22
            });

            absolutePitches = absolutePitches.map((pitch, idx) => {
               const match = path[idx];
               return match ? { ...match, instrument } : pitch;
            });
          }
        }
      }
      
      const sequenceBaseTime = Tone.now();
      absolutePitches.forEach((pitchOrObj, index) => {
        const pitch = typeof pitchOrObj === 'object' ? pitchOrObj.absoluteValue : pitchOrObj;
        const scheduleTime = sequenceBaseTime + index * stepTime;
        const noteNameStr = midiToNoteName(pitch);
        playDictionaryNote(instrument, noteNameStr, "8n", scheduleTime);
        const pathItem = (instrument === "guitar" || instrument === "bass")
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
      // Single note: play the pitch computed above from the realization — the
      // one on screen. This rebuilt the name as `${root}4`, octave 4 hard-coded,
      // and ignored that pitch: the octave selector moved the highlighted key
      // but never the sound. Without an active note, fall back to the root at
      // the dictionary octave, not at a fixed one.
      const first = absolutePitches[0];
      const absNote = first !== undefined
        ? (typeof first === "object" ? first.absoluteValue : first)
        : computeAbsoluteNote(Number(dictRoot), dictOctave || 0);
      playDictionaryNote(instrument, midiToNoteName(absNote), "2n");
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
    realizationsByInstrument,
    currentBpm,
    lastClickedContext,
    setCurrentlyPlayingNotes,
    scheduler,
  ]);

  /**
   * The play button of an instrument: that instrument plays now, and becomes the
   * instrument of the big play button ("last instrument touched", as the tile
   * did before — a click on a note does the same, in useFretboardPlayback).
   *
   * Both in the same call, in this order, with no render in between needed: the
   * selection is recorded for the renders to come, the sound is made from the
   * realization of `id` read from this one.
   *
   * @param {'piano'|'guitar'|'bass'} id
   * @returns {Promise<void>} resolves once the sound has been handed to the synth
   */
  const playInstrument = useCallback((id) => {
    // Three instruments exist; anything else is a caller's mistake, and storing
    // it as the selection would leave every reader of playbackInstrument on a
    // fallback. Ignore it rather than half-act on it.
    if (!INSTRUMENT_IDS.includes(id)) return Promise.resolve();
    setPlaybackInstrument(id);
    return playDictionaryAudio(id);
  }, [setPlaybackInstrument, playDictionaryAudio]);

  return { playDictionaryAudio, playInstrument };
}
