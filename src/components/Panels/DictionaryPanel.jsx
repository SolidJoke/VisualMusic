import React from "react";
import { useAppContext } from "../../context/AppContext";
import { NOTES, SCALES, SCALE_CATEGORIES, CHORDS, CHORD_CATEGORIES, getRecommendedScalesForChord, resolveChordFromShortName, getRelatedScales } from "../../core/theory";
import CustomSelect from "../Common/CustomSelect";
import DualToggle from "../Common/DualToggle";
import { log } from "../../utils/debug";
import HarmonicSeriesPanel from "./HarmonicSeriesPanel";
import extendedData from "../../core/extendedTheoryData.json";
import DictPositionPanel from './DictPositionPanel';
import DictChordPanel from './DictChordPanel';

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
  playDictionaryAudio,
  isPlaying,
  guitarFingering,   // { fingeringMap, outOfRange, difficultStretch } from App.jsx
  bassFingering,
  uiTheme,
  harmonicMode,
  setHarmonicMode,
  dictOctave,
  setDictOctave,
  selectedVoicingIndexGuitar,
  setSelectedVoicingIndexGuitar,
  selectedVoicingIndexBass,
  setSelectedVoicingIndexBass,
  dictActiveNotes
}) {
  const { lang, txt, notation, state, dispatch } = useAppContext();
  // Derive family from dictType
  const family = dictType === "single_note"
    ? "note"
    : (dictType && typeof dictType === 'string' && dictType.startsWith("chord_"))
      ? "chord"
      : "scale";

  const handleFamilyChange = (newFamily) => {
    if (newFamily === "note") setDictType("single_note");
    else if (newFamily === "chord") setDictType("chord_major");
    else if (newFamily === "scale") setDictType("scale_major");
  };

  const groupedScales = getGroupedScales();
  const groupedChords = getGroupedChords();

  const currentItem = SCALES[dictType] || CHORDS[dictType] || null;
  const emotionText = currentItem
    ? currentItem.emotion[lang] || currentItem.emotion.en
    : null;
  const descriptionText = currentItem
    ? currentItem.description[lang] || currentItem.description.en
    : null;

  let moodProfile = null;
  if (extendedData && extendedData.moodProfiles) {
    if (family === 'chord') moodProfile = extendedData.moodProfiles.chords[dictType];
    if (family === 'scale') moodProfile = extendedData.moodProfiles.scales[dictType];
  }

  const renderMoodProfile = () => {
    if (!moodProfile) return null;
    
    // Tension Color
    let tensionColor = "#4ade80"; // green
    if (moodProfile.tension >= 4) tensionColor = "#facc15"; // yellow
    if (moodProfile.tension >= 7) tensionColor = "#ef4444"; // red

    return (
      <div className="dict-panel__mood-profile" style={{ marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", opacity: 0.7 }}>Tension</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "60px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(moodProfile.tension / 10) * 100}%`, background: tensionColor }}></div>
            </div>
            <span style={{ fontSize: "11px", color: tensionColor, fontWeight: "bold", width: "16px", textAlign: "right" }}>{moodProfile.tension}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", opacity: 0.7 }}>Tempo</span>
          <span style={{ fontSize: "11px" }}>{moodProfile.tempo}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
          {moodProfile.genres.map((g, i) => (
            <span key={i} style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }}>{g}</span>
          ))}
        </div>
      </div>
    );
  };

  const recommendedScales = family === "chord" ? getRecommendedScalesForChord(dictType) : [];


  const applySubstitution = (subName) => {
    const resolved = resolveChordFromShortName(subName);
    if (resolved) {
      log("dictionary", `Applying substitution: ${subName} (${resolved.rootValue}, ${resolved.dictType})`);
      setDictRoot(resolved.rootValue);
      setDictType(resolved.dictType);
    }
  };

  return (
    <div className="glass-panel dict-panel" data-testid="dictionary-panel">
      <h2 className="dict-panel__title accent-text">
        {txt.freeExplorer}
      </h2>

      <div className="dict-panel__controls">

        {/* Root note selector */}
        <div className="select-group">
          <label className="field-label">{txt.rootNote}</label>
          <CustomSelect
            value={dictRoot}
            onChange={(val) => {
              log("dictionary", `Changing root to ${val}`);
              setDictRoot(val);
            }}
            options={NOTES.map((n) => ({
              value: n.value,
              label: notation === "us" ? n.us : n.eu
            }))}
            theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
            data-testid="select-root-note"
          />
        </div>

        <div className="select-group" style={{ marginTop: "-10px" }}>
          <DualToggle 
            value={notation}
            onChange={(val) => dispatch({ type: 'SET_NOTATION', payload: val })}
            options={[
              { value: "us", label: "US (A, B, C)" },
              { value: "eu", label: "EU (Do, Ré)" }
            ]}
          />
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
        
        {/* FLASH-12: Improvisation Helper (Target Notes) */}
        {family === "scale" && (
          <div className="select-group">
            <button
              onClick={() => dispatch({ type: 'SET_UI_VALUE', payload: { key: 'highlightTargetNotes', value: !state.highlightTargetNotes } })}
              className={`btn-toggle ${state.highlightTargetNotes ? "btn-toggle--active" : ""}`}
              style={{ width: "100%", padding: "0.6rem", marginTop: "0.5rem" }}
              title="Highlight 3rd and 5th for improvisation"
            >
              {state.highlightTargetNotes ? "🎯 " + (txt.targetNotesActive || "Helper Actif") : "🎯 " + (txt.targetNotesToggle || "Aide Impro")}
            </button>
          </div>
        )}

        {/* Harmonic Mode Toggle */}
        <div className="select-group">
          <button
            onClick={() => setHarmonicMode(!harmonicMode)}
            className={`btn-toggle ${harmonicMode ? "btn-toggle--active" : ""}`}
            style={{ width: "100%", padding: "0.6rem", marginTop: "0.5rem" }}
          >
            {txt.harmonicModeToggle || "Harmonic Mode"}
          </button>
          {harmonicMode && (
          <HarmonicSeriesPanel dictRoot={dictRoot} dictOctave={dictOctave} />
          )}
        </div>

        {/* Octave selector */}
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

        {/* Sub-selector: Chord type */}
        {family === "chord" && (
          <DictChordPanel
            dictType={dictType}
            setDictType={setDictType}
            dictRoot={dictRoot}
            setDictRoot={setDictRoot}
            uiTheme={uiTheme}
            groupedChords={groupedChords}
            emotionText={emotionText}
            descriptionText={descriptionText}
            moodProfile={moodProfile}
            recommendedScales={recommendedScales}
            applySubstitution={applySubstitution}
          />
        )}

        {/* Sub-selector: Scale type with optgroups */}
        {family === "scale" && (
          <div className="select-group">
            <CustomSelect
              value={dictType}
              onChange={(val) => setDictType(val)}
              options={groupedScales.map((group) => ({
                label: txt[group.labelKey] || group.category,
                items: group.items.map((scaleKey) => ({
                  value: scaleKey,
                  label: txt[SCALE_LABEL_MAP[scaleKey]] || scaleKey
                }))
              }))}
              theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
            />

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
                {renderMoodProfile()}
              </div>
            )}

            {/* Related/Parallel major/minor scale chips */}
            {dictType.includes('scale') && (
              <div className="dict-related-scales" style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                {getRelatedScales(dictRoot, dictType).map((rel, idx) => {
                  const rootName = notation === "us" ? NOTES[rel.rootValue].us : NOTES[rel.rootValue].eu;
                  return (
                    <button 
                      key={idx}
                      className="btn-premium"
                      style={{ fontSize: "11px", padding: "4px 8px", cursor: "pointer" }}
                      onClick={() => {
                        setDictRoot(rel.rootValue);
                        setDictType(rel.scaleKey);
                      }}
                    >
                      {rel.label}: {rootName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Shared Position Selectors (Guitar/Bass) for Chords and Scales */}
        <DictPositionPanel
          family={family}
          dictType={dictType}
          dictRoot={dictRoot}
          dictOctave={dictOctave}
          dictActiveNotes={dictActiveNotes}
          guitarFingering={guitarFingering}
          bassFingering={bassFingering}
          uiTheme={uiTheme}
          selectedVoicingIndexGuitar={selectedVoicingIndexGuitar}
          setSelectedVoicingIndexGuitar={setSelectedVoicingIndexGuitar}
          selectedVoicingIndexBass={selectedVoicingIndexBass}
          setSelectedVoicingIndexBass={setSelectedVoicingIndexBass}
        />
      </div>
    </div>
  );
}
