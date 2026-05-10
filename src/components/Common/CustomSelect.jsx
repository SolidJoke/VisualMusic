import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

/**
 * CustomSelect — A replacement for <select> that expands into a block.
 * Props:
 * - options: Array of { value, label } or grouped options { label, items: [ {value, label}, ... ] }
 * - value: Current value
 * - onChange: Callback function
 * - placeholder: Default text if no value
 * - theme: 'vintage' | 'modern'
 */
const CustomSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Sélectionner...", 
  theme = 'modern', 
  className = "",
  "data-testid": testId 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const getLabel = (val) => {
    for (const opt of options) {
      if (opt.items) {
        const sub = opt.items.find(i => i.value === val);
        if (sub) return sub.label;
      } else if (opt.value === val) {
        return opt.label;
      }
    }
    return placeholder;
  };

  return (
    <div 
      className={`custom-select-container ${theme}-select ${isOpen ? 'is-open' : ''} ${className}`} 
      ref={containerRef}
    >
      {/* Hidden native select for testing and accessibility */}
      <select 
        data-testid={testId}
        value={value} 
        onChange={(e) => handleSelect(isNaN(e.target.value) ? e.target.value : Number(e.target.value))}
        style={{ display: 'none' }}
      >
        {options.map((opt, i) => (
          opt.items ? (
            <optgroup key={i} label={opt.label}>
              {opt.items.map(sub => <option key={sub.value} value={sub.value}>{sub.label}</option>)}
            </optgroup>
          ) : (
            <option key={i} value={opt.value}>{opt.label}</option>
          )
        ))}
      </select>

      <div className="custom-select-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="current-value">{getLabel(value)}</span>
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="custom-select-body">
          {options.map((opt, idx) => (
            <React.Fragment key={idx}>
              {opt.items ? (
                <div className="opt-group">
                  <div className="opt-group-label">{opt.label}</div>
                  {opt.items.map(sub => (
                    <div 
                      key={sub.value} 
                      className={`select-item ${sub.value === value ? 'selected' : ''}`}
                      onClick={() => handleSelect(sub.value)}
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              ) : (
                <div 
                  className={`select-item ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
