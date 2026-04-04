import React from "react";
import { NOTES } from "../../core/theory";

export default function DictionaryPanel({
  dictRoot,
  setDictRoot,
  dictType,
  setDictType,
  notation,
  playDictionaryAudio,
  txt
}) {
  return (
    <div
      className="dashboard-panel"
      style={{
        textAlign: "center",
        backgroundColor: "#2a2a2a",
        border: "1px solid var(--theme-primary)",
        width: "100%",
        boxSizing: "border-box",
        maxWidth: "none",
        margin: "0",
        padding: "15px",
        borderRadius: "8px",
      }}
    >
      <h2
        style={{
          margin: "0 0 15px 0",
          color: "var(--theme-primary)",
        }}
      >
        {txt.freeExplorer}
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "20px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              color: "#ccc",
              marginBottom: "5px",
            }}
          >
            {txt.rootNote}
          </label>
          <select
            value={dictRoot}
            onChange={(e) => setDictRoot(e.target.value)}
            style={{
              padding: "10px",
              fontSize: "18px",
              width: "100%",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: "#111",
              color: "#fff",
              border: "1px solid #555",
              boxSizing: "border-box",
            }}
          >
            {NOTES.map((n) => (
              <option key={n.value} value={n.value}>
                {notation === "us" ? n.us : n.eu}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              color: "#ccc",
              marginBottom: "5px",
            }}
          >
            {txt.structType}
          </label>
          <select
            value={dictType}
            onChange={(e) => setDictType(e.target.value)}
            style={{
              padding: "10px",
              fontSize: "18px",
              width: "100%",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: "#111",
              color: "#fff",
              border: "1px solid #555",
              boxSizing: "border-box",
            }}
          >
            <option value="single_note">{txt.singleNote}</option>
            <option value="chord_major">{txt.chordMaj}</option>
            <option value="chord_minor">{txt.chordMin}</option>
            <option value="scale_major">{txt.scaleMaj}</option>
            <option value="scale_minor">{txt.scaleMin}</option>
          </select>
        </div>
      </div>

      <button
        onClick={playDictionaryAudio}
        style={{
          marginTop: "25px",
          padding: "12px",
          width: "100%",
          fontSize: "16px",
          fontWeight: "bold",
          borderRadius: "8px",
          cursor: "pointer",
          backgroundColor: "var(--theme-primary)",
          color: "#000",
          border: "none",
          transition: "transform 0.1s",
        }}
        onMouseDown={(e) => (e.target.style.transform = "scale(0.95)")}
        onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
      >
        {txt.listen}
      </button>
    </div>
  );
}
