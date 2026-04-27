import React from 'react';

const AboutModal = ({ isOpen, onClose, txt }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <button
          onClick={onClose}
          className="btn-premium modal-close-btn"
        >
          ✖
        </button>
        <h2 className="modal-title accent-text">
          Vmu : VisualMusic Coach
        </h2>
        <p className="modal-desc">
          {txt.aboutDesc}
        </p>
        <p className="elegant-text">
          {txt.createdBy}
        </p>

        <div className="modal-footer">
          <a
            href="https://ko-fi.com/gabrielgsdresende"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-premium"
          >
            {txt.kofi}
          </a>
          <a
            href="https://github.com/SolidJoke/VisualMusic"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-premium"
          >
            {txt.github}
          </a>
        </div>
      </div>
    </div>
  );
};


export default AboutModal;
