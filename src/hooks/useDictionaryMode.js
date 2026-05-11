
import { useState, useMemo, useEffect } from "react";
import { resolveScaleIntervals, resolveChordSemitones, getScaleNotesGeneric } from "../core/theory";
import { getChordIntervalLabel } from "../core/harmonyEngine";
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
  const [dictOctave, setDictOctave] = useState(0); // -1, 0, +1

  // Reset voicing indices and anchor when root or type changes
  useEffect(() => {
    const isChord = dictType.includes("chord");
    setSelectedVoicingIndexGuitar(isChord ? 0 : null);
    setSelectedVoicingIndexBass(isChord ? 0 : null);
    setScaleAnchor(null);
  }, [dictRoot, dictType]);

  const activeNotes = useMemo(() => {
    let notes = [];
    const currentRootValue = Number(dictRoot);
    const baseOctave = 4 + (dictOctave || 0);
    
    const scaleData = resolveScaleIntervals(dictType);
    if (scaleData) {
      notes = getScaleNotesGeneric(currentRootValue, scaleData.intervals).map(n => ({
        ...n,
        absoluteValue: n.value + (baseOctave + 1) * 12
      }));
    } else if (dictType.includes("chord")) {
      const chordData = resolveChordSemitones(dictType);
      if (chordData) {
        notes = chordData.semitones.map((semi, i) => {
          const val = (currentRootValue + semi) % 12;
          // For chords, if the note wraps around (semi + root > 12), it might be in the next octave
          // but for dictionary display we usually stay in one octave unless it's a specific voicing.
          // Here we just use the baseOctave.
          return {
            value: val,
            order: getChordIntervalLabel(i, semi),
            absoluteValue: val + (baseOctave + 1) * 12
          };
        });
      }
    } else if (dictType === "single_note") {
      notes.push({ 
        value: currentRootValue, 
        order: null,
        absoluteValue: currentRootValue + (baseOctave + 1) * 12
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
