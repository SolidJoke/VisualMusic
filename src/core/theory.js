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
        // Already handled by the NOTES array, but good for robustness
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
    Ionian: { name: "Ionian (Majeur)", emotion: "Joyeux", intervals: [2, 2, 1, 2, 2, 2, 1], targetInterval: 11 },
    Dorian: { name: "Dorian", emotion: "Nostalgique", intervals: [2, 1, 2, 2, 2, 1, 2], targetInterval: 9 },
    Phrygian: { name: "Phrygian", emotion: "Exotique, Sombre", intervals: [1, 2, 2, 2, 1, 2, 2], targetInterval: 1 },
    Lydian: { name: "Lydian", emotion: "Magique, Spatial", intervals: [2, 2, 2, 1, 2, 2, 1], targetInterval: 6 },
    Mixolydian: { name: "Mixolydian", emotion: "Bluesy, Rock", intervals: [2, 2, 1, 2, 2, 1, 2], targetInterval: 10 },
    Aeolian: { name: "Aeolian (Mineur)", emotion: "Triste", intervals: [2, 1, 2, 2, 1, 2, 2], targetInterval: 8 },
    Locrian: { name: "Locrian", emotion: "Instable, Effrayant", intervals: [1, 2, 2, 1, 2, 2, 2], targetInterval: 6 },
    PhrygianDominant: { name: "Phrygian Dominant", emotion: "Épique", intervals: [1, 3, 1, 2, 1, 2, 2], targetInterval: 1 }
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
        const isMinor = nnsStr.includes('-');
        const isDim = nnsStr.includes('°');
        const degreeMatch = nnsStr.match(/[1-7]/);
        let degree = degreeMatch ? parseInt(degreeMatch[0]) - 1 : 0; 
        let chordRootNote = scaleNotes[degree];

        if (nnsStr.includes('b')) {
            let baseValue = scaleNotes[0].value;
            let alteredValue = (baseValue + degree) % 12; // This logic might be flawed for modes
            chordRootNote = NOTES.find(n => n.value === alteredValue); 
        }

        let suffix = isMinor ? 'm' : isDim ? 'dim' : '';
        return {
            nns: nnsStr,
            chordNameUS: `${chordRootNote.us}${suffix}`,
            chordNameEU: `${chordRootNote.eu}${suffix}`,
            rootNote: chordRootNote
        };
    });
}

export function getClosestInversion(prevNotes, root, thirdInterval, fifthInterval) {
    const n1 = root;
    const n2 = root + thirdInterval;
    const n3 = root + fifthInterval;

    const allInversions = [];
    for (let octave = 2; octave < 5; octave++) { // Generate inversions across a few octaves
        const base = octave * 12;
        allInversions.push([base + n1, base + n2, base + n3]); // Root position
        allInversions.push([base + n2, base + n3, base + n1 + 12]); // 1st inversion
        allInversions.push([base + n3, base + n1 + 12, base + n2 + 12]); // 2nd inversion
    }

    if (!prevNotes || prevNotes.length === 0) {
        return allInversions.find(inv => inv[0] >= 48) || allInversions[0]; // Default to first inv starting around C4
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