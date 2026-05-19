import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { NOTES } from '../../core/theory';

/**
 * PositionSelector Component
 * 
 * Handles navigation between different fingering variants or scale positions.
 */
const PositionSelector = ({ 
  instrumentType, 
  selectedRootString, 
  setSelectedRootString, 
  fingering, 
  availableVoicings,
  selectedVoicingIndex, 
  setSelectedVoicingIndex,
  isScaleMode,
  rootVal,
  scaleAnchor,
  setScaleAnchor
}) => {
  const { lang, txt, notation } = useAppContext();

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

  const handlePrevVoicing = () => {
    if (!availableVoicings || availableVoicings.length === 0) return;
    if (selectedVoicingIndex === null) {
      setSelectedVoicingIndex(availableVoicings[availableVoicings.length - 1].id);
    } else {
      const currIdx = availableVoicings.findIndex(v => v.id === selectedVoicingIndex);
      if (currIdx <= 0) setSelectedVoicingIndex(null);
      else setSelectedVoicingIndex(availableVoicings[currIdx - 1].id);
    }
  };

  const handleNextVoicing = () => {
    if (!availableVoicings || availableVoicings.length === 0) return;
    if (selectedVoicingIndex === null) {
      setSelectedVoicingIndex(availableVoicings[0].id);
    } else {
      const currIdx = availableVoicings.findIndex(v => v.id === selectedVoicingIndex);
      if (currIdx === availableVoicings.length - 1) setSelectedVoicingIndex(null);
      else setSelectedVoicingIndex(availableVoicings[currIdx + 1].id);
    }
  };

  return (
    <div style={{ marginBottom: "15px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
      {!isScaleMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold", textAlign: "center" }}>
             {instrumentType === "guitar" ? txt.guitarLabel : txt.bassLabel} : {txt.rootStringLabel || "Root on string"}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
          {strings.map(str => {
            const rootInThisString = (rootVal - str.openVal + 12) % 12;
            const fretText = rootInThisString === 0 ? txt.fretOpen : `${txt.fretPrefix}${rootInThisString}`;
            const isActive = selectedRootString === str.idx && selectedVoicingIndex === null;
            return (
              <button
                key={str.idx}
                className={`btn-premium ${isActive ? " active" : ""}`}
                onClick={() => {
                  setSelectedRootString(isActive ? null : str.idx);
                  setSelectedVoicingIndex(null);
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

      {selectedVoicingIndex !== null && (
          <button 
            className="btn-premium active"
            onClick={() => setSelectedVoicingIndex(null)}
            style={{ padding: "5px 15px", fontSize: "11px", borderRadius: "15px", marginBottom: "5px" }}
          >
             ✕ {txt.resetVoicing || "Reset Voicing"}
          </button>
      )}

      {/* Voicing Selector UI */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", marginLeft: "-35px" }}>
        <span style={{ color: "#d4c4a8", fontSize: "14px", fontWeight: "bold" }}>
          {txt.voicingSelector}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: "20px", border: "1px solid rgba(212, 196, 168, 0.2)" }}>
          <button 
            className="btn-premium" 
            onClick={handlePrevVoicing}
            style={{ padding: "2px 8px", fontSize: "16px", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ‹
          </button>
          
          <span style={{ color: "#fff", fontSize: "12px", minWidth: "120px", textAlign: "center", fontWeight: "500" }}>
            {selectedVoicingIndex === null 
              ? (isScaleMode ? txt.fullNeck : txt.voicingAllNotes) 
              : ((availableVoicings?.find(v => v.id === selectedVoicingIndex)?.label || "Position")
                  .replace('-shape', `-${txt.shapeLabel || 'shape'}`))}
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
        <div style={{ color: "#e74c3c", fontSize: "13px", fontWeight: "bold" }}>{txt.warningOutOfRange}</div>
      )}
      {instrumentType === "guitar" && fingering?.difficultStretch && !fingering?.outOfRange && (
        <div style={{ color: "#f39c12", fontSize: "13px", fontWeight: "bold" }}>{txt.warningDifficultStretch}</div>
      )}
      {instrumentType === "guitar" && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
          <div style={{ width: "20px", height: "10px", backgroundColor: "rgba(96, 165, 250, 0.3)", border: "2px solid rgba(96, 165, 250, 0.85)", borderRadius: "4px" }}></div>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{txt.barreLegend}</span>
        </div>
      )}
    </div>
  );
};

export default PositionSelector;
