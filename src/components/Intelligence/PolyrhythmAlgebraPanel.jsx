import React from 'react';
import { balanceWordFor } from './balanceWord';

/* Grey stacked rhythms are told apart by their stroke, never by track colours
   (the voices do not sound alone): solid, long dashes, dots, dash-dot. */
const VOICE_DASH = ['', '10 6', '2 6', '12 5 2 5', '18 6'];

/* A small regular k-gon, the rhythm's signature. */
function MiniPolygon({ k, dash }) {
  const size = 26;
  const r = size / 2 - 2;
  const c = size / 2;
  const pts = Array.from({ length: Math.max(2, k) }, (_, i) => {
    const a = (2 * Math.PI * i) / k;
    return `${(c + r * Math.sin(a)).toFixed(1)},${(c - r * Math.cos(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {k >= 2 ? (
        <polygon points={pts} className="poly-mini-polygon" strokeDasharray={dash || undefined} />
      ) : (
        <circle cx={c} cy={c} r={3} className="poly-mini-bary" />
      )}
    </svg>
  );
}

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

  const balanceWord = balanceInfo
    ? balanceWordFor(balanceInfo.offset, {
        even: txt.balanceEven,
        almost: txt.balanceAlmost,
        tilted: txt.balanceTilted,
      })
    : null;

  return (
    <div className="panel-section polyrhythm-section">
      {/* Balance: one word (the point is drawn in the wheel). */}
      {balanceInfo && (
        <div
          className="balance-indicator"
          data-testid="comp-balance-word"
          title={`${txt.offset || '⊕ Off by'} ${(balanceInfo.offset * 100).toFixed(1)} %`}
        >
          <span className="balance-dot" aria-hidden="true">●</span>
          <span className="lcd-value balance-status">{balanceWord}</span>
          <span className="balance-hint">{txt.balanceHint}</span>
        </div>
      )}

      {/* Voices: one row per rhythm — a mini polygon, "Rythme N · k coups",
          its k and rotation, add/remove, ×. Grey, distinct strokes. */}
      <div className="poly-ops-editor">
        {polyOps.map((op, idx) => {
          const dash = op.op === '-' ? '2 6' : VOICE_DASH[idx % VOICE_DASH.length];
          return (
            <div key={idx} className="poly-op-row">
              <span className="poly-op-vname" title={`${txt.rhythmWord || 'Rythme'} ${idx + 1}`}>
                <MiniPolygon k={op.k} dash={dash} />
                <span>{txt.rhythmWord || 'Rythme'} {idx + 1} · {op.k} {txt.hitsUnit || 'coups'}</span>
              </span>

              <div className="poly-op-field">
                <input
                  type="range"
                  min="1"
                  max={subdivisions}
                  value={op.k}
                  onChange={(e) => {
                    const newOps = [...polyOps];
                    newOps[idx] = { ...op, k: parseInt(e.target.value, 10) };
                    setPolyOps(newOps);
                  }}
                  className="retro-slider poly-slider"
                  aria-label={`${txt.rhythmWord || 'Rythme'} ${idx + 1} : ${txt.hitsUnit || 'coups'}`}
                />
              </div>

              <div className="poly-op-field">
                <span className="poly-field-label">{txt.phraseStart}</span>
                <input
                  type="range"
                  min="0"
                  max={subdivisions - 1}
                  value={op.offset}
                  onChange={(e) => {
                    const newOps = [...polyOps];
                    newOps[idx] = { ...op, offset: parseInt(e.target.value, 10) };
                    setPolyOps(newOps);
                  }}
                  className="retro-slider poly-slider"
                  aria-label={txt.phraseStart}
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
                <option value="+">{txt.add || '+ Add'}</option>
                <option value="-">{txt.sub || '− Remove'}</option>
              </select>

              {polyOps.length > 1 && (
                <button
                  onClick={() => setPolyOps(polyOps.filter((_, i) => i !== idx))}
                  className="retro-btn danger-btn poly-remove-btn"
                  aria-label={txt.removePoly || 'Remove this rhythm'}
                >×</button>
              )}
            </div>
          );
        })}

        {polyOps.length < 5 && (
          <button
            onClick={() => setPolyOps([...polyOps, { k: 3, offset: 0, op: '+' }])}
            className="retro-btn poly-add-btn"
            data-testid="comp-poly-add"
          >
            {txt.addPoly || '+ Add a rhythm'}
          </button>
        )}
      </div>

      {/* Result binary grid */}
      {polyrhythmResult && (
        <div className="polyrhythm-result">
          <span className="input-label">{txt.algResult || 'Result:'}</span>
          <div className="binary-grid">
            {polyrhythmResult.pattern.map((val, idx) => {
              const isActiveStep = activeStep >= 0 && (idx === activeStep % subdivisions);
              let ledClass = 'grid-led';
              if (val === 1) ledClass += ' led-active';
              if (isActiveStep) ledClass += ' led-cursor-active';
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
