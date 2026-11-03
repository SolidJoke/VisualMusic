import React from "react";

/**
 * L1b-1c — the content of A′'s position panel (opened from the label of a
 * neck's head, InstrumentHead.jsx), the classic PositionSelector's controls
 * with the same state and setters (one rule set: positionPanel.js):
 *
 *   "Fondamentale sur" Mi / La / Ré with the fret (chords only) · ✕ Réinitialiser
 *   le focus (a scale with an anchor) · ✕ Réinitialiser Position (a position
 *   chosen) · the alert (out of range / large stretch, guitar) · the barre
 *   legend (guitar) · the instrument's range. What has no object is not there.
 *
 * Presentational: PrototypeA hands it the view (positionPanelView) and the
 * setters; every word is protoA's (translations.js) except the alerts and the
 * fret words, the classic page's own (txt).
 *
 * @param {Object} props
 * @param {'guitar'|'bass'} props.id
 * @param {ReturnType<typeof import("../components/Instruments/positionPanel").positionPanelView>} props.view
 * @param {Record<string, any>} props.T protoA's table
 * @param {Record<string, any>} props.txt the page's main table (warnings, fretOpen, fretPrefix)
 * @param {number|null} props.selectedRootString
 * @param {number|null} props.placementIndex
 * @param {(idx: number|null) => void} props.setSelectedRootString
 * @param {(index: number|null) => void} props.setPlacementIndex
 * @param {(anchor: null) => void} props.setScaleAnchor
 * @param {(pitch: number|null) => void} props.setStartPitch
 */
export default function PositionPanel({ id, view, T, txt, selectedRootString, placementIndex, setSelectedRootString, setPlacementIndex, setScaleAnchor, setStartPitch }) {
  const alertText = view.alert === "outOfRange" ? txt.warningOutOfRange : view.alert === "difficultStretch" ? txt.warningDifficultStretch : null;
  return (
    <div className="proto-a__pp">
      {view.startPitches && (
        <div className="proto-a__pp-group" role="group" aria-label={T.positionStartPitch}>
          <div className="proto-a__pp-title">{T.positionStartPitch}</div>
          <select
            className="proto-a__pp-select"
            data-fn={`jouer.position-depart-${id}`}
            value={view.startPitches.current ?? ""}
            onChange={(e) => setStartPitch && setStartPitch(Number(e.target.value))}
          >
            {view.startPitches.choices.map((c) => (
              <option key={c.pitch} value={String(c.pitch)}>{c.label}</option>
            ))}
          </select>
        </div>
      )}
      {view.rootStrings && (
        <div className="proto-a__pp-group" role="group" aria-label={T.positionRootOn}>
          <div className="proto-a__pp-title">{T.positionRootOn}</div>
          {view.rootStrings.map((str) => {
            const isActive = selectedRootString === str.idx && placementIndex === null;
            return (
              <button
                key={str.idx}
                type="button"
                className={`proto-a__pp-btn ${isActive ? "is-active" : ""}`}
                aria-pressed={isActive}
                data-fn={`jouer.position-fondamentale-corde-${id}-${str.idx}`}
                onClick={() => {
                  setSelectedRootString(isActive ? null : str.idx);
                  setPlacementIndex(null);
                }}
              >
                {str.label} ({str.isOpen ? txt.fretOpen : `${txt.fretPrefix}${str.fret}`})
              </button>
            );
          })}
        </div>
      )}
      {view.resets.focus && (
        <button type="button" className="proto-a__pp-btn" data-fn={`jouer.position-reinit-focus-${id}`} onClick={() => setScaleAnchor(null)}>
          ✕ {T.positionResetFocus}
        </button>
      )}
      {view.resets.position && (
        <button type="button" className="proto-a__pp-btn" data-fn={`jouer.position-reinit-${id}`} onClick={() => setPlacementIndex(null)}>
          ✕ {T.positionResetPosition}
        </button>
      )}
      {alertText && (
        <div className={`proto-a__pp-alert is-${view.alert}`} role="status" aria-label={T.positionAlerts} data-fn={`jouer.position-alertes-${id}`}>
          {alertText}
        </div>
      )}
      {view.barre && (
        <div className="proto-a__pp-barre">
          <span className="proto-a__pp-swatch" aria-hidden="true" />
          <span>{T.positionBarre}</span>
        </div>
      )}
      {view.range && (
        <div className="proto-a__pp-range" data-fn={`jouer.instrument-plage-${id}`}>
          <span className="proto-a__pp-title">{T.positionRange}</span> {view.range}
        </div>
      )}
    </div>
  );
}
