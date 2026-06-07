import React from 'react';
import { useAppContext } from '../../context/AppContext';

const TheoryLegend = () => {
  const { txt, state, dispatch } = useAppContext();
  
  if (!state.showLegend) return (
    <div className="legend-container panel panel--collapsed" style={{ width: "100%", marginBottom: "20px" }}>
      <div className="panel__header" onClick={() => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showLegend', value: true } })}>
        <span className="panel__title">{txt.legend || "📖 Légende"}</span>
        <span className="panel__toggle">▼</span>
      </div>
    </div>
  );

  return (
    <div className="legend-container panel" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
      <div className="panel__header" onClick={() => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'showLegend', value: false } })} style={{ width: "100%" }}>
        <span className="panel__title">{txt.legend || "📖 Légende"}</span>
        <span className="panel__toggle">▲</span>
      </div>
      <div className="panel__content" style={{ width: "100%" }}>

      <div 
        className="theory-legend-panel vintage-module" 
        style={{ 
          marginTop: "15px", 
          padding: "20px", 
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(10px)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          textAlign: "left",
          width: "100%",
          maxWidth: "800px"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="legend-dot" style={{ width: "14px", height: "14px", borderRadius: "50%", background: "var(--role-root)", boxShadow: "0 0 10px var(--role-root)" }}></div>
            <span style={{ fontWeight: "bold", color: "#fff" }}>{txt.rootLegend || "Fondamentale (1)"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="legend-dot" style={{ width: "14px", height: "14px", borderRadius: "50%", background: "var(--role-third)", boxShadow: "0 0 10px var(--role-third)" }}></div>
            <span style={{ fontWeight: "bold", color: "#fff" }}>{txt.thirdLegend || "Tierce (3)"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="legend-dot" style={{ width: "14px", height: "14px", borderRadius: "50%", background: "var(--role-fifth)", boxShadow: "0 0 10px var(--role-fifth)" }}></div>
            <span style={{ fontWeight: "bold", color: "#fff" }}>{txt.fifthLegend || "Quinte (5)"}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="legend-dot" style={{ width: "14px", height: "14px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.4)" }}></div>
            <span style={{ fontWeight: "bold", color: "var(--text-secondary)" }}>{txt.scaleLegend || "Note de la Gamme"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="legend-dot" style={{ width: "14px", height: "14px", borderRadius: "50%", background: "var(--role-target)", boxShadow: "0 0 12px var(--role-target)" }}></div>
            <span style={{ fontWeight: "bold", color: "var(--role-target)" }}>{txt.targetLegend || "Note Magique (Target)"}</span>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", color: "var(--text-dim)", fontStyle: "italic", opacity: 0.8 }}>
          {txt.numbersExplanation1} {txt.numbersExplanation2}
        </div>
      </div>
      </div>
    </div>
  );
};

export default TheoryLegend;
