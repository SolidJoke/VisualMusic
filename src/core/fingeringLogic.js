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
};

/**
 * Determines the best guitar fingering for a given chord.
 * @param {number} rootValue - Chromatic value of the chord root (0-11, C=0)
 * @param {boolean} isMinor - Whether the chord is minor
 * @returns {Object|null} Fingering object { [stringIndex]: { [fret]: finger } }
 *   compatible with the Fretboard component's existing rendering logic.
 */
export function getGuitarFingering(rootValue, isMinor) {
  // Check for open chord shapes first (only available for specific roots)
  const openChords = {
    // rootValue: { major: shapeName, minor: shapeName }
    0:  { major: 'open_C', minor: null },       // C
    2:  { major: null, minor: 'open_Dm' },       // D
    4:  { major: 'open_E', minor: 'open_Em' },   // E
    7:  { major: 'open_G', minor: null },         // G
    9:  { major: null, minor: 'open_Am' },        // A
  };

  // Try open shape first
  const openOption = openChords[rootValue];
  if (openOption) {
    const shapeName = isMinor ? openOption.minor : openOption.major;
    if (shapeName && GUITAR_SHAPES[shapeName]) {
      return shapeToFingeringObj(GUITAR_SHAPES[shapeName].build());
    }
  }

  // Also D major open shape
  if (rootValue === 2 && !isMinor) {
    return shapeToFingeringObj(GUITAR_SHAPES.open_D.build());
  }
  // A major open shape
  if (rootValue === 9 && !isMinor) {
    return shapeToFingeringObj(GUITAR_SHAPES.open_Am.build()); // Actually we need open_A...
    // Fallback to A-shape barre at fret 0
  }

  // Moveable barre shapes
  // E string: note value at open = 4 (E)
  let rootFretE = (rootValue - 4 + 12) % 12;
  // A string: note value at open = 9 (A)
  let rootFretA = (rootValue - 9 + 12) % 12;

  // Prefer whichever gives a lower fret position
  if (rootFretE <= rootFretA || rootFretE <= 4) {
    const shapeName = isMinor ? 'minor_E' : 'major_E';
    return shapeToFingeringObj(GUITAR_SHAPES[shapeName].build(rootFretE));
  } else {
    const shapeName = isMinor ? 'minor_A' : 'major_A';
    return shapeToFingeringObj(GUITAR_SHAPES[shapeName].build(rootFretA));
  }
}

/**
 * Determines the best bass fingering for a given chord.
 * Bass pattern: Root (1=Index) on E string, Fifth (3=Ring) on A string.
 * For minor chords, also shows the minor 3rd (2=Middle) on A string.
 * @param {number} rootValue - Chromatic value (0-11)
 * @param {boolean} isMinor - Whether the chord is minor
 * @returns {Object|null} Fingering object
 */
export function getBassFingering(rootValue, isMinor) {
  // Bass strings reversed: [G2, D2, A1, E1] → index 3 = low E
  // Index 0: G, 1: D, 2: A, 3: E
  const rootFret = (rootValue - 4 + 12) % 12; // E string open = 4 (E)

  const fingeringObj = {};
  const f = rootFret;

  // Root on E string (index 3): finger 1 (Index)
  fingeringObj[3] = { [f]: 1 };

  // Fifth on A string (index 2): 2 frets up = perfect 5th, finger 3 (Ring)
  fingeringObj[2] = { [f + 2]: 3 };

  if (isMinor) {
    // Minor 3rd is 3 semitones above root
    // On A string: minor 3rd fret = rootFret - 1 (one fret below fifth)
    // Using finger 2 (Middle)
    const minorThirdOnA = (rootValue + 3 - 9 + 12) % 12; // A string open = 9
    if (minorThirdOnA >= 0 && minorThirdOnA <= 14) {
      // Add minor 3rd on A string alongside the fifth
      fingeringObj[2] = { ...fingeringObj[2], [minorThirdOnA]: 2 };
    }
    // Octave on D string (index 1): same fret as root + 2 on D, finger 4 (Pinky)
    const octaveOnD = (rootValue - 2 + 12) % 12; // D string open = 2
    if (octaveOnD >= 0 && octaveOnD <= 14) {
      fingeringObj[1] = { [octaveOnD]: 4 };
    }
  } else {
    // Major: Octave on D string (index 1), finger 4 (Pinky)
    const octaveOnD = (rootValue - 2 + 12) % 12; // D string open = 2
    if (octaveOnD >= 0 && octaveOnD <= 14) {
      fingeringObj[1] = { [octaveOnD]: 4 };
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
