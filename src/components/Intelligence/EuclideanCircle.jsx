import React, { useMemo } from 'react';
import './EuclideanCircle.css';

/**
 * EuclideanCircle - SVG Circular Visualization of Euclidean Rhythms
 * Displays beats distributed around a clock-like circle.
 * Connects active beats with a primary polygon and complementary beats with a secondary dashed polygon.
 * Supports overlaying multiple colored polygons for polyrhythm algebra (COMP-08).
 *
 * @param {Object} props
 * @param {number[]} props.pattern Binary pattern array (e.g. [1, 0, 0, 1, 0, 0, 1, 0])
 * @param {number} props.n Total number of subdivisions
 * @param {number} [props.highlightIndex=-1] Current playback index for active beat highlighting
 * @param {string} [props.label=""] Optional text label for the center of the circle
 * @param {boolean} [props.showComplement=false] Whether to draw the complementary polygon
 * @param {Array<{indices: number[], color: string, label: string, op: string}>} [props.extraPolygons=[]]
 *   Optional list of additional polygons to overlay (for polyrhythm algebra mode).
 *   Each entry: { indices: number[], color: string, label: string, op: '+' | '-' }
 */
export function EuclideanCircle({
  pattern = [],
  n = 8,
  highlightIndex = -1,
  label = "",
  showComplement = false,
  extraPolygons = [],
}) {
  const size = 220;
  const center = size / 2;
  const radius = 80;

  // Calculate coordinates for all subdivisions (from 0 to n-1)
  // Subdivisions are rotated by -90 deg (-PI/2) to start at 12 o'clock
  const points = useMemo(() => {
    const pts = [];
    const totalSubdivisions = Math.max(2, n);
    for (let i = 0; i < totalSubdivisions; i++) {
      const angle = (2 * Math.PI * i) / totalSubdivisions - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      const isActive = pattern[i] === 1;
      pts.push({ x, y, angle, isActive, index: i });
    }
    return pts;
  }, [n, pattern, center, radius]);

  // Points that belong to the active rhythm (1s)
  const activePoints = useMemo(() => {
    return points.filter(p => p.isActive);
  }, [points]);

  // Points that belong to the complementary rhythm (0s)
  const complementPoints = useMemo(() => {
    return points.filter(p => !p.isActive);
  }, [points]);

  // Build polygon points string for the active rhythm
  const activePolygonPoints = useMemo(() => {
    if (activePoints.length < 3) return "";
    return activePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, [activePoints]);

  // Build polygon points string for the complementary rhythm
  const complementPolygonPoints = useMemo(() => {
    if (complementPoints.length < 3) return "";
    return complementPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, [complementPoints]);

  // Count active beats
  const activeCount = pattern.filter(x => x === 1).length;

  return (
    <div className="euclidean-circle-container glass-panel">
      {label && <h4 className="euclidean-circle-header accent-text">{label}</h4>}
      
      <div className="euclidean-svg-wrapper">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${size} ${size}`} 
          className="euclidean-svg"
        >
          {/* Background Outer Ring */}
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            className="euclidean-bg-ring" 
          />

          {/* Complementary Polygon (if requested and we have enough points) */}
          {showComplement && complementPolygonPoints && (
            <polygon 
              points={complementPolygonPoints} 
              className="euclidean-polygon-complement" 
            />
          )}

          {/* Complementary Lines (if only 2 complement points) */}
          {showComplement && complementPoints.length === 2 && (
            <line
              x1={complementPoints[0].x}
              y1={complementPoints[0].y}
              x2={complementPoints[1].x}
              y2={complementPoints[1].y}
              className="euclidean-polygon-complement euclidean-line"
            />
          )}

          {/* Extra Polygons (COMP-08 — Polyrhythm Algebra overlay) */}
          {extraPolygons.map((poly, polyIdx) => {
            const polyPts = poly.indices
              .map(idx => {
                const angle = (2 * Math.PI * idx) / Math.max(2, n) - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            const strokeColor = poly.color || '#a78bfa';
            const isDash = poly.op === '-';
            return poly.indices.length >= 3 ? (
              <polygon
                key={`extra-poly-${polyIdx}`}
                points={polyPts}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isDash ? 1.5 : 2}
                strokeDasharray={isDash ? '4 3' : undefined}
                opacity={0.65}
              />
            ) : poly.indices.length === 2 ? (
              <line
                key={`extra-line-${polyIdx}`}
                x1={center + radius * Math.cos((2 * Math.PI * poly.indices[0]) / Math.max(2, n) - Math.PI / 2)}
                y1={center + radius * Math.sin((2 * Math.PI * poly.indices[0]) / Math.max(2, n) - Math.PI / 2)}
                x2={center + radius * Math.cos((2 * Math.PI * poly.indices[1]) / Math.max(2, n) - Math.PI / 2)}
                y2={center + radius * Math.sin((2 * Math.PI * poly.indices[1]) / Math.max(2, n) - Math.PI / 2)}
                stroke={strokeColor}
                strokeWidth={1.5}
                strokeDasharray={isDash ? '4 3' : undefined}
                opacity={0.65}
              />
            ) : null;
          })}

          {/* Primary Active Polygon */}
          {activePolygonPoints && (
            <polygon 
              points={activePolygonPoints} 
              className="euclidean-polygon-active" 
            />
          )}

          {/* Primary Lines (if only 2 active points) */}
          {activePoints.length === 2 && (
            <line
              x1={activePoints[0].x}
              y1={activePoints[0].y}
              x2={activePoints[1].x}
              y2={activePoints[1].y}
              className="euclidean-polygon-active euclidean-line"
            />
          )}

          {/* Center Info Text (displays E(k,n) / duality status) */}
          <g className="euclidean-center-info">
            <text 
              x={center} 
              y={center - 5} 
              textAnchor="middle" 
              className="center-formula accent-text"
            >
              E({activeCount},{n})
            </text>
            <text 
              x={center} 
              y={center + 15} 
              textAnchor="middle" 
              className="center-sublabel"
            >
              {activeCount} Pulses
            </text>
          </g>

          {/* Subdivisions / Beat Nodes */}
          {points.map((pt) => {
            const isHighlighted = highlightIndex === pt.index;
            let nodeClass = "euclidean-node";
            if (pt.isActive) nodeClass += " is-active";
            if (isHighlighted) nodeClass += " is-current";

            return (
              <g key={pt.index} className="euclidean-node-group">
                {/* Node Ring Halo on active play */}
                {isHighlighted && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.isActive ? 12 : 9}
                    className="euclidean-node-halo"
                  />
                )}

                {/* Main Interactive Node */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.isActive ? 6 : 4}
                  className={nodeClass}
                />

                {/* Subtitle / Number above the node (for every 4th or 8th beats or when zoom is high) */}
                {(n <= 16 || pt.index % 4 === 0) && (
                  <text
                    x={center + (radius + 15) * Math.cos(pt.angle)}
                    y={center + (radius + 15) * Math.sin(pt.angle) + 4}
                    textAnchor="middle"
                    className={`euclidean-node-label ${isHighlighted ? 'accent-text font-bold' : ''}`}
                  >
                    {pt.index + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
