import React from 'react';
import { MODES } from '../../core/theory.js';

const TheoryModal = ({ isOpen, onClose, txt }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content theory-modal-content">
        <button
          onClick={onClose}
          className="btn-premium modal-close-btn"
        >
          ✖
        </button>
        <h2 className="modal-title">
          {txt.theoryModalTitle}
        </h2>

        <div className="guide-box">
          <h3 className="guide-title">
            {txt.guideTitle}
          </h3>
          <ul className="guide-list">
            <li>{txt.guide1}</li>
            <li>{txt.guide2}</li>
            <li>{txt.guide3}</li>
          </ul>
        </div>

        <h3 className="section-title">
          {txt.modesEmotionTitle}
        </h3>
        <ul className="modes-list">
          {Object.entries(MODES).map(([name, data]) => (
            <li key={name}>
              <strong className="mode-name">{name} :</strong>{" "}
              {data.emotion} {data.magicNote ? `(Note magique : ${data.magicNote})` : ''} {data.description ? `— ${data.description}` : ''}
            </li>
          ))}
        </ul>

        <h3 className="section-title accent">
          Nashville Number System (NNS)
        </h3>
        <p className="nns-text">
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
