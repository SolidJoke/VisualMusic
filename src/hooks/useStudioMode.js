// @ts-check
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { BRICKS } from "../core/bricks";
import { buildStudioTimeline, studioSelection } from "../core/timeline";
import { loadPersisted, brickIndexOf } from "../utils/persistedState";
import { loopLengthForCycle, maxCycleLength } from "../core/loopWindow";
import { createHistory, record, undo as undoHistory, redo as redoHistory, canUndo as historyCanUndo, canRedo as historyCanRedo } from "../core/history";
import { effectiveRoot, keyedBrick as keyedBrickOf } from "../core/keyChoice";
import { progressionFromDoc } from "../core/progressionEdit";
import { sameState } from "../core/history";
import { cycleChance, isNeutral, setDensity, withSeed } from "../core/chance";
import { newSeed } from "../core/random";
import { clampHumanize, clampSwing } from "../core/groove";
import { variationOf } from "../core/generate/generators";
import {
  createStageCache,
  hasModifications,
  initialGeneratorSettings,
  playedDocument,
  settingsForNewStyle,
  updateGeneratorSettings,
} from "../core/generate/studio";

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

  // VMU-234: the settings of every generator of the Studio, ONE state keyed by
  // generator id (core/generate/studio.js; the ordered registry is
  // core/generate/registry.js): the edited progression (VMU-127), the chance
  // and the Studio's seed (VMU-221), the key (VMU-219), the swing and the
  // humanisation (VMU-223). One state, so the history captures it in one
  // piece. A first visit draws its seed once; it is state (the history holds
  // it, the grid shows it), never read again from a clock. Not kept across a
  // reload.
  const [generators, setGenerators] = useState(() => initialGeneratorSettings());
  /** Moves one generator's settings — the one door a new generator's controls need. */
  const updateGenerator = useCallback(
    (/** @type {string} */ id, /** @type {(own: any) => any} */ update) => setGenerators((s) => updateGeneratorSettings(s, id, update)),
    [],
  );

  // VMU-127: the progression edited chord by chord, one list per variation
  // (core/progressionEdit.js), null when neither is edited.
  /** @type {import("../core/progressionEdit").CustomChords|null} */
  const customChords = generators.progression;
  // A Quick Start replaces the progression of both variations: it is the new
  // starting point of an edit, so it drops the edits made on the old one. The
  // page's own resets (a style change) go through it too.
  const setCustomProgressionAndDropEdits = useCallback(
    (progression) => {
      setCustomProgression(progression);
      updateGenerator("progression", () => null);
    },
    [updateGenerator],
  );

  // VMU-221: a chance per cell, a density per track and the seed of the draw.
  /** @type {import("../core/chance").ChanceSettings} */
  const chance = generators.chance;
  const cycleCellChance = useCallback((trackId, step) => updateGenerator("chance", (c) => cycleChance(c, trackId, step)), [updateGenerator]);
  const setTrackDensity = useCallback((trackId, percent) => updateGenerator("chance", (c) => setDensity(c, trackId, percent)), [updateGenerator]);
  const newChanceVersion = useCallback(() => updateGenerator("chance", (c) => withSeed(c, newSeed())), [updateGenerator]);

  // VMU-223: the swing (50-75 %) and the humanisation (0-100 %), two settings
  // of PLAY, not edits of the style: a change of style keeps them, "hear the
  // original" keeps them, and they are not in `hasEdits`. They are in the
  // history (↶ ↷), and the humanisation draws from the same seed as the chance.
  const { swing, humanize } = generators.groove;
  const setSwing = useCallback(
    (value) => updateGenerator("groove", (g) => (clampSwing(value) === g.swing ? g : { ...g, swing: clampSwing(value) })),
    [updateGenerator],
  );
  const setHumanize = useCallback(
    (value) => updateGenerator("groove", (g) => (clampHumanize(value) === g.humanize ? g : { ...g, humanize: clampHumanize(value) })),
    [updateGenerator],
  );

  const activeBrick = useMemo(() => BRICKS.at(Number(currentBrickIndex)), [currentBrickIndex]);

  // VMU-219: the loop's key. `keyChoice` is the user's tonic (0-11) or null, in
  // which case the style's own is followed — also after a style change; a
  // chosen one is kept across style changes. Not kept across a reload.
  // `keyRoot` is the effective tonic: the one value playback, the
  // instruments, the DAW helper, the copied progression and the exported
  // file's name all read (core/keyChoice.js).
  const keyChoice = generators.transpose;
  const keyRoot = effectiveRoot(activeBrick.rootValue, keyChoice);
  // The style's brick in the effective key: what the panels and the
  // instruments read. `activeBrick` itself stays the style's own, with its own
  // identity, because the page clears the user's edits when it changes.
  const keyedBrick = useMemo(() => keyedBrickOf(activeBrick, keyRoot), [activeBrick, keyRoot]);
  const setKeyRoot = useCallback(
    (root) => {
      const next = effectiveRoot(activeBrick.rootValue, root);
      // The style's own tonic is no choice: a later style's tonic is followed.
      updateGenerator("transpose", () => (next === activeBrick.rootValue ? null : next));
      // What was clicked was voiced in the old key.
      setClickedChord(null);
      setCurrentAbsoluteNotes([]);
    },
    [activeBrick, updateGenerator],
  );

  const overrides = useMemo(
    () => ({ customDrums, customRhythm, customProgression, suggestedBassTrack }),
    [customDrums, customRhythm, customProgression, suggestedBassTrack],
  );

  // VMU-227 — undo / redo over what the user decides: the style, the
  // variation, the four overrides and (VMU-234) the generators' settings in
  // one piece (core/history.js holds the rules; this is the wiring). A change
  // of style clears the overrides, as the page's effect always did; it does
  // so HERE too, in the same batch, so that the style and the loss of the
  // edits are ONE step — undone together, not through a state that never
  // existed. The page's effect stays (it also clears on a mode change and at
  // mount) and finds nothing left to clear.
  const snapshot = useMemo(
    () => ({
      brickIndex: Number(currentBrickIndex),
      theme: currentTheme,
      customDrums,
      customRhythm,
      customProgression,
      suggestedBassTrack,
      generators,
    }),
    [currentBrickIndex, currentTheme, customDrums, customRhythm, customProgression, suggestedBassTrack, generators],
  );
  // The history is state (what the buttons show); the ref beside it is what
  // the handlers read, written where the state is (never during a render).
  const [history, setHistory] = useState(() => createHistory(snapshot));
  const snapshotRef = useRef(snapshot);
  const historyRef = useRef(history);
  // VMU-223: a slider drag changes a setting at every pixel, and each value
  // would be a step of the history (the limit is 50). While a gesture is
  // held, the history waits; it records once, when the gesture ends — one
  // step, whatever generator the gesture moves.
  const gestureRef = useRef(false);
  useEffect(() => {
    snapshotRef.current = snapshot;
    if (gestureRef.current) return;
    const next = record(historyRef.current, snapshot);
    if (next === historyRef.current) return;
    historyRef.current = next;
    setHistory(next);
  }, [snapshot]);
  const beginGesture = useCallback(() => {
    gestureRef.current = true;
  }, []);
  const endGesture = useCallback(() => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    const next = record(historyRef.current, snapshotRef.current);
    if (next === historyRef.current) return;
    historyRef.current = next;
    setHistory(next);
  }, []);

  const setCurrentBrickIndex = useCallback((next) => {
    if (Number(next) !== snapshotRef.current.brickIndex) {
      setSuggestedBassTrack(null);
      setCustomProgression(null);
      setCustomRhythm(null);
      setCustomDrums(null);
      // Each generator says what a change of style leaves of its settings
      // (the edited chords and the chances go; the seed, the key and the
      // groove stay).
      setGenerators((s) => settingsForNewStyle(s));
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
    setCustomDrums(target.customDrums);
    setCustomRhythm(target.customRhythm);
    setCustomProgression(target.customProgression);
    setSuggestedBassTrack(target.suggestedBassTrack);
    setGenerators(target.generators);
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
  // page shows is the style's own fill (no override, no "edit" generator), in
  // the same key and groove. Not a state of the loop (no history step): a
  // hand held on a button. VMU-234: offered on THE one "has edits" rule.
  const [listenOriginal, setListenOriginal] = useState(false);
  const hasEdits = hasModifications(overrides, generators);
  const isHearingOriginal = listenOriginal && hasEdits;

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
  // The SOURCE of the chain: the style with its overrides, in its own key.
  const source = useMemo(
    () => buildStudioTimeline({ brickIndex: currentBrickIndex, theme: currentTheme, overrides, lengthMeasures }),
    [currentBrickIndex, currentTheme, overrides, lengthMeasures],
  );
  // VMU-227: the style alone — its own window, no override. The key and the
  // groove still apply (the chain's "play" generators); the tempo is not the
  // document's.
  const original = useMemo(
    () => (isHearingOriginal ? buildStudioTimeline({ brickIndex: currentBrickIndex, theme: currentTheme }) : null),
    [isHearingOriginal, currentBrickIndex, currentTheme],
  );

  // VMU-234 — the generators of the registry, in its order, on the source:
  // ONE computation of the document that plays, is drawn and is exported, and
  // ONE list of marks (the hits a generator removed, for the grid). Each
  // stage is memoised in a cache (its input, its settings, what it reads), so
  // an identity holds when nothing it depends on moved, as the separate memos
  // of before did. Two caches: the original and the edited chains do not
  // evict each other. Each is one Map for the hook's life (a lazy state, never
  // set); the result is the same with or without it.
  const [editedCache] = useState(createStageCache);
  const [originalCache] = useState(createStageCache);
  const styleRoot = activeBrick.rootValue;
  const played = useMemo(
    () =>
      isHearingOriginal
        ? playedDocument(original, generators, { theme: currentTheme, styleRoot, cycleSteps }, { hearOriginal: true, cache: originalCache })
        : playedDocument(source, generators, { theme: currentTheme, styleRoot, cycleSteps }, { cache: editedCache }),
    [isHearingOriginal, original, source, generators, currentTheme, styleRoot, cycleSteps, originalCache, editedCache],
  );
  const timeline = played.doc;
  const chanceDropped = played.dropped;

  // VMU-127 — one editing gesture: `operation` (a progressionEdit.js
  // operation, partially applied) maps the edited list of the variation that
  // plays to the next one. A first gesture starts from what plays (the
  // style's chords, a Quick Start's, the repeats of the window — the source,
  // since no edit of this variation is laid on it yet), so it changes only
  // what it is about. A refused gesture changes nothing — no edit, no
  // history step.
  const editChords = useCallback(
    (operation) => {
      const variation = variationOf(currentTheme);
      const start = customChords?.[variation] ?? progressionFromDoc(source);
      const next = operation(start);
      if (!Array.isArray(next) || next.length === 0 || sameState(next, start)) return;
      updateGenerator("progression", (previous) => ({ ...(previous || {}), [variation]: next }));
    },
    [currentTheme, customChords, source, updateGenerator],
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
    swing, setSwing, humanize, setHumanize,
    beginGrooveGesture: beginGesture, endGrooveGesture: endGesture,
    generators, updateGenerator, beginGesture, endGesture,
    activeBrick,
    keyRoot, setKeyRoot,
    keyedBrick,
    activeTracks,
    timeline,
    viewRequest,
    requestSequencerView,
    undo, redo, canUndo, canRedo, consumeRestoredStyle,
    listenOriginal, setListenOriginal, isHearingOriginal,
    hasEdits,
  };
}
