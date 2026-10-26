import React from 'react';
import { useAppContext } from '../../context/AppContext';
// L1b-1b: the label and the cycle are shared with A′'s column heads (one copy).
import { placementLabel, stepPlacement } from '../Instruments/placementLabel';
// L1b-1c: which strings, which resets and which alerts are shared with A′'s position panel.
import { positionPanelView } from '../Instruments/positionPanel';

/**
 * PositionSelector Component
 *
 * Handles navigation between different fingering variants or scale positions.
 *
 * INST-B1 — it steps through `placements` (useMusicEngine's
 * placementsByInstrument[instrument], core/placements.js listPlacements:
 * nut -> body) by index; `placementIndex` null = the default placement, whose
 * label is the shape actually shown (txt.positionDefault) — a single note has
 * none: every place of it is lit, "Toutes les notes".
 */
const PositionSelector = ({
  instrumentType,
  selectedRootString,
  setSelectedRootString,
  fingering,
  placements = [],
  placementIndex = null,
  setPlacementIndex,
  isScaleMode,
  rootVal,
  scaleAnchor,
  setScaleAnchor
}) => {
  const { txt, notation } = useAppContext();

  const view = positionPanelView({ instrumentType, rootVal, notation, isScaleMode, scaleAnchor, placementIndex, fingering });
  const strings = view.rootStrings ?? [];

  // The arrows step nut -> body and back to the default (placementLabel.js
  // stepPlacement); nothing happens on an empty list.
  const step = (direction) => {
    const next = stepPlacement(placements, placementIndex, direction);
    if (next !== undefined) setPlacementIndex(next);
  };
  const handlePrevVoicing = () => step(-1);
  const handleNextVoicing = () => step(1);

  const shownLabel = placementLabel({ placements, placementIndex, isScaleMode, txt });

  return (
    <div style={{ marginBottom: "15px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
      {view.rootStrings && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--surface-2)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", alignItems: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold", textAlign: "center" }}>
             {instrumentType === "guitar" ? txt.guitarLabel : txt.bassLabel} : {txt.rootStringLabel || "Root on string"}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {strings.map(str => {
            const fretText = str.isOpen ? txt.fretOpen : `${txt.fretPrefix}${str.fret}`;
            const isActive = selectedRootString === str.idx && placementIndex === null;
            return (
              <button
                key={str.idx}
                className={`btn-premium ${isActive ? " active" : ""}`}
                onClick={() => {
                  setSelectedRootString(isActive ? null : str.idx);
                  setPlacementIndex(null);
                }}
                style={{ padding: "5px 12px", fontSize: "12px", borderRadius: "15px" }}
                title={`${txt.rootOnString || "Root on"} ${str.label}`}
              >
                {str.label} ({fretText})
              </button>
            );
          })}
          </div>
        </div>
      )}

      {view.resets.focus && (
          <button 
            className="btn-premium active"
            onClick={() => setScaleAnchor(null)}
            style={{ padding: "5px 15px", fontSize: "11px", borderRadius: "15px", marginBottom: "5px" }}
          >
             ✕ {txt.resetFocus || "Reset Focus"}
          </button>
      )}

      {view.resets.position && (
          <button
            className="btn-premium active"
            onClick={() => setPlacementIndex(null)}
            style={{ padding: "5px 15px", fontSize: "11px", borderRadius: "15px", marginBottom: "5px" }}
          >
             ✕ {txt.resetVoicing || "Reset Voicing"}
          </button>
      )}

      {/* Voicing Selector UI */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", marginLeft: "-35px" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "bold" }}>
          {txt.voicingSelector}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "var(--surface-2)", padding: "2px 8px", borderRadius: "20px", border: "1px solid var(--border-subtle)" }}>
          <button 
            className="btn-premium" 
            onClick={handlePrevVoicing}
            style={{ padding: "2px 8px", fontSize: "16px", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ‹
          </button>
          
          <span style={{ color: "var(--text-primary)", fontSize: "12px", minWidth: "120px", textAlign: "center", fontWeight: "500" }}>
            {shownLabel}
          </span>

          <button 
            className="btn-premium" 
            onClick={handleNextVoicing}
            style={{ padding: "2px 8px", fontSize: "16px", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ›
          </button>
        </div>
      </div>

      {view.alerts.outOfRange && (
        <div style={{ color: "var(--color-error)", fontSize: "13px", fontWeight: "bold" }}>{txt.warningOutOfRange}</div>
      )}
      {view.alerts.difficultStretch && (
        <div style={{ color: "var(--color-warning)", fontSize: "13px", fontWeight: "bold" }}>{txt.warningDifficultStretch}</div>
      )}
      {view.barre && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
          <div style={{ width: "20px", height: "10px", backgroundColor: "var(--select)", border: "2px solid var(--border-strong)", borderRadius: "4px" }}></div>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{txt.barreLegend}</span>
        </div>
      )}
    </div>
  );
};

export default PositionSelector;
