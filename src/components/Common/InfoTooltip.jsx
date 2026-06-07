import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './InfoTooltip.css';

/**
 * InfoTooltip - A small '?' icon that reveals a glassmorphic tooltip on hover.
 * Uses a Portal to render at the document body level to prevent overflow clipping.
 */
const InfoTooltip = ({ text }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY - 10, // 10px above the icon
        left: rect.left + window.scrollX + rect.width / 2
      });
    }
    setIsHovered(true);
  };

  return (
    <div 
      className="info-tooltip-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span ref={iconRef} className="info-tooltip-icon">?</span>
      
      {isHovered && createPortal(
        <div 
          className="info-tooltip-popin"
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translate(-50%, -100%)',
            margin: 0
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </div>
  );
};

export default InfoTooltip;
