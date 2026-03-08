// src/core/theory.js

export const NOTES = new Array(
    { value: 0, us: 'C', eu: 'Do' }, { value: 1, us: 'C#', eu: 'Do#' },
    { value: 2, us: 'D', eu: 'Ré' }, { value: 3, us: 'D#', eu: 'Ré#' },
    { value: 4, us: 'E', eu: 'Mi' }, { value: 5, us: 'F', eu: 'Fa' },
    { value: 6, us: 'F#', eu: 'Fa#' }, { value: 7, us: 'G', eu: 'Sol' },
    { value: 8, us: 'G#', eu: 'Sol#' }, { value: 9, us: 'A', eu: 'La' },
    { value: 10, us: 'A#', eu: 'La#' }, { value: 11, us: 'B', eu: 'Si' }
);

export const MODES = {
    Ionian: { name: "Ionian (Majeur)", emotion: "Joyeux", intervals: new Array(2, 2, 1, 2, 2, 2, 1), targetInterval: 11 },
    Dorian: { name: "Dorian", emotion: "Nostalgique", intervals: new Array(2, 1, 2, 2, 2, 1, 2), targetInterval: 9 },
    Phrygian: { name: "Phrygian", emotion: "Exotique, Sombre", intervals: new Array(1, 2, 2, 2, 1, 2, 2), targetInterval: 1 },
    Lydian: { name: "Lydian", emotion: "Magique, Spatial", intervals: new Array(2, 2, 2, 1, 2, 2, 1), targetInterval: 6 },
    Mixolydian: { name: "Mixolydian", emotion: "Bluesy, Rock", intervals: new Array(2, 2, 1, 2, 2, 1, 2), targetInterval: 10 },
    Aeolian: { name: "Aeolian (Mineur)", emotion: "Triste", intervals: new Array(2, 1, 2, 2, 1, 2, 2), targetInterval: 8 },
    Locrian: { name: "Locrian", emotion: "Instable, Effrayant", intervals: new Array(1, 2, 2, 1, 2, 2, 2), targetInterval: 6 },
    PhrygianDominant: { name: "Phrygian Dominant", emotion: "Épique", intervals: new Array(1, 3, 1, 2, 1, 2, 2), targetInterval: 1 }
};

export function getScaleNotes(rootValue, modeName) {
    const mode = Reflect.get(MODES, modeName).intervals;
    let currentNotes = new Array();
    let currentIndex = rootValue;
    mode.forEach(interval => {
        currentNotes.push(NOTES.at(currentIndex % 12));
        currentIndex += interval;
    });
    return currentNotes;
}

export function generateChordsFromNNS(rootValue, modeName, nnsArray) {
    const scaleNotes = getScaleNotes(rootValue, modeName);
    return nnsArray.map(nnsStr => {
        const isMinor = nnsStr.includes('-');
        const isDim = nnsStr.includes('°');
        const degreeMatch = nnsStr.match(new RegExp("1|2|3|4|5|6|7"));
        let degree = degreeMatch ? parseInt(degreeMatch.at(0)) - 1 : 0; 
        let chordRootNote = scaleNotes.at(degree);

        if (nnsStr.includes('b')) {
            let baseValue = scaleNotes.at(0).value;
            let alteredValue = (baseValue + degree) % 12;
            chordRootNote = NOTES.at(alteredValue); 
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

// NOUVEAU : L'Algorithme d'intelligence de Voice Leading (Les Inversions)
export function getClosestInversion(prevNotes, root, thirdInterval, fifthInterval) {
    const n1 = root;
    const n2 = root + thirdInterval;
    const n3 = root + fifthInterval;

    // Génère les 3 inversions sur l'Octave 0 (Graves)
    const inv0_0 = new Array(n1, n2, n3);
    const inv1_0 = new Array(n2, n3, n1 + 12);
    const inv2_0 = new Array(n3, n1 + 12, n2 + 12);

    // Génère les 3 inversions sur l'Octave 1 (Médiums)
    const inv0_1 = new Array(n1 + 12, n2 + 12, n3 + 12);
    const inv1_1 = new Array(n2 + 12, n3 + 12, n1 + 24);
    const inv2_1 = new Array(n3 + 12, n1 + 24, n2 + 24);

    // Génère les 3 inversions sur l'Octave 2 (Aigus)
    const inv0_2 = new Array(n1 + 24, n2 + 24, n3 + 24);
    const inv1_2 = new Array(n2 + 24, n3 + 24, n1 + 36);
    const inv2_2 = new Array(n3 + 24, n1 + 36, n2 + 36);

    const allInversions = new Array(inv0_0, inv1_0, inv2_0, inv0_1, inv1_1, inv2_1, inv0_2, inv1_2, inv2_2);

    // Si on n'a pas d'accord précédent, on place la main au milieu du clavier
    if (!prevNotes || prevNotes.length === 0) {
        return inv0_1; 
    }

    // Sinon, on cherche l'inversion qui nécessite le moins de mouvement des doigts
    let bestInversion = inv0_1;
    let minDistance = 9999;

    allInversions.forEach(inv => {
        let dist = Math.abs(inv.at(0) - prevNotes.at(0)) +
                   Math.abs(inv.at(1) - prevNotes.at(1)) +
                   Math.abs(inv.at(2) - prevNotes.at(2));
        if (dist < minDistance) {
            minDistance = dist;
            bestInversion = inv;
        }
    });

    return bestInversion;
}