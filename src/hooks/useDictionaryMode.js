
import { useState, useMemo, useEffect } from "react";
import { resolveScaleIntervals, resolveChordSemitones, getScaleNotesGeneric } from "../core/theory";
import { getChordIntervalLabel } from "../core/harmonyEngine";

export function useDictionaryMode() {
  const [dictRoot, setDictRoot] = useState(0);
  const [dictType, setDictType] = useState("single_note");
  const [fretboardZone, setFretboardZone] = useState("all");
  const [selectedRootStringGuitar, setSelectedRootStringGuitar] = useState(null);
  const [selectedRootStringBass, setSelectedRootStringBass] = useState(null);
  const [harmonicMode, setHarmonicMode] = useState(false);
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
    
    const scaleData = resolveScaleIntervals(dictType);
    if (scaleData) {
      notes = getScaleNotesGeneric(currentRootValue, scaleData.intervals);
    } else if (dictType.includes("chord")) {
      const chordData = resolveChordSemitones(dictType);
      if (chordData) {
        notes = chordData.semitones.map((semi, i) => ({
          value: (currentRootValue + semi) % 12,
          order: getChordIntervalLabel(i, semi),
        }));
      }
    } else if (dictType === "single_note") {
      notes.push({ value: currentRootValue, order: null });
    }
    return notes;
  }, [dictRoot, dictType]);

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
