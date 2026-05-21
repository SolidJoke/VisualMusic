import React from "react";
import { useAppContext } from "../../context/AppContext";

export default function DictFamilySelector({ family, onChangeFamily }) {
  const { txt, state, dispatch } = useAppContext();

  return (
    <div className="select-group">
      <label className="field-label">{txt.structType}</label>
      <div className="btn-segment-group">
        {[
          { key: "note", label: txt.familyNote || "🎵 Note" },
          { key: "chord", label: txt.familyChord || "🎸 Accords" },
          { key: "scale", label: txt.familyScale || "🎹 Gammes" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => onChangeFamily(f.key)}
            className={`btn-segment${family === f.key ? " btn-segment--active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* FLASH-12: Improvisation Helper (Target Notes) */}
      {family === "scale" && (
        <button
          onClick={() => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'highlightTargetNotes', value: !state.highlightTargetNotes } })}
          className={`btn-toggle ${state.highlightTargetNotes ? "btn-toggle--active" : ""}`}
          style={{ width: "100%", padding: "0.6rem", marginTop: "0.5rem" }}
          title="Highlight 3rd and 5th for improvisation"
        >
          {state.highlightTargetNotes ? "🎯 " + (txt.targetNotesActive || "Helper Actif") : "🎯 " + (txt.targetNotesToggle || "Aide Impro")}
        </button>
      )}
    </div>
  );
}
