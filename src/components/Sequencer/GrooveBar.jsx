// @ts-check
import React, { useState } from "react";
import "./Groove.css";

/**
 * VMU-223 — the swing and the humanisation, in the drum machine's header: two
 * sliders, each with the value it sets and a one-sentence explanation behind
 * "?" (a click away, for a beginner). Both are settings of the whole Studio
 * (core/groove.js); the grid shows them (PianoRoll.jsx) and the export writes
 * them.
 *
 * Every target is --hit-min high (44px, 48px at 3840). A drag is ONE step of
 * the undo history: `onBegin` / `onEnd` bracket the gesture (pointer, keyboard
 * or focus lost) and useStudioMode records once, at the end.
 *
 * @param {Object} props
 * @param {any} props.T the labels (translations `groove`)
 * @param {number} props.swing 50..75
 * @param {number} props.humanize 0..100
 * @param {(value: number) => void} props.onSwing
 * @param {(value: number) => void} props.onHumanize
 * @param {() => void} props.onBegin a slider gesture starts
 * @param {() => void} props.onEnd a slider gesture ends
 */
export default function GrooveBar({ T, swing, humanize, onSwing, onHumanize, onBegin, onEnd }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const gesture = {
    onPointerDown: onBegin,
    onPointerUp: onEnd,
    onPointerCancel: onEnd,
    onKeyDown: onBegin,
    onKeyUp: onEnd,
    onBlur: onEnd,
  };
  const swingText = swing === 50 ? `${swing} % · ${T.straight}` : `${swing} %`;
  return (
    <div className="groove-bar" role="group" aria-label={T.group} data-groove="bar">
      <label className="groove-bar__field" title={T.swingHint} data-groove="swing">
        <span className="groove-bar__name">{T.swing}</span>
        <input
          type="range"
          min="50"
          max="75"
          step="1"
          className="proto-a__volume-slider groove-bar__slider"
          value={swing}
          aria-label={T.swing}
          aria-valuetext={swingText}
          style={/** @type {any} */ ({ "--value": `${((swing - 50) / 25) * 100}%` })}
          data-groove="swing-input"
          onChange={(e) => onSwing(Number(e.target.value))}
          {...gesture}
        />
        <output className="groove-bar__value" data-groove="swing-value">{swingText}</output>
      </label>
      <label className="groove-bar__field" title={T.humanizeHint} data-groove="humanize">
        <span className="groove-bar__name">{T.humanize}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          className="proto-a__volume-slider groove-bar__slider"
          value={humanize}
          aria-label={T.humanize}
          aria-valuetext={`${humanize} %`}
          style={/** @type {any} */ ({ "--value": `${humanize}%` })}
          data-groove="humanize-input"
          onChange={(e) => onHumanize(Number(e.target.value))}
          {...gesture}
        />
        <output className="groove-bar__value" data-groove="humanize-value">{humanize} %</output>
      </label>
      <button
        type="button"
        className={`proto-a__btn proto-a__btn--square ${helpOpen ? "is-active" : ""}`}
        aria-expanded={helpOpen}
        aria-label={T.helpButton}
        title={T.helpButton}
        data-groove="help"
        onClick={() => setHelpOpen((open) => !open)}
      >
        ?
      </button>
      {helpOpen && (
        <div className="groove-bar__pop" role="note" data-groove="help-text">
          <p>{T.swingHelp}</p>
          <p>{T.humanizeHelp}</p>
          <p className="groove-bar__pop-muted">{T.keptNote}</p>
          <button type="button" className="proto-a__btn" onClick={() => setHelpOpen(false)}>
            {T.close}
          </button>
        </div>
      )}
    </div>
  );
}
