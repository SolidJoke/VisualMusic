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
      <div
        className="dashboard-panel"
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          backgroundColor: "var(--bg-overlay)",
          width: "100%",
          boxSizing: "border-box",
          maxWidth: "none",
          margin: "0",
        }}
      >
        <button
          onClick={() => setAppMode("studio")}
          className={`btn-toggle${appMode === "studio" ? " btn-toggle--active" : ""}`}
          style={{ width: "100%", padding: "15px", fontSize: "16px" }}
        >
          {txt.studioMode}
        </button>
        <button
          onClick={() => setAppMode("dictionary")}
          className={`btn-toggle${appMode === "dictionary" ? " btn-toggle--active" : ""}`}
          style={{ width: "100%", padding: "15px", fontSize: "16px" }}
        >
          {txt.dictMode}
        </button>
      </div>

      <div
        className="dashboard-panel"
        style={{
          padding: "25px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "25px",
          backgroundColor: "var(--bg-panel)",
          border: `1px solid ${isPlaying ? "#4CAF50" : "var(--border-default)"}`,
          boxShadow: isPlaying ? "0 0 15px rgba(76, 175, 80, 0.4)" : "none",
          width: "100%",
          boxSizing: "border-box",
          maxWidth: "none",
          margin: "0",
        }}
      >
        <button
          onClick={togglePlayback}
          style={{
            padding: "15px",
            width: "100%",
            fontSize: "18px",
            cursor: "pointer",
            backgroundColor: isPlaying ? "#e53935" : "#4CAF50",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "center",
            transition: "all 0.2s",
            boxShadow: isPlaying
              ? "0 0 15px rgba(229, 57, 53, 0.4)"
              : "none",
          }}
        >
          {isPlaying ? txt.stopAudio : txt.enableAudio}
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <label
              style={{
                color: "#ccc",
                fontSize: "14px",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              {txt.masterVol} ({masterVolume} dB)
            </label>
            <input
              type="range"
              min="-40"
              max="0"
              value={masterVolume}
              onChange={(e) => setMasterVolume(e.target.value)}
              style={{ cursor: "pointer", width: "100%" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <label
              style={{
                color: "var(--theme-primary)",
                fontSize: "14px",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              {txt.tempoBpm} : {currentBpm}
            </label>
            <input
              type="range"
              min="60"
              max="200"
              value={currentBpm}
              onChange={handleBpmChange}
              style={{
                cursor: "pointer",
                width: "100%",
                accentColor: "var(--theme-primary)",
              }}
            />
          </div>
        </div>
      </div>

      <MixerStrip
        instrumentVolumes={instrumentVolumes}
        handleInstrumentVolumeChange={handleInstrumentVolumeChange}
        isPlaying={isPlaying}
      />

      {/* NEW RIGHT CONTROL PANEL ADDED HERE */}
      <div
        className="dashboard-panel"
        style={{
          padding: "15px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-default)",
          width: "100%",
          boxSizing: "border-box",
          maxWidth: "none",
          margin: "0",
        }}
      >
        {appMode === "studio" && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => setDisplayMode("chord")}
              className={`btn-toggle${displayMode === "chord" ? " btn-toggle--active" : ""}`}
            >
              {txt.chord}
            </button>
            <button
              onClick={() => setDisplayMode("scale")}
              className={`btn-toggle${displayMode === "scale" ? " btn-toggle--active" : ""}`}
            >
              {txt.scale}
            </button>
          </div>
        )}

        {appMode !== "dictionary" && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => setLayoutMode("all")}
              className={`btn-toggle${layoutMode === "all" ? " btn-toggle--active" : ""}`}
              style={{ borderRadius: "20px" }}
            >
              {txt.showAll}
            </button>
            <button
              onClick={() => setLayoutMode("tabs")}
              className={`btn-toggle${layoutMode === "tabs" ? " btn-toggle--active" : ""}`}
              style={{ borderRadius: "20px" }}
            >
              {txt.focusMode}
            </button>
          </div>
        )}

        {(appMode === "dictionary" ||
          layoutMode === "all" ||
          activeTab === "guitars") && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#ccc", fontWeight: "bold" }}>
              {txt.guitarPos}
            </span>
            <select
              value={fretboardZone}
              onChange={(e) => setFretboardZone(e.target.value)}
              style={{
                padding: "8px",
                fontSize: "14px",
                borderRadius: "4px",
                cursor: "pointer",
                backgroundColor: "var(--bg-overlay)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-dim)",
              }}
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
