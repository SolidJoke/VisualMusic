import React from 'react';
import { BRICKS } from '../../core/bricks';
import { MODES, generateChordsFromNNS, toRoman } from '../../core/theory';

const StudioPanel = ({
  currentBrickIndex,
  setCurrentBrickIndex,
  activeBrick,
  lang,
  txt,
  currentTheme,
  setCurrentTheme,
  chordOctaveOffset,
  setChordOctaveOffset,
  setCurrentAbsoluteNotes,
  activeProgression,
  chordDisplayMode,
  notation,
  clickedChord,
  setClickedChord,
  handleChordClick,
  inversionText
}) => {
  if (!activeBrick) return null;

  return (
    <div
      className="dashboard-panel"
      style={{
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        maxWidth: "none",
        margin: "0",
      }}
    >
      <h2 style={{ margin: "0 0 15px 0", color: "#fff" }}>
        {txt.styleSelection}
      </h2>

      <select
        value={currentBrickIndex}
        onChange={(e) => setCurrentBrickIndex(e.target.value)}
        style={{
          padding: "10px",
          fontSize: "18px",
          borderRadius: "4px",
          cursor: "pointer",
          backgroundColor: "var(--bg-overlay)",
          color: "var(--theme-primary)",
          border: "1px solid var(--theme-primary)",
          fontWeight: "bold",
          width: "100%",
        }}
      >
        <optgroup label="🎷 Jazz & Bossa">
          {BRICKS.map((brick, index) => brick._group === 'jazz' && <option key={index} value={index}>{brick.name[lang]}</option>)}
        </optgroup>
        <optgroup label="🌍 World & Groove">
          {BRICKS.map((brick, index) => brick._group === 'world' && <option key={index} value={index}>{brick.name[lang]}</option>)}
        </optgroup>
        <optgroup label="🎤 Urban & Hip-Hop">
          {BRICKS.map((brick, index) => brick._group === 'urban' && <option key={index} value={index}>{brick.name[lang]}</option>)}
        </optgroup>
        <optgroup label="🎓 Progressions Expertes (NNS)">
          {BRICKS.map((brick, index) => brick._group === 'expert_progressions' && <option key={index} value={index}>{brick.name[lang] || brick.name.en}</option>)}
        </optgroup>
        <optgroup label="🎹 Pop & Funk">
          {BRICKS.map((brick, index) => brick._group === 'pop' && <option key={index} value={index}>{brick.name[lang]}</option>)}
        </optgroup>
        <optgroup label="🎸 Rock & Metal">
          {BRICKS.map((brick, index) => brick._group === 'rock' && <option key={index} value={index}>{brick.name[lang]}</option>)}
        </optgroup>
        <optgroup label="🎧 Electronic">
          {BRICKS.map((brick, index) => brick._group === 'electronic' && <option key={index} value={index}>{brick.name[lang]}</option>)}
        </optgroup>
      </select>

      <div style={{ marginTop: "15px" }}>
        <span className="info-badge">
          🎵 Mode: {activeBrick.modeName} ({MODES[activeBrick.modeName]?.emotion})
        </span>
        <span className="info-badge">
          🎸 Tuning: {activeBrick.tuning || "Standard"}
        </span>
      </div>

      <div className="effects-text">
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
        style={{
          marginTop: "20px",
          color: "var(--text-primary)",
          fontSize: "15px",
          backgroundColor: "var(--bg-overlay)",
          padding: "15px",
          borderRadius: "4px",
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
              className={`btn-toggle${currentTheme === "A" ? " btn-toggle--active" : ""}`}
              style={{ marginRight: "5px" }}
            >
              {txt.varA}
            </button>
            <button
              onClick={() => setCurrentTheme("B")}
              className={`btn-toggle${currentTheme === "B" ? " btn-toggle--active" : ""}`}
            >
              {txt.varB}
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
            <select
              value={chordOctaveOffset}
              onChange={(e) => {
                setChordOctaveOffset(Number(e.target.value));
                setCurrentAbsoluteNotes([]);
              }}
              style={{
                padding: "6px",
                fontSize: "13px",
                borderRadius: "4px",
                cursor: "pointer",
                backgroundColor: "var(--bg-overlay)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-dim)",
              }}
            >
              <option value={-2}>-2 Oct.</option>
              <option value={-1}>-1 Oct.</option>
              <option value={0}>C4</option>
              <option value={1}>+1 Oct.</option>
              <option value={2}>+2 Oct.</option>
            </select>
          </div>
        </div>
        <strong>{txt.magicProg} </strong> <br />
        <br />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "5px",
          }}
        >
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
              <span
                key={i}
                style={{ display: "flex", alignItems: "center" }}
              >
                <button
                  onClick={() => handleChordClick(c, i)}
                  title={c.role}
                  style={{
                    background: isSelected
                      ? "var(--theme-primary)"
                      : "#222",
                    color: isSelected
                      ? "#000"
                      : "var(--theme-primary)",
                    border: "2px solid var(--theme-primary)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "16px",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {chordText}
                </button>
                {i < activeProgression.length - 1 ? (
                  <span style={{ margin: "0 5px" }}>➜</span>
                ) : (
                  ""
                )}
              </span>
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
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                cursor: "pointer",
                backgroundColor: "var(--border-muted)",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: "4px",
              }}
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
