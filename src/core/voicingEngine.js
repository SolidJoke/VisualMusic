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

  // For piano with MIDI array, also check muddy bass for arrays
  if ((instrument === 'guitar' || instrument === 'bass') && Array.isArray(voicing)) {
    const muddyResult = _checkMuddyBass(voicing);
    if (muddyResult) issues.push(muddyResult);
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
  for (let octave = 3; octave <= 5; octave++) {
    for (let inv = 0; inv < noteCount; inv++) {
      const notes = [];
      for (let i = 0; i < noteCount; i++) {
        const idx = (inv + i) % noteCount;
        let pitch = octave * 12 + rootValue + intervals[idx];
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
        const inversionName = _inversionName(inv, noteCount);
        suggestions.push({
          label: `${inversionName} (Octave ${octave})`,
          notes,
          span: spanMidi,
          instrument,
        });
      } else if ((instrument === 'guitar' || instrument === 'bass') && spanMidi <= GUITAR_SPAN_SEMITONE_LIMIT) {
        const inversionName = _inversionName(inv, noteCount);
        suggestions.push({
          label: `${inversionName} (Octave ${octave})`,
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
    message: `Écart de ${span} frettes — difficile pour une main de taille standard (max recommandé : ${GUITAR_MAX_SPAN}).`,
    rule: 'Un écart supérieur à 4 frettes est acrobatique. Considérez une inversion plus proche.',
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

  const intervalName = _semitoneIntervalName(interval);
  return {
    type: VOICING_ISSUE_TYPES.MUDDY_BASS,
    severity: 'warning',
    message: `Intervalle de ${intervalName} entre les deux notes les plus graves — risque de sonorité "bouillonnante" en dessous de Do3.`,
    rule: 'Règle de la série harmonique : dans les graves, les harmoniques se chevauchent. Espacez les intervalles dans le registre grave (idéalement une 5te ou une octave).',
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
    message: `${midiNotes.length} notes simultanées — impossible à jouer d'une seule main (max ${PIANO_MAX_NOTES}).`,
    rule: 'Un pianiste ne peut physiquement couvrir que 6 notes maximum avec une main. Répartissez les notes sur les deux mains ou supprimez des doublons.',
  };
}

/**
 * Human-readable inversion name.
 * @param {number} invIndex - 0 = root position, 1 = 1st inversion, etc.
 * @param {number} noteCount
 * @returns {string}
 */
function _inversionName(invIndex, noteCount) {
  const names = ['Position fondamentale', '1ère inversion', '2ème inversion', '3ème inversion'];
  return names[invIndex] || `${invIndex}ème inversion`;
}

/**
 * Human-readable semitone interval name.
 * @param {number} semitones
 * @returns {string}
 */
function _semitoneIntervalName(semitones) {
  const names = {
    0: 'unisson',
    1: '2nde mineure (demi-ton)',
    2: '2nde majeure (ton)',
    3: '3ce mineure',
    4: '3ce majeure',
    5: '4te juste',
    6: 'triton',
    7: '5te juste',
    8: '6te mineure',
    9: '6te majeure',
    10: '7ème mineure',
    11: '7ème majeure',
    12: 'octave',
  };
  return names[semitones] || `${semitones} demi-tons`;
}
