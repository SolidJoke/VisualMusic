// @ts-check
import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import "./styles/modern-theme.css";


import DictionaryPanel from "./components/Panels/DictionaryPanel";
import StudioPanel from "./components/Panels/StudioPanel";
import ControlPanel from "./components/Panels/ControlPanel";
import PlaybackPanel from "./components/Panels/PlaybackPanel";
import Sidebar from "./components/Layout/Sidebar";
import BottomNav from "./components/Layout/BottomNav";
import CustomSelect from "./components/Common/CustomSelect";
import InstrumentView from "./components/Panels/InstrumentView";
import CompositionPanel from "./components/Intelligence/CompositionPanel";
import Modal from "./components/Common/Modal";
import ConfirmDialog from "./components/Common/ConfirmDialog";
import { useSequencer } from "./audio/useSequencer";
import { useStudioMode } from "./hooks/useStudioMode";
import { useDictionaryMode } from "./hooks/useDictionaryMode";
import { usePlaybackHandlers } from "./hooks/usePlaybackHandlers";
import { useMetronome } from "./hooks/useMetronome";
import { useMusicEngine } from "./hooks/useMusicEngine";
import useDebugExport from "./hooks/useDebugExport";
import AboutModal from "./components/Modals/AboutModal";
import TheoryModal from "./components/Modals/TheoryModal";
import HelpModal from "./components/Modals/HelpModal";
import { log } from "./utils/debug";
import { savePersisted } from "./utils/persistedState";
import { useAppContext } from "./context/AppContext";
import { translations } from "./i18n/translations";
import { MusicEngineProvider } from "./context/MusicEngineContext";
import { PlaybackProvider } from "./context/PlaybackContext";
import {
  applyGenrePreset,
  masterAnalyser,
} from "./audio/AudioEngine";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import AppHeader, { HeaderActions } from './components/Layout/AppHeader';
import { IS_PROTOTYPE_A } from "./layout";

// S1 prototype (VMU-135): layout A′ with vertical instruments. Since VMU-188 it
// is the page on a desktop; src/layout.js decides which page is shown (the one
// owner of that choice). Lazy, so the classic app never downloads it;
// AppRouter's Suspense covers the load.
const PrototypeA = React.lazy(() => import("./prototype/PrototypeA"));

function AppDesktop() {
  const { lang, txt, notation, state, dispatch } = useAppContext();
  const { 
    appMode,
    showAbout,
    showTheory,
    showFingering,
    showFingerNumbers,
    playbackInstrument,
    collapsedSections,
    targetNotesPreset,
    useShellVoicings
  } = state;

  const setAppMode = useCallback((newMode) => {
    log("app", `Switching appMode to ${newMode}`);
    dispatch({ type: 'SET_APP_MODE', payload: newMode });
  }, [dispatch]);
  
  useEffect(() => {
    document.body.className = 'theme-modern';
  }, []);

  const setLang = useCallback((newLang) => dispatch({ type: 'SET_LANG', payload: newLang }), [dispatch]);
  // VMU-134: the wrapper this comment used to say didn't exist. The US/EU
  // toggle moved out of DictionaryPanel (which dispatched SET_NOTATION
  // directly) and into HeaderActions, shared by the header and the phone
  // drawer — so it now needs a stable callback like every other headerProps
  // entry, rather than a raw dispatch passed down.
  const setNotation = useCallback((val) => dispatch({ type: 'SET_NOTATION', payload: val }), [dispatch]);
  const setShowAbout = useCallback((val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showAbout', value: val } }), [dispatch]);
  const setShowTheory = useCallback((val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showTheory', value: val } }), [dispatch]);
  const setShowFingering = useCallback((val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showFingering', value: val } }), [dispatch]);
  const setShowFingerNumbers = useCallback((val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showFingerNumbers', value: val } }), [dispatch]);
  const setPlaybackInstrument = useCallback((val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'playbackInstrument', value: val } }), [dispatch]);
  // VMU-112: replaces setLayoutMode/setActiveTab. Folding is independent of
  // which instrument is played — this never touches playbackInstrument.
  // Memoized: passed to InstrumentView (memoized), stable ref avoids unnecessary re-renders
  const toggleSection = useCallback(
    (section) => dispatch({
      type: 'SET_UI_VALUE',
      payload: {
        key: 'collapsedSections',
        value: { ...collapsedSections, [section]: !collapsedSections[section] },
      },
    }),
    [dispatch, collapsedSections]
  );
  const setUseShellVoicings = useCallback((val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'useShellVoicings', value: val } }), [dispatch]);
  const setTargetNotesPreset = useCallback((val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'targetNotesPreset', value: val } }), [dispatch]);


  const {
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
    timeline
  } = useStudioMode();

  // VMU-126: changing the style or the mode clears what the user built on top
  // of the style (the effect below). When there is something to lose, the
  // change is REQUESTED here and a confirmation opens first; the raw setters
  // stay for the page's own programmatic changes (A' scenarios, URL states).
  // The edits are the four overrides of useStudioMode; the clicked chord and
  // the notes are a selection, not an edit, and clear without a question.
  const hasEdits = Boolean(customProgression || customRhythm || customDrums || suggestedBassTrack);
  const [pendingChange, setPendingChange] = useState(null); // { kind: "style" | "mode", value }

  const requestBrickIndex = useCallback((next) => {
    const index = Number(next);
    if (pendingChange || index === Number(currentBrickIndex)) return;
    if (!hasEdits) {
      setCurrentBrickIndex(index);
      return;
    }
    setPendingChange({ kind: "style", value: index });
  }, [pendingChange, currentBrickIndex, hasEdits, setCurrentBrickIndex]);

  const requestAppMode = useCallback((next) => {
    if (pendingChange || next === appMode) return;
    if (!hasEdits) {
      setAppMode(next);
      return;
    }
    setPendingChange({ kind: "mode", value: next });
  }, [pendingChange, appMode, hasEdits, setAppMode]);

  const keepEdits = useCallback(() => setPendingChange(null), []);
  const applyPendingChange = useCallback(() => {
    if (!pendingChange) return;
    const { kind, value } = pendingChange;
    setPendingChange(null);
    if (kind === "style") setCurrentBrickIndex(value);
    else setAppMode(value);
  }, [pendingChange, setCurrentBrickIndex, setAppMode]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showMathModal, setShowMathModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // The progression the Studio panel's chord buttons show. What plays is the
  // timeline document (T3), handed to the loop and the sequencer panel.
  const { progression: activeProgression } = activeTracks;

  const {
    dictRoot, setDictRoot,
    dictType, setDictType,
    fretboardZone, setFretboardZone,
    selectedRootStringGuitar, setSelectedRootStringGuitar,
    selectedRootStringBass, setSelectedRootStringBass,
    harmonicMode, setHarmonicMode,
    placementByInstrument, setPlacementIndex,
    scaleAnchor, setScaleAnchor,
    dictOctave, setDictOctave,
    activeNotes: dictActiveNotes
  } = useDictionaryMode({
    // L1b-1b: on A′ the octave is the piano's own setting (its column head):
    // it no longer picks nor clears the necks' positions. The classic page
    // keeps its common octave as it is.
    pianoOwnsOctave: IS_PROTOTYPE_A
  });

  // --- Sequencer (Playback engine) ---
  // Called before useMusicEngine: VMU-129 needs the sequencer's isPlaying
  // and currentPlayingChord as *inputs* to the music engine (so instruments
  // can follow the chord actually playing), so the engine's own output
  // can no longer be the source of the sequencer's currentRootValue input.
  // That input only ever fed a fallback register for a non-bass melody
  // track (no such track exists in any style today) — unrelated to which
  // chord of the progression is playing — so it is derived here the same
  // way useMusicEngine used to derive it, without waiting on the engine.
  const {
    isAudioReady,
    setIsAudioReady,
    isPlaying,
    masterVolume,
    setMasterVolume,
    currentBpm,
    setCurrentBpm,
    instrumentVolumes,
    handleInstrumentVolumeChange,
    currentStep,
    togglePlayback,
    handleBpmChange,
    currentPlayingChord
  } = useSequencer({
    appMode,
    activeBrick,
    timeline,
    currentRootValue: clickedChord ? clickedChord.rootNote.value : activeBrick.rootValue,
    setCurrentlyPlayingNotes,
    chordOctaveOffset,
  });

  // --- Music Engine (Harmonics & Fingering) ---
  const musicState = useMusicEngine({
    appMode,
    activeBrick,
    clickedChord,
    isPlaying,
    currentPlayingChord,
    currentAbsoluteNotes,
    chordOctaveOffset,
    displayMode,
    selectedRootStringGuitar,
    selectedRootStringBass,
    placementByInstrument,
    dictRoot,
    dictType,
    dictActiveNotes,
    dictOctave,
    notation,
    playbackInstrument,
    targetNotesPreset,
    // L1b-1b: see useDictionaryMode above — the same page, the same answer.
    pianoOwnsOctave: IS_PROTOTYPE_A
  });

  const {
    activeNotes,
    fretboardActiveNotes,
    currentRootValue,
    targetValuesByInstrument,
    guitarFingering,
    bassFingering,
    placementsByInstrument,
    inversionText: rawInversion,
    isGuitarOutOfRange,
    isBassOutOfRange,
    realizationsByInstrument
  } = musicState;

  const inversionText = useMemo(() => {
    if (!rawInversion) return "";
    if (rawInversion === 'root')    return txt.invRoot    || 'Fondamental';
    if (rawInversion === 'first')   return txt.invFirst   || '1er renversement';
    if (rawInversion === 'second')  return txt.invSecond  || '2e renversement';
    return "";
  }, [rawInversion, txt]);

  const {
    handleChordClick,
    playDictionaryAudio,
    playInstrument,
    autoPlayNote,
    ensureAudioReady
  } = usePlaybackHandlers({
    isAudioReady,
    setIsAudioReady,
    masterVolume,
    currentBpm,
    activeNotes,
    realizationsByInstrument,
    appMode,
    currentAbsoluteNotes,
    setCurrentAbsoluteNotes,
    setCurrentlyPlayingNotes,
    setContextualScaleAbsoluteValues,
    lastClickedContext,
    setLastClickedContext,
    setSinglePlayContext,
    dictRoot,
    dictType,
    playbackInstrument,
    setPlaybackInstrument,
    guitarFingering,
    bassFingering,
    activeBrick,
    setClickedChord,
    chordOctaveOffset,
    selectedRootStringGuitar,
    selectedRootStringBass,
    setScaleAnchor,
    scaleAnchor,
    dictOctave,
    useShellVoicings
  });

  // --- Metronome (VMU-056) ---
  // Own on/off state; own scheduling lives in audio/metronome.js. Whether an
  // extinction is allowed to cut the transport is transportOwner.js's call
  // now (VMU-163-fix2, decision 4) — it already knows isPlaying because
  // useSequencer.js's togglePlayback reports Play/Stop to it directly, so
  // this hook no longer needs isPlaying threaded through it.
  const { metronomeOn, toggleMetronome } = useMetronome({
    ensureAudioReady,
  });

  const isMobile = useMediaQuery('(max-width: 767px)');

  const { exportDebugSnapshot } = useDebugExport({
    appContextState: state,
    musicEngineState: {
      dictRoot,
      dictType,
      activeNotes,
      currentlyPlayingNotes,
      guitarFingering,
      bassFingering,
    },
    sequencerState: {
      isAudioReady,
      isPlaying,
      masterVolume,
      currentBpm,
      instrumentVolumes,
    },
    errors: [],
  });

  useEffect(() => {
    if (appMode === "studio") {
      // F1 (VMU-149, spec C9): --theme-primary / --theme-bg are no longer
      // written inline here — the style's tint is not applied (a future
      // --style-tint token could reintroduce it, out of F1's scope).
      // The style imposes its tempo: one call, to the transport owner's
      // setTempo (T2 / VMU-025), which sets the transport and what the
      // badge shows together.
      if (setCurrentBpm) {
        setCurrentBpm(activeBrick.bpm);
      }
      applyGenrePreset(activeBrick._group);
    }
    setClickedChord(null);
    setCurrentAbsoluteNotes([]);
    setSuggestedBassTrack(null);
    setCustomProgression(null);
    setCustomRhythm(null);
    setCustomDrums(null);
  }, [currentBrickIndex, appMode, activeBrick, setCurrentBpm, setSuggestedBassTrack, setCustomProgression, setClickedChord, setCurrentAbsoluteNotes, setCustomRhythm, setCustomDrums]);

  // VMU-050: what the next visit reopens on, written once, together, when one
  // of the kept values changes (persistedState.js says which and why). Not the
  // tempo, the volume, the metronome nor the edits: slice 2.
  const brickId = activeBrick ? activeBrick.name.en : undefined;
  useEffect(() => {
    savePersisted({
      appMode, lang, notation, playbackInstrument, brickId, chordOctaveOffset, dictRoot, dictType, dictOctave,
    });
  }, [appMode, lang, notation, playbackInstrument, brickId, chordOctaveOffset, dictRoot, dictType, dictOctave]);

  // Handlers implemented via usePlaybackHandlers

  // Track sidebar state and theme on body for CSS selectors
  useEffect(() => {
    document.body.className = `theme-modern ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`;
  }, [sidebarOpen]);

  // Track mouse for Liquid Glass effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useKeyboardShortcuts({ appMode, togglePlayback, setAppMode: requestAppMode });

  const playbackContextValue = useMemo(() => ({
    currentStep,
    isPlaying,
    currentBpm,
    togglePlayback,
    handleBpmChange
  }), [currentStep, isPlaying, currentBpm, togglePlayback, handleBpmChange]);

  // Shared by the header row and, on a phone, by the drawer that replaces it.
  const headerProps = {
    txt, lang, setLang,
    setShowHelp, setShowAbout, setShowTheory, exportDebugSnapshot,
    notation, setNotation
  };

  const musicEngineContextValue = useMemo(() => ({
    masterAnalyser,
    collapsedSections,
    toggleSection,
    appMode,
    displayMode,
    timeline,
    activeBrick,
    chordOctaveOffset,
    dictType,
    currentRootValue,
    targetValuesByInstrument,
    activeNotes,
    fretboardActiveNotes,
    autoPlayNote,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    showFingering,
    showFingerNumbers,
    clickedChord,
    selectedRootStringGuitar,
    setSelectedRootStringGuitar,
    selectedRootStringBass,
    setSelectedRootStringBass,
    guitarFingering,
    bassFingering,
    fretboardZone,
    lastClickedContext,
    singlePlayContext,
    // INST-B1: each neck's positions (nut -> body), the chosen one, its setter.
    placementsByInstrument,
    placementByInstrument,
    setPlacementIndex,
    scaleAnchor,
    setScaleAnchor,
    isGuitarOutOfRange,
    isBassOutOfRange,
    // VMU-101: the instrument bar in InstrumentView reads and sets the
    // played instrument, plays it, and shows each instrument's register.
    // INST-A2: `playInstrument(id)` plays one instrument now and makes it the
    // big play button's — what the tiles, and next the prototype's column
    // heads, call. `playDictionaryAudio` stays the big play button's.
    playbackInstrument,
    setPlaybackInstrument,
    playDictionaryAudio,
    playInstrument,
    realizationsByInstrument,
    notation
  }), [
    collapsedSections,
    toggleSection,
    appMode,
    displayMode,
    timeline,
    activeBrick,
    chordOctaveOffset,
    dictType,
    currentRootValue,
    targetValuesByInstrument,
    activeNotes,
    fretboardActiveNotes,
    autoPlayNote,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    showFingering,
    showFingerNumbers,
    clickedChord,
    selectedRootStringGuitar,
    setSelectedRootStringGuitar,
    selectedRootStringBass,
    setSelectedRootStringBass,
    guitarFingering,
    bassFingering,
    fretboardZone,
    lastClickedContext,
    singlePlayContext,
    placementsByInstrument,
    placementByInstrument,
    setPlacementIndex,
    scaleAnchor,
    setScaleAnchor,
    isGuitarOutOfRange,
    isBassOutOfRange,
    playbackInstrument,
    setPlaybackInstrument,
    playDictionaryAudio,
    playInstrument,
    realizationsByInstrument,
    notation
  ]);

  // The "Studio & Harmonie" popup's content — also the S1 prototype's drawer,
  // so both show the very same panel over the very same state.
  const studioHarmonyPanel = appMode === "studio" ? (
    <StudioPanel
      currentBrickIndex={currentBrickIndex}
      setCurrentBrickIndex={requestBrickIndex}
      activeBrick={activeBrick}
      currentTheme={currentTheme}
      setCurrentTheme={setCurrentTheme}
      chordOctaveOffset={chordOctaveOffset}
      setChordOctaveOffset={setChordOctaveOffset}
      setCurrentAbsoluteNotes={setCurrentAbsoluteNotes}
      activeProgression={activeProgression}
      clickedChord={clickedChord}
      setClickedChord={setClickedChord}
      handleChordClick={handleChordClick}
      inversionText={inversionText}
      suggestedBassTrack={suggestedBassTrack}
      setSuggestedBassTrack={setSuggestedBassTrack}
      setCustomProgression={setCustomProgression}
      customRhythm={customRhythm}
      setCustomRhythm={setCustomRhythm}
      targetNotesPreset={targetNotesPreset}
      setTargetNotesPreset={setTargetNotesPreset}
    />
  ) : (
    <DictionaryPanel
      dictRoot={dictRoot}
      setDictRoot={setDictRoot}
      dictType={dictType}
      setDictType={setDictType}
      playDictionaryAudio={playDictionaryAudio}
      isPlaying={isPlaying}
      guitarFingering={guitarFingering}
      bassFingering={bassFingering}
      harmonicMode={harmonicMode}
      setHarmonicMode={setHarmonicMode}
      dictOctave={dictOctave}
      setDictOctave={setDictOctave}
      placementsByInstrument={placementsByInstrument}
      placementByInstrument={placementByInstrument}
      setPlacementIndex={setPlacementIndex}
      targetNotesPreset={targetNotesPreset}
      setTargetNotesPreset={setTargetNotesPreset}
    />
  );

  // The classic windows, built once and rendered by both pages (A′-ACCÈS):
  // the A′ prototype opens the very same Modal, with the very same content,
  // over the very same state — not a copy of it. Opened from the classic
  // sidebar's buttons or from A′'s transport and header.
  const mathRhythmsModal = (
    <Modal isOpen={showMathModal} onClose={() => setShowMathModal(false)} title={`📐 ${txt.mathRhythms || "Math & Rythmes"}`} columns>
      {appMode !== "dictionary" ? (
        <CompositionPanel
          activeTracks={activeTracks}
          setSuggestedBassTrack={setSuggestedBassTrack}
          setCustomRhythm={setCustomRhythm}
          setCustomDrums={setCustomDrums}
          currentStep={currentStep}
          txt={txt.comp}
        />
      ) : (
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", padding: "20px", textAlign: "center" }}>
          {txt.dictNoRhythmWarning || "⚠️ Le mode Dictionnaire n'utilise pas le séquenceur rythmique."}
        </div>
      )}
    </Modal>
  );

  const instrumentsAudioModal = (
    <Modal isOpen={showAudioModal} onClose={() => setShowAudioModal(false)} title="🎛️ Instruments & Audio" columns>
      <ControlPanel
        showFingering={showFingering}
        setShowFingering={setShowFingering}
        showFingerNumbers={showFingerNumbers}
        setShowFingerNumbers={setShowFingerNumbers}
        playbackInstrument={playbackInstrument}
        setPlaybackInstrument={setPlaybackInstrument}
        appMode={appMode}
        useShellVoicings={useShellVoicings}
        setUseShellVoicings={setUseShellVoicings}
      />
      <PlaybackPanel
        appMode={appMode}
        isPlaying={isPlaying}
        masterVolume={masterVolume}
        setMasterVolume={setMasterVolume}
        currentBpm={currentBpm}
        instrumentVolumes={instrumentVolumes}
        handleInstrumentVolumeChange={handleInstrumentVolumeChange}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        fretboardZone={fretboardZone}
        setFretboardZone={setFretboardZone}
        txt={txt}
      />
    </Modal>
  );

  // VMU-126: the question, built once and rendered by both pages. Texts come
  // from the A' table (protoA) - the French stands in when a language lacks one.
  const confirmText = (txt.protoA && txt.protoA.confirmKeep) ? txt.protoA : translations.fr.protoA;
  const confirmDialog = pendingChange ? (
    <ConfirmDialog
      title={pendingChange.kind === "style" ? confirmText.confirmStyleTitle : confirmText.confirmModeTitle}
      body={pendingChange.kind === "style" ? confirmText.confirmStyleBody : confirmText.confirmModeBody}
      keepLabel={confirmText.confirmKeep}
      confirmLabel={pendingChange.kind === "style" ? confirmText.confirmStyleAction : confirmText.confirmModeAction}
      onKeep={keepEdits}
      onConfirm={applyPendingChange}
    />
  ) : null;

  const helpModal = <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />;
  const aboutModal = <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />;
  const theoryModal = <TheoryModal isOpen={showTheory} onClose={() => setShowTheory(false)} txt={txt} />;

  if (IS_PROTOTYPE_A) {
    return (
      <PrototypeA
        // A′-ACCÈS: the header's Guide / Theory / language / About (the
        // classic HeaderActions), the two tool windows, the master volume on
        // the setter the Audio window uses (VMU-025: no new writer).
        headerProps={headerProps}
        modals={
          <>
            {helpModal}
            {aboutModal}
            {theoryModal}
            {mathRhythmsModal}
            {instrumentsAudioModal}
            {confirmDialog}
          </>
        }
        modalOpen={showMathModal || showAudioModal || showHelp || Boolean(showAbout) || Boolean(showTheory) || Boolean(pendingChange)}
        onOpenMath={() => setShowMathModal(true)}
        onOpenAudio={() => setShowAudioModal(true)}
        masterVolume={masterVolume}
        setMasterVolume={setMasterVolume}
        txt={txt}
        // VMU-185: the direct selectors read the language and set the Studio's
        // style through the same state and setter as the drawer's StudioPanel.
        lang={lang}
        currentBrickIndex={currentBrickIndex}
        setCurrentBrickIndex={requestBrickIndex}
        notation={notation}
        setNotation={setNotation}
        appMode={appMode}
        setAppMode={setAppMode}
        // VMU-126: the header tabs ask first when there are edits to lose;
        // setAppMode stays raw for the scenarios and L1a states (they set a
        // whole state and must never open a question).
        onRequestAppMode={requestAppMode}
        isPlaying={isPlaying}
        togglePlayback={togglePlayback}
        playDictionaryAudio={playDictionaryAudio}
        currentBpm={currentBpm}
        handleBpmChange={handleBpmChange}
        metronomeOn={metronomeOn}
        toggleMetronome={toggleMetronome}
        showFingerNumbers={showFingerNumbers}
        setShowFingerNumbers={setShowFingerNumbers}
        dictRoot={dictRoot}
        dictType={dictType}
        setDictRoot={setDictRoot}
        setDictType={setDictType}
        timeline={timeline}
        currentStep={currentStep}
        activeBrick={activeBrick}
        chordOctaveOffset={chordOctaveOffset}
        musicEngineContextValue={musicEngineContextValue}
        playbackContextValue={playbackContextValue}
        drawerPanel={studioHarmonyPanel}
        // L1a states (octave +3, Studio octave +2, harmonic mode): the same
        // setters the drawer's Dictionary and Studio panels use.
        dictOctave={dictOctave}
        setDictOctave={setDictOctave}
        harmonicMode={harmonicMode}
        setHarmonicMode={setHarmonicMode}
        setChordOctaveOffset={setChordOctaveOffset}
        // L1b-1b: the piano head's ‹ Octave › in the Studio is the "Octave de
        // base" of the Studio window, with that window's own two calls (the
        // offset, then the clicked chord's notes cleared: the next chord is
        // voiced at the new octave).
        setCurrentAbsoluteNotes={setCurrentAbsoluteNotes}
        activeProgression={activeProgression}
        clickedChord={clickedChord}
        handleChordClick={handleChordClick}
      />
    );
  }

  return (
    <div className="app-container app-container-inner theme-modern">
      {helpModal}
      {aboutModal}

      {theoryModal}
      {confirmDialog}

      <div className="app-main-content">
        <AppHeader {...headerProps} />

        <div className={`main-layout-grid ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          {(() => {
            const ctaButtons = (
              <>
                <button 
                  className={`sidebar-cta-btn ${showStudioModal ? 'active' : ''}`}
                  onClick={() => setShowStudioModal(true)}
                >
                  {txt.studioHarmony || "Studio & Harmonie"}
                </button>
                <button 
                  className={`sidebar-cta-btn ${showMathModal ? 'active' : ''}`}
                  onClick={() => setShowMathModal(true)}
                >
                  {txt.mathRhythms || "Math & Rythmes"}
                </button>
                <button 
                  className={`sidebar-cta-btn ${showAudioModal ? 'active' : ''}`}
                  onClick={() => setShowAudioModal(true)}
                >
                  {txt.instrumentsAudio || "Instruments & Audio"}
                </button>
              </>
            );

            const isSidebarOpen = sidebarOpen;
            const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

            return isMobile ? (
              <BottomNav
                appMode={appMode}
                setAppMode={requestAppMode}
                isPlaying={isPlaying}
                togglePlayback={togglePlayback}
                playDictionaryAudio={playDictionaryAudio}
                txt={txt}
              >
                {ctaButtons}
                <div className="drawer-header-actions">
                  <HeaderActions {...headerProps} />
                </div>
              </BottomNav>
            ) : (
              <>
                {isSidebarOpen && (
                  <div
                    className="sidebar-backdrop"
                    onClick={toggleSidebar}
                    aria-hidden="true"
                  />
                )}
                <Sidebar
                  isOpen={sidebarOpen}
                  toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                  appMode={appMode}
                  setAppMode={requestAppMode}
                  isPlaying={isPlaying}
                  togglePlayback={togglePlayback}
                  playDictionaryAudio={playDictionaryAudio}
                  currentBpm={currentBpm}
                  handleBpmChange={handleBpmChange}
                  metronomeOn={metronomeOn}
                  toggleMetronome={toggleMetronome}
                  txt={txt}
                >
                  {ctaButtons}
                </Sidebar>
              </>
            );
          })()}

          {/* --- MODALS --- */}
          <Modal isOpen={showStudioModal} onClose={() => setShowStudioModal(false)} title="🎭 Studio & Harmonie" columns>
            {studioHarmonyPanel}
          </Modal>

          {mathRhythmsModal}

          {instrumentsAudioModal}

          {/* --- MAIN CONTENT AREA --- */}
          <div className="layout-col layout-center">
            <MusicEngineProvider value={musicEngineContextValue}>
              <PlaybackProvider value={playbackContextValue}>
                <InstrumentView />
              </PlaybackProvider>
            </MusicEngineProvider>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <div
          title="Licence MIT"
          className="app-footer-text"
        >
          © 2026 Gabriel Resende • Vmu (VisualMusic Coach)
        </div>
      </footer>
    </div>
  );
}

export default AppDesktop;
