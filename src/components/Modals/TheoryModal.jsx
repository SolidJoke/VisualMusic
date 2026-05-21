import React from 'react';
import { SCALES } from '../../core/theory.js';

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
          {Object.values(SCALES).filter(scale => scale.modeKey).map((scale) => {
            const name = scale.modeKey;
            const modeTxt = txt.modes?.[name] || {};
            const emotion = modeTxt.emotion;
            const description = modeTxt.description;
            const magicNote = modeTxt.magicNote;
            const magicLabel = txt.magicNoteLabel || "Magic Note";

            return (
              <li key={name}>
                <strong className="mode-name">{name} :</strong>{" "}
                {emotion} {magicNote ? `(${magicLabel} : ${magicNote})` : ''} {description ? `— ${description}` : ''}
              </li>
            );
          })}
        </ul>

        <h3 className="section-title accent">
          {txt.nnsExplainTitle}
        </h3>
        <p className="nns-text">
          {txt.nnsExplainDesc}
          <br />• <strong>1, 4, 5</strong> : {txt.nnsExplainMajor}
          <br />• <strong>2-, 3-, 6-</strong> : {txt.nnsExplainMinor}
          <br />• <strong>6-</strong> : {txt.nnsExplainRelative}
        </p>

        {txt.harmonicModeTitle && (
          <>
            <h3 className="section-title accent">
              {txt.harmonicModeTitle}
            </h3>
            <p className="nns-text">
              {txt.harmonicModeDesc}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default TheoryModal;
