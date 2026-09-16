import React from "react";
import { useAppContext } from "../../context/AppContext";
import { TARGET_NOTES_PRESETS } from "../../core/targetNotes";
import InfoTooltip from "./InfoTooltip";

// VMU-123 — the same four-preset control, rendered in both Dictionary
// (replacing the old "Aide Impro" button) and Studio (near the chord/
// inversion block). One component so both places stay in sync by
// construction rather than by two hand-kept copies.
//
// Presets are named by INTENT, never by theory jargon (VMU-136's anti-
// jargon rule) — the labels below come from i18n/translations.js
// (targetNotesLabel/Off/MajorMinor/Color/Skeleton), never hard-coded here.
const PRESET_LABEL_KEYS = {
  off: "targetNotesOff",
  majorMinor: "targetNotesMajorMinor",
  color: "targetNotesColor",
  skeleton: "targetNotesSkeleton",
};

const PRESET_FALLBACK_LABELS = {
  off: "None",
  majorMinor: "What says major or minor",
  color: "The color notes",
  skeleton: "The skeleton",
};

export default function TargetNotesSelector({ preset, onChange }) {
  const { txt } = useAppContext();

  return (
    <div className="select-group" data-testid="target-notes-selector">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
        <label className="field-label">{txt.targetNotesLabel || "Target Notes"}</label>
        <InfoTooltip text={txt.tooltip?.targetNotes} />
      </div>
      <div className="btn-segment-group" role="group" aria-label={txt.targetNotesLabel || "Target Notes"}>
        {TARGET_NOTES_PRESETS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`btn-segment${preset === key ? " btn-segment--active" : ""}`}
            aria-pressed={preset === key}
          >
            {txt[PRESET_LABEL_KEYS[key]] || PRESET_FALLBACK_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
