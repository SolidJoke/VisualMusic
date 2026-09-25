import React, { memo } from "react";
import AudioVisualizer from "../Visualizer/AudioVisualizer";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import Fretboard from "../Instruments/Fretboard";
import SequencerPanel from "./SequencerPanel";
import TheoryLegend from "./TheoryLegend";
import PositionSelector from "../Layout/PositionSelector";
import InstrumentBar from "../Instruments/InstrumentBar";
import FoldSection from "./FoldSection";
import { useSelectThenPlay } from "../../hooks/useSelectThenPlay";
import { realizationRange } from "../../core/realization";
import { formatPitchRange } from "../../core/theory";
import { useMediaQuery } from "../../hooks/useMediaQuery";

import { useAppContext } from '../../context/AppContext';
import { useMusicEngineContext } from "../../context/MusicEngineContext";
import { usePlaybackContext } from "../../context/PlaybackContext";

/**
 * InstrumentView Component
 * 
 * Main container for all musical instruments and visual feedback.
 */
const InstrumentView = memo(function InstrumentView() {
  const {
    masterAnalyser,
    collapsedSections = {},
    toggleSection = () => {},
    appMode,
    timeline,
    activeBrick,
    chordOctaveOffset,
    dictType,
    currentRootValue,
    showFingering,
    clickedChord,
    selectedRootStringGuitar,
    setSelectedRootStringGuitar,
    selectedRootStringBass,
    setSelectedRootStringBass,
    guitarFingering,
    bassFingering,
    availableGuitarFingerings,
    availableBassFingerings,
    selectedVoicingIndexGuitar,
    setSelectedVoicingIndexGuitar,
    selectedVoicingIndexBass,
    setSelectedVoicingIndexBass,
    scaleAnchor = null,
    setScaleAnchor,
    playbackInstrument = "piano",
    setPlaybackInstrument,
    playDictionaryAudio,
    realizationsByInstrument,
  } = useMusicEngineContext();

  const { currentStep, currentBpm } = usePlaybackContext();

  const { txt, notation } = useAppContext();
  const isScaleMode = (appMode === "dictionary" && dictType?.includes("scale"));

  // --- Instrument bar (VMU-101) ---
  // Each tile shows the register its instrument sounds for the current
  // selection, read from the realizations useMusicEngine already computed:
  // the same ones that decide what selecting it lights up and plays.
  const instrumentBarItems = ["piano", "guitar", "bass"].map((id) => ({
    id,
    label:
      id === "piano" ? (txt.instrumentPiano || "Piano")
      : id === "guitar" ? (txt.instrumentGuitar || "Guitare")
      : (txt.instrumentBass || "Basse"),
    range: formatPitchRange(realizationRange(realizationsByInstrument?.[id]), notation),
  }));

  const selectAndPlay = useSelectThenPlay({
    selected: playbackInstrument,
    setSelected: setPlaybackInstrument,
    play: playDictionaryAudio,
  });

  // The bar's phone layout is decided in the markup, with the query
  // PianoKeyboard uses. CSS cannot hide a button under 768px in this app:
  // App.css forces display:inline-flex !important on every button.
  const isPhone = useMediaQuery("(max-width: 767px)");

  return (
    <div className="layout-col layout-center" style={{ alignItems: "center" }} data-testid="instrument-view">
      <div style={{ width: "100%", marginBottom: "5px" }}>
        <AudioVisualizer analyser={masterAnalyser} height="60px" />
      </div>

      {appMode === "studio" && (
        <FoldSection
          id="instrument-section-sequencer"
          title={txt.sectionSequencer || "Séquenceur"}
          expanded={!collapsedSections.sequencer}
          onToggle={() => toggleSection("sequencer")}
          expandedLabel={txt.foldSectionExpanded}
          collapsedLabel={txt.foldSectionCollapsed}
        >
          <SequencerPanel
            timeline={timeline}
            currentStep={currentStep}
            currentBpm={currentBpm}
            activeBrick={activeBrick}
            chordOctaveOffset={chordOctaveOffset}
          />
        </FoldSection>
      )}

      {appMode === "dictionary" && (
        <div style={{ width: "100%", marginBottom: "12px" }}>
          <InstrumentBar
            instruments={instrumentBarItems}
            selected={playbackInstrument}
            onSelect={(id) => setPlaybackInstrument && setPlaybackInstrument(id)}
            onPlay={selectAndPlay}
            playLabel={txt.playInstrument || "Jouer"}
            groupLabel={txt.instrumentBarLabel || "Instrument joué"}
            compact={isPhone}
          />
        </div>
      )}

      {/* VMU-112: the legend stays up as long as there is something for it
          to explain — i.e. at least one of piano/guitar/bass is unfolded.
          Independent of which instrument is actually played. */}
      {!(collapsedSections.piano && collapsedSections.guitar && collapsedSections.bass) && (
        <TheoryLegend />
      )}

      <FoldSection
        id="instrument-section-piano"
        title={txt.instrumentPiano || "Piano"}
        expanded={!collapsedSections.piano}
        onToggle={() => toggleSection("piano")}
        expandedLabel={txt.foldSectionExpanded}
        collapsedLabel={txt.foldSectionCollapsed}
      >
        <div className="scrollable-instrument" style={{ width: "100%" }}>
          <PianoKeyboard />
        </div>
      </FoldSection>

      <FoldSection
        id="instrument-section-guitar"
        title={txt.instrumentGuitar || "Guitare"}
        expanded={!collapsedSections.guitar}
        onToggle={() => toggleSection("guitar")}
        expandedLabel={txt.foldSectionExpanded}
        collapsedLabel={txt.foldSectionCollapsed}
      >
        <div className="scrollable-instrument" style={{ width: "100%", paddingLeft: "35px", boxSizing: "border-box" }}>
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
        </div>
      </FoldSection>

      <FoldSection
        id="instrument-section-bass"
        title={txt.instrumentBass || "Basse"}
        expanded={!collapsedSections.bass}
        onToggle={() => toggleSection("bass")}
        expandedLabel={txt.foldSectionExpanded}
        collapsedLabel={txt.foldSectionCollapsed}
      >
        <div className="scrollable-instrument" style={{ width: "100%", paddingLeft: "35px", boxSizing: "border-box" }}>
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
      </FoldSection>
    </div>
  );
});

export default InstrumentView;
