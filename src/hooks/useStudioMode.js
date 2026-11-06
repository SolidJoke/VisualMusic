// @ts-check
import { useState, useMemo, useCallback } from "react";
import { BRICKS } from "../core/bricks";
import { buildStudioTimeline, studioSelection } from "../core/timeline";
import { loadPersisted, brickIndexOf } from "../utils/persistedState";
import { loopLengthForCycle, maxCycleLength } from "../core/loopWindow";

export function useStudioMode() {
  // VMU-050: the style the last visit left, found by its stable name (never by
  // an index, which moves when the list does); unknown or absent = the first.
  const [currentBrickIndex, setCurrentBrickIndex] = useState(() => {
    const index = brickIndexOf(loadPersisted().brickId);
    return index >= 0 ? index : 0;
  });
  const [displayMode, setDisplayMode] = useState("chord");
  const [clickedChord, setClickedChord] = useState(null);
  const [currentTheme, setCurrentTheme] = useState("A");
  const [currentAbsoluteNotes, setCurrentAbsoluteNotes] = useState([]);
  const [currentlyPlayingNotes, setCurrentlyPlayingNotes] = useState([]);
  const [chordOctaveOffset, setChordOctaveOffset] = useState(() => loadPersisted().chordOctaveOffset ?? 0); // -3..+3 (offset relative to C4)
  const [contextualScaleAbsoluteValues, setContextualScaleAbsoluteValues] = useState([]);
  const [lastClickedContext, setLastClickedContext] = useState(null);
  const [singlePlayContext, setSinglePlayContext] = useState(null);

  const [suggestedBassTrack, setSuggestedBassTrack] = useState(null);
  const [customProgression, setCustomProgression] = useState(null);
  const [customRhythm, setCustomRhythm] = useState(null);
  const [customDrums, setCustomDrums] = useState(null);

  const activeBrick = useMemo(() => BRICKS.at(Number(currentBrickIndex)), [currentBrickIndex]);

  const overrides = useMemo(
    () => ({ customDrums, customRhythm, customProgression, suggestedBassTrack }),
    [customDrums, customRhythm, customProgression, suggestedBassTrack],
  );

  // VMU-214: the loop grows to hold the longest active cycle (Math & Rythmes
  // whole-circle overrides), never shorter than today's 4 measures, never past
  // the document's 8.
  const { lengthMeasures } = useMemo(
    () => loopLengthForCycle(maxCycleLength(overrides)),
    [overrides],
  );

  // VMU-214: a send re-applies the sequencer view (whole loop, page 1). The
  // counter, not the value, is what the piano rolls watch: the same view twice
  // in a row must still re-apply, and the user's own density choice must hold
  // between sends.
  const [viewRequest, setViewRequest] = useState(0);
  const requestSequencerView = useCallback(() => setViewRequest((n) => n + 1), []);

  // What the panels show and edit: the style's tracks and progression, the
  // overrides above applied (core/timeline.js studioSelection — the rules
  // this memo used to hold).
  const activeTracks = useMemo(
    () => studioSelection(activeBrick, currentTheme, overrides),
    [activeBrick, currentTheme, overrides],
  );

  // T3: what plays — the timeline document the same style, theme and
  // overrides fill. The playback loop, the MIDI export, the piano rolls and
  // the DAW helper read it. Its window is the longest active cycle's, derived
  // above (VMU-214); the document already holds all 8 measures.
  const timeline = useMemo(
    () =>
      buildStudioTimeline({
        brickIndex: currentBrickIndex,
        theme: currentTheme,
        overrides,
        lengthMeasures,
      }),
    [currentBrickIndex, currentTheme, overrides, lengthMeasures],
  );

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
    suggestedBassTrack, setSuggestedBassTrack,
    customProgression, setCustomProgression,
    customRhythm, setCustomRhythm,
    customDrums, setCustomDrums,
    activeBrick,
    activeTracks,
    timeline,
    viewRequest,
    requestSequencerView
  };
}
