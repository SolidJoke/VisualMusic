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
    <div className="mixer-panel-content" style={{ width: "100%", marginBottom: "20px" }}>
      <MixerStrip
        instrumentVolumes={instrumentVolumes}
        handleInstrumentVolumeChange={handleInstrumentVolumeChange}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default MixerPanel;
