import React from "react";
import { useAppContext } from "../../context/AppContext";
import { NOTES, SCALES, SCALE_CATEGORIES, CHORDS, CHORD_CATEGORIES, getRecommendedScalesForChord, resolveChordSemitones, resolveScaleSemitones, getChordShortName, resolveChordFromShortName } from "../../core/theory";
import VoicingAlert from "../Intelligence/VoicingAlert";
import CustomSelect from "../Common/CustomSelect";
import DualToggle from "../Common/DualToggle";
import { log } from "../../utils/debug";
import { getAvailableGuitarFingerings, getAvailableBassFingerings, getAvailableScaleFingerings, getAvailableSingleNoteFingerings } from "../../core/fingeringLogic";
import HarmonicSeriesPanel from "./HarmonicSeriesPanel";
import expertData from "../../core/expert_theory_data.json";

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

  // Get the current item's emotion for the info tooltip (works for both scales and chords)
  const currentItem = SCALES[dictType] || CHORDS[dictType] || null;
  const emotionText = currentItem
    ? currentItem.emotion[lang] || currentItem.emotion.en
    : null;
  const descriptionText = currentItem
    ? currentItem.description[lang] || currentItem.description.en
    : null;

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
                  { value: -1, label: "-1" },
                  { value: 0, label: "0" },
                  { value: 1, label: "+1" },
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
          <div className="select-group">
            <CustomSelect
              value={dictType}
              onChange={(val) => setDictType(val)}
              options={groupedChords.map((group) => ({
                label: txt[group.labelKey] || group.category,
                items: group.items.map((chordKey) => ({
                  value: chordKey,
                  label: txt[CHORD_LABEL_MAP[chordKey]] || CHORDS[chordKey]?.key || chordKey
                }))
              }))}
              theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
            />

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

            {/* Substitutions */}
            <div className="dict-panel__substitutions" style={{ marginTop: '1.2rem' }}>
              <div className="field-label" style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                🔄 {txt.substitutions || "Substitutions"}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(() => {
                  const currentName = getChordShortName(dictRoot, dictType);
                  if (!currentName) return <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{txt.noSubAvailable || "No substitutions for this type"}</div>;
                  
                  const subs = [];
                  const tritone = expertData.harmonicSubstitutions.tritone[currentName];
                  if (tritone) subs.push({ type: 'Tritone', name: tritone });
                  
                  const relMinor = expertData.harmonicSubstitutions.relativeMinor[currentName];
                  if (relMinor) subs.push({ type: 'Rel. Minor', name: relMinor });
                  
                  if (subs.length === 0) return <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{txt.noSubAvailable || "None available"}</div>;
                  
                  return subs.map(sub => (
                    <button
                      key={sub.type}
                      onClick={() => applySubstitution(sub.name)}
                      className="tag-btn"
                      style={{ fontSize: '0.75rem', padding: '6px 10px', borderRadius: '8px', background: 'rgba(212, 196, 168, 0.08)', border: '1px solid rgba(212, 196, 168, 0.15)' }}
                    >
                      <span style={{ opacity: 0.6, marginRight: '4px', textTransform: 'uppercase', fontSize: '0.65rem' }}>{sub.type}:</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--theme-primary)' }}>{sub.name}</span>
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
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
              </div>
            )}
          </div>
        )}

        {/* Shared Position Selectors (Guitar/Bass) for Chords and Scales */}
        {(family === "chord" || family === "scale" || family === "note") && (
          <div className="dict-panel__positions">
            
            {/* Voicing Alerts — non-blocking analysis banners */}
            {(guitarFingering || bassFingering) && (
              <div className="dict-panel__alerts" style={{ marginBottom: '1rem' }}>
                {guitarFingering && (
                  <VoicingAlert
                    fingeringMap={guitarFingering?.fingeringMap}
                    instrument="guitar"
                    rootValue={Number(dictRoot)}
                    intervals={(() => {
                      if (family === "note") return [0];
                      if (family === 'scale') return resolveScaleSemitones(dictType);
                      const chordData = resolveChordSemitones(dictType);
                      return chordData ? chordData.semitones : null;
                    })()}
                  />
                )}
                {bassFingering && (
                  <VoicingAlert
                    fingeringMap={bassFingering?.fingeringMap}
                    instrument="bass"
                    rootValue={Number(dictRoot)}
                    intervals={(() => {
                      if (family === "note") return [0];
                      if (family === 'scale') return resolveScaleSemitones(dictType);
                      const chordData = resolveChordSemitones(dictType);
                      return chordData ? chordData.semitones : null;
                    })()}
                  />
                )}
              </div>
            )}

            {/* Guitar Position Selector */}
            {dictType && (
              <div className="dictionary-fretboard-options">
                <div className="option-group">
                  <label className="field-label">🎸 {txt.guitarPosition || "Guitar Position"}</label>
                  <CustomSelect
                    value={selectedVoicingIndexGuitar}
                    onChange={setSelectedVoicingIndexGuitar}
                    options={(() => {
                      if (!dictType) return [];
                      if (family === "note") {
                        const midi = dictActiveNotes[0]?.absoluteValue;
                        if (midi === undefined || midi === null) return [];
                        const avail = getAvailableSingleNoteFingerings(midi, 'guitar', notation);
                        return [
                          { value: null, label: txt.voicingAllNotes || "All positions" },
                          ...avail.map(p => ({ value: p.id, label: `${txt.posNoteString || "String"} ${p.stringName} - ${txt.posNoteFret || "Fret"} ${p.fret}` }))
                        ];
                      }
                      if (family === "scale") {
                        const avail = getAvailableScaleFingerings(dictRoot, dictType, 'guitar', ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], txt.voicingOf || 'of');
                        return [
                          { value: null, label: txt.voicingAllNotes || "All positions" },
                          ...avail.map(p => ({ value: p.id, label: p.label }))
                        ];
                      }
                      const avail = getAvailableGuitarFingerings(dictRoot, dictType, dictOctave, notation);
                      return [
                        { value: null, label: txt.voicingAllNotes || "All positions" },
                        ...avail.map(p => ({ value: p.id, label: p.label }))
                      ];
                    })()}
                    theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
                  />
                  {guitarFingering?.isOutOfRange && (
                    <div className="range-warning" style={{ color: "#ff4d4d", fontSize: "0.8em", marginTop: "4px" }}>
                      ⚠️ {txt.outOfRangeGuitar || "Guitar range exceeded"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bass Position Selector */}
            {dictType && (
              <div className="dictionary-fretboard-options" style={{ marginTop: "0.5rem" }}>
                <div className="option-group">
                  <label className="field-label">🎸 {txt.bassPosition || "Bass Position"}</label>
                  <CustomSelect
                    value={selectedVoicingIndexBass}
                    onChange={setSelectedVoicingIndexBass}
                    options={(() => {
                      if (!dictType) return [];
                      if (family === "note") {
                        const midi = dictActiveNotes[0]?.absoluteValue;
                        if (midi === undefined || midi === null) return [];
                        const avail = getAvailableSingleNoteFingerings(midi, 'bass', notation);
                        return [
                          { value: null, label: txt.voicingAllNotes || "All positions" },
                          ...avail.map(p => ({ value: p.id, label: `${txt.posNoteString || "String"} ${p.stringName} - ${txt.posNoteFret || "Fret"} ${p.fret}` }))
                        ];
                      }
                      if (family === "scale") {
                        const avail = getAvailableScaleFingerings(dictRoot, dictType, 'bass', ['E1', 'A1', 'D2', 'G2'], txt.voicingOf || 'of');
                        return [
                          { value: null, label: txt.voicingAllNotes || "All positions" },
                          ...avail.map(p => ({ value: p.id, label: p.label }))
                        ];
                      }
                      const avail = getAvailableBassFingerings(dictRoot, dictType, dictOctave, notation);
                      return [
                        { value: null, label: txt.voicingAllNotes || "All positions" },
                        ...avail.map(p => ({ value: p.id, label: p.label }))
                      ];
                    })()}
                    theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
                  />
                  {bassFingering?.isOutOfRange && (
                    <div className="range-warning" style={{ color: "#ff4d4d", fontSize: "0.8em", marginTop: "4px" }}>
                      ⚠️ {txt.outOfRangeBass || "Bass range exceeded"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={playDictionaryAudio}
        className={`btn-playback-premium ${isPlaying ? 'stop' : 'play'}`}
        onMouseDown={(e) => e.currentTarget.classList.add("is-pressed")}
        onMouseUp={(e) => e.currentTarget.classList.remove("is-pressed")}
      >
        <div className="btn-playback-icon"></div>
        <span>{isPlaying ? txt.stopAudio : txt.listen}</span>
      </button>
    </div>
  );
}
