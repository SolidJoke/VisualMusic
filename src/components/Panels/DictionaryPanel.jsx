import React from "react";
import { useAppContext } from "../../context/AppContext";
import { NOTES, SCALES, CHORDS, getRecommendedScalesForChord, resolveChordFromShortName, getRelatedScales } from "../../core/theory";
import CustomSelect from "../Common/CustomSelect";
import { log } from "../../utils/debug";
import HarmonicSeriesPanel from "./HarmonicSeriesPanel";
import extendedData from "../../core/extendedTheoryData.json";
import DictPositionPanel from './DictPositionPanel';
import DictChordPanel from './DictChordPanel';
import TargetNotesSelector from '../Common/TargetNotesSelector';
// VMU-185: the lists and the family <-> dictType rule have one owner, shared
// with A′'s direct selectors (src/prototype/SelectionRow.jsx).
import {
  getGroupedScales,
  getGroupedChords,
  scaleOptions,
  rootNoteOptions,
  familyOptions,
  dictFamily,
  dictTypeOnFamilyClick,
} from "../../core/selectionOptions";

export default function DictionaryPanel({
  dictRoot,
  setDictRoot,
  dictType,
  setDictType,
  playDictionaryAudio,
  isPlaying,
  guitarFingering,   // { fingeringMap, outOfRange, difficultStretch } from App.jsx
  bassFingering,
  harmonicMode,
  setHarmonicMode,
  dictOctave,
  setDictOctave,
  placementsByInstrument,
  placementByInstrument,
  setPlacementIndex,
  targetNotesPreset,
  setTargetNotesPreset
}) {
  const { lang, txt, notation } = useAppContext();
  // Derive family from dictType
  const family = dictFamily(dictType);

  const handleFamilyChange = (newFamily) => {
    const next = dictTypeOnFamilyClick(newFamily, dictType);
    if (next) setDictType(next);
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
    let tensionColor = "var(--color-success)";
    if (moodProfile.tension >= 4) tensionColor = "var(--color-warning)";
    if (moodProfile.tension >= 7) tensionColor = "var(--color-error)";

    return (
      <div className="dict-panel__mood-profile" style={{ marginTop: "10px", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ fontSize: "11px", opacity: 0.7 }}>Tension</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "60px", height: "4px", background: "var(--surface-2)", borderRadius: "2px", overflow: "hidden" }}>
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
            <span key={i} style={{ fontSize: "10px", padding: "2px 6px", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}>{g}</span>
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
            options={rootNoteOptions(notation)}
            data-testid="select-root-note"
          />
        </div>

        {/* VMU-134: the US/EU notation switch used to live here. It is now
            a single global control in HeaderActions (src/components/Layout/AppHeader.jsx),
            reachable from Studio too — this panel still reads `notation` for
            display (line ~156 above and the related-scales root name below),
            it just no longer owns the toggle. */}

        {/* Family selector (Note / Chord / Scale) */}
        <div className="select-group">
          <label className="field-label">{txt.structType}</label>
          <div className="btn-segment-group">
            {familyOptions(txt).map((f) => (
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
        
        {/* VMU-123 — replaces the "Aide Impro" button (FLASH-12), which had
            no effect here: the old targetValue was only ever computed in
            Studio. Shown for the two families that have a target-notes
            concept at all — Accord (the chord's own notes) and Gamme (falls
            back to the mode's characteristic note, no chord) — never for
            Note, which VMU-123 decision #3 excludes entirely. */}
        {(family === "chord" || family === "scale") && (
          <TargetNotesSelector preset={targetNotesPreset} onChange={setTargetNotesPreset} />
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
              options={scaleOptions(groupedScales, txt)}
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
          guitarFingering={guitarFingering}
          bassFingering={bassFingering}
          placementsByInstrument={placementsByInstrument}
          placementByInstrument={placementByInstrument}
          setPlacementIndex={setPlacementIndex}
        />
      </div>
    </div>
  );
}
