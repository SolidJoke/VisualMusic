import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import "./styles/vintage-theme.css";
import "./styles/modern-theme.css";


import DictionaryPanel from "./components/Panels/DictionaryPanel";
import StudioPanel from "./components/Panels/StudioPanel";
import ControlPanel from "./components/Panels/ControlPanel";
import PlaybackPanel from "./components/Panels/PlaybackPanel";
import Sidebar from "./components/Layout/Sidebar";
import CustomSelect from "./components/Common/CustomSelect";
import InstrumentView from "./components/Panels/InstrumentView";
import CompositionPanel from "./components/Intelligence/CompositionPanel";
import { useSequencer } from "./audio/useSequencer";
import { useStudioMode } from "./hooks/useStudioMode";
import { useDictionaryMode } from "./hooks/useDictionaryMode";
import { usePlaybackHandlers } from "./hooks/usePlaybackHandlers";
import { useMusicEngine } from "./hooks/useMusicEngine";
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


function App() {
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
    highlightTargetNotes
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
    notation,
    dictOctave
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
  }, [currentBrickIndex, appMode, activeBrick, setCurrentBpm, setSuggestedBassTrack, setCustomProgression, setClickedChord, setCurrentAbsoluteNotes]);

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
    <div className={`app-container app-container-inner theme-${uiTheme} ${uiTheme === 'vintage' ? 'vintage-chassis' : ''}`}>
      {uiTheme === 'vintage' && (
        <>
          <div className="screw screw-tl"></div>
          <div className="screw screw-tr"></div>
          <div className="screw screw-bl"></div>
          <div className="screw screw-br"></div>
        </>
      )}
      
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
              {uiTheme === 'vintage' ? '✨ Modern' : '📻 Vintage'}
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
          </div>
        </div>

        <div className={`main-layout-grid ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Sidebar 
            isOpen={sidebarOpen} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
            uiTheme={uiTheme}
          >
            {appMode === "studio" && (
              <>
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
                <CompositionPanel
                  activeTracks={activeTracks}
                  setSuggestedBassTrack={setSuggestedBassTrack}
                  setCustomRhythm={setCustomRhythm}
                  setCustomDrums={setCustomDrums}
                  currentStep={currentStep}
                />
              </>
            )}

            {appMode === "dictionary" && (
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
            />

            <PlaybackPanel
              appMode={appMode}
              setAppMode={setAppMode}
              isPlaying={isPlaying}
              togglePlayback={togglePlayback}
              masterVolume={masterVolume}
              setMasterVolume={setMasterVolume}
              currentBpm={currentBpm}
              handleBpmChange={handleBpmChange}
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
          </Sidebar>

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

export default App;
