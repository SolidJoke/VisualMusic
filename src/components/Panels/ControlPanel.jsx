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
  dictType
}) => {
  const { txt, notation } = useAppContext();
  return (
    <div className="glass-panel control-panel-container">
      <div className="controls-group">
        <button
          onClick={() => setNotation("us")}
          className={`btn-premium${notation === "us" ? " active" : ""}`}
        >
          US (A,B,C)
        </button>
        <button
          onClick={() => setNotation("eu")}
          className={`btn-premium${notation === "eu" ? " active" : ""}`}
        >
          EU (Do,Ré)
        </button>
      </div>

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
              className={`btn-premium${chordDisplayMode === m.id ? " active" : ""}`}
              style={{ fontSize: "0.75rem" }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* FINGERING TOGGLE */}
      {!(appMode === "dictionary" && dictType && !dictType.includes("chord")) && (
        <div className="fingering-controls">
           <button
              onClick={() => setShowFingering(!showFingering)}
              className={`btn-premium fingering-main-btn${showFingering ? " active" : ""}`}
              style={{ width: "100%", borderRadius: "var(--radius-xl)" }}
            >
              {showFingering ? txt.fingeringToggleOn : txt.fingeringToggleOff}
            </button>
            {showFingering && (
              <div className="fingering-sub-modes">
                {[
                  { id: "numeric", label: txt.fingeringNumeric },
                  { id: "anatomic", label: txt.fingeringAnatomic },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setFingeringMode(m.id)}
                    className={`btn-premium${fingeringMode === m.id ? " active" : ""}`}
                    style={{ padding: "4px 10px", fontSize: "0.7rem", borderRadius: "var(--radius-md)" }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            <p className="fingering-desc">
              {showFingering
                ? fingeringMode === "numeric"
                  ? txt.fingeringNumericDesc
                  : txt.fingeringAnatomicDesc
                : txt.fingeringOffDesc}
            </p>
        </div>
      )}

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
              className={`btn-premium${playbackInstrument === inst.id ? " active" : ""}`}
              style={{ fontSize: "0.7rem", padding: "6px 8px" }}
            >
              {inst.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
