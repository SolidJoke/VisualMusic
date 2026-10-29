import React from 'react';
import SectionTitle from './SectionTitle';

export default function ExportTargetPanel({
  txt,
  exportTarget,
  setExportTarget,
  showExportSuccess,
  handleExport,
  handleClearOverrides,
  isPlaying = false,
  togglePlayback
}) {
  return (
    <div className="panel-section export-section" data-testid="comp-export">
      <SectionTitle id="export" name={txt.exportPanel} help={txt.helpExport} helpLabel={txt.help}>
        {txt.exportPanel || "Send to"}
      </SectionTitle>

      <div className="export-controls">
        <div className="target-select">
          <label htmlFor="comp-target">{txt.target || "Instrument:"}</label>
          <select
            id="comp-target"
            data-testid="comp-target"
            value={exportTarget}
            onChange={(e) => setExportTarget(e.target.value)}
            className="retro-select mini"
          >
            <option value="Kick">{txt.kick || "Kick drum"}</option>
            <option value="Snare">{txt.snare || "Snare drum"}</option>
            <option value="Hat">{txt.hat || "Hi-hat"}</option>
            <option value="Bass">{txt.bass || "Bass line"}</option>
            <option value="Chords">{txt.chordsOut || "Chord rhythm"}</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          data-testid="comp-send"
          className={`retro-btn export-btn ${showExportSuccess ? "success" : ""}`}
        >
          {showExportSuccess ? (txt.exportSuccess || "Sent!") : (txt.exportBtn || "Send now")}
        </button>
      </div>

      {/* The track already follows the settings: say so, and let the user
          hear it without closing the window (the main loop, not a new engine). */}
      <p className="live-note">{txt.live}</p>
      {togglePlayback && (
        <button
          type="button"
          onClick={togglePlayback}
          data-testid="comp-listen"
          className="retro-btn listen-btn"
        >
          {isPlaying ? txt.stopListen : txt.listen}
        </button>
      )}

      <div className="clear-container">
        <button
          onClick={handleClearOverrides}
          data-testid="comp-reset"
          className="retro-btn clear-btn"
        >
          {txt.resetAll || "Back to the style's rhythm"}
        </button>
      </div>
    </div>
  );
}
