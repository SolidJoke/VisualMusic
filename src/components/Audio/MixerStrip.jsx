import React from "react";

export default function MixerStrip({ instrumentVolumes, handleInstrumentVolumeChange, isPlaying }) {
  const instruments = [
    { id: "kick", label: "Kick" },
    { id: "snare", label: "Snare/Clap" },
    { id: "hat", label: "Hi-Hat" },
    { id: "bass", label: "Bass Synth" },
    { id: "piano", label: "Piano" },
    { id: "guitar", label: "Guitar" },
  ];

  return (
    <div
      className="dashboard-panel"
      style={{
        padding: "15px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: `1px solid ${isPlaying ? "#4CAF50" : "#333"}`,
        boxSizing: "border-box",
        width: "100%",
        boxShadow: isPlaying ? "0 0 15px rgba(76, 175, 80, 0.2)" : "none",
        transition: "all 0.3s",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#ccc", fontSize: "16px" }}>🎚️ Mixer Volumes</h3>
      <div
        style={{
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {instruments.map((inst) => (
          <div
            key={inst.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: "1 1 min-content",
              minWidth: "60px",
              backgroundColor: "#222",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #444",
            }}
          >
            <div
              style={{
                height: "100px",
                display: "flex",
                justifyContent: "center",
                marginBottom: "10px",
              }}
            >
              <input
                type="range"
                orient="vertical"
                min="-60"
                max="10"
                value={instrumentVolumes[inst.id]}
                onChange={(e) => handleInstrumentVolumeChange(inst.id, e.target.value)}
                style={{
                  WebkitAppearance: "slider-vertical",
                  cursor: "pointer",
                  width: "10px",
                  height: "100%",
                  accentColor: "var(--theme-primary, #4CAF50)",
                }}
              />
            </div>
            <span style={{ color: "#fff", fontSize: "11px", fontWeight: "bold", textAlign: "center" }}>
              {inst.label}
            </span>
            <span style={{ color: "#888", fontSize: "10px" }}>
              {instrumentVolumes[inst.id]} dB
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
