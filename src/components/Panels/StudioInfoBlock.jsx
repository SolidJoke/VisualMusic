import React, { useState } from 'react';
import './StudioInfoBlock.css';

const StudioInfoBlock = ({ txt, lang }) => {
  const [isOpen, setIsOpen] = useState(true);

  const content = {
    fr: {
      title: "ℹ️ Comprendre le Mode Harmonique",
      intro: "Ce mode transforme VisualMusic en un assistant de composition intelligent.",
      nnsTitle: "Système NNS (Nashville Number System)",
      nnsDesc: "Les chiffres (1, 4, 5...) représentent les degrés de la gamme. Cela permet de transposer une progression dans n'importe quelle tonalité instantanément.",
      skankTitle: "Variations Rythmiques",
      skankDesc: "Certains genres (comme le Reggae) jouent sur le contretemps. Le séquenceur s'adapte automatiquement au style choisi.",
      tips: "💡 Astuce : Cliquez sur un accord pour voir ses doigtés sur les manches."
    },
    en: {
      title: "ℹ️ Understanding Harmonic Mode",
      intro: "This mode turns VisualMusic into an intelligent composition assistant.",
      nnsTitle: "NNS (Nashville Number System)",
      nnsDesc: "Numbers (1, 4, 5...) represent scale degrees. This allows you to transpose a progression to any key instantly.",
      skankTitle: "Rhythmic Variations",
      skankDesc: "Some genres (like Reggae) play on the offbeat. The sequencer automatically adapts to the chosen style.",
      tips: "💡 Tip: Click a chord to see its fingerings on the fretboards."
    }
  };

  const t = content[lang] || content.en;

  return (
    <div className={`glass-panel studio-info-block ${isOpen ? 'is-open' : 'is-closed'}`}>
      <div className="info-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>{t.title}</h3>
        <span className="toggle-icon">{isOpen ? '−' : '+'}</span>
      </div>
      
      {isOpen && (
        <div className="info-content">
          <p className="intro">{t.intro}</p>
          <div className="info-section">
            <h4>{t.nnsTitle}</h4>
            <p>{t.nnsDesc}</p>
          </div>
          <div className="info-section">
            <h4>{t.skankTitle}</h4>
            <p>{t.skankDesc}</p>
          </div>
          <p className="tips">{t.tips}</p>
        </div>
      )}
    </div>
  );
};

export default StudioInfoBlock;
