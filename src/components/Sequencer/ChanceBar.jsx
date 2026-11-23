// @ts-check
import React, { useState } from "react";
import "./Chance.css";

/**
 * VMU-221 — the chance's controls, in the drum machine's header: the "Chance"
 * mode (while it is on, touching a lit cell moves its chance 100 -> 50 -> 25 ->
 * 100), a "?" that explains it in one sentence, the version's seed and
 * "Une autre version". The densities sit in each roll's bar (PianoRoll.jsx).
 *
 * Every target is --hit-min high (44px, 48px at 3840).
 *
 * @param {Object} props
 * @param {any} props.T the labels (translations `chance`)
 * @param {boolean} props.mode whether touching a cell sets its chance
 * @param {(on: boolean) => void} props.onMode
 * @param {string} props.seed the seed as shown (core/random.js formatSeed)
 * @param {boolean} props.canVary whether a chance or a density is set (else a new version changes nothing)
 * @param {() => void} props.onNewVersion
 */
export default function ChanceBar({ T, mode, onMode, seed, canVary, onNewVersion }) {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="chance-bar" role="group" aria-label={T.group} data-chance="bar">
      <button
        type="button"
        className={`proto-a__btn chance-bar__mode ${mode ? "is-active" : ""}`}
        aria-pressed={mode}
        title={T.toggleHint}
        data-chance="mode"
        onClick={() => onMode(!mode)}
      >
        {T.toggle}
      </button>
      <button
        type="button"
        className={`proto-a__btn proto-a__btn--square ${helpOpen ? "is-active" : ""}`}
        aria-expanded={helpOpen}
        aria-label={T.helpButton}
        title={T.helpButton}
        data-chance="help"
        onClick={() => setHelpOpen((open) => !open)}
      >
        ?
      </button>
      <span className="chance-bar__seed" title={T.seedHint}>
        <span className="chance-bar__seed-label">{T.seedLabel}</span>{" "}
        <code data-chance="seed">{seed}</code>
      </span>
      <button
        type="button"
        className="proto-a__btn chance-bar__another"
        disabled={!canVary}
        title={canVary ? T.anotherHint : T.anotherNeeds}
        aria-label={`${T.another}${canVary ? "" : ` — ${T.anotherNeeds}`}`}
        data-chance="another"
        onClick={onNewVersion}
      >
        {T.another}
      </button>
      {helpOpen && (
        <div className="chance-bar__pop" role="note" data-chance="help-text">
          <p>{T.help}</p>
          <p className="chance-bar__pop-muted">{T.densityHint}</p>
          <button type="button" className="proto-a__btn" onClick={() => setHelpOpen(false)}>
            {T.close}
          </button>
        </div>
      )}
    </div>
  );
}
