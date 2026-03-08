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
    Ionian: { name: "Ionian (Majeur)", intervals: new Array(2, 2, 1, 2, 2, 2, 1), targetInterval: 11 },
    Dorian: { name: "Dorian", intervals: new Array(2, 1, 2, 2, 2, 1, 2), targetInterval: 9 },
    Phrygian: { name: "Phrygian", intervals: new Array(1, 2, 2, 2, 1, 2, 2), targetInterval: 1 },
    Lydian: { name: "Lydian", intervals: new Array(2, 2, 2, 1, 2, 2, 1), targetInterval: 6 },
    Mixolydian: { name: "Mixolydian", intervals: new Array(2, 2, 1, 2, 2, 1, 2), targetInterval: 10 },
    Aeolian: { name: "Aeolian (Mineur)", intervals: new Array(2, 1, 2, 2, 1, 2, 2), targetInterval: 8 },
    Locrian: { name: "Locrian", intervals: new Array(1, 2, 2, 1, 2, 2, 2), targetInterval: 6 },
    PhrygianDominant: { name: "Phrygian Dominant", intervals: new Array(1, 3, 1, 2, 1, 2, 2), targetInterval: 1 }
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