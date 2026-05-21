// src/core/harmonyEngine.js
//
// Harmonic analysis and rule engine.
// Pure logic — no React, no side effects.
// Provides chord function identification, theory mode management,
// and Set Theory primitives (invisible to the user).

// ---------------------------------------------------------------------------
// Theory Modes (Classique vs Moderne)
// ---------------------------------------------------------------------------

/**
 * Available theory interpretation modes.
 * CLASSICAL: V7 must resolve to I.
 * MODERN: Chords of tension can be stable in context (Jazz, Debussy).
 */
export const THEORY_MODES = {
  CLASSICAL: 'classical',
  MODERN: 'modern',
};

// ---------------------------------------------------------------------------
// Chord Function (Tonic / Subdominant / Dominant)
// ---------------------------------------------------------------------------

/**
 * Returns the harmonic function of a chord identified by its NNS degree.
 * Based on tonal harmony: I=Tonic, IV=Subdominant, V=Dominant.
 *
 * @param {string} nns - Nashville Number System string, e.g. '1', '4', '5-', '5maj7'
 * @returns {'tonic'|'subdominant'|'dominant'|null} null for non-functional degrees (II, III, VI, VII)
 */
export function getChordFunction(nns) {
  if (!nns || typeof nns !== 'string') return null;
  const degree = _extractDegree(nns);
  if (degree === 1) return 'tonic';
  if (degree === 4) return 'subdominant';
  if (degree === 5) return 'dominant';
  return null;
}

/**
 * Determines whether a chord of this NNS degree requires resolution in the given mode.
 *
 * @param {string} nns - Nashville Number System string
 * @param {'classical'|'modern'} theoryMode
 * @returns {boolean}
 */
export function isResolutionRequired(nns, theoryMode) {
  if (theoryMode === THEORY_MODES.MODERN) return false;
  // Classical: Dominant chord (V, V7, V9, Vmaj7...) requires resolution to I
  return getChordFunction(nns) === 'dominant';
}

// ---------------------------------------------------------------------------
// Set Theory (Invisible to UI — feeds suggestion engines)
// ---------------------------------------------------------------------------

/**
 * Calculates the interval vector for a set of pitch classes.
 * An interval vector tallies how many times each interval class (1–6) appears.
 * Used internally for chord similarity, substitution suggestions, and tension scoring.
 *
 * Reference: Allen Forte, "The Structure of Atonal Music" (1973).
 *
 * @param {number[]} pitchClasses - Array of integers 0–11 (C=0, C#=1, ..., B=11)
 * @returns {number[]} Array of 6 counts: [m2/M7, M2/m7, m3/M6, M3/m6, P4/P5, TT]
 *
 * @example
 * getIntervalVector([0, 4, 7]) // C major → [0, 0, 1, 1, 1, 0]
 */
export function getIntervalVector(pitchClasses) {
  const vector = [0, 0, 0, 0, 0, 0];
  const pcs = pitchClasses.map(p => ((p % 12) + 12) % 12);

  for (let i = 0; i < pcs.length; i++) {
    for (let j = i + 1; j < pcs.length; j++) {
      const diff = Math.abs(pcs[i] - pcs[j]);
      const interval = Math.min(diff, 12 - diff); // interval class (1–6)
      if (interval > 0 && interval <= 6) {
        vector[interval - 1]++;
      }
    }
  }
  return vector;
}

/**
 * Computes a "dissonance score" from an interval vector.
 * Higher scores indicate more tension (more tritones, minor 2nds, etc.)
 * Used by the voicing alert system and the "Avocat du Diable" mode.
 *
 * Weights: TT(6)=3, m2(1)=2, M7(1)=2, m7(2)=1, m3(3)=0.5, ...
 *
 * @param {number[]} intervalVector - 6-element array from getIntervalVector()
 * @returns {number} dissonance score (higher = more dissonant)
 */
export function getDissonanceScore(intervalVector) {
  const weights = [2, 1, 0.5, 0.5, 0, 3]; // indices: m2, M2, m3, M3, P4, TT
  return intervalVector.reduce((sum, count, i) => sum + count * weights[i], 0);
}

/**
 * Converts chord intervals (from root) to pitch classes given a root.
 *
 * @param {number} rootValue - Chromatic root (0–11)
 * @param {number[]} intervals - Semitones from root, e.g. [0, 4, 7]
 * @returns {number[]} pitch classes (0–11)
 */
export function chordToPitchClasses(rootValue, intervals) {
  return intervals.map(i => ((rootValue + i) % 12 + 12) % 12);
}

// ---------------------------------------------------------------------------
// Song Structure Templates (EPIC-05 seed data)
// ---------------------------------------------------------------------------

/**
 * Structural templates for common musical forms.
 * Each section specifies its harmonic role and expected tension level.
 * Used by the Structure module to guide and alert the user.
 */
export const SONG_STRUCTURES = {
  ABA: {
    name: 'Ternaire (ABA)',
    description: "Exposition – Développement – Réexposition. Forme classique pour les ballades et la musique populaire.",
    sections: [
      { label: 'A', role: 'exposition',     tension: 'low',    harmonicHint: 'Tonique (I)',                nnsExpected: ['1'] },
      { label: 'B', role: 'development',    tension: 'high',   harmonicHint: 'Dominante (V) ou relative', nnsExpected: ['5', '6-'] },
      { label: 'A', role: 'recapitulation', tension: 'low',    harmonicHint: 'Retour Tonique (I)',         nnsExpected: ['1'] },
    ],
  },
  RONDO: {
    name: 'Rondo (ABACA)',
    description: "Thème principal A alternant avec des épisodes contrastés. Courant dans la musique baroque et classique.",
    sections: [
      { label: 'A', role: 'theme',   tension: 'low',    harmonicHint: 'Tonique (I)',         nnsExpected: ['1'] },
      { label: 'B', role: 'episode', tension: 'medium', harmonicHint: 'Sous-Dominante (IV)', nnsExpected: ['4'] },
      { label: 'A', role: 'theme',   tension: 'low',    harmonicHint: 'Tonique (I)',          nnsExpected: ['1'] },
      { label: 'C', role: 'episode', tension: 'high',   harmonicHint: 'Dominante (V)',        nnsExpected: ['5'] },
      { label: 'A', role: 'theme',   tension: 'low',    harmonicHint: 'Tonique (I)',          nnsExpected: ['1'] },
    ],
  },
  SONATA: {
    name: 'Forme Sonate',
    description: "Exposition de deux thèmes, développement conflictuel, réexposition résolue. Base de la symphonie classique.",
    sections: [
      { label: 'Exposition I',   role: 'first_theme',  tension: 'low',    harmonicHint: 'Tonique (I)',         nnsExpected: ['1'] },
      { label: 'Exposition II',  role: 'second_theme', tension: 'medium', harmonicHint: 'Dominante (V)',        nnsExpected: ['5'] },
      { label: 'Développement',  role: 'development',  tension: 'high',   harmonicHint: 'Modulatoire (libre)', nnsExpected: [] },
      { label: 'Réexposition',   role: 'recap',        tension: 'low',    harmonicHint: 'Retour Tonique (I)',  nnsExpected: ['1'] },
    ],
  },
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the numeric degree (1–7) from an NNS string.
 * @param {string} nns
 * @returns {number|null}
 */
function _extractDegree(nns) {
  const match = nns.match(/[1-7]/);
  return match ? parseInt(match[0], 10) : null;
}

// ---------------------------------------------------------------------------
// Inversion Detection (migrated from App.jsx)
// ---------------------------------------------------------------------------

/**
 * Detects the inversion of a chord based on the bass note (lowest sounding pitch).
 *
 * @param {number} bassNoteAbsolute - Absolute MIDI pitch of the lowest sounding note
 * @param {number} rootValue        - Chromatic root value (0–11)
 * @param {string} nns              - NNS string used to determine chord quality (minor/dim)
 * @returns {'root'|'first'|'second'|'unknown'}
 *
 * @example
 * getInversionType(60, 0, '1')   // C in bass of C major → 'root'
 * getInversionType(64, 0, '1')   // E in bass of C major → 'first'
 * getInversionType(67, 0, '1')   // G in bass of C major → 'second'
 */
export function getInversionType(bassNoteAbsolute, rootValue, nns) {
  const bassNoteClass = bassNoteAbsolute % 12;
  const isMinor = nns.includes('-') || nns.includes('m');
  const isDim   = nns.includes('°') || nns.includes('b5') || nns.includes('dim');

  const thirdVal = (rootValue + (isMinor || isDim ? 3 : 4)) % 12;
  const fifthVal  = (rootValue + (isDim ? 6 : 7)) % 12;

  if (bassNoteClass === rootValue) return 'root';
  if (bassNoteClass === thirdVal)  return 'first';
  if (bassNoteClass === fifthVal)  return 'second';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Chord Degree Label (migrated from App.jsx's inline getOrderLabel)
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable interval label for a chord tone.
 * Used to label piano keys (1, b3, 3, b5, 5, b7, 7, 9…).
 *
 * @param {number} index    - Position in the chord's semitone array (0 = root)
 * @param {number} semitone - Semitone distance from root
 * @returns {number|string}  e.g. 1, 'b3', 3, 'b5', 5, 'b7', 7, 9
 */
export function getChordIntervalLabel(index, semitone) {
  if (index === 0)    return 1;
  if (semitone === 2)  return '2';   // sus2 second
  if (semitone === 3)  return 'b3';
  if (semitone === 4)  return 3;
  if (semitone === 5)  return '4';   // sus4 fourth
  if (semitone === 6)  return 'b5';
  if (semitone === 7)  return 5;
  if (semitone === 10) return 'b7';
  if (semitone === 11) return 7;
  if (semitone > 12)   return 9;
  return index + 2; // fallback for aug5 and other edge cases
}

// ---------------------------------------------------------------------------
// Playability Score (G.4.3)
// ---------------------------------------------------------------------------

/**
 * Calculates a playability/complexity score for a chord progression.
 * Starts at 100 and applies penalties for non-diatonic chords, complex extensions, 
 * large harmonic leaps, and intrinsic dissonance.
 * 
 * @param {Array} progression - Array of chord objects (e.g. { nns, rootValue, dictType })
 * @returns {Object} { score, label, color, details }
 */
export function calculatePlayabilityScore(progression) {
  if (!progression || progression.length === 0) return { score: 100, label: "Vide", color: "#888", details: [] };

  let score = 100;
  let nonDiatonicCount = 0;
  let complexExtensionsCount = 0;
  let jumpPenaltyCount = 0;
  let totalDissonance = 0;
  let details = [];

  for (let i = 0; i < progression.length; i++) {
    const chord = progression[i];
    if (!chord) continue;

    // Support both Dictionary format (rootValue, dictType) and NNS format (rootNote, nns)
    const rootVal = chord.rootValue ?? (chord.rootNote ? chord.rootNote.value : 0);
    let type = chord.dictType || "";
    const nns = chord.nns || "";

    if (!type) {
      if (nns.includes('maj7')) type = 'chord_maj7';
      else if (nns.includes('m7b5')) type = 'chord_m7b5';
      else if (nns.includes('dim7')) type = 'chord_dim7';
      else if (nns.includes('m7') || nns.includes('-7')) type = 'chord_m7';
      else if (nns.includes('7')) type = 'chord_7';
      else if (nns.includes('dim') || nns.includes('°')) type = 'chord_dim';
      else if (nns.includes('aug') || nns.includes('+')) type = 'chord_aug';
      else if (nns.includes('m') || nns.includes('-')) type = 'chord_minor';
      else type = 'chord_major';
    }

    // 1. Extensions penalty
    // Grades by complexity: 7th chords (-2), complex extensions (-4), aug/dim (-3)
    // NOTE: dim7 and m7b5 are intentionally excluded here — they are handled
    //       in block 4 (intrinsic dissonance) to avoid double-counting.
    if (type === 'chord_maj7' || type === 'chord_m7' || type === 'chord_7') {
      score -= 2;
    } else if (type === 'chord_9' || type === 'chord_m9' || type === 'chord_add9' || type.includes('11') || type.includes('13')) {
      score -= 4;
      complexExtensionsCount++;
    } else if (type === 'chord_aug') {
      score -= 3;
    }

    // 2. Diatonicity penalty
    const isNonDiatonic = nns.includes('b') || nns.includes('#') || 
                          (nns.startsWith('2') && !nns.includes('-') && !nns.includes('dim')) ||
                          (nns.startsWith('3') && !nns.includes('-') && !nns.includes('dim')) ||
                          (nns.startsWith('6') && !nns.includes('-') && !nns.includes('dim')) ||
                          (nns.startsWith('1') && nns.includes('-')) ||
                          (nns.startsWith('4') && nns.includes('-')) ||
                          (nns.startsWith('5') && nns.includes('-'));
    if (isNonDiatonic) {
      score -= 5;
      nonDiatonicCount++;
    }

    // 3. Harmonic Leaps (Circle of Fifths distance)
    if (i > 0 && progression[i-1]) {
      const prevChord = progression[i-1];
      const prevRoot = prevChord.rootValue ?? (prevChord.rootNote ? prevChord.rootNote.value : 0);
      
      const circleOfFifthsPosition = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
      const prevPos = circleOfFifthsPosition.indexOf(prevRoot);
      const currPos = circleOfFifthsPosition.indexOf(rootVal);
      
      if (prevPos !== -1 && currPos !== -1) {
        let distance = Math.abs(prevPos - currPos);
        if (distance > 6) distance = 12 - distance;
        
        if (distance > 3) {
          score -= (distance - 3) * 2; 
          jumpPenaltyCount++;
        }
      }
    }
    
    // 4. Intrinsic dissonance
    // dim7 and m7b5 are only penalized here (NOT in block 1) to avoid double-counting.
    // chord_9 types are already penalized in block 1 (-4) so excluded here.
    if (type === 'chord_m7b5' || type === 'chord_dim7') {
      totalDissonance += 5; // high inherent tension (tritone + diminished intervals)
    } else if (type === 'chord_aug') {
      totalDissonance += 2; // augmented has inherent dissonance too
    } else if (type === 'chord_7') {
      totalDissonance += 1; // mild tension from the minor 7th
    }
  }

  score -= totalDissonance;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Generate details
  if (nonDiatonicCount > 0) details.push(`${nonDiatonicCount} accord(s) hors tonalité (-${nonDiatonicCount * 5} pts)`);
  if (complexExtensionsCount > 0) details.push(`${complexExtensionsCount} extension(s) complexe(s) (-${complexExtensionsCount * 4} pts)`);
  if (jumpPenaltyCount > 0) details.push(`${jumpPenaltyCount} saut(s) harmonique(s) brusque(s)`);
  if (totalDissonance > 0) details.push(`Tension interne (dissonance) : -${totalDissonance} pts`);
  if (details.length === 0) details.push("Progression très standard.");

  // Determine Label and Color
  let label = "Facile / Pop";
  let color = "#4ade80"; // green

  if (score < 50) {
    label = "Complexe / Expérimental";
    color = "#f87171"; // red
  } else if (score < 80) {
    label = "Modéré / Jazz";
    color = "#fbbf24"; // amber
  }

  return { score, label, color, details };
}
