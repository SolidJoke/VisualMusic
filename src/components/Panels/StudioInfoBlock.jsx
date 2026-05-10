import React, { useState } from 'react';
import './StudioInfoBlock.css';

const StudioInfoBlock = ({ txt }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`glass-panel studio-info-block ${isOpen ? 'is-open' : 'is-closed'}`}>
      <div className="info-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>{txt.studioInfoTitle}</h3>
        <span className="toggle-icon">{isOpen ? '−' : '+'}</span>
      </div>
      
      {isOpen && (
        <div className="info-content">
          <p className="intro">{txt.studioInfoIntro}</p>
          <div className="info-section">
            <h4>{txt.studioInfoNnsTitle}</h4>
            <p>{txt.studioInfoNnsDesc}</p>
          </div>
          <div className="info-section">
            <h4>{txt.studioInfoSkankTitle}</h4>
            <p>{txt.studioInfoSkankDesc}</p>
          </div>
          <p className="tips">{txt.studioInfoTips}</p>
        </div>
      )}
    </div>
  );
};

export default StudioInfoBlock;
