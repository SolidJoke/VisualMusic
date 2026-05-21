import React from 'react';
import { BRICKS } from '../../core/bricks';
import { SCALES, generateChordsFromNNS, toRoman } from '../../core/theory';
import { useAppContext } from '../../context/AppContext';
import StudioInfoBlock from './StudioInfoBlock';
import LcdScreen from '../Common/LcdScreen';
import CustomSelect from '../Common/CustomSelect';
import { log } from '../../utils/debug';
import extendedTheoryData from '../../core/extendedTheoryData.json';

const StudioPanel = ({
  currentBrickIndex,
  setCurrentBrickIndex,
  activeBrick,
  currentTheme,
  setCurrentTheme,
  chordOctaveOffset,
  setChordOctaveOffset,
  setCurrentAbsoluteNotes,
  activeProgression,
  chordDisplayMode,
  clickedChord,
  setClickedChord,
  handleChordClick,
  inversionText,
  suggestedBassTrack,
  setSuggestedBassTrack,
  setCustomProgression,
  customRhythm,
  setCustomRhythm
}) => {
  const RHYTHM_PATTERNS = [
    { id: 'default', name: 'Original', steps: null },
    { id: 'straight', name: 'Straight 4/4', steps: [0] },
    { id: 'sync1', name: 'Syncopated 1', steps: [0, 2] },
    { id: 'sync2', name: 'Syncopated 2', steps: [0, 1, 2] },
    { id: 'skank', name: 'Reggae Skank', steps: [2] },
    { id: 'jazz', name: 'Jazz Comp', steps: [0, 3] },
  ];

  const { lang, txt, notation, state } = useAppContext();
  const { uiTheme } = state;
  if (!activeBrick) return null;

  const handleSuggestBass = () => {
    import('../../core/bassEngine').then(({ suggestBassPattern }) => {
      const chords = generateChordsFromNNS(
        activeBrick.rootValue,
        activeBrick.scaleKey,
        activeProgression
      );
      const newPattern = suggestBassPattern(activeBrick.name.en, chords);
      setSuggestedBassTrack(newPattern);
    });
  };

  const getChordQuality = (nns) => {
    if (nns.includes('dim') || nns.includes('°')) return txt.chordQualDim || 'Dim.';
    if (nns.includes('-') || (nns.includes('m') && !nns.startsWith('maj'))) return txt.chordQualMin || 'Min.';
    return txt.chordQualMaj || 'Maj.';
  };

  return (
    <div
      className="vintage-chassis"
      data-testid="studio-panel"
    >
      <div className="screw screw-tl"></div>
      <div className="screw screw-tr"></div>
      <div className="screw screw-bl"></div>
      <div className="screw screw-br"></div>

      <StudioInfoBlock txt={txt} lang={lang} />

      <div style={{ margin: "15px 0", position: "relative", zIndex: 20 }}>
        <LcdScreen title={txt.styleSelection}>
          <CustomSelect
            value={currentBrickIndex}
            onChange={(val) => setCurrentBrickIndex(Number(val))}
            options={[
              { label: "🎷 Jazz & Bossa", items: BRICKS.filter(b => b._group === 'jazz').map((b, i) => ({ value: BRICKS.indexOf(b), label: b.name[lang] })) },
              { label: "🌍 World & Groove", items: BRICKS.filter(b => b._group === 'world').map((b, i) => ({ value: BRICKS.indexOf(b), label: b.name[lang] })) },
              { label: "🎤 Urban & Hip-Hop", items: BRICKS.filter(b => b._group === 'urban').map((b, i) => ({ value: BRICKS.indexOf(b), label: b.name[lang] })) },
              { label: "🎓 Progressions Expertes (NNS)", items: BRICKS.filter(b => b._group === 'expert_progressions').map((b, i) => ({ value: BRICKS.indexOf(b), label: b.name[lang] || b.name.en })) },
              { label: "🎹 Pop & Funk", items: BRICKS.filter(b => b._group === 'pop').map((b, i) => ({ value: BRICKS.indexOf(b), label: b.name[lang] })) },
              { label: "🎸 Rock & Metal", items: BRICKS.filter(b => b._group === 'rock').map((b, i) => ({ value: BRICKS.indexOf(b), label: b.name[lang] })) },
              { label: "🎧 Electronic", items: BRICKS.filter(b => b._group === 'electronic').map((b, i) => ({ value: BRICKS.indexOf(b), label: b.name[lang] })) },
            ]}
            theme="vintage" /* Style selector inside LCD is always vintage style */
          />
        </LcdScreen>
      </div>

      <div style={{ marginTop: "15px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
        <span className="info-badge" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #444' }}>
          🎵 {SCALES[activeBrick.scaleKey]?.modeKey || activeBrick.scaleKey}
        </span>
        <span className="info-badge" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #444' }}>
          🎸 {activeBrick.tuning || "Standard"}
        </span>
      </div>

      <div className="effects-text" style={{ color: 'var(--led-cyan)', opacity: 0.8 }}>
        💡 {activeBrick.effects?.[lang] || ""}
      </div>
      {activeBrick.inspiration?.[lang] && (
        <div style={{ color: '#888', fontSize: '13px', marginTop: '6px', fontStyle: 'italic', paddingLeft: '12px' }}>
          {activeBrick.inspiration[lang]}
        </div>
      )}
      <div
        style={{
          color: "#aaa",
          fontSize: "13px",
          marginTop: "5px",
          fontStyle: "italic",
          textAlign: "left",
          paddingLeft: "12px",
        }}
      >
        🎧 {activeBrick.examples?.[lang] || ""}
      </div>

      <div
        className="glass-panel"
        style={{
          marginTop: "20px",
          padding: "20px",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            marginBottom: "15px",
          }}
        >
            <div style={{ marginBottom: "12px" }}>
              <span
                style={{
                  color: "#ccc",
                  marginRight: "10px",
                  fontSize: "16px",
                }}
              >
                {txt.theme}
              </span>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "15px" }}>
                <button
                  onClick={() => setCurrentTheme("A")}
                  className={`btn-premium ${currentTheme === "A" ? " active" : ""}`}
                  style={{ flex: 1, padding: "8px 12px" }}
                >
                  {txt.varA}
                </button>
                <button
                  onClick={() => setCurrentTheme("B")}
                  className={`btn-premium ${currentTheme === "B" ? " active" : ""}`}
                  style={{ flex: 1, padding: "8px 12px" }}
                >
                  {txt.varB}
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: "10px" }}>
              <button
                onClick={handleSuggestBass}
                className={`btn-premium ${suggestedBassTrack ? " active" : ""}`}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
                title={txt.suggestBassTip || "Generate a bass line for this genre"}
              >
                {suggestedBassTrack ? "✨ Bass OK" : `🎸 ${txt.suggestBass || "Suggest Bass"}`}
              </button>
            </div>

          <div style={{ textAlign: "center" }}>
             <span style={{ color: "#888", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Quick Start Progressions</span>
             <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginTop: "10px" }}>
               {extendedTheoryData.axiomRules.progressions.map(p => (
                 <button
                   key={p.id}
                   onClick={() => {
                     log("studio", `Loading quick progression: ${p.name}`);
                     setCustomProgression(p.degrees);
                   }}
                   className="btn-premium"
                   style={{ fontSize: "0.7rem", padding: "4px 8px", borderRadius: "12px" }}
                   title={p.degrees.join(" - ")}
                 >
                   {p.name}
                 </button>
               ))}
               <button
                 onClick={() => setCustomProgression(null)}
                 className="btn-premium"
                 style={{ fontSize: "0.7rem", padding: "4px 8px", borderRadius: "12px", opacity: 0.6 }}
               >
                 ↺ Reset
               </button>
             </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#ccc",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {txt.octaveBase}
            </span>
            <CustomSelect
              value={chordOctaveOffset}
              onChange={(val) => {
                setChordOctaveOffset(Number(val));
                setCurrentAbsoluteNotes([]);
              }}
              options={[
                { value: -2, label: "-2 Oct." },
                { value: -1, label: "-1 Oct." },
                { value: 0, label: "C4" },
                { value: 1, label: "+1 Oct." },
                { value: 2, label: "+2 Oct." },
              ]}
              theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#ccc",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {"🥁 Rhythm"}
            </span>
            <CustomSelect
              value={RHYTHM_PATTERNS.find(p => JSON.stringify(p.steps) === JSON.stringify(customRhythm))?.id || 'default'}
              onChange={(val) => {
                const pattern = RHYTHM_PATTERNS.find(p => p.id === val);
                setCustomRhythm(pattern?.steps || null);
              }}
              options={RHYTHM_PATTERNS.map(p => ({ value: p.id, label: p.name }))}
              theme={uiTheme === 'vintage' ? 'vintage' : 'modern'}
            />
          </div>
        </div>
        <strong>{txt.magicProg} </strong> <br />
        <br />
        <div className="magic-progression-container" style={{ position: "relative", zIndex: 5 }}>

          {generateChordsFromNNS(
            activeBrick.rootValue,
            activeBrick.scaleKey,
            activeProgression,
          ).map((c, i) => {
            const isSelected =
              clickedChord && clickedChord.nns === c.nns;
            const chordText =
              chordDisplayMode === "nns"
                ? c.nns
                : chordDisplayMode === "roman"
                  ? toRoman(c.nns)
                  : notation === "us"
                    ? c.chordNameUS
                    : c.chordNameEU;

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <button
                  onClick={() => {
                    log("studio", `Selecting magic chord ${c.chordNameUS}`, c);
                    handleChordClick(c, i);
                  }}
                  title={c.role}
                  className={`btn-premium ${isSelected ? " active" : ""}`}
                  style={{
                    flexShrink: 0,
                  }}
                >
                  {chordText}
                </button>
                <span style={{
                  fontSize: "10px",
                  color: isSelected ? "var(--theme-primary)" : "#888",
                  fontStyle: "italic",
                  letterSpacing: "0.03em",
                  transition: "color 0.2s",
                }}>
                  {getChordQuality(c.nns)}
                </span>
              </div>
            );
          })}
        </div>
        {clickedChord && (
          <div style={{ marginTop: "15px" }}>
            <button
              onClick={() => {
                setClickedChord(null);
                setCurrentAbsoluteNotes([]);
              }}
              className="btn-premium"
            >
              {txt.backRoot}
            </button>
          </div>
        )}
        {inversionText && (
          <div
            style={{
              marginTop: "15px",
              fontSize: "14px",
              color: "#90caf9",
              fontStyle: "italic",
            }}
          >
            🎹 {inversionText}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioPanel;
