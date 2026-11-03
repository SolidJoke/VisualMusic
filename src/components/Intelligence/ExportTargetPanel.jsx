import React from 'react';
import HelpButton from './HelpButton';

/**
 * ExportTargetPanel — the footer of the Math & Rythmes window (VMU-195-B).
 * The instrument choice moved into the phrase ("joués par [Grosse caisse ▾]");
 * what stays here is what the footer says: "● en direct sur …", "Envoyer
 * maintenant", "▶ Écouter / ■ Arrêter" and "↺ Rythme du style".
 */
export default function ExportTargetPanel({
  txt,
  exportTarget = 'Kick',
  showExportSuccess,
  handleExport,
  handleClearOverrides,
  isPlaying = false,
  togglePlayback
}) {
  // The instrument's name for the live note, first letter lowercased
  // ("en direct sur grosse caisse").
  const labels = {
    Kick: txt.kick,
    Snare: txt.snare,
    Hat: txt.hat,
    Bass: txt.bass,
    Chords: txt.chordsOut,
  };
  const name = labels[exportTarget] || exportTarget;
  const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  // Statically addressed so the CSS-variable scan sees each --seq-* name.
  const SEQ_TOKEN = {
    Kick: 'var(--seq-kick)',
    Snare: 'var(--seq-snare)',
    Hat: 'var(--seq-hat)',
    Bass: 'var(--seq-bass)',
    Chords: 'var(--seq-chords)',
  };
  const trackToken = SEQ_TOKEN[exportTarget] || SEQ_TOKEN.Kick;

  return (
    <div className="panel-section export-section export-footer" data-testid="comp-export">
      <p className="live-note" data-testid="comp-live-note" style={{ '--c': trackToken }}>
        <i className="live-dot" aria-hidden="true" /> {txt.liveOn} {lower(name)}
      </p>

      {togglePlayback && (
        <button
          type="button"
          onClick={togglePlayback}
          data-testid="comp-listen"
          className="retro-btn listen-btn"
        >
          {isPlaying ? txt.stopListen : txt.listen}
        </button>
      )}

      <button
        onClick={handleExport}
        data-testid="comp-send"
        title={txt.helpExport}
        className={`retro-btn export-btn ${showExportSuccess ? 'success' : ''}`}
      >
        {showExportSuccess ? (txt.exportSuccess || 'Sent!') : (txt.exportBtn || 'Send now')}
      </button>

      <HelpButton id="export" name={txt.exportBtn} help={txt.helpExport} helpLabel={txt.help} />

      <button
        onClick={handleClearOverrides}
        data-testid="comp-reset"
        className="retro-btn clear-btn"
      >
        {txt.resetAll || '↺ Rythme du style'}
      </button>
    </div>
  );
}
