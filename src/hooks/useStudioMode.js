// @ts-check
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { BRICKS } from "../core/bricks";
import { buildStudioTimeline, studioSelection } from "../core/timeline";
import { loadPersisted, brickIndexOf } from "../utils/persistedState";
import { loopLengthForCycle, maxCycleLength } from "../core/loopWindow";
import { createHistory, record, undo as undoHistory, redo as redoHistory, canUndo as historyCanUndo, canRedo as historyCanRedo } from "../core/history";
import { effectiveRoot, keyedBrick as keyedBrickOf, transposeTimeline } from "../core/keyChoice";
import { applyEditedChords, progressionFromDoc } from "../core/progressionEdit";
import { sameState } from "../core/history";
import { applyChance, cycleChance, emptyChance, isNeutral, setDensity, withSeed } from "../core/chance";
import { newSeed } from "../core/random";

/**
 * Whether any of the four overrides is set, or (VMU-127) a variation's
 * progression is edited, or (VMU-221) a chance or a density is set.
 */
function hasOverrides(overrides, customChords = null, chance = null) {
  return Boolean(
    overrides.customDrums ||
      overrides.customRhythm ||
      overrides.customProgression ||
      overrides.suggestedBassTrack ||
      (customChords && (customChords.A || customChords.B)) ||
      (chance && !isNeutral(chance)),
  );
}

/** No removed hit (a constant: a stable identity for the readers). */
const NO_DROPPED = Object.freeze({});

/** The variation a theme plays: "B", or "A" for anything else. */
function variationOf(theme) {
  return theme === "B" ? "B" : "A";
}

export function useStudioMode() {
  // VMU-050: the style the last visit left, found by its stable name (never by
  // an index, which moves when the list does); unknown or absent = the first.
  const [currentBrickIndex, setBrickIndexRaw] = useState(() => {
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
  // VMU-127: the progression edited chord by chord, one list per variation
  // (core/progressionEdit.js), null when neither is edited.
  const [customChords, setCustomChords] = useState(/** @type {import("../core/progressionEdit").CustomChords|null} */ (null));
  // A Quick Start replaces the progression of both variations: it is the new
  // starting point of an edit, so it drops the edits made on the old one. The
  // page's own resets (a style change) go through it too.
  const setCustomProgressionAndDropEdits = useCallback((progression) => {
    setCustomProgression(progression);
    setCustomChords(null);
  }, []);

  // VMU-221: a chance per cell, a density per track and the seed of the draw
  // (core/chance.js). A first visit draws its seed once; it is state (the
  // history holds it, the grid shows it), never read again from a clock. Not
  // kept across a reload, like the key.
  const [chance, setChance] = useState(() => emptyChance(newSeed()));
  const cycleCellChance = useCallback((trackId, step) => setChance((c) => cycleChance(c, trackId, step)), []);
  const setTrackDensity = useCallback((trackId, percent) => setChance((c) => setDensity(c, trackId, percent)), []);
  const newChanceVersion = useCallback(() => setChance((c) => withSeed(c, newSeed())), []);

  const activeBrick = useMemo(() => BRICKS.at(Number(currentBrickIndex)), [currentBrickIndex]);

  // VMU-219: the loop's key. `keyChoice` is the user's tonic (0-11) or null, in
  // which case the style's own is followed — also after a style change; a
  // chosen one is kept across style changes. Not kept across a reload.
  // `keyRoot` is the effective tonic: the one value playback, the
  // instruments, the DAW helper, the copied progression and the exported
  // file's name all read (core/keyChoice.js).
  const [keyChoice, setKeyChoice] = useState(null);
  const keyRoot = effectiveRoot(activeBrick.rootValue, keyChoice);
  // The style's brick in the effective key: what the panels and the
  // instruments read. `activeBrick` itself stays the style's own, with its own
  // identity, because the page clears the user's edits when it changes.
  const keyedBrick = useMemo(() => keyedBrickOf(activeBrick, keyRoot), [activeBrick, keyRoot]);
  const setKeyRoot = useCallback(
    (root) => {
      const next = effectiveRoot(activeBrick.rootValue, root);
      // The style's own tonic is no choice: a later style's tonic is followed.
      setKeyChoice(next === activeBrick.rootValue ? null : next);
      // What was clicked was voiced in the old key.
      setClickedChord(null);
      setCurrentAbsoluteNotes([]);
    },
    [activeBrick],
  );

  const overrides = useMemo(
    () => ({ customDrums, customRhythm, customProgression, suggestedBassTrack }),
    [customDrums, customRhythm, customProgression, suggestedBassTrack],
  );

  // VMU-227 — undo / redo over what the user decides: the style, the
  // variation, the key and the four overrides (core/history.js holds the
  // rules; this is the wiring). A change of style clears the overrides, as
  // the page's effect always did; it does so HERE too, in the same batch, so
  // that the style and the loss of the edits are ONE step — undone together,
  // not through a state that never existed. The page's effect stays (it also
  // clears on a mode change and at mount) and finds nothing left to clear.
  const snapshot = useMemo(
    () => ({
      brickIndex: Number(currentBrickIndex),
      theme: currentTheme,
      keyChoice,
      customDrums,
      customRhythm,
      customProgression,
      suggestedBassTrack,
      customChords,
      chance,
    }),
    [currentBrickIndex, currentTheme, keyChoice, customDrums, customRhythm, customProgression, suggestedBassTrack, customChords, chance],
  );
  // The history is state (what the buttons show); the ref beside it is what
  // the handlers read, written where the state is (never during a render).
  const [history, setHistory] = useState(() => createHistory(snapshot));
  const snapshotRef = useRef(snapshot);
  const historyRef = useRef(history);
  useEffect(() => {
    snapshotRef.current = snapshot;
    const next = record(historyRef.current, snapshot);
    if (next === historyRef.current) return;
    historyRef.current = next;
    setHistory(next);
  }, [snapshot]);

  const setCurrentBrickIndex = useCallback((next) => {
    if (Number(next) !== snapshotRef.current.brickIndex) {
      setSuggestedBassTrack(null);
      setCustomProgression(null);
      setCustomRhythm(null);
      setCustomDrums(null);
      setCustomChords(null);
      // The chances and densities are keyed by the style's tracks: they do not
      // carry over. The seed does (the version stays the version).
      setChance((c) => (isNeutral(c) ? c : emptyChance(c.seed)));
    }
    setBrickIndexRaw(next);
  }, []);

  // Set when a restore changes the style: the page's "style changed" effect
  // must then keep the overrides the restore just put back, once.
  const restoredStyleRef = useRef(false);
  const consumeRestoredStyle = useCallback(() => {
    const was = restoredStyleRef.current;
    restoredStyleRef.current = false;
    return was;
  }, []);

  const restore = useCallback((target) => {
    if (target.brickIndex !== snapshotRef.current.brickIndex) restoredStyleRef.current = true;
    setBrickIndexRaw(target.brickIndex);
    setCurrentTheme(target.theme);
    setKeyChoice(target.keyChoice);
    setCustomDrums(target.customDrums);
    setCustomRhythm(target.customRhythm);
    setCustomProgression(target.customProgression);
    setSuggestedBassTrack(target.suggestedBassTrack);
    setCustomChords(target.customChords ?? null);
    if (target.chance) setChance(target.chance);
    // What was clicked was voiced in the loop of before.
    setClickedChord(null);
    setCurrentAbsoluteNotes([]);
  }, []);
  const undo = useCallback(() => {
    const next = undoHistory(historyRef.current);
    if (next === historyRef.current) return;
    historyRef.current = next;
    restore(next.present);
    setHistory(next);
  }, [restore]);
  const redo = useCallback(() => {
    const next = redoHistory(historyRef.current);
    if (next === historyRef.current) return;
    historyRef.current = next;
    restore(next.present);
    setHistory(next);
  }, [restore]);
  const canUndo = historyCanUndo(history);
  const canRedo = historyCanRedo(history);

  // VMU-227 — hold to hear the original: while true, what plays and what the
  // page shows is the style's own fill (no override), in the same key. Not a
  // state of the loop (no history step): a hand held on a button.
  const [listenOriginal, setListenOriginal] = useState(false);
  const isHearingOriginal = listenOriginal && hasOverrides(overrides, customChords, chance);

  // VMU-127: the edited progression of the variation that plays, if any.
  const editedChords = customChords?.[variationOf(currentTheme)] ?? null;

  // VMU-214: the loop grows to hold the longest active cycle (Math & Rythmes
  // whole-circle overrides), never shorter than today's 4 measures, never past
  // the document's 8. An edited progression sets its own window instead
  // (progressionEdit.js editedLoopLength: the chords' length or the cycle's).
  const cycleSteps = useMemo(() => maxCycleLength(overrides), [overrides]);
  const { lengthMeasures } = useMemo(() => loopLengthForCycle(cycleSteps), [cycleSteps]);

  // VMU-214: a send re-applies the sequencer view (whole loop, page 1). The
  // counter, not the value, is what the piano rolls watch: the same view twice
  // in a row must still re-apply, and the user's own density choice must hold
  // between sends.
  const [viewRequest, setViewRequest] = useState(0);
  const requestSequencerView = useCallback(() => setViewRequest((n) => n + 1), []);

  // What the panels show and edit: the style's tracks and progression, the
  // overrides above applied (core/timeline.js studioSelection — the rules
  // this memo used to hold).
  // VMU-127: an edited progression is what the panels show as the
  // progression (its degrees, in order — the drawer's chord buttons).
  const activeTracks = useMemo(() => {
    const selection = studioSelection(activeBrick, currentTheme, overrides);
    return editedChords ? { ...selection, progression: editedChords.map((chord) => chord.nns) } : selection;
  }, [activeBrick, currentTheme, overrides, editedChords]);

  // T3: what plays — the timeline document the same style, theme and
  // overrides fill. The playback loop, the MIDI export, the piano rolls and
  // the DAW helper read it. Its window is the longest active cycle's, derived
  // above (VMU-214); the document already holds all 8 measures.
  // The document with the user's edits, in the STYLE's key: the overrides,
  // then (VMU-127) the edited chords, resolved in the style's tonic and laid
  // over the window they set.
  const editedDoc = useMemo(() => {
    const doc = buildStudioTimeline({ brickIndex: currentBrickIndex, theme: currentTheme, overrides, lengthMeasures });
    return editedChords ? applyEditedChords(doc, editedChords, cycleSteps) : doc;
  }, [currentBrickIndex, currentTheme, overrides, lengthMeasures, editedChords, cycleSteps]);

  // VMU-221: the chances and densities, applied after the document is built
  // (the progression's edits above are in it) and before the key moves it.
  // `dropped` is the removed hits, for the grid to mark.
  const chanced = useMemo(() => applyChance(editedDoc, chance), [editedDoc, chance]);

  const timeline = useMemo(
    () =>
      transposeTimeline(
        isHearingOriginal
          ? // VMU-227: the style alone — its own window, no override (nor
            // edited chords, nor chance). The key is the same (transposed
            // below), the tempo is not the document's.
            buildStudioTimeline({ brickIndex: currentBrickIndex, theme: currentTheme })
          : chanced.doc,
        keyRoot - activeBrick.rootValue,
      ),
    [currentBrickIndex, currentTheme, chanced, keyRoot, activeBrick, isHearingOriginal],
  );
  const chanceDropped = isHearingOriginal ? NO_DROPPED : chanced.dropped;

  // VMU-127 — one editing gesture: `operation` (a progressionEdit.js
  // operation, partially applied) maps the edited list of the variation that
  // plays to the next one. A first gesture starts from what plays (the
  // style's chords, a Quick Start's, the repeats of the window), so it changes
  // only what it is about. A refused gesture changes nothing — no edit, no
  // history step.
  const editChords = useCallback(
    (operation) => {
      const variation = variationOf(currentTheme);
      const start = customChords?.[variation] ?? progressionFromDoc(editedDoc);
      const next = operation(start);
      if (!Array.isArray(next) || next.length === 0 || sameState(next, start)) return;
      setCustomChords((previous) => ({ ...(previous || {}), [variation]: next }));
    },
    [currentTheme, customChords, editedDoc],
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
    customProgression, setCustomProgression: setCustomProgressionAndDropEdits,
    customRhythm, setCustomRhythm,
    customDrums, setCustomDrums,
    customChords, editedChords, editChords,
    chance, chanceDropped, cycleCellChance, setTrackDensity, newChanceVersion,
    chanceActive: !isNeutral(chance),
    activeBrick,
    keyRoot, setKeyRoot,
    keyedBrick,
    activeTracks,
    timeline,
    viewRequest,
    requestSequencerView,
    undo, redo, canUndo, canRedo, consumeRestoredStyle,
    listenOriginal, setListenOriginal, isHearingOriginal,
    hasEdits: hasOverrides(overrides, customChords, chance),
  };
}
