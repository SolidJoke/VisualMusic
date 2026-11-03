import React, { useMemo } from 'react';
import './EuclideanCircle.css';

/**
 * EuclideanCircle — the rotating wheel of the Math & Rythmes window.
 *
 * VMU-195-B (variant B, "la phrase"): the pattern turns like a music box under
 * a FIXED marker at the top; what passes under the marker is the step that
 * sounds. Its angle follows the loop's TOTAL step counter (`currentStep`), so
 * `angle = currentStep * 360 / n` — never `currentStep % n`, or the wheel would
 * jump backwards at every turn. A linear CSS transition spans one step; with
 * `prefers-reduced-motion` the transition is dropped and the wheel steps.
 *
 * The hits take the colour of the track that plays them (a `--seq-*` token,
 * passed as `color`). The centre no longer shows "E(k,n)": it shows the number
 * of hits above "k coups sur n" (the notation stays in the tooltip of the
 * preset pills). Stacked rhythms (`extraPolygons`) are grey, told apart by
 * their stroke, never by track colours. In the stack mode the balance point
 * (centroid) is drawn in the wheel and the caller's `balanceWord` is shown.
 *
 * @param {number[]} props.pattern Binary pattern of the active mode.
 * @param {number} props.n Number of steps (the circle's subdivision).
 * @param {number} [props.currentStep=-1] The loop's TOTAL step counter.
 * @param {boolean} [props.showEmpty=false] Draw the empty cases (Ø 12) vs a hair.
 * @param {string} [props.color] Track colour token for the hits.
 * @param {Array<{indices: number[], dash: string}>} [props.extraPolygons] Grey stacked rhythms.
 * @param {{centroid:{x:number,y:number}, offset:number}|null} [props.balanceInfo]
 * @param {string|null} [props.balanceWord] The balance word shown in the centre.
 * @param {string} [props.sur="sur"] The word between "k" and "n" ("sur"/"over").
 * @param {string} [props.hitsUnit="coups"] The word after the hit count.
 */
export function EuclideanCircle({
  pattern = [],
  n = 8,
  currentStep = -1,
  showEmpty = false,
  color = 'var(--seq-kick)',
  extraPolygons = [],
  balanceInfo = null,
  balanceWord = null,
  sur = 'sur',
  hitsUnit = 'coups',
}) {
  // Diameter 420 px at 2560 px CSS (the reference spec); the wheel leaves a
  // 26 px margin, hits are Ø 22 (r 11), empty cases Ø 12 (r 6).
  const D = 420;
  const C = D / 2;
  const R = D / 2 - 26; // 184
  const steps = Math.max(2, n);

  // The pattern normalised to `steps` slots (so an empty pattern still draws
  // the empty ring of cases).
  const slots = useMemo(() => {
    const arr = new Array(steps).fill(0);
    for (let i = 0; i < Math.min(pattern.length, steps); i += 1) {
      if (pattern[i]) arr[i] = 1;
    }
    return arr;
  }, [pattern, steps]);

  const hits = useMemo(
    () => slots.map((v, i) => (v ? i : -1)).filter((i) => i >= 0),
    [slots]
  );

  // A point on the circle for step i (0 = 12 o'clock, clockwise).
  const pt = (i, radius = R) => {
    const a = (2 * Math.PI * i) / steps;
    return [C + radius * Math.sin(a), C - radius * Math.cos(a)];
  };

  // The wheel angle follows the TOTAL counter, never the modulo.
  const angle = currentStep >= 0 ? (currentStep * 360) / steps : 0;
  const cur = currentStep >= 0 ? ((currentStep % steps) + steps) % steps : -1;

  const activePolygonPoints = useMemo(() => {
    if (hits.length < 3) return '';
    return hits.map((i) => pt(i).map((c) => c.toFixed(1)).join(',')).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hits, steps]);

  const wheelStyle = {
    transform: `rotate(${-angle}deg)`,
    transformOrigin: `${C}px ${C}px`,
  };

  return (
    <div className="euclidean-circle-container" style={{ '--c': color }}>
      <div className="euclidean-svg-wrapper">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${D} ${D}`}
          className="euclidean-svg"
          role="img"
          aria-label={`${hits.length} ${hitsUnit} ${sur} ${steps}`}
        >
          {/* The rotating part: ring, polygon(s), dots. */}
          <g className="euclidean-wheel" data-step={currentStep} data-rotation={angle} style={wheelStyle}>
            <circle cx={C} cy={C} r={R} className="euclidean-bg-ring" />

            {/* Stacked rhythms: grey, distinct strokes, never track colours. */}
            {extraPolygons.map((poly, polyIdx) => {
              const polyPts = poly.indices
                .map((idx) => pt(idx).map((c) => c.toFixed(1)).join(','))
                .join(' ');
              return poly.indices.length >= 2 ? (
                <polygon
                  key={`extra-poly-${polyIdx}`}
                  points={polyPts}
                  className="euclidean-polygon-stacked"
                  style={{ strokeDasharray: poly.dash || undefined }}
                />
              ) : null;
            })}

            {/* Primary active polygon / line */}
            {hits.length >= 3 ? (
              <polygon points={activePolygonPoints} className="euclidean-polygon-active" />
            ) : hits.length === 2 ? (
              <line
                x1={pt(hits[0])[0]}
                y1={pt(hits[0])[1]}
                x2={pt(hits[1])[0]}
                y2={pt(hits[1])[1]}
                className="euclidean-polygon-active euclidean-line"
              />
            ) : null}

            {/* Step dots: hits coloured, empty cases outlined. */}
            {slots.map((v, i) => {
              const [x, y] = pt(i);
              const isHit = v === 1;
              const r = isHit ? 11 : showEmpty ? 6 : 2;
              return (
                <g key={`dot-${i}`} className="euclidean-node-group">
                  {i === cur && (
                    <circle cx={x} cy={y} r={r + 5} className="euclidean-node-halo" />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    className={`euclidean-node ${isHit ? 'is-active' : 'is-empty'}`}
                  />
                </g>
              );
            })}
          </g>

          {/* The fixed part: the marker, the centre text, the balance point. */}
          <g className="euclidean-fixed">
            {/* Fixed marker at the top: a 16 px triangle pointing at the wheel. */}
            <path d={`M ${C - 9} 2 L ${C + 9} 2 L ${C} 16 Z`} className="euclidean-marker" />

            {balanceInfo ? (
              <g className="euclidean-balance">
                {/* isBalanced() returns the centroid in (cos, sin) of the step
                    angle; the wheel draws steps from 12 o'clock (sin, -cos). */}
                <line
                  x1={C}
                  y1={C}
                  x2={C + balanceInfo.centroid.y * R}
                  y2={C - balanceInfo.centroid.x * R}
                  className="euclidean-plumb"
                />
                <circle cx={C} cy={C} r={3} className="euclidean-balance-centre" />
                <circle
                  cx={C + balanceInfo.centroid.y * R}
                  cy={C - balanceInfo.centroid.x * R}
                  r={8}
                  className="euclidean-balance-dot"
                />
                {balanceWord && (
                  <text x={C} y={C + 56} textAnchor="middle" className="euclidean-center-formula" data-testid="wheel-balance-word">
                    {balanceWord}
                  </text>
                )}
              </g>
            ) : (
              <g className="euclidean-center-info">
                <text x={C} y={C + 8} textAnchor="middle" className="euclidean-center-big">
                  {hits.length}
                </text>
                <text x={C} y={C + 42} textAnchor="middle" className="euclidean-center-formula" data-testid="center-formula">
                  {hitsUnit} {sur} {steps}
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
