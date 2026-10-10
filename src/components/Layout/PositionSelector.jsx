import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { NOTES } from '../../core/theory';

/**
 * What the arrows show for one placement of core/placements.js: a scale box is
 * numbered from the nut, "3 sur 5" (it read "3 eu 5": the notation code was
 * passed as fingeringLogic.js's separator); a shape keeps its own label, with
 * "-shape" in the page's language.
 */
function placementText(placement, count, txt) {
  if (placement.fingering?.isScaleMode) return `${placement.index + 1} ${txt.voicingOf || "of"} ${count}`;
  return placement.label.replace('-shape', `-${txt.shapeLabel || 'shape'}`);
}

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

  const getNoteLabel = (midiVal) => {
    const note = NOTES[midiVal % 12];
    return notation === 'eu' ? note.eu : note.us;
  };

  const strings = instrumentType === "guitar" ? [
    { idx: 5, label: getNoteLabel(4), openVal: 4 },
    { idx: 4, label: getNoteLabel(9), openVal: 9 },
    { idx: 3, label: getNoteLabel(2), openVal: 2 },
  ] : [
    { idx: 3, label: getNoteLabel(4), openVal: 4 },
    { idx: 2, label: getNoteLabel(9), openVal: 9 },
    { idx: 1, label: getNoteLabel(2), openVal: 2 },
  ];

  // The chosen entry's rank, or -1 when the index points nowhere (a list that
  // changed under it): the arrows then behave as they did for an unknown id.
  const count = placements.length;
  const current = Number.isInteger(placementIndex) && placementIndex >= 0 && placementIndex < count ? placementIndex : -1;
  const defaultPlacement = placements.find((p) => p.isDefault) ?? null;

  const handlePrevVoicing = () => {
    if (count === 0) return;
    if (placementIndex === null) setPlacementIndex(count - 1);
    else if (current <= 0) setPlacementIndex(null);
    else setPlacementIndex(current - 1);
  };

  const handleNextVoicing = () => {
    if (count === 0) return;
    if (placementIndex === null) setPlacementIndex(0);
    else if (current === count - 1) setPlacementIndex(null);
    else setPlacementIndex(current + 1);
  };

  let shownLabel;
  if (placementIndex !== null) {
    shownLabel = current >= 0 ? placementText(placements[current], count, txt) : "Position";
  } else if (defaultPlacement) {
    const text = placementText(defaultPlacement, count, txt);
    shownLabel = typeof txt.positionDefault === "function" ? txt.positionDefault(text) : text;
  } else {
    shownLabel = isScaleMode ? txt.fullNeck : txt.voicingAllNotes;
  }

  return (
    <div style={{ marginBottom: "15px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
      {!isScaleMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--surface-2)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", alignItems: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold", textAlign: "center" }}>
             {instrumentType === "guitar" ? txt.guitarLabel : txt.bassLabel} : {txt.rootStringLabel || "Root on string"}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {strings.map(str => {
            const rootInThisString = (rootVal - str.openVal + 12) % 12;
            const fretText = rootInThisString === 0 ? txt.fretOpen : `${txt.fretPrefix}${rootInThisString}`;
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

      {isScaleMode && scaleAnchor && (
          <button 
            className="btn-premium active"
            onClick={() => setScaleAnchor(null)}
            style={{ padding: "5px 15px", fontSize: "11px", borderRadius: "15px", marginBottom: "5px" }}
          >
             ✕ {txt.resetFocus || "Reset Focus"}
          </button>
      )}

      {placementIndex !== null && (
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

      {instrumentType === "guitar" && fingering?.outOfRange && (
        <div style={{ color: "var(--color-error)", fontSize: "13px", fontWeight: "bold" }}>{txt.warningOutOfRange}</div>
      )}
      {instrumentType === "guitar" && fingering?.difficultStretch && !fingering?.outOfRange && (
        <div style={{ color: "var(--color-warning)", fontSize: "13px", fontWeight: "bold" }}>{txt.warningDifficultStretch}</div>
      )}
      {instrumentType === "guitar" && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
          <div style={{ width: "20px", height: "10px", backgroundColor: "var(--select)", border: "2px solid var(--border-strong)", borderRadius: "4px" }}></div>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{txt.barreLegend}</span>
        </div>
      )}
    </div>
  );
};

export default PositionSelector;
