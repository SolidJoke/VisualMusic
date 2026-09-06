import { useEffect } from 'react';

/**
 * Registers global keyboard shortcuts for the app.
 * Space = Play/Stop (studio mode only), S = Studio mode, D = Dictionary mode.
 * Disabled when focus is inside an input, textarea, or select.
 * @param {Object} options
 * @param {string} options.appMode - Current app mode ('studio' or 'dictionary')
 * @param {Function} options.togglePlayback - Function to toggle playback
 * @param {Function} options.setAppMode - Function to switch app mode
 */
export function useKeyboardShortcuts({ appMode, togglePlayback, setAppMode }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (appMode !== 'dictionary') togglePlayback();
      } else if (e.key === 's' || e.key === 'S') {
        setAppMode('studio');
      } else if (e.key === 'd' || e.key === 'D') {
        setAppMode('dictionary');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, togglePlayback, setAppMode]);
}