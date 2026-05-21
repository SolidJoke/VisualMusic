import React, { memo } from "react";
import AudioVisualizer from "../Visualizer/AudioVisualizer";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import Fretboard from "../Instruments/Fretboard";
import SequencerPanel from "./SequencerPanel";
import TheoryLegend from "./TheoryLegend";
import PositionSelector from "../Layout/PositionSelector";

import { useAppContext } from '../../context/AppContext';
import { useMusicEngineContext } from "../../context/MusicEngineContext";

/**
 * InstrumentView Component
 * 
 * Main container for all musical instruments and visual feedback.
 */
const InstrumentView = memo(function InstrumentView() {
  const {
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
    availableGuitarFingerings,
    availableBassFingerings,
    fretboardZone,
    lastClickedContext,
    singlePlayContext,
    selectedVoicingIndexGuitar,
    setSelectedVoicingIndexGuitar,
    selectedVoicingIndexBass,
    setSelectedVoicingIndexBass,
    visualFocus = "chords",
    scaleAnchor = null,
    setScaleAnchor,
    isGuitarOutOfRange = false,
    isBassOutOfRange = false,
    highlightTargetNotes = false
  } = useMusicEngineContext();

  const { lang, txt, notation } = useAppContext();
  const isScaleMode = (appMode === "dictionary" && dictType?.includes("scale"));

  return (
    <div className="layout-col layout-center" style={{ alignItems: "center" }} data-testid="instrument-view">
      <div style={{ width: "100%", marginBottom: "5px" }}>
        <AudioVisualizer analyser={masterAnalyser} height="60px" />
      </div>

      {layoutMode === "tabs" && (
        <div style={{ width: "100%", display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "center", flexWrap: "wrap" }}>
          {["sequencer", "piano", "guitars"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn-premium ${activeTab === tab ? " active" : ""}`}
            >
              {txt[`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`] || tab}
            </button>
          ))}
        </div>
      )}

      {appMode === "studio" && (layoutMode === "all" || activeTab === "sequencer") && (
        <SequencerPanel
          activeDrums={activeDrums}
          activeMelody={activeMelody}
          activeChordTrack={activeChordTrack}
          currentStep={currentStep}
          currentBpm={currentBpm}
          activeBrick={activeBrick}
          activeProgression={activeProgression}
          chordOctaveOffset={chordOctaveOffset}
        />
      )}

      {(appMode === "dictionary" || layoutMode === "all" || activeTab === "piano" || activeTab === "guitars") && (
        <TheoryLegend />
      )}

      {(appMode === "dictionary" || layoutMode === "all" || activeTab === "piano") && (
        <div className="scrollable-instrument" style={{ width: "100%" }}>
          <PianoKeyboard />
        </div>
      )}

      {(appMode === "dictionary" || layoutMode === "all" || activeTab === "guitars") && (
        <div className="scrollable-instrument" style={{ width: "100%", paddingLeft: "35px" }}>
          {showFingering && ((appMode === "studio" && clickedChord) || appMode === "dictionary") && (
            <PositionSelector 
              instrumentType="guitar"
              selectedRootString={selectedRootStringGuitar}
              setSelectedRootString={setSelectedRootStringGuitar}
              fingering={guitarFingering}
              availableVoicings={availableGuitarFingerings}
              selectedVoicingIndex={selectedVoicingIndexGuitar}
              setSelectedVoicingIndex={setSelectedVoicingIndexGuitar}
              isScaleMode={isScaleMode}
              rootVal={currentRootValue}
              scaleAnchor={scaleAnchor}
              setScaleAnchor={setScaleAnchor}
            />
          )}

          <div className="fretboard-scroll-container">
            <Fretboard instrument="guitar" />
          </div>
          
          <br />

          {showFingering && ((appMode === "studio" && clickedChord) || appMode === "dictionary") && (
            <PositionSelector 
              instrumentType="bass"
              selectedRootString={selectedRootStringBass}
              setSelectedRootString={setSelectedRootStringBass}
              fingering={bassFingering}
              availableVoicings={availableBassFingerings}
              selectedVoicingIndex={selectedVoicingIndexBass}
              setSelectedVoicingIndex={setSelectedVoicingIndexBass}
              isScaleMode={isScaleMode}
              rootVal={currentRootValue}
              scaleAnchor={scaleAnchor}
              setScaleAnchor={setScaleAnchor}
            />
          )}

          <div className="fretboard-scroll-container">
            <Fretboard instrument="bass" />
          </div>
        </div>
      )}
    </div>
  );
});

export default InstrumentView;
