import React from 'react';
import CustomSelect from '../Common/CustomSelect';
import { CHORDS, NOTES, getChordShortName, getAbsoluteChordSuggestions } from '../../core/theory';
import { useAppContext } from '../../context/AppContext';
import expertData from '../../core/expert_theory_data.json';

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

export default function DictChordPanel({
  dictType,
  setDictType,
  dictRoot,
  setDictRoot,
  uiTheme,
  groupedChords,
  emotionText,
  descriptionText,
  moodProfile,
  recommendedScales,
  applySubstitution
}) {
  const { lang, txt, notation } = useAppContext();

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
          {renderMoodProfile()}
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

      {/* Chord Suggestions (G.3.4) */}
      {(() => {
        const suggestions = getAbsoluteChordSuggestions(dictRoot, dictType);
        if (suggestions.length === 0) return null;

        return (
          <div className="dict-panel__substitutions" style={{ marginTop: '1.2rem' }}>
            <div className="field-label" style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
              💡 {txt.suggestedNextChords || "Accords Suivants Suggérés"}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {suggestions.map((s, idx) => {
                const noteStr = notation === "us" ? NOTES[s.targetRoot].us : NOTES[s.targetRoot].eu;
                const chordStr = txt[CHORD_LABEL_MAP[s.targetType]] || CHORDS[s.targetType]?.key;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setDictRoot(s.targetRoot);
                      setDictType(s.targetType);
                    }}
                    className="tag-btn"
                    title={s.reason}
                    style={{ fontSize: '0.75rem', padding: '6px 10px', borderRadius: '8px', background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.3)' }}
                  >
                    <span style={{ fontWeight: 'bold', color: '#facc15' }}>{noteStr} {chordStr}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
