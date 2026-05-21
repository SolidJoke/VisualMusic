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
import { useAppContext } from '../../context/AppContext';
import './VoicingAlert.css';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IssueTag({ issue, txt }) {
  const severityColor = issue.severity === 'error'
    ? 'var(--color-alert-error, #ff6b6b)'
    : 'var(--color-alert-warning, #ffd166)';

  const voicingTxt = txt?.voicing || {};
  const issueDef = voicingTxt.issues?.[issue.type];
  
  // Format message based on issue type
  let message = '';
  let rule = '';
  
  if (issueDef) {
    rule = issueDef.rule;
    if (issue.type === 'SPAN_TOO_WIDE') message = issueDef.message(issue.span, issue.max);
    else if (issue.type === 'MUDDY_BASS') {
      const intervalName = voicingTxt.intervals?.[issue.interval] || voicingTxt.intervals?.default?.(issue.interval);
      message = issueDef.message(intervalName);
    }
    else if (issue.type === 'UNPLAYABLE_STRETCH') message = issueDef.message(issue.count, issue.max);
  }

  return (
    <div
      className="voicing-alert__issue"
      title={rule}
      style={{ borderLeft: `3px solid ${severityColor}` }}
    >
      <span className="voicing-alert__issue-icon">
        {issue.severity === 'error' ? '⛔' : '⚠️'}
      </span>
      <span className="voicing-alert__issue-message">{message}</span>
    </div>
  );
}

function SuggestionList({ suggestions, txt }) {
  if (!suggestions || suggestions.length === 0) return null;
  const voicingTxt = txt?.voicing || {};

  return (
    <div className="voicing-alert__suggestions">
      <h4>{txt?.suggestedVoicings || "Suggested voicings:"}</h4>
      <div className="voicing-alert__suggestions-list">
        {suggestions.slice(0, 3).map((s, i) => {
          const invNameFn = voicingTxt.inversions?.[s.invIndex] || voicingTxt.inversions?.default;
          const label = invNameFn ? `${typeof invNameFn === 'function' ? invNameFn(s.invIndex) : invNameFn} (Octave ${s.octave})` : `Inv ${s.invIndex} (Octave ${s.octave})`;
          return (
            <span key={i} className="voicing-alert__suggestion-chip">
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function VoicingAlert({ fingeringMap, midiNotes, instrument, rootValue, intervals }) {
  const { txt } = useAppContext();
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
          {hasCritical ? (txt?.voicingImpossible || '⛔ Unplayable voicing') : (txt?.voicingDifficult || '⚠️ Difficult voicing')}
        </span>

        <div className="voicing-alert__controls">
          <button
            className="voicing-alert__toggle"
            onClick={() => setIsExpanded(e => !e)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? (txt?.collapseDetails || 'Collapse') : (txt?.expandDetails || 'Details')}
          >
            {isExpanded ? (txt?.collapseDetails || '▲ Collapse') : (txt?.expandDetails || '▼ Details')}
          </button>
          <button
            className="voicing-alert__dismiss"
            onClick={() => setIsDismissed(true)}
            aria-label={txt?.dismissAlert || "Dismiss this alert"}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div className="voicing-alert__body">
          {analysis.issues.map((issue, i) => (
            <IssueTag key={i} issue={issue} txt={txt} />
          ))}
          <SuggestionList suggestions={suggestions} txt={txt} />
        </div>
      )}
    </div>
  );
}
