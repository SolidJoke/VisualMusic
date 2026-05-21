import React from "react";
import { useAppContext } from "../../context/AppContext";
import CustomSelect from "../Common/CustomSelect";
import { CHORDS, getRecommendedScalesForChord, getChordShortName, resolveChordFromShortName } from "../../core/theory";
import expertData from "../../core/expert_theory_data.json";
import { log } from "../../utils/debug";

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

export default function DictChordSubPanel({
  dictRoot,
  setDictRoot,
  dictType,
  setDictType,
  groupedChords,
  uiTheme,
  SCALE_LABEL_MAP
}) {
  const { lang, txt } = useAppContext();
  
  const currentItem = CHORDS[dictType] || null;
  const emotionText = currentItem ? currentItem.emotion[lang] || currentItem.emotion.en : null;
  const descriptionText = currentItem ? currentItem.description[lang] || currentItem.description.en : null;
  const recommendedScales = getRecommendedScalesForChord(dictType);

  const applySubstitution = (subName) => {
    const resolved = resolveChordFromShortName(subName);
    if (resolved) {
      log("dictionary", `Applying substitution: ${subName} (${resolved.rootValue}, ${resolved.dictType})`);
      setDictRoot(resolved.rootValue);
      setDictType(resolved.dictType);
    }
  };

  return (
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

      {emotionText && (
        <div className="dict-panel__emotion-card">
          <div className="dict-panel__emotion-title">🎭 {emotionText}</div>
          {descriptionText && <div className="dict-panel__emotion-desc">{descriptionText}</div>}
        </div>
      )}

      {recommendedScales.length > 0 && (
        <div className="dict-panel__recommended">
          <div className="dict-panel__recommended-label">
            {txt.recommendedScales || "Recommended scales:"}
          </div>
          <div className="dict-panel__recommended-tags">
            {recommendedScales.map(scaleKey => (
              <button key={scaleKey} onClick={() => setDictType(scaleKey)} className="tag-btn">
                {txt[SCALE_LABEL_MAP[scaleKey]] || scaleKey}
              </button>
            ))}
          </div>
        </div>
      )}

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
  );
}
