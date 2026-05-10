import React from 'react';
import PianoRoll from "../Sequencer/PianoRoll";
import DAWHelper from "../Sequencer/DAWHelper";
import { exportDrums, exportChords, exportBass, triggerMidiDownload } from "../../audio/MidiExporter";
import { useAppContext } from '../../context/AppContext';

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
