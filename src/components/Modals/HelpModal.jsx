import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose }) => {
  const { txt } = useAppContext();
  const [activeTab, setActiveTab] = useState('desktop');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('help-modal-overlay')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const content = txt.helpModal || {};

  return (
    <div className="help-modal-overlay" onClick={handleBackdropClick} aria-modal="true" role="dialog">
      <div className="help-modal-container animate-fade-in" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="help-modal-header">
          <h2>{content.title || "Guide d'utilisation"}</h2>
          <button className="help-modal-close-icon" onClick={onClose} aria-label={content.closeBtn || "Fermer"}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="help-modal-tabs" role="tablist">
          <button 
            className={`help-tab ${activeTab === 'desktop' ? 'active' : ''}`}
            onClick={() => setActiveTab('desktop')}
            role="tab"
            aria-selected={activeTab === 'desktop'}
          >
            <span className="help-tab-icon">💻</span>
            {content.tabDesktop || "Desktop"}
          </button>
          <button 
            className={`help-tab ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveTab('mobile')}
            role="tab"
            aria-selected={activeTab === 'mobile'}
          >
            <span className="help-tab-icon">📱</span>
            {content.tabMobile || "Mobile"}
          </button>
          <button 
            className={`help-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            role="tab"
            aria-selected={activeTab === 'about'}
          >
            <span className="help-tab-icon">ℹ️</span>
            {content.tabAbout || "À propos"}
          </button>
        </div>

        {/* Content */}
        <div className="help-modal-content custom-scrollbar">
          {activeTab === 'desktop' && (
            <div className="help-steps-list">
              <div className="help-step-card group">
                <div className="help-step-icon">🎛️</div>
                <div className="help-step-text">
                  <h3>{content.step1Title || "Choisir un mode"}</h3>
                  <p>{content.step1Desc || "Studio pour composer, Dictionnaire pour explorer gammes et accords"}</p>
                </div>
              </div>
              <div className="help-step-card group">
                <div className="help-step-icon">🎹</div>
                <div className="help-step-text">
                  <h3>{content.step2Title || "Naviguer le clavier"}</h3>
                  <p>{content.step2Desc || "Faites glisser le scrubber sous le piano pour changer d'octave"}</p>
                </div>
              </div>
              <div className="help-step-card group">
                <div className="help-step-icon">🎸</div>
                <div className="help-step-text">
                  <h3>{content.step3Title || "Naviguer le manche"}</h3>
                  <p>{content.step3Desc || "Utilisez les flèches Position ou faites glisser le scrubber"}</p>
                </div>
              </div>
              <div className="help-step-card group">
                <div className="help-step-icon">⬅️</div>
                <div className="help-step-text">
                  <h3>{content.step4Title || "Menu latéral"}</h3>
                  <p>{content.step4Desc || "Repliez-le avec ‹ pour plus d'espace"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="help-steps-list">
              <div className="help-step-card group">
                <div className="help-step-icon">👇</div>
                <div className="help-step-text">
                  <h3>{content.mob1Title || "Navigation bas de page"}</h3>
                  <p>{content.mob1Desc || "Utilisez Studio / Dict / Play / Menu en bas de l'écran"}</p>
                </div>
              </div>
              <div className="help-step-card group">
                <div className="help-step-icon">🔄</div>
                <div className="help-step-text">
                  <h3>{content.mob2Title || "Mode paysage"}</h3>
                  <p>{content.mob2Desc || "Tournez l'appareil pour voir les instruments en mode étendu"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="help-about-section">
              <div className="help-about-logo">🎵</div>
              <h3>VisualMusic Coach</h3>
              <p className="help-about-version">v3.0 - 2026</p>
              <p className="help-about-desc">Conçu pour simplifier l'apprentissage de l'harmonie et de la composition sur guitare, basse et piano.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="help-modal-footer">
          <button className="help-modal-close-btn" onClick={onClose}>
            {content.closeBtn || "Fermer"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;
