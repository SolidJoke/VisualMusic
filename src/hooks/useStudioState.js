import { useState } from "react";

export function useStudioState() {
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
    singlePlayContext, setSinglePlayContext
  };
}
