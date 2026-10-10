// @ts-check

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { resolveScaleIntervals, resolveScaleSemitones, resolveChordSemitones, NOTES } from "../core/theory";
import { getChordIntervalLabel } from "../core/harmonyEngine";
import { realizeScale, realizeChord, realizeNote } from "../core/noteEngine";
import { octaveClearsPlacement } from "../core/placements";
import { useAppContext } from "../context/AppContext";

/** @typedef {{guitar: number|null, bass: number|null}} PlacementIndexes */

/** No placement chosen on either neck: each shows its default. @type {PlacementIndexes} */
const NO_PLACEMENT = { guitar: null, bass: null };
/** @param {PlacementIndexes} prev @returns {PlacementIndexes} */
const clearPlacements = (prev) => (prev.guitar === null && prev.bass === null ? prev : NO_PLACEMENT);

export function useDictionaryMode() {
  const { state, dispatch } = useAppContext();
  const { harmonicMode } = state;
  const setHarmonicMode = (val) => dispatch({ type: 'SET_HARMONIC_MODE', payload: val });

  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState("single_note");
  const [fretboardZone, setFretboardZone] = useState("all");
  const [selectedRootStringGuitar, setSelectedRootStringGuitar] = useState(null);
  const [selectedRootStringBass, setSelectedRootStringBass] = useState(null);
  // Remove: const [harmonicMode, setHarmonicMode] = useState(false);
  // INST-B1 — the chosen position of each neck: an index into
  // core/placements.js listPlacements (nut -> body), null = the default. It
  // replaces selectedVoicingIndexGuitar / selectedVoicingIndexBass, which held
  // fingeringLogic.js ids ("open", 5, "pos_4", "note_5_8") in an order that was
  // not the neck's.
  const [placementIndex, setPlacementIndexState] = useState(NO_PLACEMENT);
  const [scaleAnchor, setScaleAnchor] = useState(null); // { stringIndex, fret, absoluteValue }
  const [dictOctave, setDictOctave] = useState(0); // -3..+3 (offset relative to octave 4)

  /**
   * Chooses a position on one neck (`index` into its list), or null for its default.
   * @param {string} instrument "guitar" or "bass"; anything else is ignored
   * @param {number|null} index
   */
  const setPlacementIndex = useCallback((instrument, index) => {
    if (instrument !== "guitar" && instrument !== "bass") return;
    setPlacementIndexState((prev) => (prev[instrument] === index ? prev : { ...prev, [instrument]: index }));
  }, []);

  // What clears a chosen placement (both necks back to their default):
  // - a new root or type, as before;
  // - the common octave, only where it changes what is shown
  //   (core/placements.js octaveClearsPlacement): a scale — C-06, the octave
  //   picks the box, kept until the common octave segment goes (L1b-1 / B2) —
  //   and a single note — the octave changes the note. A chord shape the
  //   player chose stays: the octave does not move it.
  // One effect, as before; the previous selection, kept in a ref, tells a new
  // root or type from an octave change.
  const lastSelection = useRef({ dictRoot, dictType });
  useEffect(() => {
    const rootOrTypeChanged = lastSelection.current.dictRoot !== dictRoot || lastSelection.current.dictType !== dictType;
    lastSelection.current = { dictRoot, dictType };
    if (rootOrTypeChanged || octaveClearsPlacement(dictType)) setPlacementIndexState(clearPlacements);
    setScaleAnchor(null);
  }, [dictRoot, dictType, dictOctave]);

  // { piano: { octave }, guitar: { index }, bass: { index } } — what each
  // instrument's placement is. The piano's stays the common octave.
  const placementByInstrument = useMemo(() => ({
    piano: { octave: dictOctave },
    guitar: { index: placementIndex.guitar },
    bass: { index: placementIndex.bass },
  }), [dictOctave, placementIndex]);


  const activeNotes = useMemo(() => {
    // `order` is a number for a computed degree (1, 2, 3...) and the string
    // '1' for the scale's closing note — pre-existing (matches the object
    // getChordIntervalLabel can also return, e.g. 'b3', '4'), annotated
    // explicitly because inferring it from the first assignment below (the
    // scale branch's `.map`) otherwise locks `order` to `number` and the
    // closing note's `push` fails typecheck.
    /** @type {Array<{value?: number, us?: string, eu?: string, order: number|string|null, absoluteValue: number}>} */
    let notes = [];
    const currentRootValue = Number(dictRoot);
    const baseOctave = 4 + (dictOctave || 0);
    
    const scaleData = resolveScaleIntervals(dictType);
    if (scaleData) {
      // VMU-140 — realizeScale (core/noteEngine.js) gives strictly ascending
      // absolute pitches root-to-root+12 for any root; this used to fold
      // each degree's pitch class into a fixed octave by hand
      // (`n.value + (baseOctave + 1) * 12`, n.value already having lost its
      // octave in getScaleNotesGeneric), which put any degree below the
      // root's class a full octave too low (mi pentatonic major: do# a
      // fourth degree below mi's class landed as do#4 instead of do#5).
      const semitones = resolveScaleSemitones(dictType);
      const absolutePitches = realizeScale(currentRootValue, dictType, baseOctave);
      notes = semitones.map((semi, i) => ({
        ...NOTES.at((currentRootValue + semi) % 12),
        order: i + 1,
        absoluteValue: absolutePitches[i]
      }));
      // Add the final octave note to visually close the scale on the piano
      notes.push({
        value: currentRootValue,
        order: '1',
        absoluteValue: absolutePitches[absolutePitches.length - 1]
      });
    } else if (dictType && dictType.includes("chord")) {
      const chordData = resolveChordSemitones(dictType);
      if (chordData) {
        // VMU-140 — realizeChord: fundamental position, no modulo, so an
        // extension (chord_9's 14) stays above the octave instead of
        // folding back down next to the root, and a note whose class is
        // below the root's (e.g. do# above la) stays above it in pitch too.
        const absolutePitches = realizeChord(currentRootValue, chordData.semitones, baseOctave);
        notes = chordData.semitones.map((semi, i) => ({
          value: (currentRootValue + semi) % 12,
          order: getChordIntervalLabel(i, semi),
          absoluteValue: absolutePitches[i]
        }));
      }
    } else if (dictType === "single_note") {
      notes.push({
        value: currentRootValue,
        order: null,
        absoluteValue: realizeNote(currentRootValue, baseOctave)
      });
    }
    return notes;
  }, [dictRoot, dictType, dictOctave]);

  return {
    dictRoot, setDictRoot,
    dictType, setDictType,
    fretboardZone, setFretboardZone,
    selectedRootStringGuitar, setSelectedRootStringGuitar,
    selectedRootStringBass, setSelectedRootStringBass,
    harmonicMode, setHarmonicMode,
    placementByInstrument, setPlacementIndex,
    scaleAnchor, setScaleAnchor,
    dictOctave, setDictOctave,
    activeNotes
  };
}
