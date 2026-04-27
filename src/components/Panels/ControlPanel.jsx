import React from 'react';

const ControlPanel = ({
  notation,
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
  txt
}) => {
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

      {/* FINGERING TOGGLE */}
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

      <div className="controls-group">
        {[
          { id: "piano", label: txt.instPiano },
          { id: "guitar", label: txt.instGuitarBass },
          { id: "bass", label: txt.instBass }
        ].map((inst) => (
          <button
            key={inst.id}
            onClick={() => setPlaybackInstrument(inst.id)}
            className={`btn-premium${playbackInstrument === inst.id ? " active" : ""}`}
          >
            {inst.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ControlPanel;
