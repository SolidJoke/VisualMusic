import React from 'react';
import MixerStrip from '../Audio/MixerStrip';
import { useAppContext } from '../../context/AppContext';

const MixerPanel = ({
  instrumentVolumes,
  handleInstrumentVolumeChange,
  masterVolume,
  setMasterVolume,
  txt,
  uiTheme,
  isPlaying
}) => {
  const context = useAppContext();
  const activeTxt = txt || context.txt;

  return (
    <details className="mixer-panel-details" style={{ width: "100%", marginBottom: "20px" }}>
      <summary style={{ 
        cursor: "pointer", 
        color: "#ccc", 
        fontWeight: "bold", 
        outline: "none", 
        marginBottom: "10px", 
        padding: "10px", 
        backgroundColor: "rgba(255,255,255,0.05)", 
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span>🎚️ {activeTxt.mixerVolumes || "Mixer Volumes"}</span>
        <span className="summary-icon">▾</span>
      </summary>
      <div className="mixer-panel-content" style={{ marginTop: '10px' }}>
        <MixerStrip
          instrumentVolumes={instrumentVolumes}
          handleInstrumentVolumeChange={handleInstrumentVolumeChange}
          isPlaying={isPlaying}
        />
      </div>
    </details>
  );
};

export default MixerPanel;
