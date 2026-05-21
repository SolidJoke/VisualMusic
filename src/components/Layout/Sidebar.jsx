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

  return (
    <div className={`app-sidebar ${isOpen ? 'is-open' : 'is-closed'} theme-${uiTheme}`}>
      {/* ── Collapse toggle ── */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={isOpen ? (txt.sidebar?.closePanel || 'Fermer le panneau') : (txt.sidebar?.openPanel || 'Ouvrir le panneau')}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      {/* ── Rail icons (visible only when closed) ── */}
      <div className="sidebar-rail-icons" aria-hidden="true">
        <span className="rail-icon" title={appMode === 'studio' ? (txt.sidebar?.studio || 'Studio') : (txt.sidebar?.dictionary || 'Dictionary')}>
          {appMode === 'studio' ? '🎹' : '📖'}
        </span>
        {isPlaying && (
          <span className={`rail-icon is-playing`} title={txt.sidebar?.nowPlaying || "En lecture"}>⏵</span>
        )}
      </div>

      {/* ── Fixed header (always visible when open) ── */}
      <div className="sidebar-fixed-header">
        {/* Mode selector */}
        <div className="sidebar-mode-row">
          <button
            onClick={() => setAppMode('studio')}
            className={`btn-premium${appMode === 'studio' ? ' active' : ''}`}
            data-testid="btn-mode-studio"
          >
            {txt.studioMode || '🎹 Studio'}
          </button>
          <button
            onClick={() => setAppMode('dictionary')}
            className={`btn-premium${appMode === 'dictionary' ? ' active' : ''}`}
            data-testid="btn-mode-dictionary"
          >
            {txt.dictMode || '📖 Dictionnaire'}
          </button>
        </div>

        {/* Play + BPM (Studio only) */}
        {appMode !== 'dictionary' && (
          <div className="sidebar-play-row">
            <button
              onClick={togglePlayback}
              className={`btn-playback-premium ${isPlaying ? 'stop' : 'play'}`}
            >
              <div className="btn-playback-icon" />
              <span>{isPlaying ? (txt.stopAudio || '■ Stop') : (txt.enableAudio || '▶ Play')}</span>
            </button>

            {/* BPM inline badge */}
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
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="sidebar-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
