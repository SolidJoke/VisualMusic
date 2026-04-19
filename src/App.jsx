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
    singlePlayContext, setSinglePlayContext
  } = useStudioState();

  const {
    dictRoot, setDictRoot,
    dictType, setDictType,
    fretboardZone, setFretboardZone,
    selectedRootString, setSelectedRootString
  } = useDictionaryState();

  // --- Expert Fingering Logic ---
  const guitarFingering = useMemo(() => {
    if (!showFingering) return null;
    let rootVal, isMinor;
    if (appMode === "dictionary") {
      // In dictionary mode, we don't have clickedChord. We use dictRoot/currentRootValue
      if (dictType.includes("scale")) return null; // Only for chords
      rootVal = dictRoot;
      isMinor = dictType === "minor" || dictType.includes("min") || dictType.includes("-");
    } else {
      if (!clickedChord) return null;
      rootVal = clickedChord.rootNote.value;
      isMinor = clickedChord.nns.includes("-");
    }
    return getGuitarFingering(rootVal, isMinor, selectedRootString);
  }, [showFingering, clickedChord, selectedRootString, appMode, dictRoot, dictType]);

  const bassFingering = useMemo(() => {
    if (!showFingering) return null;
    let rootVal, isMinor;
    if (appMode === "dictionary") {
      if (dictType.includes("scale")) return null;
      rootVal = dictRoot;
      isMinor = dictType === "minor" || dictType.includes("min") || dictType.includes("-");
    } else {
      if (!clickedChord) return null;
      rootVal = clickedChord.rootNote.value;
      isMinor = clickedChord.nns.includes("-");
    }
    return getBassFingering(rootVal, isMinor);
  }, [showFingering, clickedChord, appMode, dictRoot, dictType]);

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
    } else if (dictType === "chord_major") {
      activeNotes.push(
        { value: currentRootValue, order: 1 },
        { value: (currentRootValue + 4) % 12, order: 3 },
        { value: (currentRootValue + 7) % 12, order: 5 },
      );
    } else if (dictType === "chord_minor") {
      activeNotes.push(
        { value: currentRootValue, order: 1 },
        { value: (currentRootValue + 3) % 12, order: "b3" },
        { value: (currentRootValue + 7) % 12, order: 5 },
      );
    } else if (dictType === "single_note") {
      activeNotes.push({ value: currentRootValue, order: null });
    }
  }

  let inversionText = "";
  if (clickedChord && currentAbsoluteNotes.length > 0) {
    const bassNoteClass = currentAbsoluteNotes[0] % 12;
    const rootVal = clickedChord.rootNote.value;
    const isMinor = clickedChord.nns.includes("-");
    const isDim =
      clickedChord.nns.includes("°") || clickedChord.nns.includes("b5");

    const thirdVal = (rootVal + (isMinor || isDim ? 3 : 4)) % 12;
    const fifthVal = (rootVal + (isDim ? 6 : 7)) % 12;

    if (bassNoteClass === rootVal) inversionText = txt.invRoot;
    else if (bassNoteClass === thirdVal) inversionText = txt.invFirst;
    else if (bassNoteClass === fifthVal) inversionText = txt.invSecond;
    else inversionText = txt.invUnknown;
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
    isPianoReady
  } = useSequencer({
    appMode,
    activeBrick,
    activeDrums,
    activeMelody,
    currentRootValue,
    setCurrentlyPlayingNotes,
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
    setPlaybackInstrument
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
    <div
      className="app-container"
      style={{
        maxWidth: "2560px",
        margin: "0 auto",
        padding: "0 20px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} txt={txt} />

      <TheoryModal isOpen={showTheory} onClose={() => setShowTheory(false)} txt={txt} />

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <h1 style={{ color: "#fff", margin: 0 }}>{txt.title}</h1>

          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            <button
              onClick={() => setShowTheory(true)}
              style={{
                padding: "8px 15px",
                backgroundColor: "#1a237e",
                color: "#90caf9",
                border: "1px solid #3949ab",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#283593")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#1a237e")
              }
            >
              {txt.guideTheoryBtn}
            </button>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#222",
                color: "#fff",
                border: "1px solid var(--theme-primary)",
                cursor: "pointer",
                fontWeight: "bold",
                outline: "none",
              }}
            >
              <option value="fr">🇫🇷 FR</option>
              <option value="en">🇬🇧 EN</option>
              <option value="pt">🇵🇹 PT</option>
              <option value="zh">🇨🇳 ZH</option>
            </select>

            <button
              onClick={() => setShowAbout(true)}
              style={{
                padding: "8px 15px",
                backgroundColor: "transparent",
                color: "var(--theme-primary)",
                border: "1px solid var(--theme-primary)",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "var(--theme-primary)";
                e.target.style.color = "#000";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "var(--theme-primary)";
              }}
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
                lang={lang}
                txt={txt}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                chordOctaveOffset={chordOctaveOffset}
                setChordOctaveOffset={setChordOctaveOffset}
                setCurrentAbsoluteNotes={setCurrentAbsoluteNotes}
                activeProgression={activeProgression}
                chordDisplayMode={chordDisplayMode}
                notation={notation}
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
                notation={notation}
                playDictionaryAudio={playDictionaryAudio}
                txt={txt}
                lang={lang}
              />
            )}

            {/* NEW LEFT CONTROL PANEL ADDED HERE */}
            <ControlPanel
              notation={notation}
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
              txt={txt}
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
            currentStep={currentStep}
            currentBpm={currentBpm}
            activeBrick={activeBrick}
            lang={lang}
            dictType={dictType}
            currentRootValue={currentRootValue}
            targetValue={targetValue}
            activeNotes={activeNotes}
            notation={notation}
            autoPlayNote={autoPlayNote}
            currentlyPlayingNotes={currentlyPlayingNotes}
            contextualScaleAbsoluteValues={contextualScaleAbsoluteValues}
            showFingering={showFingering}
            fingeringMode={fingeringMode}
            clickedChord={clickedChord}
            selectedRootString={selectedRootString}
            setSelectedRootString={setSelectedRootString}
            guitarFingering={guitarFingering}
            bassFingering={bassFingering}
            fretboardZone={fretboardZone}
            lastClickedContext={lastClickedContext}
            singlePlayContext={singlePlayContext}
            txt={txt}
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
            txt={txt}
          />
        </div>
      </div>

      <footer
        style={{
          marginTop: "60px",
          padding: "20px 0",
          borderTop: "1px solid #333",
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          title="Licence MIT"
          style={{ cursor: "help", transition: "color 0.3s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ccc")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
        >
          © 2026 Gabriel Resende • Vmu (VisualMusic Coach)
        </div>
      </footer>
    </div>
  );
}

export default App;
