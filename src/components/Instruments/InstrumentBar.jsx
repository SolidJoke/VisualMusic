import React from "react";
import "./InstrumentBar.css";

/**
 * InstrumentBar — which instrument plays, and plays it (VMU-101, design
 * option A chosen 2026-09-13).
 *
 * The tile chooses; the round button inside it plays. Two gestures in one
 * object, because since #103 the keyboard shows the register of the selected
 * instrument: looking at the guitar voicing without hearing it has to stay
 * possible, and comparing instruments has to stay one tap.
 *
 * Selection is signalled by elevation and a light border, not by the accent
 * colour: in theme-modern the accent and --role-root are the same cyan, and a
 * control that borrows a musical colour teaches the wrong thing.
 *
 * `compact` (phone) swaps the three round play buttons for one full-width play
 * of the selected instrument: a 114px tile cannot hold a 44px button beside its
 * label. The swap happens in the markup, not in CSS. App.css forces
 * `display: inline-flex !important` on every button under 768px, so a
 * stylesheet cannot hide a button there — the first version of this component
 * tried, and shipped all four play buttons to the phone.
 *
 * Presentational only. Selecting then playing in one tap lives in
 * hooks/useSelectThenPlay.js, where the stale-closure trap is handled.
 *
 * The select button and the play button are siblings, not nested: a button
 * inside a button is invalid HTML, and it would fire both handlers.
 *
 * @param {Object} props
 * @param {Array<{id: string, label: string, range: string|null}>} props.instruments
 * @param {string} props.selected
 * @param {(id: string) => void} props.onSelect
 * @param {(id: string) => void} props.onPlay
 * @param {string} props.playLabel
 * @param {string} props.groupLabel
 * @param {boolean} [props.compact=false]
 */
export default function InstrumentBar({
  instruments,
  selected,
  onSelect,
  onPlay,
  playLabel,
  groupLabel,
  compact = false,
}) {
  const selectedItem =
    instruments.find((inst) => inst.id === selected) ?? instruments[0];

  return (
    <div
      className={`instrument-bar${compact ? " instrument-bar--compact" : ""}`}
      role="group"
      aria-label={groupLabel}
    >
      {instruments.map((inst) => {
        const on = inst.id === selected;
        return (
          <div
            key={inst.id}
            className={`instrument-bar__tile${on ? " is-selected" : ""}`}
          >
            <button
              type="button"
              className="instrument-bar__select"
              data-instrument={inst.id}
              aria-pressed={on}
              onClick={() => onSelect(inst.id)}
            >
              <span className="instrument-bar__name">
                <span className="instrument-bar__icon" aria-hidden="true">
                  <InstrumentIcon id={inst.id} />
                </span>
                {inst.label}
              </span>
              {inst.range && (
                <span className="instrument-bar__range">{inst.range}</span>
              )}
            </button>
            {!compact && (
              <button
                type="button"
                className="instrument-bar__play"
                aria-label={`${playLabel} — ${inst.label}`}
                onClick={() => onPlay(inst.id)}
              >
                <PlayGlyph />
              </button>
            )}
          </div>
        );
      })}

      {compact && selectedItem && (
        <button
          type="button"
          className="instrument-bar__play-selected"
          data-testid="instrument-bar-play-selected"
          aria-label={`${playLabel} — ${selectedItem.label}`}
          onClick={() => onPlay(selectedItem.id)}
        >
          <PlayGlyph />
          <span>{playLabel}</span>
        </button>
      )}
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5 L18.5 12 L8 18.5 Z" fill="currentColor" />
    </svg>
  );
}

/** Stroke icons on a 24px grid, drawn in currentColor so they follow the tile state. */
function InstrumentIcon({ id }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (id === "piano") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M9 5v14M15 5v14" />
        <path d="M7.5 5v7M10.5 5v7M13.5 5v7M16.5 5v7" strokeWidth="2.6" />
      </svg>
    );
  }
  if (id === "bass") {
    return (
      <svg {...common}>
        <circle cx="7" cy="17" r="3.5" />
        <path d="M9.6 14.4 L21 3" />
        <path d="M18.5 2.5 L21.5 5.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="16" r="4.5" />
      <path d="M11.2 12.8 L19 5" />
      <path d="M17 4 L20 7" />
    </svg>
  );
}
