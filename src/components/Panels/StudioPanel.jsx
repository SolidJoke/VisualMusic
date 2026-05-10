import React from 'react';
import { BRICKS } from '../../core/bricks';
import { MODES, generateChordsFromNNS, toRoman } from '../../core/theory';
import { useAppContext } from '../../context/AppContext';
import StudioInfoBlock from './StudioInfoBlock';
import LcdScreen from '../Common/LcdScreen';
import CustomSelect from '../Common/CustomSelect';
import { log } from '../../utils/debug';

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
  setSuggestedBassTrack
}) => {
  const { lang, txt, notation, state } = useAppContext();
  const { uiTheme } = state;
  if (!activeBrick) return null;

  const handleSuggestBass = () => {
    import('../../core/bassEngine').then(({ suggestBassPattern }) => {
      const chords = generateChordsFromNNS(
        activeBrick.rootValue,
        activeBrick.modeName,
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
      style={{
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        maxWidth: "none",
        margin: "0",
      }}
    >
      <div className="screw screw-tl"></div>
      <div className="screw screw-tr"></div>
      <div className="screw screw-bl"></div>
      <div className="screw screw-br"></div>

      <StudioInfoBlock txt={txt} lang={lang} />

      <div style={{ margin: "15px 0" }}>
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
          🎵 {activeBrick.modeName}
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
          <div>
            <span
              style={{
                color: "#ccc",
                marginRight: "10px",
                fontSize: "16px",
              }}
            >
              {txt.theme}
            </span>
            <br />
            <br />
            <button
              onClick={() => setCurrentTheme("A")}
              className={`btn-toggle ${currentTheme === "A" ? " btn-toggle--active" : ""}`}
              style={{ marginRight: "5px" }}
            >
              {txt.varA}
            </button>
            <button
              onClick={() => setCurrentTheme("B")}
              className={`btn-toggle ${currentTheme === "B" ? " btn-toggle--active" : ""}`}
            >
              {txt.varB}
            </button>
            <button
              onClick={handleSuggestBass}
              className={`btn-premium ${suggestedBassTrack ? " active" : ""}`}
              style={{ marginLeft: "10px", padding: "6px 12px", fontSize: "0.85rem" }}
              title={txt.suggestBassTip || "Generate a bass line for this genre"}
            >
              {suggestedBassTrack ? "✨ Bass OK" : "🎸 Suggest Bass"}
            </button>
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
        </div>
        <strong>{txt.magicProg} </strong> <br />
        <br />
        <div className="magic-progression-container">

          {generateChordsFromNNS(
            activeBrick.rootValue,
            activeBrick.modeName,
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
