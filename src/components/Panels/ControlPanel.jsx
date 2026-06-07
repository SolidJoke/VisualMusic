import React, { useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import InfoTooltip from '../Common/InfoTooltip';

const ControlPanel = ({
  chordDisplayMode,
  setChordDisplayMode,
  showFingering,
  setShowFingering,
  fingeringMode,
  setFingeringMode,
  playbackInstrument,
  setPlaybackInstrument,
  appMode,
  useShellVoicings,
  setUseShellVoicings
}) => {
  const { txt } = useAppContext();
  return (
    <div className="glass-panel control-panel-container">
      {appMode !== "dictionary" && (
        <div className="controls-group">
          {[
            { id: "standard", label: "Chord" },
            { id: "nns", label: "NNS (1,4,5)" },
            { id: "roman", label: "Roman (I,IV,V)" }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setChordDisplayMode(m.id)}
              className={`btn-premium ${chordDisplayMode === m.id ? " active" : ""}`}
              style={{ fontSize: "0.75rem" }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}


      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "15px" }}>
        <div className="controls-group" style={{ flexDirection: "column", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "bold" }}>Audio :</span>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { id: "piano", label: txt.instPiano },
              { id: "guitar", label: txt.instGuitarBass },
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
          {showFingering && (
            <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
               <button
                 onClick={() => setFingeringMode("numeric")}
                 className={`btn-premium ${fingeringMode === "numeric" ? " active" : ""}`}
                 style={{ fontSize: "0.75rem", padding: "6px 10px" }}
               >
                 {txt.fingeringNumeric}
               </button>
               <button
                 onClick={() => setFingeringMode("anatomic")}
                 className={`btn-premium ${fingeringMode === "anatomic" ? " active" : ""}`}
                 style={{ fontSize: "0.75rem", padding: "6px 10px" }}
               >
                 {txt.fingeringAnatomic}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
