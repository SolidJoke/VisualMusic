import { useState, useMemo } from "react";
import { BRICKS } from "../core/bricks";
import { getScaleNotes, resolveNnsToChordType, resolveChordSemitones } from "../core/theory";
import { getChordIntervalLabel } from "../core/harmonyEngine";

export function useStudioMode() {
  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState("chord");
  const [clickedChord, setClickedChord] = useState(null);
  const [currentTheme, setCurrentTheme] = useState("A");
  const [currentAbsoluteNotes, setCurrentAbsoluteNotes] = useState([]);
  const [currentlyPlayingNotes, setCurrentlyPlayingNotes] = useState([]);
  const [chordOctaveOffset, setChordOctaveOffset] = useState(0); // -3..+3 (offset relative to C4)
  const [contextualScaleAbsoluteValues, setContextualScaleAbsoluteValues] = useState([]);
  const [lastClickedContext, setLastClickedContext] = useState(null);
  const [singlePlayContext, setSinglePlayContext] = useState(null);
  const [visualFocus, setVisualFocus] = useState("chords");

  const [suggestedBassTrack, setSuggestedBassTrack] = useState(null);
  const [customProgression, setCustomProgression] = useState(null);
  const [customRhythm, setCustomRhythm] = useState(null);
  const [customDrums, setCustomDrums] = useState(null);

  const activeBrick = useMemo(() => BRICKS.at(Number(currentBrickIndex)), [currentBrickIndex]);

  const activeTracks = useMemo(() => {
    const isB = currentTheme === "B";
    const baseMelody = isB && activeBrick.melodyTracksVariation ? activeBrick.melodyTracksVariation : activeBrick.melodyTracks;
    
    // If we have a suggested bass, we override the 'Bass' track in the melody tracks
    let finalMelody = baseMelody;
    if (suggestedBassTrack) {
        finalMelody = baseMelody.map(track => 
            track.name === 'Bass' ? suggestedBassTrack : track
        );
    }

    const baseProgression = isB && activeBrick.nnsProgressionVariation ? activeBrick.nnsProgressionVariation : activeBrick.nnsProgression;

    // Start with base drums
    let baseDrums = isB && activeBrick.drumTracksVariation ? activeBrick.drumTracksVariation : activeBrick.drumTracks;
    let finalDrums = baseDrums || [];

    if (customDrums) {
      finalDrums = baseDrums.map(track => {
        if (customDrums[track.name] !== undefined) {
          return { ...track, activeSteps: customDrums[track.name] };
        }
        return track;
      });

      // Also append tracks that might not be in baseDrums but exist in customDrums
      Object.keys(customDrums).forEach(name => {
        if (!finalDrums.some(t => t.name === name)) {
          finalDrums.push({ name, activeSteps: customDrums[name] });
        }
      });
    }

    return {
      drums: finalDrums,
      melody: finalMelody,
      progression: customProgression || baseProgression,
      rhythm: customRhythm || activeBrick.chordRhythm || [0]
    };
  }, [activeBrick, currentTheme, suggestedBassTrack, customProgression, customRhythm, customDrums]);

  return {
    currentBrickIndex, setCurrentBrickIndex,
    displayMode, setDisplayMode,
    clickedChord, setClickedChord,
    currentTheme, setCurrentTheme,
    currentAbsoluteNotes, setCurrentAbsoluteNotes,
    currentlyPlayingNotes, setCurrentlyPlayingNotes,
    chordOctaveOffset, setChordOctaveOffset,
    contextualScaleAbsoluteValues, setContextualScaleAbsoluteValues,
    lastClickedContext, setLastClickedContext,
    singlePlayContext, setSinglePlayContext,
    visualFocus, setVisualFocus,
    suggestedBassTrack, setSuggestedBassTrack,
    customProgression, setCustomProgression,
    customRhythm, setCustomRhythm,
    customDrums, setCustomDrums,
    activeBrick,
    activeTracks
  };
}
