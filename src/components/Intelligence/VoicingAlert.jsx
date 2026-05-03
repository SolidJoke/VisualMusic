// src/components/Intelligence/VoicingAlert.jsx
//
// Non-blocking voicing analysis banner.
// Displays issues detected by voicingEngine.analyzeVoicingRules()
// and suggests re-voicings when applicable.
//
// Props:
//   fingeringMap  {Object|null}   Guitar/Bass fingeringMap (from fingeringLogic.js)
//   midiNotes     {number[]|null} Piano MIDI note array
//   instrument    {'guitar'|'bass'|'piano'}
//   rootValue     {number}        Chromatic root 0-11 (for re-voicing suggestions)
//   intervals     {number[]|null} Chord intervals (for re-voicing suggestions)
//
// Usage (guitar):
//   <VoicingAlert fingeringMap={currentFingering} instrument="guitar" rootValue={rootValue} intervals={chordIntervals} />
//
// Usage (piano):
//   <VoicingAlert midiNotes={[60,64,67]} instrument="piano" />

import React, { useMemo, useState } from 'react';
import { analyzeVoicingRules, suggestReVoicing } from '../../core/voicingEngine.js';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IssueTag({ issue }) {
  const severityColor = issue.severity === 'error'
    ? 'var(--color-alert-error, #ff6b6b)'
    : 'var(--color-alert-warning, #ffd166)';

  return (
    <div
      className="voicing-alert__issue"
      title={issue.rule}
      style={{ borderLeft: `3px solid ${severityColor}` }}
    >
      <span className="voicing-alert__issue-icon">
        {issue.severity === 'error' ? '⛔' : '⚠️'}
      </span>
      <span className="voicing-alert__issue-message">{issue.message}</span>
    </div>
  );
}

function SuggestionList({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="voicing-alert__suggestions">
      <span className="voicing-alert__suggestions-label">Voicings suggérés :</span>
      <div className="voicing-alert__suggestions-list">
        {suggestions.slice(0, 3).map((s, i) => (
          <span key={i} className="voicing-alert__suggestion-chip">
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VoicingAlert({ fingeringMap, midiNotes, instrument, rootValue, intervals }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Determine the voicing data to analyse
  const voicingData = useMemo(() => {
    if (instrument === 'piano' && midiNotes) return midiNotes;
    if (fingeringMap) return fingeringMap;
    return null;
  }, [instrument, midiNotes, fingeringMap]);

  // Run analysis
  const analysis = useMemo(() => {
    if (!voicingData || !instrument) return null;
    return analyzeVoicingRules(voicingData, instrument);
  }, [voicingData, instrument]);

  // Generate suggestions when there are issues and interval data is available
  const suggestions = useMemo(() => {
    if (!analysis || analysis.isPlayable || !intervals || rootValue == null) return [];
    return suggestReVoicing(rootValue, intervals, instrument);
  }, [analysis, intervals, rootValue, instrument]);

  // Don't render if no issues, or dismissed
  if (!analysis || analysis.issues.length === 0 || isDismissed) return null;

  const hasCritical = analysis.issues.some(i => i.severity === 'error');

  return (
    <div
      className={`voicing-alert ${hasCritical ? 'voicing-alert--error' : 'voicing-alert--warning'}`}
      role="alert"
      aria-live="polite"
      id="voicing-alert-banner"
    >
      {/* Header row */}
      <div className="voicing-alert__header">
        <span className="voicing-alert__title">
          {hasCritical ? '⛔ Voicing impossible' : '⚠️ Voicing difficile'}
        </span>

        <div className="voicing-alert__controls">
          <button
            className="voicing-alert__toggle"
            onClick={() => setIsExpanded(e => !e)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Réduire les détails' : 'Voir les détails'}
          >
            {isExpanded ? '▲ Réduire' : '▼ Détails'}
          </button>
          <button
            className="voicing-alert__dismiss"
            onClick={() => setIsDismissed(true)}
            aria-label="Ignorer cette alerte"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div className="voicing-alert__body">
          {analysis.issues.map((issue, i) => (
            <IssueTag key={i} issue={issue} />
          ))}
          <SuggestionList suggestions={suggestions} />
        </div>
      )}
    </div>
  );
}
