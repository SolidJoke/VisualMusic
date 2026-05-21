// src/core/voicingEngine.js
//
// Analyses voicing playability and suggests corrections.
// Pure logic — no React, no side effects.
// Works with:
//   - guitar: fingeringMap objects { [stringIndex]: { [fret]: fingerLabel } }
//   - piano/bass: arrays of absolute MIDI note numbers

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum fret span considered playable on guitar/bass (standard hand stretch). */
const GUITAR_MAX_SPAN = 4;

/** Maximum simultaneous notes considered playable on a single hand (piano). */
const PIANO_MAX_NOTES = 6;

/**
 * Threshold below which close intervals in the bass cause "muddy" sound.
 * MIDI note 48 = C3. Notes below this are considered "bass register".
 */
const BASS_REGISTER_MIDI_THRESHOLD = 48;

/**
 * Maximum interval (in semitones) between adjacent bass notes before flagging MUDDY_BASS.
 * A minor 6th (8 semitones) or less is considered "too close" in the bass register.
 * Perfect 5th (7) is OK; Minor 6th (8) is the boundary. We flag anything <= 7 except perfect 5th?
 * Musical rule: unisons, seconds, thirds, tritones in the bass = muddy.
 * Safe intervals in the bass: perfect 4th (5), perfect 5th (7), octave (12).
 * Threshold: flag intervals < 5 (seconds and thirds) as muddy.
 */
const MUDDY_BASS_MAX_INTERVAL = 4; // flag intervals of 1,2,3,4 semitones (min 2nd to maj 3rd)

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enum-like object of voicing issue type identifiers.
 * Used by consumers to filter or display issues by type.
 */
export const VOICING_ISSUE_TYPES = {
  SPAN_TOO_WIDE:      'SPAN_TOO_WIDE',
  MUDDY_BASS:         'MUDDY_BASS',
  UNPLAYABLE_STRETCH: 'UNPLAYABLE_STRETCH',
};

/**
 * Analyses a voicing for playability issues.
 *
 * @param {Object|number[]} voicing
 *   - For 'guitar' or 'bass': a fingeringMap object `{ [stringIndex]: { [fret]: fingerLabel } }`
 *     as produced by `fingeringLogic.js`.
 *   - For 'piano': an array of absolute MIDI note numbers `number[]`.
 * @param {'guitar'|'bass'|'piano'} instrument
 * @returns {{ isPlayable: boolean, issues: VoicingIssue[], suggestions: ReVoicingSuggestion[] }}
 */
export function analyzeVoicingRules(voicing, instrument) {
  const issues = [];

  if (instrument === 'guitar' || instrument === 'bass') {
    const spanResult = _checkSpan(voicing);
    if (spanResult) issues.push(spanResult);
  }

  if (instrument === 'piano') {
    const muddyResult = _checkMuddyBass(voicing);
    if (muddyResult) issues.push(muddyResult);

    const stretchResult = _checkUnplayableStretch(voicing);
    if (stretchResult) issues.push(stretchResult);
  }

  const isPlayable = issues.every(i => i.severity !== 'error') &&
                     !issues.some(i => i.type === VOICING_ISSUE_TYPES.SPAN_TOO_WIDE);

  return { isPlayable, issues, suggestions: [] };
}

/**
 * Generates re-voicing suggestions for a chord (instrument-agnostic inversions).
 * Returns inversions of the chord that fit within playability constraints.
 *
 * @param {number} rootValue - Chromatic root (0-11, C=0)
 * @param {number[]} intervals - Semitone intervals from root (e.g. [0, 4, 7] for major triad)
 * @param {'guitar'|'bass'|'piano'} instrument
 * @returns {ReVoicingSuggestion[]}
 */
export function suggestReVoicing(rootValue, intervals, instrument) {
  const suggestions = [];
  const noteCount = intervals.length;

  // Generate all inversions across octaves 3–5
  // MIDI standard: C4 = 60 = (4+1)*12. Consistent with theory.js getChordNotesAbsolute.
  for (let octave = 3; octave <= 5; octave++) {
    for (let inv = 0; inv < noteCount; inv++) {
      const notes = [];
      for (let i = 0; i < noteCount; i++) {
        const idx = (inv + i) % noteCount;
        let pitch = (octave + 1) * 12 + rootValue + intervals[idx];
        // Ensure ascending
        if (notes.length > 0 && pitch <= notes[notes.length - 1]) pitch += 12;
        notes.push(pitch);
      }

      // Compute span in semitones (MIDI range across the chord)
      const spanMidi = notes[notes.length - 1] - notes[0];

      // For guitar/bass: rough fret estimate = span in semitones (1 semitone ≈ 1 fret on guitar)
      // We allow up to GUITAR_MAX_SPAN * 2 semitones to give some flexibility for closed voicings
      const GUITAR_SPAN_SEMITONE_LIMIT = GUITAR_MAX_SPAN * 2; // 8 semitones

      if (instrument === 'piano' && notes.length <= PIANO_MAX_NOTES) {
        suggestions.push({
          invIndex: inv,
          noteCount,
          octave,
          notes,
          span: spanMidi,
          instrument,
        });
      } else if ((instrument === 'guitar' || instrument === 'bass') && spanMidi <= GUITAR_SPAN_SEMITONE_LIMIT) {
        suggestions.push({
          invIndex: inv,
          noteCount,
          octave,
          notes,
          span: spanMidi,
          instrument,
        });
      }
    }
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extracts all non-open, non-muted fret values from a fingeringMap.
 * @param {Object} fingeringMap
 * @returns {number[]} sorted fret values
 */
function _extractFrets(fingeringMap) {
  const frets = [];
  for (const stringIdx in fingeringMap) {
    const stringMap = fingeringMap[stringIdx];
    if (!stringMap) continue;

    // V2 Format Support
    if (stringMap.status !== undefined) {
      if (stringMap.status === 'played' && stringMap.fret > 0) {
        frets.push(stringMap.fret);
      }
      continue;
    }

    // Legacy Format Support
    for (const fretStr in stringMap) {
      const val = stringMap[fretStr];
      if (val !== 'X' && val !== 'O' && val !== undefined) {
        const fret = parseInt(fretStr, 10);
        if (fret > 0) frets.push(fret);
      }
    }
  }
  return frets.sort((a, b) => a - b);
}

/**
 * Checks fret span on a fingeringMap (guitar/bass).
 * @param {Object} fingeringMap
 * @returns {VoicingIssue|null}
 */
function _checkSpan(fingeringMap) {
  const frets = _extractFrets(fingeringMap);
  if (frets.length < 2) return null;

  const span = frets[frets.length - 1] - frets[0];
  if (span <= GUITAR_MAX_SPAN) return null;

  return {
    type: VOICING_ISSUE_TYPES.SPAN_TOO_WIDE,
    severity: 'warning',
    span,
    max: GUITAR_MAX_SPAN,
  };
}

/**
 * Checks for muddy bass (close intervals between the two lowest notes in bass register).
 * Works with arrays of MIDI note numbers.
 * @param {number[]} midiNotes
 * @returns {VoicingIssue|null}
 */
function _checkMuddyBass(midiNotes) {
  if (!Array.isArray(midiNotes) || midiNotes.length < 2) return null;

  const sorted = [...midiNotes].sort((a, b) => a - b);
  const lowest = sorted[0];
  const secondLowest = sorted[1];

  // Only flag if the two lowest notes are in the bass register
  if (lowest >= BASS_REGISTER_MIDI_THRESHOLD) return null;

  const interval = secondLowest - lowest;
  if (interval > MUDDY_BASS_MAX_INTERVAL) return null;

  return {
    type: VOICING_ISSUE_TYPES.MUDDY_BASS,
    severity: 'warning',
    interval,
  };
}

/**
 * Checks if a piano chord has too many notes to be played with one hand.
 * @param {number[]} midiNotes
 * @returns {VoicingIssue|null}
 */
function _checkUnplayableStretch(midiNotes) {
  if (!Array.isArray(midiNotes)) return null;
  if (midiNotes.length <= PIANO_MAX_NOTES) return null;

  return {
    type: VOICING_ISSUE_TYPES.UNPLAYABLE_STRETCH,
    severity: 'error',
    count: midiNotes.length,
    max: PIANO_MAX_NOTES,
  };
}

/**
 * Applies a shell voicing reduction to an array of MIDI notes.
 * Omits the perfect 5th (7 semitones from root) to lighten the chord,
 * prioritizing Root, 3rd, and 7th. Essential for Jazz voicings.
 * 
 * @param {number[]} midiNotes - Absolute MIDI notes of the chord
 * @param {number} rootMidi - The absolute MIDI note of the root (used as reference)
 * @returns {number[]} Filtered array of MIDI notes
 */
export function applyShellVoicing(midiNotes, rootMidi) {
  if (!midiNotes || midiNotes.length <= 3) return midiNotes; // Don't reduce triads

  return midiNotes.filter(note => {
    const intervalFromRoot = ((note - rootMidi) % 12 + 12) % 12;
    // Omit perfect 5th (7 semitones)
    if (intervalFromRoot === 7) return false;
    return true;
  });
}
