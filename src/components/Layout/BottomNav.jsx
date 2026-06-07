import React, { useState } from 'react';
import './BottomNav.css';

/**
 * Mobile Bottom Navigation & Drawer component
 */
export default function BottomNav({
  appMode,
  setAppMode,
  isPlaying,
  togglePlayback,
  playDictionaryAudio,
  uiTheme,
  txt,
  children
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handlePlayClick = () => {
    if (appMode === 'dictionary' && playDictionaryAudio) {
      playDictionaryAudio();
    } else if (togglePlayback) {
      togglePlayback();
    }
  };

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  return (
    <>
      <div className={`bottom-nav-container glass theme-${uiTheme}`}>
        <button 
          className={`bottom-nav-btn ${appMode === 'studio' ? 'active' : ''}`}
          onClick={() => setAppMode('studio')}
        >
          <span className="icon">🎹</span>
          <span className="label">Studio</span>
        </button>

        <button 
          className={`bottom-nav-btn ${appMode === 'dictionary' ? 'active' : ''}`}
          onClick={() => setAppMode('dictionary')}
        >
          <span className="icon">📖</span>
          <span className="label">Dict</span>
        </button>

        <button 
          className={`bottom-nav-btn btn-play ${isPlaying ? 'is-playing' : ''}`}
          onClick={handlePlayClick}
        >
          <span className="icon">{isPlaying ? '■' : '▶'}</span>
          <span className="label">{isPlaying ? 'Stop' : 'Play'}</span>
        </button>

        <button 
          className={`bottom-nav-btn ${isDrawerOpen ? 'active' : ''}`}
          onClick={toggleDrawer}
          aria-label="Open menu"
          aria-expanded={isDrawerOpen}
        >
          <span className="icon">☰</span>
          <span className="label">Menu</span>
        </button>
      </div>

      <div 
        className={`mobile-drawer-overlay ${isDrawerOpen ? 'is-open' : ''}`}
        onClick={toggleDrawer}
      />
      <div className={`mobile-drawer theme-${uiTheme} ${isDrawerOpen ? 'is-open' : ''}`}>
        <div className="drawer-header">
          <h3>Menu</h3>
          <button className="drawer-close-btn" aria-label="Close menu" onClick={toggleDrawer}>×</button>
        </div>
        <div className="drawer-content">
          {children}
        </div>
      </div>
    </>
  );
}
