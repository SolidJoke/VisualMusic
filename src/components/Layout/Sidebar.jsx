import React, { useRef, useState, useEffect } from 'react';
import './Sidebar.css';

/**
 * Sidebar layout component.
 *
 * Fixed header always visible (even when scrolled):
 *   - Mode selector (Studio / Dictionary)
 *   - Play/Stop button (Studio only)
 *   - BPM badge (clickable inline editor, Studio only)
 *
 * Rail icons visible when sidebar is collapsed:
 *   - Mode icon  🎹 / 📖
 *   - Playing indicator ⏵ (animated)
 *
 * @param {object} props
 * @param {boolean}  props.isOpen
 * @param {function} props.toggleSidebar
 * @param {string}   props.uiTheme
 * @param {string}   props.appMode        - 'studio' | 'dictionary'
 * @param {function} props.setAppMode
 * @param {boolean}  props.isPlaying
 * @param {function} props.togglePlayback
 * @param {number}   props.currentBpm
 * @param {function} props.handleBpmChange - receives synthetic event { target: { value } }
 * @param {object}   props.txt             - i18n strings
 * @param {React.ReactNode} props.children
 */
const Sidebar = ({
  isOpen,
  toggleSidebar,
  uiTheme,
  appMode,
  setAppMode,
  isPlaying,
  togglePlayback,
  playDictionaryAudio,
  currentBpm,
  handleBpmChange,
  txt = {},
  children,
}) => {
  const contentRef = useRef(null);
  const [bpmEditing, setBpmEditing] = useState(false);
  const [bpmInputVal, setBpmInputVal] = useState(currentBpm);
  const bpmInputRef = useRef(null);

  // Scroll to top when mode switches (guard against jsdom in tests)
  useEffect(() => {
    const el = contentRef.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [appMode]);

  // Keep local BPM value in sync
  useEffect(() => {
    setBpmInputVal(currentBpm);
  }, [currentBpm]);

  // Focus the BPM input when editing starts
  useEffect(() => {
    if (bpmEditing) bpmInputRef.current?.select();
  }, [bpmEditing]);

  const commitBpm = () => {
    setBpmEditing(false);
    const num = parseInt(bpmInputVal, 10);
    if (!isNaN(num) && num >= 60 && num <= 200) {
      handleBpmChange({ target: { value: num } });
    } else {
      setBpmInputVal(currentBpm); // revert on invalid
    }
  };

  const handlePlayClick = () => {
    if (appMode === 'dictionary' && playDictionaryAudio) {
      playDictionaryAudio();
    } else if (togglePlayback) {
      togglePlayback();
    }
  };

  return (
    <div className={`app-sidebar ${isOpen ? 'is-open' : 'is-closed'} theme-${uiTheme}`}>
      <button 
        className="sidebar-toggle" 
        onClick={toggleSidebar} 
        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isOpen ? '‹' : '›'}
      </button>

      {/* ── Rail icons (visible only when closed) — clickable ── */}
      <div className="sidebar-rail-icons">
        <button
          className={`rail-icon-btn${appMode === 'studio' ? ' active' : ''}`}
          onClick={() => setAppMode('studio')}
          title={txt.sidebar?.studio || 'Studio'}
          aria-label="Mode Studio"
        >🎹</button>
        <button
          className={`rail-icon-btn${appMode === 'dictionary' ? ' active' : ''}`}
          onClick={() => setAppMode('dictionary')}
          title={txt.sidebar?.dictionary || 'Dictionnaire'}
          aria-label="Mode Dictionnaire"
        >📖</button>
        <button
          className={`rail-icon-btn btn-play-rail${isPlaying ? ' is-playing' : ''}`}
          onClick={handlePlayClick}
          title={isPlaying ? (txt.sidebar?.stop || 'Stop') : (txt.sidebar?.play || 'Play')}
          aria-label={isPlaying ? 'Stop' : 'Play'}
        >{isPlaying ? '⏹' : '▶'}</button>
      </div>

      {/* ── Fixed header (always visible when open) ── */}
      <div className="sidebar-fixed-header">
        <div className="sidebar-header-grid">
          {/* Mode selectors */}
          <button
            onClick={() => setAppMode('studio')}
            className={`btn-premium${appMode === 'studio' ? ' active' : ''}`}
            data-testid="btn-mode-studio"
          >
            Studio
          </button>
          <button
            onClick={() => setAppMode('dictionary')}
            className={`btn-premium${appMode === 'dictionary' ? ' active' : ''}`}
            data-testid="btn-mode-dictionary"
          >
            Dictionnaire
          </button>

          {/* Play + BPM */}
          <button
            onClick={handlePlayClick}
            className={`btn-playback-premium ${isPlaying ? 'stop' : 'play'}`}
          >
            {isPlaying ? '■ Stop' : '▶ Play'}
          </button>

          <div
            className="bpm-badge"
            onClick={() => !bpmEditing && setBpmEditing(true)}
            title={txt.sidebar?.clickToEditBpm || "Cliquer pour modifier le BPM"}
          >
            ♩{' '}
            {bpmEditing ? (
              <input
                ref={bpmInputRef}
                type="number"
                min="60"
                max="200"
                value={bpmInputVal}
                onChange={(e) => setBpmInputVal(e.target.value)}
                onBlur={commitBpm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitBpm();
                  if (e.key === 'Escape') { setBpmEditing(false); setBpmInputVal(currentBpm); }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{currentBpm}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="sidebar-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
