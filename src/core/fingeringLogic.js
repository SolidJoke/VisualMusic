// src/core/fingeringLogic.js
//
// Calculates optimal fingering positions for guitar and bass chords.
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

function analyzeVoicing(fingeringMap) {
  let minFret = 99;
  let maxFret = -1;
  let outOfRange = false;

  for (const strIdx in fingeringMap) {
    for (const fretStr in fingeringMap[strIdx]) {
      const val = fingeringMap[strIdx][fretStr];
      if (val !== 'X' && val !== 'O') {
        const fret = parseInt(fretStr, 10);
        if (fret > 14) outOfRange = true;
        if (fret > 0) {
          if (fret < minFret) minFret = fret;
          if (fret > maxFret) maxFret = fret;
        }
      }
    }
  }

  const difficultStretch = (maxFret !== -1 && minFret !== 99) ? (maxFret - minFret > 4) : false;
  return { fingeringMap, outOfRange, difficultStretch };
}

/**
 * Determines the best guitar fingering for a given chord.
 * @param {number} rootValue - Chromatic value of the chord root (0-11, C=0)
 * @param {string} chordType - Type of the chord (e.g. 'chord_major', 'chord_m7')
 * @param {number|null} rootString - Optional forced string index for the root (5=E, 4=A, 3=D)
 * @returns {Object} Rich fingering object { fingeringMap, outOfRange, difficultStretch }
 */
export function getGuitarFingering(rootValue, chordType = 'chord_major', rootString = null) {
  // Determine simple triad equivalents for open chords
  const isMinorLike = chordType === 'chord_minor' || chordType === 'chord_m7' || chordType === 'chord_m9' || chordType === 'chord_m7b5';
  const isBasicMajor = chordType === 'chord_major';
  const isBasicMinor = chordType === 'chord_minor';

  // If no rootString is forced, check for open chord shapes first (only for basic triads)
  if (rootString === null && (isBasicMajor || isBasicMinor)) {
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
        return analyzeVoicing(shapeToFingeringObj(GUITAR_SHAPES[shapeName].build()));
      }
    }
  }

  // Open string values
  const stringOpenValues = {
    5: 4,  // Low E
    4: 9,  // A
    3: 2,  // D
  };

  // Determine which string to anchor on
  let targetString = rootString;
  if (targetString === null || ![5, 4, 3].includes(targetString)) {
    // Default logic: prefer E or A string based on lowest fret
    let rootFretE = (rootValue - stringOpenValues[5] + 12) % 12;
    let rootFretA = (rootValue - stringOpenValues[4] + 12) % 12;
    targetString = (rootFretE <= rootFretA || rootFretE <= 4) ? 5 : 4;
  }

  const rootFret = (rootValue - stringOpenValues[targetString] + 12) % 12;
  
  // Map chordType to shape suffix
  let shapeSuffix = 'major'; // default
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
  else if (targetString === 3) shapeName = isMinorLike ? 'minor_D' : 'major_D'; // Fallback for D string

  // If the specific shape doesn't exist, fallback to major/minor
  if (!GUITAR_SHAPES[shapeName]) {
    shapeName = isMinorLike ? (targetString === 5 ? 'minor_E' : 'minor_A') : (targetString === 5 ? 'major_E' : 'major_A');
  }

  const shape = GUITAR_SHAPES[shapeName].build(rootFret);
  return analyzeVoicing(shapeToFingeringObj(shape));
}

/**
 * Determines the best bass fingering for a given chord.
 * Bass pattern: Root (1=Index) on E string, Fifth (3=Ring) on A string.
 * Adapts to extended chords (adds 7th, etc).
 * @param {number} rootValue - Chromatic value (0-11)
 * @param {string} chordType - Type of the chord (e.g. 'chord_major', 'chord_m7')
 * @returns {Object|null} Fingering object
 */
export function getBassFingering(rootValue, chordType = 'chord_major', rootString = null) {
  // Bass strings reversed: index 0:G, 1:D, 2:A, 3:E
  const stringOpenValues = {
    3: 4,  // E1
    2: 9,  // A1
    1: 2,  // D2
    0: 7   // G2
  };

  // Determine which string to anchor on (default to E or A)
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

  // 2. Fifth (if string above exists)
  if (targetString > 0) {
    const isDim5 = chordType === 'chord_m7b5' || chordType === 'chord_dim' || chordType === 'chord_dim7';
    const fifthFret = isDim5 ? rootFret + 1 : rootFret + 2;
    if (fifthFret <= 14) {
      fingeringObj[targetString - 1] = { [fifthFret]: 3 };
    }
  }

  // 3. Octave (if string 2 above exists)
  if (targetString > 1) {
    const octaveFret = rootFret + 2;
    if (octaveFret <= 14) {
      // If we already have something on this string (the 5th), we might skip or replace.
      // But typically for root on E, 5th is on A, Octave is on D.
      // String index: E=3, A=2, D=1, G=0.
      // If root on 3, 5th on 2, Octave on 1. Correct.
      if (!fingeringObj[targetString - 2]) {
        fingeringObj[targetString - 2] = { [octaveFret]: 4 };
      }
    }
  }

  return fingeringObj;
}

/**
 * Converts a shape definition to the fingering object format
 * expected by the Fretboard component: { [stringIndex]: { [fret]: finger } }
 */
function shapeToFingeringObj(shape) {
  const result = {};
  for (const [strIdx, data] of Object.entries(shape)) {
    if (data === null) {
      // Muted string: mark all frets as X
      result[strIdx] = {};
      for (let f = 0; f <= 14; f++) {
        result[strIdx][f] = 'X';
      }
    } else {
      result[strIdx] = { [data.fret]: data.finger };
    }
  }
  return result;
}
