import React from 'react';
import './DualToggle.css';

const DualToggle = ({ value, options, onChange }) => {
  const activeIndex = options.findIndex(opt => opt.value === value);
  
  return (
    <div className="dual-toggle-container">
      <div className="dual-toggle-slider" onClick={() => {
        const nextIdx = (activeIndex + 1) % options.length;
        onChange(options[nextIdx].value);
      }}>
        <div 
          className="dual-toggle-handle" 
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {options.map((opt, idx) => (
          <div 
            key={opt.value}
            className={`dual-toggle-option ${activeIndex === idx ? 'active' : ''}`}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DualToggle;
