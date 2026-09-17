// @ts-check

import { useState, useMemo, useEffect } from "react";
import { resolveScaleIntervals, resolveScaleSemitones, resolveChordSemitones, NOTES } from "../core/theory";
import { getChordIntervalLabel } from "../core/harmonyEngine";
import { realizeScale, realizeChord, realizeNote } from "../core/noteEngine";
import { useAppContext } from "../context/AppContext";

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
  const [selectedVoicingIndexGuitar, setSelectedVoicingIndexGuitar] = useState(null);
  const [selectedVoicingIndexBass, setSelectedVoicingIndexBass] = useState(null);
  const [scaleAnchor, setScaleAnchor] = useState(null); // { stringIndex, fret, absoluteValue }
  const [dictOctave, setDictOctave] = useState(0); // -3..+3 (offset relative to octave 4)

  // Reset voicing indices when root, type, OR octave changes.
  // For scales: auto-select best position for the chosen octave (null = auto).
  // For chords/notes: reset to null (auto-computed best fingering).
  useEffect(() => {
    setSelectedVoicingIndexGuitar(null);
    setSelectedVoicingIndexBass(null);
    setScaleAnchor(null);
  }, [dictRoot, dictType, dictOctave]);


  const activeNotes = useMemo(() => {
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
    selectedVoicingIndexGuitar, setSelectedVoicingIndexGuitar,
    selectedVoicingIndexBass, setSelectedVoicingIndexBass,
    scaleAnchor, setScaleAnchor,
    dictOctave, setDictOctave,
    activeNotes
  };
}
