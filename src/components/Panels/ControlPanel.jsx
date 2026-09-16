import React, { useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import InfoTooltip from '../Common/InfoTooltip';

const ControlPanel = ({
  showFingering,
  setShowFingering,
  showFingerNumbers,
  setShowFingerNumbers,
  playbackInstrument,
  setPlaybackInstrument,
  appMode,
  useShellVoicings,
  setUseShellVoicings
}) => {
  const { txt } = useAppContext();
  return (
    <div className="glass-panel control-panel-container">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "15px" }}>
        {/* In the Dictionary, the instrument bar above the keyboard owns this
            choice (VMU-101); a second control for the same state, buried in a
            modal, would only disagree with it. The Studio keeps it here. */}
        {appMode !== "dictionary" && (
          <div className="controls-group" style={{ flexDirection: "column", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Audio :</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { id: "piano", label: txt.instPiano },
                // Was "Guit./Bass": one label naming two instruments for a
                // state that has three distinct values.
                { id: "guitar", label: txt.instGuitar },
                { id: "bass", label: txt.instBass }
              ].map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setPlaybackInstrument(inst.id)}
                  className={`btn-premium ${playbackInstrument === inst.id ? " active" : ""}`}
                  style={{ fontSize: "0.8rem", padding: "8px 12px" }}
                >
                  {inst.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="controls-group" style={{ flexDirection: "column", gap: "10px", alignItems: "center" }}>
          <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center" }}>
            <button
              onClick={() => setUseShellVoicings(!useShellVoicings)}
              className={`btn-premium ${useShellVoicings ? " active" : ""}`}
              style={{ flex: 1, fontSize: "0.85rem", padding: "10px" }}
            >
              {useShellVoicings ? "🎹 Shell Voicings : ON" : "🎹 Shell Voicings : OFF"}
            </button>
            <InfoTooltip text={txt.tooltip?.shellVoicings} />
          </div>
        </div>

        <div className="controls-group" style={{ flexDirection: "column", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setShowFingering(!showFingering)}
            className={`btn-premium ${showFingering ? " active" : ""}`}
            style={{ width: "100%", fontSize: "0.85rem", padding: "10px" }}
          >
            {showFingering ? txt.fingeringToggleOn : txt.fingeringToggleOff}
          </button>
          {/* VMU-111 §5: separate from showFingering above (which still
              gates the voicing mask and position selector). This one only
              swaps a fretted note's label between its degree (default) and
              its finger number (1-4) — the old numeric/anatomic choice is
              gone, finger labels are always numeric now. */}
          <button
            onClick={() => setShowFingerNumbers(!showFingerNumbers)}
            className={`btn-premium ${showFingerNumbers ? " active" : ""}`}
            style={{ width: "100%", fontSize: "0.75rem", padding: "8px", marginTop: "8px" }}
          >
            {showFingerNumbers ? txt.fingerNumbersToggleOn : txt.fingerNumbersToggleOff}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
