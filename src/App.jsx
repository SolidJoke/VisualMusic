import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";

import MixerStrip from "./components/Audio/MixerStrip";
import DictionaryPanel from "./components/Panels/DictionaryPanel";
import StudioPanel from "./components/Panels/StudioPanel";
import ControlPanel from "./components/Panels/ControlPanel";
import PlaybackPanel from "./components/Panels/PlaybackPanel";
import InstrumentView from "./components/Panels/InstrumentView";
import { useSequencer } from "./audio/useSequencer";
import { useUIState } from "./hooks/useUIState";
import { useStudioState } from "./hooks/useStudioState";
import { useDictionaryState } from "./hooks/useDictionaryState";
import { usePlaybackHandlers } from "./hooks/usePlaybackHandlers";
import { translations } from "./i18n/translations";
import AboutModal from "./components/Modals/AboutModal";
import TheoryModal from "./components/Modals/TheoryModal";
import { AppProvider } from "./context/AppContext";
import { getInversionType, getChordIntervalLabel } from "./core/harmonyEngine";

import {
  getScaleNotes,
  generateChordsFromNNS,
  MODES,
  NOTES,
  getClosestInversion,
  getAbsoluteNoteValue,
  resolveScaleIntervals,
  getScaleNotesGeneric,
  toRoman,
  resolveChordSemitones,
  resolveNnsToChordType,
} from "./core/theory";
import { getGuitarFingering, getBassFingering } from "./core/fingeringLogic";
import { BRICKS } from "./core/bricks";
import {
  chordSynth,
  kickSynth,
  snareSynth,
  hatSynth,
  bassSynth,
  applyGenrePreset,
  initPianoSampler,
  getPianoSynth,
  setInstrumentVolume,
  playDictionaryNote,
  masterAnalyser,
  setBpm,
  startAudioEngine,
  setMasterVolume,
} from "./audio/AudioEngine";



function App() {
  const {
    lang, setLang,
    notation, setNotation,
    chordDisplayMode, setChordDisplayMode,
    showAbout, setShowAbout,
    showTheory, setShowTheory,
    showFingering, setShowFingering,
    fingeringMode, setFingeringMode,
    playbackInstrument, setPlaybackInstrument,
    layoutMode, setLayoutMode,
    activeTab, setActiveTab
  } = useUIState();

  const txt = (translations && translations[lang]) || {};

  const [appMode, setAppMode] = useState("studio");

  const playTokenRef = useRef(0);

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
    visualFocus, setVisualFocus
  } = useStudioState();

  const {
    dictRoot, setDictRoot,
    dictType, setDictType,
    fretboardZone, setFretboardZone,
    selectedRootStringGuitar, setSelectedRootStringGuitar,
    selectedRootStringBass, setSelectedRootStringBass,
    harmonicMode, setHarmonicMode
  } = useDictionaryState();



  // --- Expert Fingering Logic ---
  const guitarFingering = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary") {
      if (!dictType.includes("chord")) return null; // Only for chords
      rootVal = dictRoot;
      chordType = dictType;
    } else {
      if (!clickedChord) return null;
      rootVal = clickedChord.rootNote.value;
      chordType = resolveNnsToChordType(clickedChord.nns);
    }
    return getGuitarFingering(rootVal, chordType, selectedRootStringGuitar);
  }, [clickedChord, selectedRootStringGuitar, appMode, dictRoot, dictType]);

  const bassFingering = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary") {
      if (!dictType.includes("chord")) return null;
      rootVal = dictRoot;
      chordType = dictType;
    } else {
      if (!clickedChord) return null;
      rootVal = clickedChord.rootNote.value;
      chordType = resolveNnsToChordType(clickedChord.nns);
    }
    return getBassFingering(rootVal, chordType, selectedRootStringBass);
  }, [clickedChord, selectedRootStringBass, appMode, dictRoot, dictType]);

  const activeBrick = BRICKS.at(Number(currentBrickIndex));

  const activeDrums =
    currentTheme === "B" && activeBrick.drumTracksVariation
      ? activeBrick.drumTracksVariation
      : activeBrick.drumTracks;
  const activeMelody =
    currentTheme === "B" && activeBrick.melodyTracksVariation
      ? activeBrick.melodyTracksVariation
      : activeBrick.melodyTracks;
  const activeProgression =
    currentTheme === "B" && activeBrick.nnsProgressionVariation
      ? activeBrick.nnsProgressionVariation
      : activeBrick.nnsProgression;

  let activeNotes = [];
  let fretboardActiveNotes = null;
  let currentRootValue = 0;
  let targetValue = -1;

  if (appMode === "studio") {
    const scaleNotes = getScaleNotes(
      activeBrick.rootValue,
      activeBrick.modeName,
    );
    const modeData = Reflect.get(MODES, activeBrick.modeName);

    if (displayMode === "scale") {
      activeNotes = scaleNotes;
    } else {
      if (clickedChord) {
        activeNotes = currentAbsoluteNotes.map((val, idx) => ({
          value: val % 12,
          order: idx + 1,
          absoluteValue: val,
        }));
        
        const chordType = resolveNnsToChordType(clickedChord.nns);
        const chordData = resolveChordSemitones(chordType);
        if (chordData) {
          fretboardActiveNotes = chordData.semitones.map((semi, i) => ({
            value: (clickedChord.rootNote.value + semi) % 12,
            order: getChordIntervalLabel(i, semi),
          }));
        }
      } else {
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

    // --- Bass Pattern Logic ---
    if (appMode === "studio" && visualFocus === "bass" && clickedChord) {
      const chordType = resolveNnsToChordType(clickedChord.nns);
      const chordData = resolveChordSemitones(chordType);
      if (chordData) {
        // Show Root, 3rd, 5th, 7th as a "Bass Line Example"
        activeNotes = chordData.semitones.slice(0, 4).map((semi, i) => ({
          value: (clickedChord.rootNote.value + semi) % 12,
          order: getChordIntervalLabel(i, semi),
          absoluteValue: clickedChord.rootNote.value + semi + 36, // Lower octave for bass
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
    currentRootValue = Number(dictRoot);
    const scaleData = resolveScaleIntervals(dictType);
    if (scaleData) {
      activeNotes = getScaleNotesGeneric(currentRootValue, scaleData.intervals);
    } else if (dictType.includes("chord")) {
      const chordData = resolveChordSemitones(dictType);
      if (chordData) {
        activeNotes = chordData.semitones.map((semi, i) => ({
          value: (currentRootValue + semi) % 12,
          order: getChordIntervalLabel(i, semi),
        }));
      }
    } else if (dictType === "single_note") {
      activeNotes.push({ value: currentRootValue, order: null });
    }
  }

  // Inversion label — derived from bass note position vs root/third/fifth
  let inversionText = "";
  if (clickedChord && currentAbsoluteNotes.length > 0) {
    const invType = getInversionType(
      currentAbsoluteNotes[0],
      clickedChord.rootNote.value,
      clickedChord.nns,
    );
    if (invType === 'root')    inversionText = txt.invRoot    || 'Fondamental';
    else if (invType === 'first')  inversionText = txt.invFirst   || '1er renversement';
    else if (invType === 'second') inversionText = txt.invSecond  || '2e renversement';
    else                           inversionText = txt.invUnknown || '?';
  }
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
    isPianoReady,
    activeChordTrack
  } = useSequencer({
    appMode,
    activeBrick,
    activeDrums,
    activeMelody,
    activeProgression,
    currentRootValue,
    setCurrentlyPlayingNotes,
    chordOctaveOffset,
  });

  const {
    handleChordClick,
    playDictionaryAudio,
    autoPlayNote,
    ensureAudioReady
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
    setPlaybackInstrument,
    guitarFingering,
    bassFingering,
    activeBrick,
    setClickedChord,
    chordOctaveOffset,
    selectedRootStringGuitar,
    selectedRootStringBass
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
    setCurrentTheme("A");
  }, [currentBrickIndex, appMode, activeBrick, setCurrentBpm]);

  // Handlers implemented via usePlaybackHandlers

  return (
    <AppProvider lang={lang} txt={txt} notation={notation}>
    <div className="app-container app-container-inner">
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <TheoryModal isOpen={showTheory} onClose={() => setShowTheory(false)} txt={txt} />

      <div className="app-main-content">
        <div className="app-header">
          <h1 className="app-title">{txt.title}</h1>

          <div className="app-controls">
            <button
              onClick={() => setShowTheory(true)}
              className="btn-theory"
            >
              {txt.guideTheoryBtn}
            </button>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="select-lang"
            >
              <option value="fr">🇫🇷 FR</option>
              <option value="en">🇬🇧 EN</option>
              <option value="pt">🇵🇹 PT</option>
              <option value="zh">🇨🇳 ZH</option>
            </select>

            <button
              onClick={() => setShowAbout(true)}
              className="btn-about"
            >
              {txt.about}
            </button>
          </div>
        </div>

        <div className="main-layout-grid">
          {/* --- LEFT COLUMN --- */}
          <div className="layout-col layout-left">
            {appMode === "studio" && (
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
              />
            )}

            {appMode === "dictionary" && (
              <DictionaryPanel
                dictRoot={dictRoot}
                setDictRoot={setDictRoot}
                dictType={dictType}
                setDictType={setDictType}
                playDictionaryAudio={playDictionaryAudio}
                guitarFingering={guitarFingering}
                harmonicMode={harmonicMode}
                setHarmonicMode={setHarmonicMode}
              />
            )}

            {/* NEW LEFT CONTROL PANEL ADDED HERE */}
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
          </div>

          {/* --- CENTER COLUMN --- */}
          <InstrumentView
            masterAnalyser={masterAnalyser}
            layoutMode={layoutMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            appMode={appMode}
            displayMode={displayMode}
            activeDrums={activeDrums}
            activeMelody={activeMelody}
            activeChordTrack={activeChordTrack}
            currentStep={currentStep}
            currentBpm={currentBpm}
            activeBrick={activeBrick}
            dictType={dictType}
            currentRootValue={currentRootValue}
            targetValue={targetValue}
            activeNotes={activeNotes}
            fretboardActiveNotes={fretboardActiveNotes}
            autoPlayNote={autoPlayNote}
            currentlyPlayingNotes={currentlyPlayingNotes}
            contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
            showFingering={showFingering}
            fingeringMode={fingeringMode}
            clickedChord={clickedChord}
            selectedRootStringGuitar={selectedRootStringGuitar}
            setSelectedRootStringGuitar={setSelectedRootStringGuitar}
            selectedRootStringBass={selectedRootStringBass}
            setSelectedRootStringBass={setSelectedRootStringBass}
            guitarFingering={guitarFingering}
            bassFingering={bassFingering}
            fretboardZone={fretboardZone}
            lastClickedContext={lastClickedContext}
            singlePlayContext={singlePlayContext}
            harmonicMode={harmonicMode}
            visualFocus={visualFocus}
          />

          {/* --- RIGHT COLUMN --- */}
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
    </AppProvider>
  );
}

export default App;
