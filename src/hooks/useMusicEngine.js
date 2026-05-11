import { useMemo } from "react";
import { 
  getGuitarFingering, 
  getBassFingering, 
  getAvailableGuitarFingerings, 
  getAvailableBassFingerings, 
  getAvailableScaleFingerings,
  getAvailableSingleNoteFingerings
} from "../core/fingeringLogic";
import { 
  getScaleNotes, 
  resolveChordSemitones, 
  MODES,
  resolveNnsToChordType
} from "../core/theory";
import { getInversionType, getChordIntervalLabel } from "../core/harmonyEngine";

/**
 * useMusicEngine Hook
 * 
 * Centralizes harmonic resolution and fingering calculations.
 * Adheres to MusicState v2 contract.
 */
export function useMusicEngine({
  appMode,
  activeBrick,
  clickedChord,
  currentAbsoluteNotes,
  chordOctaveOffset,
  displayMode,
  visualFocus,
  selectedRootStringGuitar,
  selectedRootStringBass,
  selectedVoicingIndexGuitar,
  selectedVoicingIndexBass,
  dictRoot,
  dictType,
  dictActiveNotes,
  dictOctave,
  fingeringMode,
  notation
}) {

  // --- 1. Harmonization & Active Notes ---
  const musicContext = useMemo(() => {
    let activeNotes = [];
    let fretboardActiveNotes = null;
    let currentRootValue = 0;
    let targetValue = -1;

    if (appMode === "studio") {
      const scaleNotes = getScaleNotes(
        activeBrick.rootValue,
        activeBrick.modeName
      );
      const modeData = Reflect.get(MODES, activeBrick.modeName);

      if (displayMode === "scale") {
        activeNotes = scaleNotes;
      } else {
        if (clickedChord) {
          activeNotes = currentAbsoluteNotes.map((val) => {
            const semi = (val - clickedChord.rootNote.value + 12) % 12;
            return {
              value: val % 12,
              order: getChordIntervalLabel(-1, semi),
              absoluteValue: val,
            };
          });
          
          const chordType = resolveNnsToChordType(clickedChord.nns);
          const chordData = resolveChordSemitones(chordType);
          if (chordData) {
            fretboardActiveNotes = chordData.semitones.map((semi, i) => ({
              value: (clickedChord.rootNote.value + semi) % 12,
              order: getChordIntervalLabel(i, semi),
            }));
          }
        } else {
          // Default triad if no chord clicked
          const n1 = scaleNotes.at(0).value;
          const n2 = scaleNotes.at(2).value;
          const n3 = scaleNotes.at(4).value;
          activeNotes.push(
            { value: n1, order: 1, absoluteValue: n1 + 48 },
            { value: n2, order: 2, absoluteValue: n2 + (n2 < n1 ? 60 : 48) },
            { value: n3, order: 3, absoluteValue: n3 + (n3 < n1 ? 60 : 48) },
          );
        }
      }

      if (visualFocus === "bass" && clickedChord) {
        const chordType = resolveNnsToChordType(clickedChord.nns);
        const chordData = resolveChordSemitones(chordType);
        if (chordData) {
          activeNotes = chordData.semitones.slice(0, 4).map((semi, i) => ({
            value: (clickedChord.rootNote.value + semi) % 12,
            order: getChordIntervalLabel(i, semi),
            absoluteValue: clickedChord.rootNote.value + semi + 36,
          }));
          fretboardActiveNotes = activeNotes;
        }
      }

      currentRootValue = clickedChord
        ? clickedChord.rootNote.value
        : activeBrick.rootValue;
      targetValue = !clickedChord
        ? (activeBrick.rootValue + modeData.targetInterval) % 12
        : -1;

    } else {
      // Dictionary Mode
      currentRootValue = Number(dictRoot);
      activeNotes = dictActiveNotes;
    }

    return { activeNotes, fretboardActiveNotes, currentRootValue, targetValue };
  }, [appMode, activeBrick, clickedChord, currentAbsoluteNotes, displayMode, visualFocus, dictRoot, dictActiveNotes]);

  // --- 2. Inversion Logic ---
  const inversionText = useMemo(() => {
    if (clickedChord && currentAbsoluteNotes.length > 0) {
      const invType = getInversionType(
        currentAbsoluteNotes[0],
        clickedChord.rootNote.value,
        clickedChord.nns,
      );
      // Note: Translations should ideally be handled outside or passed in, 
      // but we match App.jsx behavior for now.
      return invType; 
    }
    return "";
  }, [clickedChord, currentAbsoluteNotes]);

  // --- 3. Fingering Logic (Guitar & Bass) ---
  
  const toV2 = (fingering, instrument) => {
    if (!fingering) return null;
    const v2Map = {};
    const rawMap = fingering.fingeringMap;
    const maxString = instrument === 'bass' ? 3 : 5;
    
    for (let i = 0; i <= maxString; i++) {
      const stringData = rawMap[i];
      if (!stringData || stringData.X) {
        v2Map[i] = { fret: -1, status: 'muted' };
      } else if (stringData[0] === 'O' || stringData.O) {
        v2Map[i] = { fret: 0, status: 'open' };
      } else {
        const fret = Object.keys(stringData).find(k => !isNaN(k));
        v2Map[i] = { 
          fret: parseInt(fret), 
          status: 'played',
          finger: stringData[fret]
        };
      }
    }
    return { ...fingering, fingeringMap: v2Map };
  };

  const guitarFingering = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary") {
      if (dictType.includes("scale")) {
        if (selectedVoicingIndexGuitar !== null) {
          const tuning = activeBrick.guitarStrings || ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
          const avail = getAvailableScaleFingerings(dictRoot, dictType, 'guitar', tuning);
          const found = avail.find(p => p.id === selectedVoicingIndexGuitar);
          if (found) return toV2({ ...found.fingering, octave: dictOctave }, 'guitar');
        }
        return null; 
      }
      if (dictType === "single_note") {
        if (selectedVoicingIndexGuitar !== null && dictActiveNotes?.length > 0) {
          const avail = getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'guitar', notation);
          const found = avail.find(p => p.id === selectedVoicingIndexGuitar);
          if (found) return toV2(found.fingering, 'guitar');
        }
        return null;
      }
      if (!dictType.includes("chord")) return null;
      rootVal = Number(dictRoot);
      chordType = dictType;
    } else {
      if (!clickedChord) return null;
      rootVal = clickedChord.rootNote.value;
      chordType = resolveNnsToChordType(clickedChord.nns);
    }

    if (appMode === "dictionary" && selectedVoicingIndexGuitar !== null) {
      const avail = getAvailableGuitarFingerings(rootVal, chordType, dictOctave, notation);
      const found = avail.find(p => String(p.id) === String(selectedVoicingIndexGuitar));
      if (found) return toV2(found.fingering, 'guitar');
    }

    const offset = appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0);
    return toV2(getGuitarFingering(rootVal, chordType, selectedRootStringGuitar, offset), 'guitar');
  }, [clickedChord, selectedRootStringGuitar, appMode, dictRoot, dictType, selectedVoicingIndexGuitar, activeBrick.guitarStrings, dictOctave, chordOctaveOffset, notation]);

  const availableGuitarFingerings = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary") {
      rootVal = Number(dictRoot);
      chordType = dictType;
      if (dictType.includes("scale")) {
        const tuning = activeBrick.guitarStrings || ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
        return getAvailableScaleFingerings(dictRoot, dictType, 'guitar', tuning, notation);
      }
    } else {
      if (!clickedChord) return [];
      rootVal = clickedChord.rootNote.value;
      chordType = resolveNnsToChordType(clickedChord.nns);
    }
    if (dictType === "single_note") {
      if (dictActiveNotes.length > 0) {
        return getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'guitar', notation);
      }
      return [];
    }
    return getAvailableGuitarFingerings(rootVal, chordType, appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0), notation);
  }, [clickedChord, appMode, dictRoot, dictType, activeBrick.guitarStrings, chordOctaveOffset, dictOctave, notation]);

  const bassFingering = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary") {
      if (dictType.includes("scale")) {
        if (selectedVoicingIndexBass !== null) {
          const tuning = activeBrick.bassStrings || ['E1', 'A1', 'D2', 'G2'];
          const avail = getAvailableScaleFingerings(dictRoot, dictType, 'bass', tuning, notation);
          const found = avail.find(p => String(p.id) === String(selectedVoicingIndexBass));
          if (found) return toV2({ ...found.fingering, octave: dictOctave }, 'bass');
        }
        return null;
      }
      if (dictType === "single_note") {
        if (selectedVoicingIndexBass !== null && dictActiveNotes?.length > 0) {
          const avail = getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'bass', notation);
          const found = avail.find(p => p.id === selectedVoicingIndexBass);
          if (found) return toV2(found.fingering, 'bass');
        }
        return null;
      }
      if (!dictType.includes("chord")) return null;
      rootVal = Number(dictRoot);
      chordType = dictType;
    } else {
      if (!clickedChord) return null;
      rootVal = clickedChord.rootNote.value;
      chordType = resolveNnsToChordType(clickedChord.nns);
    }

    if (appMode === "dictionary" && selectedVoicingIndexBass !== null) {
      const avail = getAvailableBassFingerings(rootVal, chordType, dictOctave, notation);
      const found = avail.find(p => String(p.id) === String(selectedVoicingIndexBass));
      if (found) return toV2(found.fingering, 'bass');
    }

    const offset = appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0);
    return toV2(getBassFingering(rootVal, chordType, selectedRootStringBass, offset), 'bass');
  }, [clickedChord, selectedRootStringBass, appMode, dictRoot, dictType, selectedVoicingIndexBass, activeBrick.bassStrings, dictOctave, chordOctaveOffset, notation]);

  const availableBassFingerings = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary") {
      rootVal = Number(dictRoot);
      chordType = dictType;
      if (dictType.includes("scale")) {
        const tuning = activeBrick.bassStrings || ['E1', 'A1', 'D2', 'G2'];
        return getAvailableScaleFingerings(dictRoot, dictType, 'bass', tuning, notation);
      }
    } else {
      if (!clickedChord) return [];
      rootVal = clickedChord.rootNote.value;
      chordType = resolveNnsToChordType(clickedChord.nns);
    }
    if (dictType === "single_note") {
      if (dictActiveNotes.length > 0) {
        return getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'bass', notation);
      }
      return [];
    }
    return getAvailableBassFingerings(rootVal, chordType, appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0), notation);
  }, [clickedChord, appMode, dictRoot, dictType, activeBrick.bassStrings, chordOctaveOffset, dictOctave, notation]);

  return {
    ...musicContext,
    inversionText,
    guitarFingering,
    bassFingering,
    availableGuitarFingerings,
    availableBassFingerings,
    isGuitarOutOfRange: !!(appMode === "dictionary" && dictType && (!guitarFingering || guitarFingering.isOutOfRange)),
    isBassOutOfRange: !!(appMode === "dictionary" && dictType && (!bassFingering || bassFingering.isOutOfRange))
  };
}
