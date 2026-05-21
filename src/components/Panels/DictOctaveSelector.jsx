import React from "react";
import { useAppContext } from "../../context/AppContext";

export default function DictOctaveSelector({ family, dictOctave, setDictOctave }) {
  const { txt } = useAppContext();

  return (
    <div className="select-group">
      <label className="field-label">{txt.octave || "Octave"}</label>
      <div className="btn-segment-group">
        {(family === "note" 
          ? [
              { value: -3, label: "1" },
              { value: -2, label: "2" },
              { value: -1, label: "3" },
              { value: 0, label: "4" },
              { value: 1, label: "5" },
              { value: 2, label: "6" },
              { value: 3, label: "7" },
            ]
          : [
              { value: -3, label: "-3" },
              { value: -2, label: "-2" },
              { value: -1, label: "-1" },
              { value: 0, label: "0" },
              { value: 1, label: "+1" },
              { value: 2, label: "+2" },
              { value: 3, label: "+3" },
            ]
        ).map((oct) => (
          <button
            key={oct.value}
            onClick={() => setDictOctave(oct.value)}
            className={`btn-segment${dictOctave === oct.value ? " btn-segment--active" : ""}`}
          >
            {oct.label}
          </button>
        ))}
      </div>
    </div>
  );
}
