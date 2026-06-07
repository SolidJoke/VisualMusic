import React, { useState } from 'react';
import './InfoTooltip.css';

/**
 * InfoTooltip - A small '?' icon that reveals a glassmorphic tooltip on hover.
 * Position is relatively handled, but the tooltip itself pops out.
 */
const InfoTooltip = ({ text }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="info-tooltip-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="info-tooltip-icon">?</span>
      
      {isHovered && (
        <div className="info-tooltip-popin">
          {text}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
