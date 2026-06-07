// src/components/Panels/HarmonicSeriesPanel.jsx
//
// Self-contained harmonic series visualizer, extracted from DictionaryPanel.
// Shows the first N harmonics of a root note with their pitch names and cent deviation.

import React, { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getHarmonicSeries, midiToFreq } from "../../core/acousticEngine";

/**
 * Displays the harmonic series for a given root note and octave.
 * @param {number} dictRoot - Chromatic root value (0–11)
 * @param {number} dictOctave - Octave offset from default (0 = C4 area)
 */
export default function HarmonicSeriesPanel({ dictRoot, dictOctave }) {
  const { txt, notation } = useAppContext();
  const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 2560 && !isTestEnv);

  const harmonics = getHarmonicSeries(
    midiToFreq(48 + Number(dictRoot) + dictOctave * 12),
    16,
    notation?.toLowerCase()
  );

  return (
    <div className={`harmonic-series-container panel ${isCollapsed ? 'panel--collapsed' : ''}`} style={{
      marginTop: "1.5rem",
      padding: "15px",
      background: "rgba(0,0,0,0.3)",
      borderRadius: "12px",
      border: "1px solid rgba(212, 196, 168, 0.1)",
      textAlign: "left"
    }}>
      <div className="panel__header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="panel__title" style={{ color: "var(--theme-primary)", textTransform: "uppercase", letterSpacing: "1px" }}>
          {txt.harmonicSpectre || "Spectre Harmonique"}
        </span>
        <span className="panel__toggle">{isCollapsed ? '▼' : '▲'}</span>
      </div>
      {!isCollapsed && (
        <div className="panel__content">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {harmonics.map(h => (
              <div
                key={h.order}
                title={`${h.frequency.toFixed(1)} Hz (${h.centsOffset > 0 ? '+' : ''}${h.centsOffset} cents)`}
                style={{
                  padding: "6px 4px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: Math.abs(h.centsOffset) > 15
                    ? "#ff9999"
                    : (Math.abs(h.centsOffset) < 5 ? "var(--theme-primary)" : "#ccc")
                }}
              >
                <div style={{ fontSize: "0.6rem", opacity: 0.5, marginBottom: "2px" }}>#{h.order}</div>
                <div style={{ fontWeight: "bold" }}>{h.noteName}</div>
                <div style={{ fontSize: "0.6rem", opacity: 0.7 }}>
                  {h.centsOffset > 0 ? '+' : ''}{h.centsOffset}¢
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "12px", fontSize: "0.7rem", color: "#888", fontStyle: "italic" }}>
            💡 {txt.harmonicTip || "Les notes en rouge sont naturellement \"fausses\" par rapport au tempérament égal."}
          </div>
        </div>
      )}
    </div>
  );
}
