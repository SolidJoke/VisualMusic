// src/core/theory.js

export const NOTES = [
    { value: 0, us: 'C', eu: 'Do' }, { value: 1, us: 'C#', eu: 'Do#' },
    { value: 2, us: 'D', eu: 'Ré' }, { value: 3, us: 'D#', eu: 'Ré#' },
    { value: 4, us: 'E', eu: 'Mi' }, { value: 5, us: 'F', eu: 'Fa' },
    { value: 6, us: 'F#', eu: 'Fa#' }, { value: 7, us: 'G', eu: 'Sol' },
    { value: 8, us: 'G#', eu: 'Sol#' }, { value: 9, us: 'A', eu: 'La' },
    { value: 10, us: 'A#', eu: 'La#' }, { value: 11, us: 'B', eu: 'Si' }
];

// NEW: Converts a note name (e.g., "C4") to an absolute numeric value (MIDI note number).
export const getAbsoluteNoteValue = (noteName) => {
    const noteStr = String(noteName);
    const letter = noteStr.replace(/[0-9#b]/g, '');
    const octaveStr = noteStr.replace(/[^0-9]/g, '');
    const octave = octaveStr ? parseInt(octaveStr, 10) : 4; // Default to octave 4 if not specified
    
    let noteValue = (NOTES.find(n => n.us === letter || n.eu === letter) || {}).value;

    if (noteStr.includes('#')) {
        noteValue = (noteValue + 1) % 12;
    } else if (noteStr.includes('b')) {
        noteValue = (noteValue - 1 + 12) % 12;
    }

    if (noteValue === undefined) return null; // Note not found

    // MIDI standard: C4 is 60. Our system: C0 is 0. C4 = 12*4 = 48.
    // Let's adjust to a common system where C4 = 60 to be more standard.
    // C0=12, C1=24, C2=36, C3=48, C4=60
    return noteValue + (octave + 1) * 12;
};


export const MODES = {
    Ionian: { 
        name: "Ionian (Majeur)", 
        emotion: "Joyeux, Triomphant, Lumineux", 
        description: "La base de la musique populaire. Stable et résolu.",
        intervals: [2, 2, 1, 2, 2, 2, 1], 
        targetInterval: 11,
        magicNote: null
    },
    Dorian: { 
        name: "Dorian", 
        emotion: "Nostalgique, Jazzy, Sophistiqué, Funky", 
        description: "Utilisé pour des grooves hypnotiques.",
        intervals: [2, 1, 2, 2, 2, 1, 2], 
        targetInterval: 9,
        magicNote: "6te Majeure"
    },
    Phrygian: { 
        name: "Phrygian", 
        emotion: "Sombre, Exotique, Metal", 
        description: "Idéal pour le Metal et le Flamenco.",
        intervals: [1, 2, 2, 2, 1, 2, 2], 
        targetInterval: 1,
        magicNote: "2nde bémol"
    },
    Lydian: { 
        name: "Lydian", 
        emotion: "Flottant, Magique, Spatial", 
        description: "Très utilisé dans les musiques de films.",
        intervals: [2, 2, 2, 1, 2, 2, 1], 
        targetInterval: 6,
        magicNote: "4te augmentée"
    },
    Mixolydian: { 
        name: "Mixolydian", 
        emotion: "Bluesy, Rock, Rebelle", 
        description: "Le mode du Rock classique et du Blues.",
        intervals: [2, 2, 1, 2, 2, 1, 2], 
        targetInterval: 10,
        magicNote: "7ème bémol"
    },
    Aeolian: { 
        name: "Aeolian (Mineur)", 
        emotion: "Triste, Mélancolique, Sentimental", 
        description: "Le mineur naturel par excellence.",
        intervals: [2, 1, 2, 2, 1, 2, 2], 
        targetInterval: 8,
        magicNote: null
    },
    Locrian: { 
        name: "Locrian", 
        emotion: "Extrêmement tendu, Instable", 
        description: "Crée un sentiment de chaos et d'insécurité.",
        intervals: [1, 2, 2, 1, 2, 2, 2], 
        targetInterval: 6,
        magicNote: "5te diminuée"
    },
    PhrygianDominant: { 
        name: "Phrygian Dominant", 
        emotion: "Épique, Oriental", 
        description: "Très typé Moyen-Orient et Metal.",
        intervals: [1, 3, 1, 2, 1, 2, 2], 
        targetInterval: 1,
        magicNote: "3ce Majeure"
    }
};

// ---------------------------------------------------------
// FINGERING DATABASE (GUITAR & BASS)
// ---------------------------------------------------------

export const FINGERING_SHAPES = {
    guitar: {
        CAGED: {
            // Numbers 1-4 = fingers, O = Open, X = Muted
            C: { strings: ['X', 3, 2, 'O', 1, 'O'], offset: 0 },
            A: { strings: ['X', 'O', 2, 3, 4, 'O'], offset: 0 },
            G: { strings: [3, 2, 'O', 'O', 'O', 4], offset: 0 },
            E: { strings: ['O', 2, 3, 1, 'O', 'O'], offset: 0 },
            D: { strings: ['X', 'X', 'O', 1, 3, 2], offset: 0 }
        },
        PowerChords: {
            E_form: { strings: [1, 3, 4, 'X', 'X', 'X'], span: 2 },
            A_form: { strings: ['X', 1, 3, 4, 'X', 'X'], span: 2 }
        }
    },
    bass: {
        Standard: {
            Root: { strings: [1, 'X', 'X', 'X'] },
            Root5: { strings: [1, 3, 'X', 'X'] }, // Root + 5th (Power Chord style)
            Arpeggio: { strings: [2, 1, 4, 'X'] }  // 1, 3, 5 pattern
        }
    }
};

export function getScaleNotes(rootValue, modeName) {
    const mode = MODES[modeName].intervals;
    let currentNotes = [];
    let currentIndex = rootValue;
    let order = 1;
    mode.forEach(interval => {
        const note = NOTES.at(currentIndex % 12);
        currentNotes.push({ ...note, order: order++ });
        currentIndex += interval;
    });
    return currentNotes;
}

export function generateChordsFromNNS(rootValue, modeName, nnsArray) {
    const scaleNotes = getScaleNotes(rootValue, modeName);
    return nnsArray.map(nnsStr => {
        // NNS Notation: 1, 2-, 3-, 4, 5, 6-, 7°
        const isMinor = nnsStr.includes('-') || nnsStr.includes('m');
        const isDim = nnsStr.includes('°') || nnsStr.includes('dim');
        const isMajor = !isMinor && !isDim;
        
        const degreeMatch = nnsStr.match(/[1-7]/);
        let degree = degreeMatch ? parseInt(degreeMatch[0]) - 1 : 0; 
        let chordRootNote = scaleNotes[degree];

        // Handle flat degrees (e.g., b2, b7)
        if (nnsStr.includes('b')) {
            // Find chromatic distance from root
            let semitonesFromRoot = 0;
            const modeIntervals = MODES[modeName].intervals;
            for(let i=0; i<degree; i++) semitonesFromRoot += modeIntervals[i];
            
            let alteredValue = (rootValue + semitonesFromRoot - 1 + 12) % 12;
            chordRootNote = NOTES.find(n => n.value === alteredValue);
        }

        let suffix = isMinor ? 'm' : isDim ? 'dim' : '';
        
        // Define Harmonic Role
        let role = "";
        const roleDegree = degree + 1;
        if (roleDegree === 1) role = "Tonic (Repos, Maison)";
        else if (roleDegree === 4) role = "Subdominant (Départ, Aventure)";
        else if (roleDegree === 5) role = "Dominant (Tension maximale)";
        else if (roleDegree === 6 && isMinor) role = "Relative Minor (Profondeur)";

        return {
            nns: nnsStr,
            chordNameUS: `${chordRootNote.us}${suffix}`,
            chordNameEU: `${chordRootNote.eu}${suffix}`,
            rootNote: chordRootNote,
            role: role
        };
    });
}

export function getClosestInversion(prevNotes, root, thirdInterval, fifthInterval, octaveOffset = 0) {
    const n1 = root;
    const n2 = root + thirdInterval;
    const n3 = root + fifthInterval;

    const allInversions = [];
    for (let octave = 1; octave <= 7; octave++) { 
        const base = octave * 12;
        allInversions.push([base + n1, base + n2, base + n3]); // Root position
        allInversions.push([base + n2, base + n3, base + n1 + 12]); // 1st inversion
        allInversions.push([base + n3, base + n1 + 12, base + n2 + 12]); // 2nd inversion
    }

    if (!prevNotes || prevNotes.length === 0) {
        const targetBase = 48 + (octaveOffset * 12);
        return allInversions.find(inv => inv[0] >= targetBase) || allInversions.find(inv => inv[0] >= 48) || allInversions[parseInt(allInversions.length / 2)];
    }

    let bestInversion = allInversions[0];
    let minDistance = Infinity;

    allInversions.forEach(inv => {
        let dist = Math.abs(inv[0] - prevNotes[0]) +
                   Math.abs(inv[1] - prevNotes[1]) +
                   Math.abs(inv[2] - prevNotes[2]);
        if (dist < minDistance) {
            minDistance = dist;
            bestInversion = inv;
        }
    });

    return bestInversion;
}