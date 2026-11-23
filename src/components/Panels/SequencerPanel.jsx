import React, { useState } from 'react';
import PianoRoll from "../Sequencer/PianoRoll";
import DAWHelper from "../Sequencer/DAWHelper";
import ChanceBar from "../Sequencer/ChanceBar";
import { translations } from "../../i18n/translations";
import { formatSeed } from "../../core/random";
import { exportTimelineDrums, exportTimelineChords, exportTimelineBass, midiFileName, triggerMidiDownload } from "../../audio/MidiExporter";
import { DRUM_ROLES, MELODIC_ROLES, loopSteps, measurePattern } from "../../core/timeline";
import { useAppContext } from '../../context/AppContext';
import { usePlaybackContext } from '../../context/PlaybackContext';

/**
 * The Studio's sequencer: the rows of the timeline document (T3) the loop
 * plays, over its window, and their MIDI export.
 *
 * `timeline` is useStudioMode's document (core/timeline.js).
 *
 * `tight` (VMU-127, the A′ page): the spacing around and between the three
 * rolls is tightened (12px paddings instead of 20, 16px between sections
 * instead of 30, no bottom margin), giving back the height of the chord row
 * A′ puts above the rolls — at 3840 x 2045 the Studio fitted the window with
 * about 6px to spare. The classic page keeps its spacing.
 *
 * `chance` (VMU-221, the Studio's A′ page; absent elsewhere = no chance
 * controls): { settings, dropped, active, onCycle, onDensity, onNewVersion } —
 * useStudioMode's chance state and writers (core/chance.js). The "Chance" mode
 * (touching a cell sets its chance) is the panel's own, not a state of the loop.
 */
const SequencerPanel = ({
  timeline,
  currentStep,
  currentBpm,
  activeBrick,
  chordOctaveOffset,
  viewRequest = 0,
  tight = false,
  chance = null,
}) => {
  const [chanceMode, setChanceMode] = useState(false);
  const sectionGap = tight ? "16px" : "30px";
  const { lang, txt, notation } = useAppContext();
  const { isPlaying, togglePlayback, handleBpmChange } = usePlaybackContext();

  const C = txt?.chance ?? translations.fr.chance;
  const rollChance = chance
    ? { T: C, settings: chance.settings, dropped: chance.dropped, mode: chanceMode, onCycle: chance.onCycle, onDensity: chance.onDensity }
    : null;

  const rows = timeline ? timeline.tracks : [];
  const drumRows = rows.filter((track) => DRUM_ROLES.includes(track.role));
  const chordRows = rows.filter((track) => track.role === "chordHits");
  const melodicRows = rows.filter((track) => MELODIC_ROLES.includes(track.role));
  const totalSteps = timeline ? loopSteps(timeline) : 0;

  // VMU-217: one name per file (style, key, tempo, variation, part), in the
  // interface language, so the three files and both variations do not collide.
  const fileName = (part) =>
    midiFileName({
      styleName: activeBrick?.name?.[lang] || activeBrick?.name?.en,
      key: timeline?.key,
      lang,
      bpm: currentBpm,
      variation: timeline?.origin?.variation,
      part,
    });

  return (
    <div
      className="module-body"
      style={{
        width: "100%",
        marginBottom: tight ? 0 : "30px",
        padding: tight ? "12px 20px" : "20px",
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

      <div className={`module-header${chance ? " module-header--chance" : ""}`}>
        <span>{txt.drumMachine}</span>
        {chance && (
          <ChanceBar
            T={C}
            mode={chanceMode}
            onMode={setChanceMode}
            seed={formatSeed(chance.settings.seed)}
            canVary={chance.active}
            onNewVersion={chance.onNewVersion}
          />
        )}
        <button className="module-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportTimelineDrums(timeline, currentBpm);
          triggerMidiDownload(midiData, fileName("drums"));
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={drumRows}
          totalSteps={totalSteps}
          currentStep={currentStep}
          viewRequest={viewRequest}
          chance={rollChance}
        />
      </div>

      <div className="module-header" style={{ marginTop: sectionGap }}>
        <span>🎹 {txt.harmonicSeq || "Harmonic Sequencer"}</span>
        <button className="module-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportTimelineChords(timeline, currentBpm, { octaveOffset: chordOctaveOffset });
          triggerMidiDownload(midiData, fileName("chords"));
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={chordRows}
          totalSteps={totalSteps}
          currentStep={currentStep}
          viewRequest={viewRequest}
        />
      </div>

      <div className="module-header" style={{ marginTop: sectionGap }}>
        <span>{txt.melodicSeq}</span>
        <button className="module-control-btn" style={{fontSize:"10px", padding:"2px 6px"}} onClick={() => {
          const midiData = exportTimelineBass(timeline, currentBpm);
          triggerMidiDownload(midiData, fileName("bass"));
        }}>⬇️ MIDI</button>
      </div>
      <div className="scrollable-instrument">
        <PianoRoll
          tracks={melodicRows}
          totalSteps={totalSteps}
          currentStep={currentStep}
          viewRequest={viewRequest}
          chance={rollChance}
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
