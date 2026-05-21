import { Scale, Chord, Note } from '@tonaljs/tonal';
import { NOTES } from './theory';

const ROOT_MAP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_MAPPING = {
    'scale_major': 'major',
    'scale_minor': 'minor',
    'scale_harmonic_minor': 'harmonic minor',
    'scale_melodic_minor': 'melodic minor',
    'scale_dorian': 'dorian',
    'scale_phrygian': 'phrygian',
    'scale_lydian': 'lydian',
    'scale_mixolydian': 'mixolydian',
    'scale_locrian': 'locrian',
    'scale_phrygian_dominant': 'phrygian dominant',
    'scale_pentatonic_major': 'major pentatonic',
    'scale_pentatonic_minor': 'minor pentatonic',
    'scale_blues_minor': 'minor blues',
    'scale_blues_major': 'major blues',
    'scale_hirajoshi': 'hirajoshi',
    'scale_hungarian_minor': 'hungarian minor',
    'scale_whole_tone': 'whole tone',
    'scale_chromatic': 'chromatic'
};

const CHORD_MAPPING = {
    'chord_major': 'M',
    'chord_minor': 'm',
    'chord_dim': 'dim',
    'chord_aug': 'aug',
    'chord_sus2': 'sus2',
    'chord_sus4': 'sus4',
    'chord_maj7': 'maj7',
    'chord_m7': 'm7',
    'chord_7': '7',
    'chord_dim7': 'dim7',
    'chord_m7b5': 'm7b5',
    'chord_add9': 'add9',
    'chord_9': '9',
    'chord_m9': 'm9'
};

// Helper: Convert Tonal Note to our Internal Note Object
const mapTonalNoteToInternal = (tonalNoteStr, order) => {
    // tonalNoteStr might be "C", "C#", "Bb"
    const simplified = Note.simplify(tonalNoteStr);
    const pc = Note.pitchClass(simplified); // Pitch class like C, Db, etc
    // Find the corresponding note in NOTES array. 
    // We can rely on midi value % 12
    const chroma = Note.chroma(simplified);
    const baseNote = NOTES.find(n => n.value === chroma);
    
    return {
        ...baseNote,
        order: order
    };
};

export const getScaleNotesAdapter = (rootValue, scaleKey) => {
    const tonalScaleName = SCALE_MAPPING[scaleKey];
    if (!tonalScaleName) return [];

    const rootName = ROOT_MAP[rootValue % 12];
    if (!rootName) return [];

    const scale = Scale.get(`${rootName} ${tonalScaleName}`);
    if (scale.empty) return [];

    return scale.notes.map((noteStr, index) => mapTonalNoteToInternal(noteStr, index + 1));
};

export const getChordNotesAbsoluteAdapter = (rootValue, dictType, octave = 4) => {
    const tonalChordType = CHORD_MAPPING[dictType];
    if (!tonalChordType) return [];

    const rootName = ROOT_MAP[rootValue % 12];
    if (!rootName) return [];

    const chord = Chord.getChord(tonalChordType, `${rootName}${octave}`);
    
    if (chord.empty) return [];

    return chord.notes.map(noteStr => Note.midi(noteStr));
};
