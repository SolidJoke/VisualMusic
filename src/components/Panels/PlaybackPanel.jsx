import React from 'react';
import MixerPanel from './MixerPanel';
import LcdScreen from '../Common/LcdScreen';
import CustomSelect from '../Common/CustomSelect';
import { useAppContext } from '../../context/AppContext';

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
  visualFocus,
  setVisualFocus,
  txt
}) => {
  const { state } = useAppContext();
  const { uiTheme } = state;
  return (
    <div className="layout-col layout-right playback-panel-container">
      <div className="vintage-module app-mode-selector" style={{ display: "flex", gap: "5px" }}>
        <button
          onClick={() => setAppMode("studio")}
          className={`btn-premium ${appMode === "studio" ? " active" : ""}`}
          style={{ width: "100%", padding: "12px", fontSize: "0.9rem" }}
          data-testid="btn-mode-studio"
        >
          {txt.studioMode}
        </button>
        <button
          onClick={() => setAppMode("dictionary")}
          className={`btn-premium ${appMode === "dictionary" ? " active" : ""}`}
          style={{ width: "100%", padding: "12px", fontSize: "0.9rem" }}
          data-testid="btn-mode-dictionary"
        >
          {txt.dictMode}
        </button>
      </div>

      <div className={`vintage-module playback-controls${isPlaying ? " is-playing" : ""}`}>
        {appMode !== "dictionary" && (
          <button
            onClick={togglePlayback}
            className={`btn-playback-premium ${isPlaying ? 'stop' : 'play'}`}
          >
            <div className="btn-playback-icon"></div>
            <span>{isPlaying ? txt.stopAudio : txt.enableAudio}</span>
          </button>
        )}


        <div className="sliders-group">
          <div className="slider-item">
            <LcdScreen title={`${txt.masterVol} (dB)`}>
              {masterVolume}
            </LcdScreen>
            <input
              type="range"
              min="-40"
              max="0"
              value={masterVolume}
              onChange={(e) => setMasterVolume(e.target.value)}
              className="premium-slider"
              style={{ '--value': `${((masterVolume + 40) / 40) * 100}%` }}
            />
          </div>

          <div className="slider-item">
            <LcdScreen title={txt.tempoBpm}>
              {currentBpm}
            </LcdScreen>
            <input
              type="range"
              min="60"
              max="200"
              value={currentBpm}
              onChange={handleBpmChange}
              className="premium-slider accent"
              style={{ '--value': `${((currentBpm - 60) / 140) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <MixerPanel
        instrumentVolumes={instrumentVolumes}
        handleInstrumentVolumeChange={handleInstrumentVolumeChange}
        isPlaying={isPlaying}
      />

      {appMode === "studio" && (
        <div className="glass-panel" style={{ padding: "12px", marginBottom: "20px" }}>
          <label className="section-label" style={{ marginBottom: "10px", display: "block" }}>
            {txt.visualFocusLabel}
          </label>
          <div className="controls-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              onClick={() => setVisualFocus("chords")}
              className={`btn-premium ${visualFocus === "chords" ? " active" : ""}`}
              style={{ fontSize: "0.9rem", padding: "8px" }}
            >
              {txt.focusChords}
            </button>
            <button
              onClick={() => setVisualFocus("bass")}
              className={`btn-premium ${visualFocus === "bass" ? " active" : ""}`}
              style={{ fontSize: "0.9rem", padding: "8px" }}
            >
              {txt.focusBass}
            </button>
            <button
              onClick={() => setVisualFocus("both")}
              className={`btn-premium ${visualFocus === "both" ? " active" : ""}`}
              style={{ fontSize: "0.9rem", padding: "8px", gridColumn: "span 2" }}
            >
              {txt.focusBoth}
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel secondary-controls">
        {appMode === "studio" && (
          <div className="controls-group">
            <button
              onClick={() => setDisplayMode("chord")}
              className={`btn-premium ${displayMode === "chord" ? " active" : ""}`}
            >
              {txt.chord}
            </button>
            <button
              onClick={() => setDisplayMode("scale")}
              className={`btn-premium ${displayMode === "scale" ? " active" : ""}`}
            >
              {txt.scale}
            </button>
          </div>
        )}

        {appMode !== "dictionary" && (
          <div className="controls-group">
            <button
              onClick={() => setLayoutMode("all")}
              className={`btn-premium ${layoutMode === "all" ? " active" : ""}`}
              style={{ borderRadius: "var(--radius-xl)" }}
            >
              {txt.showAll}
            </button>
            <button
              onClick={() => setLayoutMode("tabs")}
              className={`btn-premium ${layoutMode === "tabs" ? " active" : ""}`}
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
            <CustomSelect
              value={fretboardZone}
              onChange={(val) => setFretboardZone(val)}
              options={[
                { value: "all", label: txt.posAll },
                { value: "open", label: txt.posOpen },
                { value: "mid", label: txt.posMid },
                { value: "high", label: txt.posHigh },
              ]}
              theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaybackPanel;
