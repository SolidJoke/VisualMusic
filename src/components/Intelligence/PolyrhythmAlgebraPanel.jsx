import React from 'react';

export default function PolyrhythmAlgebraPanel({
  showPolyrhythm,
  txt,
  balanceInfo,
  polyOps,
  setPolyOps,
  subdivisions,
  polyrhythmResult,
  activeStep
}) {
  if (!showPolyrhythm) return null;

  return (
    <div className="panel-section polyrhythm-section">
      <label className="section-label">{txt.polyEngine || "POLYRHYTHM ALGEBRA (ANDREW MILNE)"}</label>

      {/* Balance indicator */}
      {balanceInfo && (
        <div className={`balance-indicator ${balanceInfo.isBalanced ? 'balanced' : 'unbalanced'}`}>
          <span className="lcd-label">{txt.barycenter || "BARYCENTER:"}</span>
          <span className="lcd-value balance-status">
            {balanceInfo.isBalanced ? (txt.perfectBal || "✦ PERFECTLY BALANCED") : `${txt.offset || "⊕ OFFSET"} ${(balanceInfo.offset * 100).toFixed(1)}%`}
          </span>
        </div>
      )}

      {/* Polygon operations editor */}
      <div className="poly-ops-editor">
        <span className="input-label">{txt.polyOps || "POLYGON OPERATIONS:"}</span>
        {polyOps.map((op, idx) => {
          const polyColors = ['#a78bfa', '#f59e0b', '#34d399', '#f87171', '#60a5fa'];
          const color = polyColors[idx % polyColors.length];
          return (
            <div key={idx} className="poly-op-row" style={{ borderLeft: `3px solid ${color}` }}>
              <span className="poly-op-label" style={{ color }}>{idx === 0 ? '▲' : idx === 1 ? '■' : '●'}-{idx + 1}</span>

              <div className="poly-op-field">
                <span>k</span>
                <input
                  type="range"
                  min="1"
                  max={subdivisions}
                  value={op.k}
                  onChange={(e) => {
                    const newOps = [...polyOps];
                    newOps[idx] = { ...op, k: parseInt(e.target.value) };
                    setPolyOps(newOps);
                  }}
                  className="retro-slider poly-slider"
                />
                <span className="lcd-value">{op.k}</span>
              </div>

              <div className="poly-op-field">
                <span>⊕</span>
                <input
                  type="range"
                  min="0"
                  max={subdivisions - 1}
                  value={op.offset}
                  onChange={(e) => {
                    const newOps = [...polyOps];
                    newOps[idx] = { ...op, offset: parseInt(e.target.value) };
                    setPolyOps(newOps);
                  }}
                  className="retro-slider poly-slider"
                />
                <span className="lcd-value">{op.offset}</span>
              </div>

              <select
                value={op.op}
                onChange={(e) => {
                  const newOps = [...polyOps];
                  newOps[idx] = { ...op, op: e.target.value };
                  setPolyOps(newOps);
                }}
                className="retro-select mini poly-op-select"
              >
                <option value="+">{txt.add || "+ ADD"}</option>
                <option value="-">{txt.sub || "- SUB"}</option>
              </select>

              {polyOps.length > 1 && (
                <button
                  onClick={() => setPolyOps(polyOps.filter((_, i) => i !== idx))}
                  className="retro-btn danger-btn poly-remove-btn"
                  title="Remove this polygon"
                >×</button>
              )}
            </div>
          );
        })}

        {polyOps.length < 5 && (
          <button
            onClick={() => setPolyOps([...polyOps, { k: 3, offset: 0, op: '+' }])}
            className="retro-btn poly-add-btn"
          >
            {txt.addPoly || "+ ADD POLYGON"}
          </button>
        )}
      </div>

      {/* Result binary grid */}
      {polyrhythmResult && (
        <div className="polyrhythm-result">
          <span className="input-label">{txt.algResult || "ALGEBRAIC RESULT:"}</span>
          <div className="binary-grid">
            {polyrhythmResult.pattern.map((val, idx) => {
              const isActiveStep = activeStep >= 0 && (idx === activeStep % subdivisions);
              let ledClass = "grid-led";
              if (val === 1) ledClass += " led-active";
              if (isActiveStep) ledClass += " led-cursor-active";
              return (
                <div key={idx} className="grid-cell">
                  <div className={ledClass}></div>
                  <span className="grid-index">{idx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
