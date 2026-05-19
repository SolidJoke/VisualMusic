import { getAbsoluteNoteValue, NOTES } from "./theory";

/**
 * Calculates optimal fingering positions for guitar and bass chords.
// Finger notation: 1=Index, 2=Middle, 3=Ring, 4=Pinky, O=Open, X=Muted
// Anatomical labels: I=Index, M=Middle, A=Annulaire(Ring), m=Auriculaire(Pinky)

/**
 * Maps numeric finger IDs to anatomical labels.
 */
export const FINGER_LABELS = {
  numeric: { 1: '1', 2: '2', 3: '3', 4: '4', O: 'O', X: 'X' },
  anatomic: { 1: 'I', 2: 'M', 3: 'A', 4: 'm', O: 'O', X: 'X' },
};

/**
 * Standard instrument ranges (Absolute MIDI values).
 * C4 = 60.
 */
export const INSTRUMENT_RANGES = {
  guitar: { min: 40, max: 86 }, // E2 to D6 (22 frets)
  bass: { min: 28, max: 65 },   // E1 to F4 (22 frets)
};

/**
 * Guitar chord shapes database.
 * Each shape defines finger assignments per string relative to a root fret.
 * Strings are indexed 0 (high E) to 5 (low E) in the reversed Fretboard array.
 * In the Fretboard component: index 0 = highest string, index 5 = lowest string.
 * BUT in our barre chord logic, we think in traditional guitar order:
 *   5=Low E, 4=A, 3=D, 2=G, 1=B, 0=High E
 */
const GUITAR_SHAPES = {
  // E-shape barre (root on low E string)
  major_E: {
    // Relative to root fret f on low E:
    //   Low E(5): f=1(barre), A(4): f+2=3, D(3): f+2=4, G(2): f+1=2, B(1): f=1(barre), High E(0): f=1(barre)
    build: (f) => ({
      5: { fret: f, finger: 1 },
      4: { fret: f + 2, finger: 3 },
      3: { fret: f + 2, finger: 4 },
      2: { fret: f + 1, finger: 2 },
      1: { fret: f, finger: 1 },
      0: { fret: f, finger: 1 },
    }),
  },
  minor_E: {
    // Like major but no middle finger on G string (minor 3rd)
    build: (f) => ({
      5: { fret: f, finger: 1 },
      4: { fret: f + 2, finger: 3 },
      3: { fret: f + 2, finger: 4 },
      2: { fret: f, finger: 1 },  // barre covers minor 3rd
      1: { fret: f, finger: 1 },
      0: { fret: f, finger: 1 },
    }),
  },
  // A-shape barre (root on A string)
  major_A: {
    build: (f) => ({
      5: null, // muted
      4: { fret: f, finger: 1 },
      3: { fret: f + 2, finger: 2 },
      2: { fret: f + 2, finger: 3 },
      1: { fret: f + 2, finger: 4 },
      0: { fret: f, finger: 1 },
    }),
  },
  minor_A: {
    build: (f) => ({
      5: null, // muted
      4: { fret: f, finger: 1 },
      3: { fret: f + 2, finger: 3 },
      2: { fret: f + 2, finger: 4 },
      1: { fret: f + 1, finger: 2 }, // minor 3rd on B string
      0: { fret: f, finger: 1 },
    }),
  },
  // Extended E-shape
  maj7_E: {
    build: (f) => ({
      5: { fret: f, finger: 1 },
      4: null,
      3: { fret: f + 1, finger: 2 },
      2: { fret: f + 1, finger: 3 },
      1: { fret: f, finger: 1 },
      0: null,
    }),
  },
  m7_E: {
    build: (f) => ({
      5: { fret: f, finger: 1 },
      4: null,
      3: { fret: f, finger: 1 },
      2: { fret: f, finger: 1 },
      1: { fret: f, finger: 1 },
      0: null,
    }),
  },
  dom7_E: {
    build: (f) => ({
      5: { fret: f, finger: 1 },
      4: { fret: f + 2, finger: 3 },
      3: { fret: f, finger: 1 },
      2: { fret: f + 1, finger: 2 },
      1: { fret: f, finger: 1 },
      0: { fret: f, finger: 1 },
    }),
  },
  m7b5_E: {
    build: (f) => ({
      5: { fret: f, finger: 2 },
      4: null,
      3: { fret: f, finger: 3 },
      2: { fret: f, finger: 4 },
      1: { fret: f - 1, finger: 1 },
      0: null,
    }),
  },
  dim7_E: {
    build: (f) => ({
      5: { fret: f, finger: 2 },
      4: null,
      3: { fret: f - 1, finger: 1 },
      2: { fret: f, finger: 3 },
      1: { fret: f - 1, finger: 1 },
      0: null,
    }),
  },
  // Extended A-shape
  maj7_A: {
    build: (f) => ({
      5: null,
      4: { fret: f, finger: 1 },
      3: { fret: f + 2, finger: 3 },
      2: { fret: f + 1, finger: 2 },
      1: { fret: f + 2, finger: 4 },
      0: { fret: f, finger: 1 },
    }),
  },
  m7_A: {
    build: (f) => ({
      5: null,
      4: { fret: f, finger: 1 },
      3: { fret: f + 2, finger: 3 },
      2: { fret: f, finger: 1 },
      1: { fret: f + 1, finger: 2 },
      0: { fret: f, finger: 1 },
    }),
  },
  dom7_A: {
    build: (f) => ({
      5: null,
      4: { fret: f, finger: 1 },
      3: { fret: f + 2, finger: 3 },
      2: { fret: f, finger: 1 },
      1: { fret: f + 2, finger: 4 },
      0: { fret: f, finger: 1 },
    }),
  },
  m7b5_A: {
    build: (f) => ({
      5: null,
      4: { fret: f, finger: 1 },
      3: { fret: f + 1, finger: 2 },
      2: { fret: f, finger: 1 },
      1: { fret: f + 1, finger: 3 },
      0: null,
    }),
  },
  dim7_A: {
    build: (f) => ({
      5: null,
      4: { fret: f, finger: 1 },
      3: { fret: f + 1, finger: 2 },
      2: { fret: f - 1, finger: 1 },
      1: { fret: f + 1, finger: 3 },
      0: null,
    }),
  },
  // Open chord shapes (fret 0 only)
  open_C: {
    build: () => ({
      5: null, // X
      4: { fret: 3, finger: 3 },
      3: { fret: 2, finger: 2 },
      2: { fret: 0, finger: 'O' },
      1: { fret: 1, finger: 1 },
      0: { fret: 0, finger: 'O' },
    }),
  },
  open_Am: {
    build: () => ({
      5: null,
      4: { fret: 0, finger: 'O' },
      3: { fret: 2, finger: 2 },
      2: { fret: 2, finger: 3 },
      1: { fret: 1, finger: 1 },
      0: { fret: 0, finger: 'O' },
    }),
  },
  // A major open (X-0-2-2-2-0)
  open_A: {
    build: () => ({
      5: null,
      4: { fret: 0, finger: 'O' },
      3: { fret: 2, finger: 1 },
      2: { fret: 2, finger: 2 },
      1: { fret: 2, finger: 3 },
      0: { fret: 0, finger: 'O' },
    }),
  },
  // Dm open (X-X-0-2-3-1)
  open_Dm: {
    build: () => ({
      5: null,
      4: null,
      3: { fret: 0, finger: 'O' },
      2: { fret: 2, finger: 2 },
      1: { fret: 3, finger: 3 },
      0: { fret: 1, finger: 1 },
    }),
  },
  open_G: {
    build: () => ({
      5: { fret: 3, finger: 2 },
      4: { fret: 2, finger: 1 },
      3: { fret: 0, finger: 'O' },
      2: { fret: 0, finger: 'O' },
      1: { fret: 0, finger: 'O' },
      0: { fret: 3, finger: 3 },
    }),
  },
  open_E: {
    build: () => ({
      5: { fret: 0, finger: 'O' },
      4: { fret: 2, finger: 2 },
      3: { fret: 2, finger: 3 },
      2: { fret: 1, finger: 1 },
      1: { fret: 0, finger: 'O' },
      0: { fret: 0, finger: 'O' },
    }),
  },
  open_Em: {
    build: () => ({
      5: { fret: 0, finger: 'O' },
      4: { fret: 2, finger: 2 },
      3: { fret: 2, finger: 3 },
      2: { fret: 0, finger: 'O' },
      1: { fret: 0, finger: 'O' },
      0: { fret: 0, finger: 'O' },
    }),
  },
  open_D: {
    build: () => ({
      5: null,
      4: null,
      3: { fret: 0, finger: 'O' },
      2: { fret: 2, finger: 1 },
      1: { fret: 3, finger: 3 },
      0: { fret: 2, finger: 2 },
    }),
  },
  // D-shape barre (root on D string)
  major_D: {
    build: (f) => ({
      5: null, // muted
      4: null, // muted
      3: { fret: f, finger: 1 },
      2: { fret: f + 2, finger: 2 },
      1: { fret: f + 3, finger: 4 },
      0: { fret: f + 2, finger: 3 },
    }),
  },
  minor_D: {
    build: (f) => ({
      5: null, // muted
      4: null, // muted
      3: { fret: f, finger: 1 },
      2: { fret: f + 2, finger: 3 },
      1: { fret: f + 3, finger: 4 },
      0: { fret: f + 1, finger: 2 },
    }),
  },
};

/**
 * Analyzes a voicing and checks for instrument range compatibility.
 * @param {Object} fingeringMap - Raw fingering map
 * @param {string} instrument - 'guitar' or 'bass'
 * @param {number} rootValue - Chromatic root
 * @param {number} octave - Octave offset
 */
function analyzeVoicing(fingeringMap, instrument, rootValue, octave = 0) {
  let minFret = 99;
  let maxFret = -1;
  let isOutOfRange = false;
  
  // Basic range check: if the total pitch is outside the instrument's capability
  const range = INSTRUMENT_RANGES[instrument];
  
  // We need to calculate absolute pitches to verify range
  const tuning = instrument === 'bass' ? [43, 38, 33, 28] : [64, 59, 55, 50, 45, 40]; // Reversed order
  
  for (const strIdx in fingeringMap) {
    const sIdx = parseInt(strIdx, 10);
    const openPitch = tuning[sIdx];
    
    for (const fretStr in fingeringMap[strIdx]) {
      const finger = fingeringMap[strIdx][fretStr];
      if (finger !== 'X' && finger !== 'O') {
        const fret = parseInt(fretStr, 10);
        const pitch = openPitch + fret + (octave * 12);
        
        if (pitch < range.min || pitch > range.max) isOutOfRange = true;
        
        if (fret > 0) {
          if (fret < minFret) minFret = fret;
          if (fret > maxFret) maxFret = fret;
        }
      } else if (finger === 'O') {
        const pitch = openPitch + (octave * 12);
        if (pitch < range.min || pitch > range.max) isOutOfRange = true;
      }
    }
  }

  const difficultStretch = (maxFret !== -1 && minFret !== 99) ? (maxFret - minFret > 4) : false;
  
  return { 
    fingeringMap, 
    instrument,
    octave,
    isOutOfRange, 
    difficultStretch 
  };
}

/**
 * Determines the best guitar fingering for a given chord.
 */
export function getGuitarFingering(rootValue, chordType = 'chord_major', rootString = null, octave = 0) {
  // Determine simple triad equivalents for open chords
  const isMinorLike = chordType === 'chord_minor' || chordType === 'chord_m7' || chordType === 'chord_m9' || chordType === 'chord_m7b5';
  const isBasicMajor = chordType === 'chord_major';
  const isBasicMinor = chordType === 'chord_minor';

  // If no rootString is forced, check for open chord shapes first
  if (rootString === null && octave === 0 && (isBasicMajor || isBasicMinor)) {
    const openChords = {
      0:  { major: 'open_C',  minor: null      },  // C
      2:  { major: 'open_D',  minor: 'open_Dm' },  // D
      4:  { major: 'open_E',  minor: 'open_Em' },  // E
      7:  { major: 'open_G',  minor: null      },  // G
      9:  { major: 'open_A',  minor: 'open_Am' },  // A
    };

    const openOption = openChords[rootValue];
    if (openOption) {
      const shapeName = isMinorLike ? openOption.minor : openOption.major;
      if (shapeName && GUITAR_SHAPES[shapeName]) {
        return analyzeVoicing(shapeToFingeringObj(GUITAR_SHAPES[shapeName].build()), 'guitar', rootValue, octave);
      }
    }
  }

  // Open string values (standard EADGBE)
  const stringOpenValues = { 5: 4, 4: 9, 3: 2 };

  let targetString = rootString;
  if (targetString === null || ![5, 4, 3].includes(targetString)) {
    let rootFretE = (rootValue - stringOpenValues[5] + 12) % 12;
    let rootFretA = (rootValue - stringOpenValues[4] + 12) % 12;
    targetString = (rootFretE <= rootFretA || rootFretE <= 4) ? 5 : 4;
  }

  const rootFret = (rootValue - stringOpenValues[targetString] + 12) % 12;
  
  let shapeSuffix = 'major';
  if (chordType === 'chord_minor') shapeSuffix = 'minor';
  else if (chordType === 'chord_maj7') shapeSuffix = 'maj7';
  else if (chordType === 'chord_m7' || chordType === 'chord_m9') shapeSuffix = 'm7';
  else if (chordType === 'chord_7' || chordType === 'chord_9' || chordType === 'chord_add9') shapeSuffix = 'dom7';
  else if (chordType === 'chord_m7b5') shapeSuffix = 'm7b5';
  else if (chordType === 'chord_dim7' || chordType === 'chord_dim') shapeSuffix = 'dim7';
  else if (isMinorLike) shapeSuffix = 'minor';

  let shapeName = `${shapeSuffix}_E`;
  if (targetString === 5) shapeName = `${shapeSuffix}_E`;
  else if (targetString === 4) shapeName = `${shapeSuffix}_A`;
  else if (targetString === 3) shapeName = isMinorLike ? 'minor_D' : 'major_D';

  if (!GUITAR_SHAPES[shapeName]) {
    shapeName = isMinorLike ? (targetString === 5 ? 'minor_E' : 'minor_A') : (targetString === 5 ? 'major_E' : 'major_A');
  }

  const shape = GUITAR_SHAPES[shapeName].build(rootFret);
  return analyzeVoicing(shapeToFingeringObj(shape), 'guitar', rootValue, octave);
}

/**
 * Determines the best bass fingering for a given chord.
 */
export function getBassFingering(rootValue, chordType = 'chord_major', rootString = null, octave = 0) {
  const stringOpenValues = { 3: 4, 2: 9, 1: 2, 0: 7 };

  let targetString = rootString;
  if (targetString === null || ![3, 2, 1].includes(targetString)) {
    let rootFretE = (rootValue - stringOpenValues[3] + 12) % 12;
    let rootFretA = (rootValue - stringOpenValues[2] + 12) % 12;
    targetString = (rootFretE <= rootFretA || rootFretE <= 4) ? 3 : 2;
  }

  const rootFret = (rootValue - stringOpenValues[targetString] + 12) % 12;
  const fingeringObj = {};

  // 1. Root
  fingeringObj[targetString] = { [rootFret]: 1 };

  // 2. Fifth
  if (targetString > 0) {
    const isDim5 = chordType === 'chord_m7b5' || chordType === 'chord_dim' || chordType === 'chord_dim7';
    const fifthFret = isDim5 ? rootFret + 1 : rootFret + 2;
    if (fifthFret <= 22) {
      fingeringObj[targetString - 1] = { [fifthFret]: 3 };
    }
  }

  // 3. Octave
  if (targetString > 1) {
    const octaveFret = rootFret + 2;
    if (octaveFret <= 22) {
      if (!fingeringObj[targetString - 2]) {
        fingeringObj[targetString - 2] = { [octaveFret]: 4 };
      }
    }
  }

  return analyzeVoicing(fingeringObj, 'bass', rootValue, octave);
}

/**
 * Returns all available guitar fingerings for a chord.
 */
export function getAvailableGuitarFingerings(rootValue, chordType = 'chord_major', octave = 0, notation = 'us') {
  const positions = [];
  const stringOpenValues = { 5: 4, 4: 9, 3: 2 };

  // 1. Check for open chord first
  const isMinorLike = chordType === 'chord_minor' || chordType === 'chord_m7' || chordType === 'chord_m9' || chordType === 'chord_m7b5';
  const isBasicMajor = chordType === 'chord_major';
  const isBasicMinor = chordType === 'chord_minor';

  if (isBasicMajor || isBasicMinor) {
    const openChords = {
      0: { major: 'open_C', minor: null },
      2: { major: 'open_D', minor: 'open_Dm' },
      4: { major: 'open_E', minor: 'open_Em' },
      7: { major: 'open_G', minor: null },
      9: { major: 'open_A', minor: 'open_Am' },
    };
    const openOption = openChords[rootValue];
    if (openOption) {
      const shapeName = isMinorLike ? openOption.minor : openOption.major;
      if (shapeName && GUITAR_SHAPES[shapeName]) {
        positions.push({
          id: 'open',
          label: 'Open',
          fingering: analyzeVoicing(shapeToFingeringObj(GUITAR_SHAPES[shapeName].build()), 'guitar', rootValue, octave)
        });
      }
    }
  }

  // 2. Standard Barre shapes (E, A, D)
  [5, 4, 3].forEach(targetString => {
    const rootFret = (rootValue - stringOpenValues[targetString] + 12) % 12;
    let shapeSuffix = 'major';
    if (chordType === 'chord_minor') shapeSuffix = 'minor';
    else if (chordType === 'chord_maj7') shapeSuffix = 'maj7';
    else if (chordType === 'chord_m7' || chordType === 'chord_m9') shapeSuffix = 'm7';
    else if (chordType === 'chord_7' || chordType === 'chord_9' || chordType === 'chord_add9') shapeSuffix = 'dom7';
    else if (chordType === 'chord_m7b5') shapeSuffix = 'm7b5';
    else if (chordType === 'chord_dim7' || chordType === 'chord_dim') shapeSuffix = 'dim7';
    else if (isMinorLike) shapeSuffix = 'minor';

    let shapeName = `${shapeSuffix}_E`;
    if (targetString === 5) shapeName = `${shapeSuffix}_E`;
    else if (targetString === 4) shapeName = `${shapeSuffix}_A`;
    else if (targetString === 3) shapeName = isMinorLike ? 'minor_D' : 'major_D';

    if (!GUITAR_SHAPES[shapeName]) {
      shapeName = isMinorLike ? (targetString === 5 ? 'minor_E' : 'minor_A') : (targetString === 5 ? 'major_E' : 'major_A');
    }

    if (GUITAR_SHAPES[shapeName]) {
      const getNoteName = (midiVal) => {
        const n = NOTES[midiVal % 12];
        return notation === 'eu' ? n.eu : n.us;
      };
      const shapePrefix = targetString === 5 ? getNoteName(4) : (targetString === 4 ? getNoteName(9) : getNoteName(2));
      const label = `${shapePrefix}-shape`;
      positions.push({
        id: targetString,
        label: `${label} (fr. ${rootFret})`,
        fingering: analyzeVoicing(shapeToFingeringObj(GUITAR_SHAPES[shapeName].build(rootFret)), 'guitar', rootValue, octave)
      });
    }
  });

  return positions;
}

/**
 * Returns all available bass fingerings for a chord.
 */
export function getAvailableBassFingerings(rootValue, chordType = 'chord_major', octave = 0, notation = 'us') {
  const positions = [];
  [3, 2, 1].forEach(targetString => {
    const stringNotes = { 3: 4, 2: 9, 1: 2 }; // E, A, D
    const n = NOTES[stringNotes[targetString]];
    const noteName = notation === 'eu' ? n.eu : n.us;
    const stringLabel = notation === 'eu' ? 'Corde' : 'String';
    
    positions.push({
      id: targetString,
      label: `${stringLabel} ${noteName}`,
      fingering: getBassFingering(rootValue, chordType, targetString, octave)
    });
  });
  return positions;
}

/**
 * Returns available scale patterns (positions/boxes) for guitar or bass.
 *
 * Uses Option-B architecture: returns `scaleFrets` (a flat list of {stringIndex, fret, noteValue})
 * instead of a fingeringMap. This keeps scale display logic completely separate from chord logic,
 * avoids the 1-note-per-string limitation of fingeringMap (V2 format), and is trivially readable
 * for maintenance by any model.
 *
 * @param {number|string} rootValue - Chromatic root (0–11)
 * @param {string} scaleType - e.g. 'scale_major'
 * @param {'guitar'|'bass'} instrument
 * @param {string[]} strings - Tuning array e.g. ['E2','A2','D3','G3','B3','E4']
 * @param {string} sep - Separator word for label (e.g. 'of', 'de')
 * @returns {Array<{id, label, scaleFrets: Array<{stringIndex, fret, noteValue}>}>}
 */
export function getAvailableScaleFingerings(rootValue, scaleType, instrument = 'guitar', strings = [], sep = 'of') {
  // Import resolveScaleIntervals lazily to avoid circular deps — it's already available in theory.js
  // We use dynamic require-style import but since this is ESM with a bundler, we use a local import.
  // NOTE: fingeringLogic.js already imports from './theory' at the top. We need to add resolveScaleIntervals.
  // For now we compute semitones inline from the scaleType key.
  // Scale semitone intervals (from root) for all supported scale types:
  const SCALE_SEMITONES = {
    scale_major:             [0, 2, 4, 5, 7, 9, 11],
    scale_minor:             [0, 2, 3, 5, 7, 8, 10],
    scale_harmonic_minor:    [0, 2, 3, 5, 7, 8, 11],
    scale_melodic_minor:     [0, 2, 3, 5, 7, 9, 11],
    scale_dorian:            [0, 2, 3, 5, 7, 9, 10],
    scale_phrygian:          [0, 1, 3, 5, 7, 8, 10],
    scale_lydian:            [0, 2, 4, 6, 7, 9, 11],
    scale_mixolydian:        [0, 2, 4, 5, 7, 9, 10],
    scale_locrian:           [0, 1, 3, 5, 6, 8, 10],
    scale_phrygian_dominant: [0, 1, 4, 5, 7, 8, 10],
    scale_pentatonic_major:  [0, 2, 4, 7, 9],
    scale_pentatonic_minor:  [0, 3, 5, 7, 10],
    scale_blues_minor:       [0, 3, 5, 6, 7, 10],
    scale_blues_major:       [0, 2, 3, 4, 7, 9],
    scale_hirajoshi:         [0, 2, 3, 7, 8],
    scale_hungarian_minor:   [0, 2, 3, 6, 7, 8, 11],
    scale_whole_tone:        [0, 2, 4, 6, 8, 10],
    scale_chromatic:         [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  };

  const semitones = SCALE_SEMITONES[scaleType] || SCALE_SEMITONES['scale_major'];
  const semitoneSet = new Set(semitones.map(s => (Number(rootValue) + s) % 12));

  // stringOpenValues[i] = absolute MIDI value of open string i.
  // Convention: strings input is low→high (e.g. ['E2','A2','D3','G3','B3','E4']).
  // We reverse it so that index 0 = HIGHEST string (E4), matching the Fretboard
  // component which also calls .reverse() before iterating with stringIndex.
  // This ensures scaleFrets coordinates are directly usable by Fretboard and playback.
  const stringOpenValues = strings.map(s => getAbsoluteNoteValue(s)).reverse();
  const numStrings = strings.length;
  const isBass = instrument === 'bass';
  const span = isBass ? 3 : 4;

  // Find all frets where the root appears, to anchor positions.
  // sIdx here directly equals stringIndex (0=high, N-1=low) — same as Fretboard.
  const rootPositions = [];
  stringOpenValues.forEach((openVal, stringIndex) => {
    for (let f = 0; f <= 15; f++) {
      if ((openVal + f) % 12 === Number(rootValue) % 12) {
        rootPositions.push({ stringIndex, fret: f });
      }
    }
  });

  // Build candidate start frets from root positions
  const startFrets = new Set();
  rootPositions.forEach(pos => {
    [0, -1, -2, -3].forEach(offset => {
      const start = Math.max(0, pos.fret + offset);
      if (start <= 12) startFrets.add(start);
    });
  });

  const sortedStarts = Array.from(startFrets).sort((a, b) => a - b);
  const filteredStarts = [];
  let last = -99;
  sortedStarts.forEach(s => {
    if (s >= last + 2) {
      filteredStarts.push(s);
      last = s;
    }
  });

  const positions = filteredStarts.slice(0, 5).map((start, idx) => {
    const endFret = start + span;

    // Build exact list of frets in this position window that belong to the scale.
    // stringIndex = sIdx (0=high string), consistent with Fretboard convention.
    const scaleFrets = [];
    stringOpenValues.forEach((openVal, stringIndex) => {
      for (let fret = start; fret <= endFret; fret++) {
        const noteValue = (openVal + fret) % 12;
        if (semitoneSet.has(noteValue)) {
          scaleFrets.push({ stringIndex, fret, noteValue });
        }
      }
    });

    return {
      id: `pos_${start}`,
      label: `${idx + 1} ${sep} ${filteredStarts.slice(0, 5).length}`,
      positionIndex: idx,
      // scaleFrets is the Option-B model: a flat list of exact fret positions.
      // fingeringMap is intentionally absent — chord rendering is unaffected.
      scaleFrets,
      // Keep startFret/endFret for playback handler compatibility during transition
      startFret: start,
      endFret,
    };
  });

  return positions;
}


/**
 * Returns all possible ways to play a single note (by MIDI value) on guitar or bass.
 */
export function getAvailableSingleNoteFingerings(midiValue, instrument = 'guitar', notation = 'us') {
  if (midiValue === undefined || midiValue === null || isNaN(midiValue)) return [];
  const positions = [];
  const stringOpenMidis = instrument === 'bass' ? [28, 33, 38, 43] : [40, 45, 50, 55, 59, 64];
  const strings = instrument === 'bass' ? [3, 2, 1, 0] : [5, 4, 3, 2, 1, 0];
  
  strings.forEach((strIdx, i) => {
    const openMidi = stringOpenMidis[i];
    const fret = midiValue - openMidi;
    if (fret >= 0 && fret <= 22) {
      const noteName = NOTES[midiValue % 12][notation];
      const stringName = NOTES[openMidi % 12][notation];
      const octave = Math.floor(midiValue / 12) - 1;
      
      positions.push({
        id: `note_${strIdx}_${fret}`,
        // Note: Label will be refined in the UI to use translations
        label: `${stringName} | ${fret}`, 
        fingering: {
          fingeringMap: { [strIdx]: { [fret]: 1 } },
          rootValue: midiValue % 12,
          octave: octave
        },
        stringName,
        fret
      });
    }
  });
  
  return positions;
}


/**
 * Converts a shape definition to the fingering object format
 * expected by the Fretboard component: { [stringIndex]: { [fret]: finger } }
 */
function shapeToFingeringObj(shape) {
  const result = {};
  for (const [strIdx, data] of Object.entries(shape)) {
    if (data === null) {
      // Muted string: represent as an empty object or with a special status
      // Fretboard expects { [fret]: finger }
      result[strIdx] = { muted: true };
    } else if (data.finger === 'O') {
      // Open string
      result[strIdx] = { 0: 'O' };
    } else {
      result[strIdx] = { [data.fret]: data.finger };
    }
  }
  return result;
}
