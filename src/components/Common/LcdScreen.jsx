import React from 'react';

const LcdScreen = ({ children, title, className = "" }) => {
  return (
    <div className={`lcd-display ${className}`}>
      {title && (
        <div style={{ 
          fontSize: '0.65rem', 
          textTransform: 'uppercase', 
          marginBottom: '4px', 
          opacity: 0.7,
          letterSpacing: '0.1em'
        }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
        {children}
      </div>
    </div>
  );
};

export default LcdScreen;
