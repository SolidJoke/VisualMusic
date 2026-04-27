import React from "react";
import { NOTES, SCALES, SCALE_CATEGORIES, CHORDS, CHORD_CATEGORIES, getRecommendedScalesForChord } from "../../core/theory";

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

// Map chord dictType keys to translation keys
const CHORD_LABEL_MAP = {
  chord_major: "chordMaj",
  chord_minor: "chordMin",
  chord_dim: "chordDim",
  chord_aug: "chordAug",
  chord_sus2: "chordSus2",
  chord_sus4: "chordSus4",
  chord_maj7: "chordMaj7",
  chord_m7: "chordM7",
  chord_7: "chord7",
  chord_dim7: "chordDim7",
  chord_m7b5: "chordM7b5",
  chord_add9: "chordAdd9",
  chord_9: "chord9",
  chord_m9: "chordM9",
};

// Group scales by category, sorted by category order
function getGroupedScales() {
  const groups = {};
  Object.entries(SCALES).forEach(([key, scale]) => {
    if (!groups[scale.category]) groups[scale.category] = [];
    groups[scale.category].push(key);
  });
  return Object.entries(SCALE_CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .filter(([cat]) => groups[cat])
    .map(([cat, meta]) => ({ category: cat, labelKey: meta.labelKey, items: groups[cat] }));
}

// Group chords by category, sorted by category order
function getGroupedChords() {
  const groups = {};
  Object.entries(CHORDS).forEach(([key, chord]) => {
    if (!groups[chord.category]) groups[chord.category] = [];
    groups[chord.category].push(key);
  });
  return Object.entries(CHORD_CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .filter(([cat]) => groups[cat])
    .map(([cat, meta]) => ({ category: cat, labelKey: meta.labelKey, items: groups[cat] }));
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
  const groupedChords = getGroupedChords();

  // Get the current item's emotion for the info tooltip (works for both scales and chords)
  const currentItem = SCALES[dictType] || CHORDS[dictType] || null;
  const emotionText = currentItem
    ? currentItem.emotion[lang] || currentItem.emotion.en
    : null;
  const descriptionText = currentItem
    ? currentItem.description[lang] || currentItem.description.en
    : null;

  const recommendedScales = family === "chord" ? getRecommendedScalesForChord(dictType) : [];

  return (
    <div className="glass-panel dict-panel">
      <h2 className="dict-panel__title accent-text">
        {txt.freeExplorer}
      </h2>

      <div className="dict-panel__controls">

        {/* Root note selector */}
        <div className="select-group">
          <label className="field-label">{txt.rootNote}</label>
          <select
            value={dictRoot}
            onChange={(e) => setDictRoot(e.target.value)}
            className="select-premium"
          >
            {NOTES.map((n) => (
              <option key={n.value} value={n.value}>
                {notation === "us" ? n.us : n.eu}
              </option>
            ))}
          </select>
        </div>

        {/* Family selector (Note / Chord / Scale) */}
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
          <div className="select-group">
            <select
              value={dictType}
              onChange={(e) => setDictType(e.target.value)}
              className="select-premium"
            >
              {groupedChords.map((group) => (
                <optgroup
                  key={group.category}
                  label={txt[group.labelKey] || group.category}
                >
                  {group.items.map((chordKey) => (
                    <option key={chordKey} value={chordKey}>
                      {txt[CHORD_LABEL_MAP[chordKey]] || CHORDS[chordKey]?.key || chordKey}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Emotion/description card for chords */}
            {emotionText && (
              <div className="dict-panel__emotion-card">
                <div className="dict-panel__emotion-title">
                  🎭 {emotionText}
                </div>
                {descriptionText && (
                  <div className="dict-panel__emotion-desc">
                    {descriptionText}
                  </div>
                )}
              </div>
            )}

            {/* Recommended Scales */}
            {recommendedScales.length > 0 && (
              <div className="dict-panel__recommended">
                <div className="dict-panel__recommended-label">
                  {txt.recommendedScales || "Recommended scales:"}
                </div>
                <div className="dict-panel__recommended-tags">
                  {recommendedScales.map(scaleKey => (
                    <button
                      key={scaleKey}
                      onClick={() => setDictType(scaleKey)}
                      className="tag-btn"
                    >
                      {txt[SCALE_LABEL_MAP[scaleKey]] || scaleKey}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sub-selector: Scale type with optgroups */}
        {family === "scale" && (
          <div className="select-group">
            <select
              value={dictType}
              onChange={(e) => setDictType(e.target.value)}
              className="select-premium"
            >
              {groupedScales.map((group) => (
                <optgroup
                  key={group.category}
                  label={txt[group.labelKey] || group.category}
                >
                  {group.items.map((scaleKey) => (
                    <option key={scaleKey} value={scaleKey}>
                      {txt[SCALE_LABEL_MAP[scaleKey]] || scaleKey}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Emotion/description card for scales */}
            {emotionText && (
              <div className="dict-panel__emotion-card">
                <div className="dict-panel__emotion-title">
                  🎭 {emotionText}
                </div>
                {descriptionText && (
                  <div className="dict-panel__emotion-desc">
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
        className="btn-premium btn-premium--full btn-premium--listen"
        onMouseDown={(e) => e.currentTarget.classList.add("is-pressed")}
        onMouseUp={(e) => e.currentTarget.classList.remove("is-pressed")}
      >
        {txt.listen}
      </button>
    </div>
  );
}
