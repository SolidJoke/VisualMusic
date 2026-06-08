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

  if (!isOpen) return null;

  const content = txt.helpModal || {};

  return (
    <div className="help-modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="help-modal-content" onClick={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>❓ {content.title || "Guide d'utilisation"}</h2>
          <button className="btn-close-modal" onClick={onClose} aria-label={content.closeBtn || "Fermer"}>✕</button>
        </div>
        
        <div className="help-modal-tabs">
          <button 
            className={`help-tab ${activeTab === 'desktop' ? 'active' : ''}`}
            onClick={() => setActiveTab('desktop')}
          >
            {content.tabDesktop || "Desktop"}
          </button>
          <button 
            className={`help-tab ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveTab('mobile')}
          >
            {content.tabMobile || "Mobile"}
          </button>
          <button 
            className={`help-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            {content.tabAbout || "À propos"}
          </button>
        </div>

        <div className="help-modal-body">
          {activeTab === 'desktop' && (
            <div className="help-steps-list">
              <div className="help-step">
                <span className="help-step-icon">🎛️</span>
                <div className="help-step-text">
                  <h3>{content.step1Title || "Choisir un mode"}</h3>
                  <p>{content.step1Desc || "Studio pour composer, Dictionnaire pour explorer gammes et accords"}</p>
                </div>
              </div>
              <div className="help-step">
                <span className="help-step-icon">🎹</span>
                <div className="help-step-text">
                  <h3>{content.step2Title || "Naviguer le clavier"}</h3>
                  <p>{content.step2Desc || "Faites glisser le scrubber sous le piano pour changer d'octave"}</p>
                </div>
              </div>
              <div className="help-step">
                <span className="help-step-icon">🎸</span>
                <div className="help-step-text">
                  <h3>{content.step3Title || "Naviguer le manche"}</h3>
                  <p>{content.step3Desc || "Utilisez les flèches Position ou faites glisser le scrubber"}</p>
                </div>
              </div>
              <div className="help-step">
                <span className="help-step-icon">📐</span>
                <div className="help-step-text">
                  <h3>{content.step4Title || "Menu latéral"}</h3>
                  <p>{content.step4Desc || "Repliez-le avec ‹ pour profiter d'un espace de travail maximal"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="help-steps-list">
              <div className="help-step">
                <span className="help-step-icon">👆</span>
                <div className="help-step-text">
                  <h3>{content.mob1Title || "Navigation bas de page"}</h3>
                  <p>{content.mob1Desc || "Passez du Studio au Dictionnaire via la barre d'outils en bas de l'écran"}</p>
                </div>
              </div>
              <div className="help-step">
                <span className="help-step-icon">🔄</span>
                <div className="help-step-text">
                  <h3>{content.mob2Title || "Mode paysage"}</h3>
                  <p>{content.mob2Desc || "Tournez l'appareil à l'horizontale pour déployer les instruments"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="help-about-section">
              <h3>VisualMusic Coach</h3>
              <p>v3.0 - 2026</p>
              <p>Conçu pour simplifier l'apprentissage de l'harmonie et de la composition sur guitare, basse et piano.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
