import React from 'react';
import PianoRoll from "../Sequencer/PianoRoll";
import DAWHelper from "../Sequencer/DAWHelper";
import { exportTimelineDrums, exportTimelineChords, exportTimelineBass, triggerMidiDownload } from "../../audio/MidiExporter";
import { DRUM_ROLES, MELODIC_ROLES, loopSteps, measurePattern } from "../../core/timeline";
import { useAppContext } from '../../context/AppContext';
import { usePlaybackContext } from '../../context/PlaybackContext';

/**
 * The Studio's sequencer: the rows of the timeline document (T3) the loop
 * plays, over its window, and their MIDI export.
 *
 * `timeline` is useStudioMode's document (core/timeline.js).
 */
const SequencerPanel = ({
  timeline,
  currentStep,
  currentBpm,
  activeBrick,
  chordOctaveOffset,
}) => {
  const { lang, txt, notation } = useAppContext();
  const { isPlaying, togglePlayback, handleBpmChange } = usePlaybackContext();

  const rows = timeline ? timeline.tracks : [];
  const drumRows = rows.filter((track) => DRUM_ROLES.includes(track.role));
  const chordRows = rows.filter((track) => track.role === "chordHits");
  const melodicRows = rows.filter((track) => MELODIC_ROLES.includes(track.role));
  const totalSteps = timeline ? loopSteps(timeline) : 0;

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
          const midiData = exportTimelineDrums(timeline, currentBpm);
          triggerMidiDownload(midiData, `VMU_${activeBrick?.name?.en?.replace(/\s+/g, '_') || "Drums"}_${currentBpm}bpm.mid`);
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={drumRows}
          totalSteps={totalSteps}
          currentStep={currentStep}
        />
      </div>

      <div className="vintage-header" style={{ marginTop: "30px" }}>
        <span>🎹 {txt.harmonicSeq || "Harmonic Sequencer"}</span>
        <button className="vintage-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportTimelineChords(timeline, currentBpm, { octaveOffset: chordOctaveOffset });
          triggerMidiDownload(midiData, `VMU_${activeBrick?.name?.en?.replace(/\s+/g, '_') || "Chords"}_${currentBpm}bpm.mid`);
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={chordRows}
          totalSteps={totalSteps}
          currentStep={currentStep}
        />
      </div>

      <div className="vintage-header" style={{ marginTop: "30px" }}>
        <span>{txt.melodicSeq}</span>
        <button className="vintage-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportTimelineBass(timeline, currentBpm);
          triggerMidiDownload(midiData, `VMU_${activeBrick?.name?.en?.replace(/\s+/g, '_') || "Bass"}_${currentBpm}bpm.mid`);
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={melodicRows}
          totalSteps={totalSteps}
          currentStep={currentStep}
        />
      </div>
      {/* The DAW helper still describes each row one measure at a time: the
          first one. Every row the Studio fills today repeats it (a style or
          an override copies one measure into all of them). */}
      <DAWHelper
        drumTracks={drumRows.map((track) => measurePattern(track, 0))}
        melodyTracks={melodicRows.map((track) => measurePattern(track, 0))}
        bpm={currentBpm}
        genreName={activeBrick.name?.[lang] || activeBrick.name?.en || ""}
        lang={lang}
        timeline={timeline}
        notation={notation}
      />
    </div>
  );
};

export default SequencerPanel;
