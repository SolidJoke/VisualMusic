import React from 'react';
import { MODES } from '../../core/theory.js';

const TheoryModal = ({ isOpen, onClose, txt }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-panel)",
          padding: "30px",
          borderRadius: "12px",
          border: "1px solid var(--theme-primary)",
          maxWidth: "600px",
          width: "90%",
          position: "relative",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          ✖
        </button>
        <h2
          style={{
            color: "var(--theme-primary)",
            marginTop: 0,
            textAlign: "center",
          }}
        >
          {txt.theoryModalTitle}
        </h2>

        <div
          style={{
            backgroundColor: "var(--bg-overlay)",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            borderLeft: "4px solid #90caf9",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#90caf9" }}>
            {txt.guideTitle}
          </h3>
          <ul
            style={{
              color: "#e3f2fd",
              margin: 0,
              paddingLeft: "20px",
              lineHeight: "1.6",
              fontSize: "14px",
            }}
          >
            <li style={{ marginBottom: "8px" }}>{txt.guide1}</li>
            <li style={{ marginBottom: "8px" }}>{txt.guide2}</li>
            <li>{txt.guide3}</li>
          </ul>
        </div>

        <h3
          style={{
            color: "#fff",
            borderBottom: "1px solid #444",
            paddingBottom: "10px",
          }}
        >
          {txt.modesEmotionTitle}
        </h3>
        <ul
          style={{
            listStyleType: "none",
            padding: 0,
            color: "#ccc",
            lineHeight: "1.8",
          }}
        >
          <li>
            <strong style={{ color: "#fff" }}>Ionian :</strong>{" "}
            {MODES.Ionian.emotion} — {MODES.Ionian.description}
          </li>
          <li>
            <strong style={{ color: "#fff" }}>Dorian :</strong>{" "}
            {MODES.Dorian.emotion} (Note magique : {MODES.Dorian.magicNote})
          </li>
          <li>
            <strong style={{ color: "#fff" }}>Phrygian :</strong>{" "}
            {MODES.Phrygian.emotion} (Note magique : {MODES.Phrygian.magicNote})
          </li>
          <li>
            <strong style={{ color: "#fff" }}>Lydian :</strong>{" "}
            {MODES.Lydian.emotion} (Note magique : {MODES.Lydian.magicNote})
          </li>
          <li>
            <strong style={{ color: "#fff" }}>Mixolydian :</strong>{" "}
            {MODES.Mixolydian.emotion} (Note magique : {MODES.Mixolydian.magicNote})
          </li>
          <li>
            <strong style={{ color: "#fff" }}>Aeolian :</strong>{" "}
            {MODES.Aeolian.emotion}
          </li>
          <li>
            <strong style={{ color: "#fff" }}>Locrian :</strong>{" "}
            {MODES.Locrian.emotion}
          </li>
          <li>
            <strong style={{ color: "#fff" }}>Phrygian Dominant :</strong>{" "}
            {MODES.PhrygianDominant.emotion}
          </li>
        </ul>

        <h3
          style={{
            color: "var(--theme-primary)",
            borderBottom: "1px solid #444",
            paddingBottom: "10px",
            marginTop: "30px"
          }}
        >
          Nashville Number System (NNS)
        </h3>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          Le NNS remplace les noms de notes par des fonctions :
          <br />• <strong>1, 4, 5</strong> : Accords Majeurs (Repos, Départ, Tension).
          <br />• <strong>2-, 3-, 6-</strong> : Accords Mineurs.
          <br />• <strong>6-</strong> : La relative mineure (Profondeur).
        </p>
      </div>
    </div>
  );
};

export default TheoryModal;
