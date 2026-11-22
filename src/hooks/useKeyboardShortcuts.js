// @ts-check
import { useEffect } from 'react';

/** Whether the focus sits in a place that types text (or picks from a list). */
function inTextField() {
  const el = /** @type {HTMLElement | null} */ (document.activeElement);
  const tag = el?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el?.closest?.('[contenteditable]:not([contenteditable="false"])'));
}

/**
 * Registers global keyboard shortcuts for the app.
 * Space = Play/Stop (studio mode only), S = Studio mode, D = Dictionary mode.
 * VMU-227: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z = redo (Studio only).
 * Disabled when focus is inside an input, textarea, select or editable text.
 * Space leaves the "hear the original" button alone: it holds it, it does not
 * start the music (the button is marked `data-hold-original`).
 * @param {Object} options
 * @param {string} options.appMode - Current app mode ('studio' or 'dictionary')
 * @param {Function} options.togglePlayback - Function to toggle playback
 * @param {Function} options.setAppMode - Function to switch app mode
 * @param {Function} [options.undo] - Undo the Studio's last change
 * @param {Function} [options.redo] - Redo it
 */
export function useKeyboardShortcuts({ appMode, togglePlayback, setAppMode, undo, redo }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (inTextField()) return;
      const mod = (e.ctrlKey || e.metaKey) && !e.altKey;
      if (mod && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
        if (appMode === 'dictionary') return;
        const isRedo = e.key === 'y' || e.key === 'Y' || e.shiftKey;
        const action = isRedo ? redo : undo;
        if (action) {
          e.preventDefault();
          action();
        }
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (document.activeElement?.closest?.('[data-hold-original]')) return;
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
  }, [appMode, togglePlayback, setAppMode, undo, redo]);
}
