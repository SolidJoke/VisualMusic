import React from 'react';
import PianoRoll from "../Sequencer/PianoRoll";
import DAWHelper from "../Sequencer/DAWHelper";
import { exportDrums, exportChords, exportBass, triggerMidiDownload } from "../../audio/MidiExporter";
import { useAppContext } from '../../context/AppContext';
import { useMusicEngineContext } from '../../context/MusicEngineContext';

const SequencerPanel = ({
  activeDrums,
  activeMelody,
  activeChordTrack,
  currentStep,
  currentBpm,
  activeBrick,
  activeProgression,
  chordOctaveOffset,
}) => {
  const { lang, txt } = useAppContext();
  const { isPlaying, togglePlayback, handleBpmChange } = useMusicEngineContext();

  return (
    <div
      className="vintage-module"
      style={{
        width: "100%",
        marginBottom: "30px",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div className="sequencer-mobile-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px", background: "var(--surface-sunken)", padding: "10px", borderRadius: "8px" }}>
        <button 
          className={`btn-premium ${isPlaying ? 'active' : ''}`}
          onClick={togglePlayback}
          style={{ flex: 1, minWidth: "120px" }}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: "120px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>BPM</span>
            <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "bold" }}>{currentBpm}</span>
          </div>
          <input 
            type="range" 
            min="60" 
            max="200" 
            value={currentBpm} 
            onChange={(e) => handleBpmChange(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div className="vintage-header">
        <span>{txt.drumMachine}</span>
        <button className="vintage-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportDrums(activeDrums, currentBpm, activeBrick?.name?.[lang] || "Genre");
          triggerMidiDownload(midiData, `VMU_${activeBrick?.name?.en?.replace(/\s+/g, '_') || "Drums"}_${currentBpm}bpm.mid`);
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={activeDrums}
          totalSteps={64}
          currentStep={currentStep}
        />
      </div>

      <div className="vintage-header" style={{ marginTop: "30px" }}>
        <span>🎹 {txt.harmonicSeq || "Harmonic Sequencer"}</span>
        <button className="vintage-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportChords(activeBrick, activeProgression, chordOctaveOffset, currentBpm, activeBrick?.name?.[lang] || "Genre");
          triggerMidiDownload(midiData, `VMU_${activeBrick?.name?.en?.replace(/\s+/g, '_') || "Chords"}_${currentBpm}bpm.mid`);
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={[activeChordTrack]}
          totalSteps={64}
          currentStep={currentStep}
        />
      </div>

      <div className="vintage-header" style={{ marginTop: "30px" }}>
        <span>{txt.melodicSeq}</span>
        <button className="vintage-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportBass(activeMelody, activeBrick, activeProgression, currentBpm);
          triggerMidiDownload(midiData, `VMU_${activeBrick?.name?.en?.replace(/\s+/g, '_') || "Bass"}_${currentBpm}bpm.mid`);
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={activeMelody}
          totalSteps={64}
          currentStep={currentStep}
        />
      </div>
      <DAWHelper
        drumTracks={activeDrums}
        melodyTracks={activeMelody}
        bpm={currentBpm}
        genreName={activeBrick.name?.[lang] || activeBrick.name?.en || ""}
        lang={lang}
        progression={activeProgression}
      />
    </div>
  );
};

export default SequencerPanel;
