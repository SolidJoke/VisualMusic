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
    <div
      className="dashboard-panel"
      style={{
        padding: "15px",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        backgroundColor: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        width: "100%",
        boxSizing: "border-box",
        maxWidth: "none",
        margin: "0",
      }}
    >
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => setNotation("us")}
          className={`btn-toggle${notation === "us" ? " btn-toggle--active" : ""}`}
        >
          US (A,B,C)
        </button>
        <button
          onClick={() => setNotation("eu")}
          className={`btn-toggle${notation === "eu" ? " btn-toggle--active" : ""}`}
        >
          EU (Do,Ré)
        </button>
      </div>

      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "center", marginTop: "5px" }}>
        {[
          { id: "standard", label: "Chord" },
          { id: "nns", label: "NNS (1,4,5)" },
          { id: "roman", label: "Roman (I,IV,V)" }
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setChordDisplayMode(m.id)}
            className={`btn-toggle${chordDisplayMode === m.id ? " btn-toggle--active" : ""}`}
            style={{ fontSize: "12px", padding: "6px 10px" }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* FINGERING TOGGLE */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
         <button
            onClick={() => setShowFingering(!showFingering)}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              borderRadius: "20px",
              border: showFingering ? "2px solid var(--theme-primary)" : "1px solid #555",
              fontWeight: "bold",
              backgroundColor: showFingering ? "var(--theme-primary)" : "transparent",
              color: showFingering ? "#000" : "#fff",
              transition: "all 0.3s ease",
              fontSize: "14px",
              width: "80%"
            }}
          >
            {showFingering ? txt.fingeringToggleOn : txt.fingeringToggleOff}
          </button>
          {showFingering && (
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
              {[
                { id: "numeric", label: txt.fingeringNumeric },
                { id: "anatomic", label: txt.fingeringAnatomic },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setFingeringMode(m.id)}
                  style={{
                    padding: "4px 12px",
                    cursor: "pointer",
                    borderRadius: "12px",
                    border: fingeringMode === m.id ? "2px solid var(--theme-primary)" : "1px solid #555",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: fingeringMode === m.id ? "var(--theme-primary)" : "transparent",
                    color: fingeringMode === m.id ? "#000" : "#ccc",
                    transition: "all 0.2s ease",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          <p style={{ color: "#888", fontSize: "11px", marginTop: "6px" }}>
            {showFingering
              ? fingeringMode === "numeric"
                ? txt.fingeringNumericDesc
                : txt.fingeringAnatomicDesc
              : txt.fingeringOffDesc}
          </p>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "10px" }}>
        {[
          { id: "piano", label: txt.instPiano },
          { id: "guitar", label: txt.instGuitarBass },
          { id: "bass", label: txt.instBass }
        ].map((inst) => (
          <button
            key={inst.id}
            onClick={() => setPlaybackInstrument(inst.id)}
            className={`btn-toggle${playbackInstrument === inst.id ? " btn-toggle--active" : ""}`}
          >
            {inst.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ControlPanel;
