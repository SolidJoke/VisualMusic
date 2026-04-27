import React from 'react';
import MixerStrip from '../Audio/MixerStrip';

const PlaybackPanel = ({
  appMode,
  setAppMode,
  isPlaying,
  togglePlayback,
  masterVolume,
  setMasterVolume,
  currentBpm,
  handleBpmChange,
  instrumentVolumes,
  handleInstrumentVolumeChange,
  displayMode,
  setDisplayMode,
  layoutMode,
  setLayoutMode,
  activeTab,
  fretboardZone,
  setFretboardZone,
  txt
}) => {
  return (
    <div className="layout-col layout-right">
      <div className="glass-panel app-mode-selector">
        <button
          onClick={() => setAppMode("studio")}
          className={`btn-premium${appMode === "studio" ? " active" : ""}`}
          style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
        >
          {txt.studioMode}
        </button>
        <button
          onClick={() => setAppMode("dictionary")}
          className={`btn-premium${appMode === "dictionary" ? " active" : ""}`}
          style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
        >
          {txt.dictMode}
        </button>
      </div>

      <div className={`glass-panel playback-controls${isPlaying ? " is-playing" : ""}`}>
        <button
          onClick={togglePlayback}
          className="btn-premium playback-toggle-btn"
          style={{
            backgroundColor: isPlaying ? "var(--color-error)" : "var(--color-success)",
            color: "var(--text-bright)",
            width: "100%",
            fontSize: "1.1rem",
          }}
        >
          {isPlaying ? txt.stopAudio : txt.enableAudio}
        </button>

        <div className="sliders-group">
          <div className="slider-item">
            <label className="section-label">
              {txt.masterVol} ({masterVolume} dB)
            </label>
            <input
              type="range"
              min="-40"
              max="0"
              value={masterVolume}
              onChange={(e) => setMasterVolume(e.target.value)}
              className="premium-slider"
            />
          </div>

          <div className="slider-item">
            <label className="section-label accent">
              {txt.tempoBpm} : {currentBpm}
            </label>
            <input
              type="range"
              min="60"
              max="200"
              value={currentBpm}
              onChange={handleBpmChange}
              className="premium-slider accent"
            />
          </div>
        </div>
      </div>

      <MixerStrip
        instrumentVolumes={instrumentVolumes}
        handleInstrumentVolumeChange={handleInstrumentVolumeChange}
        isPlaying={isPlaying}
      />

      <div className="glass-panel secondary-controls">
        {appMode === "studio" && (
          <div className="controls-group">
            <button
              onClick={() => setDisplayMode("chord")}
              className={`btn-premium${displayMode === "chord" ? " active" : ""}`}
            >
              {txt.chord}
            </button>
            <button
              onClick={() => setDisplayMode("scale")}
              className={`btn-premium${displayMode === "scale" ? " active" : ""}`}
            >
              {txt.scale}
            </button>
          </div>
        )}

        {appMode !== "dictionary" && (
          <div className="controls-group">
            <button
              onClick={() => setLayoutMode("all")}
              className={`btn-premium${layoutMode === "all" ? " active" : ""}`}
              style={{ borderRadius: "var(--radius-xl)" }}
            >
              {txt.showAll}
            </button>
            <button
              onClick={() => setLayoutMode("tabs")}
              className={`btn-premium${layoutMode === "tabs" ? " active" : ""}`}
              style={{ borderRadius: "var(--radius-xl)" }}
            >
              {txt.focusMode}
            </button>
          </div>
        )}

        {(appMode === "dictionary" ||
          layoutMode === "all" ||
          activeTab === "guitars") && (
          <div className="select-group">
            <span className="section-label">
              {txt.guitarPos}
            </span>
            <select
              value={fretboardZone}
              onChange={(e) => setFretboardZone(e.target.value)}
              className="select-premium"
              style={{ width: "100%" }}
            >
              <option value="all">{txt.posAll}</option>
              <option value="open">{txt.posOpen}</option>
              <option value="mid">{txt.posMid}</option>
              <option value="high">{txt.posHigh}</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaybackPanel;
