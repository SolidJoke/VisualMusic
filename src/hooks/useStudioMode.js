
import { useState, useMemo } from "react";
import { BRICKS } from "../core/bricks";
import { getScaleNotes, resolveNnsToChordType, resolveChordSemitones, MODES } from "../core/theory";
import { getChordIntervalLabel } from "../core/harmonyEngine";

export function useStudioMode() {
  const [currentBrickIndex, setCurrentBrickIndex] = useState(0);
  const [displayMode, setDisplayMode] = useState("chord");
  const [clickedChord, setClickedChord] = useState(null);
  const [currentTheme, setCurrentTheme] = useState("A");
  const [currentAbsoluteNotes, setCurrentAbsoluteNotes] = useState([]);
  const [currentlyPlayingNotes, setCurrentlyPlayingNotes] = useState([]);
  const [chordOctaveOffset, setChordOctaveOffset] = useState(0);
  const [contextualScaleAbsoluteValues, setContextualScaleAbsoluteValues] = useState([]);
  const [lastClickedContext, setLastClickedContext] = useState(null);
  const [singlePlayContext, setSinglePlayContext] = useState(null);
  const [visualFocus, setVisualFocus] = useState("chords");

  const [suggestedBassTrack, setSuggestedBassTrack] = useState(null);

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

    return {
      drums: isB && activeBrick.drumTracksVariation ? activeBrick.drumTracksVariation : activeBrick.drumTracks,
      melody: finalMelody,
      progression: isB && activeBrick.nnsProgressionVariation ? activeBrick.nnsProgressionVariation : activeBrick.nnsProgression
    };
  }, [activeBrick, currentTheme, suggestedBassTrack]);

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
    activeBrick,
    activeTracks
  };
}
