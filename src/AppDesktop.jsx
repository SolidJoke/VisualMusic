import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import "./styles/vintage-theme.css";
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
import { useSequencer } from "./audio/useSequencer";
import { useStudioMode } from "./hooks/useStudioMode";
import { useDictionaryMode } from "./hooks/useDictionaryMode";
import { usePlaybackHandlers } from "./hooks/usePlaybackHandlers";
import { useMusicEngine } from "./hooks/useMusicEngine";
import useDebugExport from "./hooks/useDebugExport";
import { translations } from "./i18n/translations";
import AboutModal from "./components/Modals/AboutModal";
import TheoryModal from "./components/Modals/TheoryModal";
import { log } from "./utils/debug";
import { useAppContext } from "./context/AppContext";
import { MusicEngineProvider } from "./context/MusicEngineContext";
import {
  applyGenrePreset,
  masterAnalyser,
  setBpm,
} from "./audio/AudioEngine";


function AppDesktop() {
  const { lang, txt, notation, state, dispatch } = useAppContext();
  const { 
    appMode,
    showAbout,
    showTheory,
    showFingering,
    fingeringMode,
    playbackInstrument,
    layoutMode,
    activeTab,
    chordDisplayMode,
    uiTheme,
    highlightTargetNotes,
    useShellVoicings
  } = state;

  const setAppMode = (newMode) => {
    log("app", `Switching appMode to ${newMode}`);
    dispatch({ type: 'SET_APP_MODE', payload: newMode });
  };
  
  useEffect(() => {
    document.body.className = `theme-${uiTheme}`;
  }, [uiTheme]);

  const setLang = (newLang) => dispatch({ type: 'SET_LANG', payload: newLang });
  const setNotation = (newNotation) => dispatch({ type: 'SET_NOTATION', payload: newNotation });
  const setShowAbout = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showAbout', value: val } });
  const setShowTheory = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showTheory', value: val } });
  const setShowFingering = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showFingering', value: val } });
  const setFingeringMode = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'fingeringMode', value: val } });
  const setPlaybackInstrument = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'playbackInstrument', value: val } });
  const setLayoutMode = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'layoutMode', value: val } });
  // Memoized: passed to InstrumentView (memoized), stable ref avoids unnecessary re-renders
  const setActiveTab = useCallback(
    (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'activeTab', value: val } }),
    [dispatch]
  );
  const setChordDisplayMode = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'chordDisplayMode', value: val } });
  const setUiTheme = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'uiTheme', value: val } });
  const setUseShellVoicings = (val) => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'useShellVoicings', value: val } });


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
    visualFocus, setVisualFocus,
    suggestedBassTrack, setSuggestedBassTrack,
    setCustomProgression,
    customRhythm, setCustomRhythm,
    setCustomDrums,
    activeBrick,
    activeTracks
  } = useStudioMode();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showMathModal, setShowMathModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);

  const {
    drums: activeDrums,
    melody: activeMelody,
    progression: activeProgression
  } = activeTracks;

  const {
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
    activeNotes: dictActiveNotes
  } = useDictionaryMode();

  // --- Music Engine (Harmonics & Fingering) ---
  const musicState = useMusicEngine({
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
  });

  const {
    activeNotes,
    fretboardActiveNotes,
    currentRootValue,
    targetValue,
    guitarFingering,
    bassFingering,
    availableGuitarFingerings,
    availableBassFingerings,
    inversionText: rawInversion,
    isGuitarOutOfRange,
    isBassOutOfRange
  } = musicState;

  const inversionText = useMemo(() => {
    if (!rawInversion) return "";
    if (rawInversion === 'root')    return txt.invRoot    || 'Fondamental';
    if (rawInversion === 'first')   return txt.invFirst   || '1er renversement';
    if (rawInversion === 'second')  return txt.invSecond  || '2e renversement';
    return "";
  }, [rawInversion, txt]);
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
    activeChordTrack
  } = useSequencer({
    appMode,
    activeBrick,
    activeDrums,
    activeMelody,
    activeProgression,
    activeRhythm: activeTracks.rhythm,
    currentRootValue,
    setCurrentlyPlayingNotes,
    chordOctaveOffset,
    notation,
  });

  const {
    handleChordClick,
    playDictionaryAudio,
    autoPlayNote
  } = usePlaybackHandlers({
    isAudioReady,
    setIsAudioReady,
    masterVolume,
    currentBpm,
    activeNotes,
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
    guitarFingering,
    bassFingering,
    activeBrick,
    chordOctaveOffset,
    setScaleAnchor,
    scaleAnchor,
    dictOctave,
    useShellVoicings
  });

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
      document.documentElement.style.setProperty(
        "--theme-primary",
        activeBrick.theme.primary,
      );
      document.documentElement.style.setProperty(
        "--theme-bg",
        activeBrick.theme.bg,
      );
      if (setCurrentBpm) {
        setCurrentBpm(activeBrick.bpm);
        setBpm(activeBrick.bpm);
      }
      applyGenrePreset(activeBrick._group);
    } else {
      document.documentElement.style.setProperty("--theme-primary", "#ffd700");
      document.documentElement.style.setProperty("--theme-bg", "#1a1a1a");
    }
    setClickedChord(null);
    setCurrentAbsoluteNotes([]);
    setSuggestedBassTrack(null);
    setCustomProgression(null);
    setCustomRhythm(null);
    setCustomDrums(null);
  }, [currentBrickIndex, appMode, activeBrick, setCurrentBpm, setSuggestedBassTrack, setCustomProgression, setClickedChord, setCurrentAbsoluteNotes, setCustomRhythm, setCustomDrums]);

  // Handlers implemented via usePlaybackHandlers

  // Track sidebar state and theme on body for CSS selectors
  useEffect(() => {
    document.body.className = `theme-${uiTheme} ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`;
  }, [uiTheme, sidebarOpen]);

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

  // Keyboard shortcuts: Space = Play/Stop, S = Studio, D = Dictionary
  // Guard: disabled when focus is inside an input/select/textarea
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (appMode !== 'dictionary') togglePlayback();
      } else if (e.key === 's' || e.key === 'S') {
        setAppMode('studio');
      } else if (e.key === 'd' || e.key === 'D') {
        setAppMode('dictionary');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, togglePlayback, setAppMode]);

  const musicEngineContextValue = useMemo(() => ({
    masterAnalyser,
    layoutMode,
    activeTab,
    setActiveTab,
    appMode,
    displayMode,
    activeDrums,
    activeMelody,
    activeChordTrack,
    currentStep,
    currentBpm,
    activeBrick,
    activeProgression,
    chordOctaveOffset,
    dictType,
    currentRootValue,
    targetValue,
    activeNotes,
    fretboardActiveNotes,
    autoPlayNote,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    showFingering,
    fingeringMode,
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
    selectedVoicingIndexGuitar,
    setSelectedVoicingIndexGuitar,
    selectedVoicingIndexBass,
    setSelectedVoicingIndexBass,
    availableGuitarFingerings,
    availableBassFingerings,
    visualFocus,
    scaleAnchor,
    setScaleAnchor,
    isGuitarOutOfRange,
    isBassOutOfRange,
    highlightTargetNotes
  }), [
    layoutMode,
    activeTab,
    setActiveTab,
    appMode,
    displayMode,
    activeDrums,
    activeMelody,
    activeChordTrack,
    currentStep,
    currentBpm,
    activeBrick,
    activeProgression,
    chordOctaveOffset,
    dictType,
    currentRootValue,
    targetValue,
    activeNotes,
    fretboardActiveNotes,
    autoPlayNote,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    showFingering,
    fingeringMode,
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
    selectedVoicingIndexGuitar,
    setSelectedVoicingIndexGuitar,
    selectedVoicingIndexBass,
    setSelectedVoicingIndexBass,
    availableGuitarFingerings,
    availableBassFingerings,
    visualFocus,
    scaleAnchor,
    setScaleAnchor,
    isGuitarOutOfRange,
    isBassOutOfRange,
    highlightTargetNotes
  ]);

  return (
    <div className={`app-container app-container-inner theme-${uiTheme}`}>
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <TheoryModal isOpen={showTheory} onClose={() => setShowTheory(false)} txt={txt} />

      <div className="app-main-content">
        <div className="app-header">
          <h1 className="app-title">{txt.title}</h1>

          <div className="app-header-actions">
            <button 
              onClick={() => {
                const next = uiTheme === 'vintage' ? 'modern' : 'vintage';
                log("app", `Switching theme to ${next}`);
                setUiTheme(next);
              }}
              className="btn-header-action"
            >
              {uiTheme === 'vintage' ? '✨ Neon Monolith' : '🌿 Zen Studio'}
            </button>

            <button
              onClick={() => setShowTheory(true)}
              className="btn-header-action"
            >
              {txt.guideTheoryBtn}
            </button>

            <CustomSelect
              options={Object.keys(translations).map(l => ({
                value: l,
                label: translations[l].langLabel || l.toUpperCase()
              }))}
              value={lang}
              onChange={setLang}
              theme={uiTheme}
              className="header-lang-select"
            />

            <button
              onClick={() => setShowAbout(true)}
              className="btn-header-action"
            >
              {txt.about}
            </button>

            {import.meta.env.DEV && (
              <button
                onClick={exportDebugSnapshot}
                className="btn-header-action"
                title="Export debug state as JSON"
              >
                🐛 Debug
              </button>
            )}
          </div>
        </div>

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

            return (
              <>
                <Sidebar 
                  isOpen={sidebarOpen} 
                  toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
                  uiTheme={uiTheme}
                  appMode={appMode}
                  setAppMode={setAppMode}
                  isPlaying={isPlaying}
                  togglePlayback={togglePlayback}
                  playDictionaryAudio={playDictionaryAudio}
                  currentBpm={currentBpm}
                  handleBpmChange={handleBpmChange}
                  txt={txt}
                >
                  {ctaButtons}
                </Sidebar>
                <BottomNav
                  appMode={appMode}
                  setAppMode={setAppMode}
                  isPlaying={isPlaying}
                  togglePlayback={togglePlayback}
                  playDictionaryAudio={playDictionaryAudio}
                  uiTheme={uiTheme}
                  txt={txt}
                >
                  {ctaButtons}
                </BottomNav>
              </>
            );
          })()}

          {/* --- MODALS --- */}
          <Modal uiTheme={uiTheme} isOpen={showStudioModal} onClose={() => setShowStudioModal(false)} title="🎭 Studio & Harmonie">
            {appMode === "studio" ? (
              <StudioPanel
                currentBrickIndex={currentBrickIndex}
                setCurrentBrickIndex={setCurrentBrickIndex}
                activeBrick={activeBrick}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                chordOctaveOffset={chordOctaveOffset}
                setChordOctaveOffset={setChordOctaveOffset}
                setCurrentAbsoluteNotes={setCurrentAbsoluteNotes}
                activeProgression={activeProgression}
                chordDisplayMode={chordDisplayMode}
                clickedChord={clickedChord}
                setClickedChord={setClickedChord}
                handleChordClick={handleChordClick}
                inversionText={inversionText}
                suggestedBassTrack={suggestedBassTrack}
                setSuggestedBassTrack={setSuggestedBassTrack}
                setCustomProgression={setCustomProgression}
                customRhythm={customRhythm}
                setCustomRhythm={setCustomRhythm}
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
                uiTheme={uiTheme}
                harmonicMode={harmonicMode}
                setHarmonicMode={setHarmonicMode}
                dictOctave={dictOctave}
                setDictOctave={setDictOctave}
                selectedVoicingIndexGuitar={selectedVoicingIndexGuitar}
                setSelectedVoicingIndexGuitar={setSelectedVoicingIndexGuitar}
                selectedVoicingIndexBass={selectedVoicingIndexBass}
                setSelectedVoicingIndexBass={setSelectedVoicingIndexBass}
                dictActiveNotes={dictActiveNotes}
              />
            )}
          </Modal>

          <Modal uiTheme={uiTheme} isOpen={showMathModal} onClose={() => setShowMathModal(false)} title={`📐 ${txt.mathRhythms || "Math & Rythmes"}`}>
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

          <Modal uiTheme={uiTheme} isOpen={showAudioModal} onClose={() => setShowAudioModal(false)} title="🎛️ Instruments & Audio">
            <ControlPanel
              setNotation={setNotation}
              chordDisplayMode={chordDisplayMode}
              setChordDisplayMode={setChordDisplayMode}
              showFingering={showFingering}
              setShowFingering={setShowFingering}
              fingeringMode={fingeringMode}
              setFingeringMode={setFingeringMode}
              playbackInstrument={playbackInstrument}
              setPlaybackInstrument={setPlaybackInstrument}
              appMode={appMode}
              dictType={dictType}
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
              layoutMode={layoutMode}
              setLayoutMode={setLayoutMode}
              activeTab={activeTab}
              fretboardZone={fretboardZone}
              setFretboardZone={setFretboardZone}
              visualFocus={visualFocus}
              setVisualFocus={setVisualFocus}
              txt={txt}
            />
          </Modal>

          {/* --- MAIN CONTENT AREA --- */}
          <div className="layout-col layout-center">
            <MusicEngineProvider value={musicEngineContextValue}>
              <InstrumentView />
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
