import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './CustomSelect.css';

// VMU-142 — the open list is rendered through a portal into `document.body`,
// `position: fixed`, instead of as a `position: absolute` descendant of this
// component. A descendant cannot draw past an ancestor that clips
// (`.modal-container { overflow: hidden }` / `.modal-body { overflow-y:
// auto }`, Modal.css) no matter its z-index, which is why the list used to
// get cut off inside a popup (Gabriel's report). The field itself never
// moves; only the open panel is portaled.
const DROPDOWN_GAP = 10; // px between the field and the panel — matches the pre-portal `top: calc(100% + 10px)`
const VIEWPORT_MARGIN = 12; // px kept clear of the viewport edge
const MIN_OPEN_HEIGHT = 160; // below this much room, prefer flipping upward if there is more room above
const MAX_PANEL_HEIGHT = 500; // matches the pre-portal CSS `max-height: 500px`

// Computes where the portaled panel should sit, from the field's own
// viewport rect (`getBoundingClientRect`) — not from any scrolling ancestor,
// since the panel is `position: fixed` in the viewport. Flips upward when
// there isn't enough room below and there is more room above (never off
// bottom of the screen), and bounds the panel's height to whichever side it
// opens on, with internal scrolling (`.custom-select-body`'s own
// `overflow-y: auto`) for the rest.
function computeDropdownPosition(rect) {
  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom - DROPDOWN_GAP - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - DROPDOWN_GAP - VIEWPORT_MARGIN;
  const openUpward = spaceBelow < MIN_OPEN_HEIGHT && spaceAbove > spaceBelow;
  const available = openUpward ? spaceAbove : spaceBelow;
  return {
    left: rect.left + rect.width / 2,
    top: openUpward ? null : rect.bottom + DROPDOWN_GAP,
    bottom: openUpward ? viewportHeight - rect.top + DROPDOWN_GAP : null,
    maxHeight: Math.max(120, Math.min(MAX_PANEL_HEIGHT, available)),
    openUpward,
  };
}

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
  const [position, setPosition] = useState(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const bodyRef = useRef(null); // the portaled panel — no longer a DOM descendant of containerRef

  // Close when clicking outside — "outside" now means outside both the
  // closed-field container AND the portaled panel, since the panel is no
  // longer nested inside containerRef's DOM subtree.
  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideField = containerRef.current && containerRef.current.contains(event.target);
      const insidePanel = bodyRef.current && bodyRef.current.contains(event.target);
      if (!insideField && !insidePanel) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape, scroll and window resize close the panel (decision: reposition
  // is not attempted — the panel's coordinates are a snapshot of the field's
  // rect taken at open time, so a scroll/resize that could move the field
  // just closes it instead of tracking it). Scrolling *inside* the open
  // panel itself (its own `overflow-y: auto` list) must not close it.
  // Listeners are scoped to `isOpen` and always cleaned up — StrictMode
  // mounts effects twice in dev, so a missing cleanup here would double them.
  useEffect(() => {
    if (!isOpen) return undefined;
    const closeAndRefocus = () => {
      setIsOpen(false);
      headerRef.current?.focus();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeAndRefocus();
    };
    const handleScroll = (e) => {
      // e.target is a Node for an element/document scroll, but window.scroll
      // events can carry `window` itself as the target (e.g. dispatched
      // directly on window, as tests do) — `Node.contains` throws on a
      // non-Node argument, so guard it explicitly.
      if (e.target instanceof Node && bodyRef.current && bodyRef.current.contains(e.target)) return;
      closeAndRefocus();
    };
    const handleResize = () => closeAndRefocus();

    document.addEventListener('keydown', handleKeyDown);
    // capture: true — scroll does not bubble, so this is the only way to
    // observe it on an arbitrary ancestor (e.g. `.modal-body`) from here.
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const openDropdown = () => {
    if (headerRef.current) {
      setPosition(computeDropdownPosition(headerRef.current.getBoundingClientRect()));
    }
    setIsOpen(true);
  };
  const toggleDropdown = () => (isOpen ? setIsOpen(false) : openDropdown());
  const handleHeaderKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    }
  };

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
        value={value ?? ""} 
        onChange={(e) => {
          const val = e.target.value;
          handleSelect(val === "" ? null : (isNaN(val) ? val : Number(val)));
        }}
        style={{ display: 'none' }}
      >
        {options.map((opt, i) => (
          opt.items ? (
            <optgroup key={i} label={opt.label}>
              {opt.items.map(sub => (
                <option key={sub.value ?? "null"} value={sub.value ?? ""}>
                  {sub.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={i} value={opt.value ?? ""}>{opt.label}</option>
          )
        ))}
      </select>

      <div
        className="custom-select-header"
        ref={headerRef}
        onClick={toggleDropdown}
        onKeyDown={handleHeaderKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
      >
        <span className="current-value">{getLabel(value)}</span>
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && position && createPortal(
        <div
          ref={bodyRef}
          className={`custom-select-body ${theme}-select`}
          data-testid="custom-select-dropdown"
          data-open-direction={position.openUpward ? 'up' : 'down'}
          style={{
            position: 'fixed',
            left: `${position.left}px`,
            top: position.openUpward ? 'auto' : `${position.top}px`,
            bottom: position.openUpward ? `${position.bottom}px` : 'auto',
            maxHeight: `${position.maxHeight}px`,
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
