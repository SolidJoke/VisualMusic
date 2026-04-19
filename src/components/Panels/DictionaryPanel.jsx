import React from "react";
import { NOTES, SCALES, SCALE_CATEGORIES } from "../../core/theory";

// Map dictType keys to translation keys for scale names
const SCALE_LABEL_MAP = {
  scale_major: "scaleMaj",
  scale_minor: "scaleMin",
  scale_harmonic_minor: "scaleHarmonicMinor",
  scale_melodic_minor: "scaleMelodicMinor",
  scale_dorian: "scaleDorian",
  scale_phrygian: "scalePhrygian",
  scale_lydian: "scaleLydian",
  scale_mixolydian: "scaleMixolydian",
  scale_locrian: "scaleLocrian",
  scale_phrygian_dominant: "scalePhrygianDom",
  scale_pentatonic_major: "scalePentaMaj",
  scale_pentatonic_minor: "scalePentaMin",
  scale_blues_minor: "scaleBluesMin",
  scale_blues_major: "scaleBluesMaj",
  scale_hirajoshi: "scaleHirajoshi",
  scale_hungarian_minor: "scaleHungarianMin",
  scale_whole_tone: "scaleWholeTone",
  scale_chromatic: "scaleChromatic",
};

// Group scales by category, sorted by category order
function getGroupedScales() {
  const groups = {};
  Object.entries(SCALES).forEach(([key, scale]) => {
    if (!groups[scale.category]) {
      groups[scale.category] = [];
    }
    groups[scale.category].push(key);
  });

  // Sort categories by their defined order
  return Object.entries(SCALE_CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .filter(([cat]) => groups[cat])
    .map(([cat, meta]) => ({
      category: cat,
      labelKey: meta.labelKey,
      scales: groups[cat],
    }));
}

export default function DictionaryPanel({
  dictRoot,
  setDictRoot,
  dictType,
  setDictType,
  notation,
  playDictionaryAudio,
  txt,
  lang,
}) {
  // Derive family from dictType
  const family = dictType === "single_note"
    ? "note"
    : dictType.startsWith("chord_")
      ? "chord"
      : "scale";

  const handleFamilyChange = (newFamily) => {
    if (newFamily === "note") setDictType("single_note");
    else if (newFamily === "chord") setDictType("chord_major");
    else if (newFamily === "scale") setDictType("scale_major");
  };

  const groupedScales = getGroupedScales();

  // Get the current scale's emotion for the info tooltip
  const currentScale = SCALES[dictType];
  const emotionText = currentScale
    ? currentScale.emotion[lang] || currentScale.emotion.en
    : null;
  const descriptionText = currentScale
    ? currentScale.description[lang] || currentScale.description.en
    : null;

  const selectStyle = {
    padding: "10px",
    fontSize: "18px",
    width: "100%",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "var(--bg-overlay)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-dim)",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    color: "#ccc",
    marginBottom: "5px",
  };

  return (
    <div
      className="dashboard-panel"
      style={{
        textAlign: "center",
        backgroundColor: "var(--bg-raised)",
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
        {/* Root note selector */}
        <div>
          <label style={labelStyle}>{txt.rootNote}</label>
          <select
            value={dictRoot}
            onChange={(e) => setDictRoot(e.target.value)}
            style={selectStyle}
          >
            {NOTES.map((n) => (
              <option key={n.value} value={n.value}>
                {notation === "us" ? n.us : n.eu}
              </option>
            ))}
          </select>
        </div>

        {/* Family selector (Note / Chord / Scale) */}
        <div>
          <label style={labelStyle}>{txt.structType}</label>
          <div style={{ display: "flex", gap: "4px", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border-dim)" }}>
            {[
              { key: "note", label: txt.familyNote || "🎵 Note" },
              { key: "chord", label: txt.familyChord || "🎸 Accords" },
              { key: "scale", label: txt.familyScale || "🎹 Gammes" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => handleFamilyChange(f.key)}
                className={`btn-segment${family === f.key ? " btn-segment--active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-selector: Chord type */}
        {family === "chord" && (
          <div>
            <select
              value={dictType}
              onChange={(e) => setDictType(e.target.value)}
              style={selectStyle}
            >
              <option value="chord_major">{txt.chordMaj}</option>
              <option value="chord_minor">{txt.chordMin}</option>
            </select>
          </div>
        )}

        {/* Sub-selector: Scale type with optgroups */}
        {family === "scale" && (
          <div>
            <select
              value={dictType}
              onChange={(e) => setDictType(e.target.value)}
              style={selectStyle}
            >
              {groupedScales.map((group) => (
                <optgroup
                  key={group.category}
                  label={txt[group.labelKey] || group.category}
                >
                  {group.scales.map((scaleKey) => (
                    <option key={scaleKey} value={scaleKey}>
                      {txt[SCALE_LABEL_MAP[scaleKey]] || scaleKey}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* C.3 — Emotion/description tooltip */}
            {emotionText && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  backgroundColor: "var(--bg-panel)",
                  borderRadius: "6px",
                  borderLeft: "3px solid var(--theme-primary)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--theme-primary)",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  🎭 {emotionText}
                </div>
                {descriptionText && (
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    {descriptionText}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
