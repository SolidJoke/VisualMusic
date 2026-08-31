import React from 'react';

export default function ExportTargetPanel({
  txt,
  exportTarget,
  setExportTarget,
  showExportSuccess,
  handleExport,
  handleClearOverrides
}) {
  return (
    <div className="panel-section export-section">
      <label className="section-label">{txt.exportPanel || "SEQUENCER EXPORT PANEL"}</label>

      <div className="export-controls">
        <div className="target-select">
          <span>{txt.target || "TARGET:"}</span>
          <select
            value={exportTarget}
            onChange={(e) => setExportTarget(e.target.value)}
            className="retro-select mini"
          >
            <option value="Kick">{txt.kick || "KICK DRUM"}</option>
            <option value="Snare">{txt.snare || "SNARE DRUM"}</option>
            <option value="Hat">{txt.hat || "HI-HAT"}</option>
            <option value="Bass">{txt.bass || "BASS LINE"}</option>
            <option value="Chords">{txt.chordsOut || "CHORD RHYTHM"}</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          className={`retro-btn export-btn ${showExportSuccess ? "success" : ""}`}
        >
          {showExportSuccess ? (txt.exportSuccess || "RHYTHM DEPLOYED !") : (txt.exportBtn || "EXPORT TO TRACK")}
        </button>
      </div>

      <div className="clear-container">
        <button
          onClick={handleClearOverrides}
          className="retro-btn clear-btn"
          title="Reset all tracks back to original brick rhythm patterns"
        >
          {txt.resetAll || "RESET ALL OVERRIDES"}
        </button>
      </div>
    </div>
  );
}
