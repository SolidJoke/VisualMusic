import React from 'react';
import MixerPanel from './MixerPanel';
import LcdScreen from '../Common/LcdScreen';
import CustomSelect from '../Common/CustomSelect';
import { useAppContext } from '../../context/AppContext';

const PlaybackPanel = ({
  appMode,
  isPlaying,
  masterVolume,
  setMasterVolume,
  currentBpm,
  instrumentVolumes,
  handleInstrumentVolumeChange,
  displayMode,
  setDisplayMode,
  fretboardZone,
  setFretboardZone,
  txt
}) => {
  const { state } = useAppContext();
  const { uiTheme } = state;
  return (
    <div className="layout-col layout-right playback-panel-container">
      {/* Mode selector and play button moved to Sidebar fixed header */}

      <div className={`vintage-module playback-controls${isPlaying ? " is-playing" : ""}`}>

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
        </div>
      </div>

      <MixerPanel
        instrumentVolumes={instrumentVolumes}
        handleInstrumentVolumeChange={handleInstrumentVolumeChange}
        masterVolume={masterVolume}
        setMasterVolume={setMasterVolume}
        txt={txt}
        uiTheme={uiTheme}
        isPlaying={isPlaying}
      />

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

        {/* VMU-112: "Tout afficher / Mode Focus" removed — replaced by
            per-section folding in InstrumentView. The guitar-position
            selector below no longer depends on it and shows in both
            app modes. */}

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
      </div>
    </div>
  );
};

export default PlaybackPanel;
