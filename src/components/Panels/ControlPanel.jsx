import React from 'react';

import { useAppContext } from '../../context/AppContext';

const ControlPanel = ({
  setNotation,
  chordDisplayMode,
  setChordDisplayMode,
  showFingering,
  setShowFingering,
  fingeringMode,
  setFingeringMode,
  playbackInstrument,
  setPlaybackInstrument,
  appMode,
  dictType,
  useShellVoicings,
  setUseShellVoicings
}) => {
  const { txt, notation } = useAppContext();
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


      <details className="vintage-module" style={{ marginTop: "15px" }}>
        <summary className="btn-premium" style={{ listStyle: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
          🎛️ {txt.advancedSettings || "Instrument Settings"}
        </summary>
        <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "15px" }}>
          <div className="controls-group" style={{ flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Audio :</span>
            <div style={{ display: "flex", gap: "5px" }}>
              {[
                { id: "piano", label: txt.instPiano },
                { id: "guitar", label: txt.instGuitarBass },
                { id: "bass", label: txt.instBass }
              ].map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setPlaybackInstrument(inst.id)}
                  className={`btn-premium ${playbackInstrument === inst.id ? " active" : ""}`}
                  style={{ fontSize: "0.7rem", padding: "6px 8px" }}
                >
                  {inst.label}
                </button>
              ))}
            </div>
          </div>

          <div className="controls-group" style={{ flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setUseShellVoicings(!useShellVoicings)}
              className={`btn-premium ${useShellVoicings ? " active" : ""}`}
              style={{ width: "100%", fontSize: "0.75rem" }}
              title="Alléger les accords en retirant la quinte (1-3-7)"
            >
              {useShellVoicings ? "🎹 Shell Voicings : ON" : "🎹 Shell Voicings : OFF"}
            </button>
          </div>

          <div className="controls-group" style={{ flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => setShowFingering(!showFingering)}
              className={`btn-premium ${showFingering ? " active" : ""}`}
              style={{ width: "100%", fontSize: "0.75rem" }}
            >
              {showFingering ? txt.fingeringToggleOn : txt.fingeringToggleOff}
            </button>
            {showFingering && (
              <div style={{ display: "flex", gap: "5px" }}>
                 <button
                   onClick={() => setFingeringMode("numeric")}
                   className={`btn-premium ${fingeringMode === "numeric" ? " active" : ""}`}
                   style={{ fontSize: "0.65rem", padding: "4px 6px" }}
                 >
                   {txt.fingeringNumeric}
                 </button>
                 <button
                   onClick={() => setFingeringMode("anatomic")}
                   className={`btn-premium ${fingeringMode === "anatomic" ? " active" : ""}`}
                   style={{ fontSize: "0.65rem", padding: "4px 6px" }}
                 >
                   {txt.fingeringAnatomic}
                 </button>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};

export default ControlPanel;
