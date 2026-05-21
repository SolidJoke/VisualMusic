// src/core/theory.js
import { getScaleNotesAdapter, getChordNotesAbsoluteAdapter } from './tonal-adapter';
import expertData from './expert_theory_data.json';

export const getChordAbsolute = getChordNotesAbsoluteAdapter;

export const NOTES = [
    { value: 0, us: 'C', eu: 'Do' }, { value: 1, us: 'C#', eu: 'Do#' },
    { value: 2, us: 'D', eu: 'Ré' }, { value: 3, us: 'D#', eu: 'Ré#' },
    { value: 4, us: 'E', eu: 'Mi' }, { value: 5, us: 'F', eu: 'Fa' },
    { value: 6, us: 'F#', eu: 'Fa#' }, { value: 7, us: 'G', eu: 'Sol' },
    { value: 8, us: 'G#', eu: 'Sol#' }, { value: 9, us: 'A', eu: 'La' },
    { value: 10, us: 'A#', eu: 'La#' }, { value: 11, us: 'B', eu: 'Si' }
];

/**
 * Returns technical metadata for a semitone interval relative to a root.
 * @param {number} semitones - Distance from root in semitones (0-24+)
 * @returns {Object} { degree: string, label: string, color: string }
 */
export const getIntervalMetadata = (semitones) => {
    const normalized = semitones % 12;
    const octave = Math.floor(semitones / 12);
    
    const meta = {
        0:  { degree: '1',  label: 'R',     color: 'var(--root-color)' },
        1:  { degree: 'b2', label: 'b2',    color: 'var(--ext-color)' },
        2:  { degree: '2',  label: '2',     color: 'var(--ext-color)' },
        3:  { degree: 'b3', label: 'b3',    color: 'var(--minor-color)' },
        4:  { degree: '3',  label: '3',     color: 'var(--major-color)' },
        5:  { degree: '4',  label: '4',     color: 'var(--ext-color)' },
        6:  { degree: 'b5', label: 'b5/#4', color: 'var(--tension-color)' },
        7:  { degree: '5',  label: '5',     color: 'var(--fifth-color)' },
        8:  { degree: 'b6', label: 'b6',    color: 'var(--ext-color)' },
        9:  { degree: '6',  label: '6',     color: 'var(--ext-color)' },
        10: { degree: 'b7', label: 'b7',    color: 'var(--dominant-color)' },
        11: { degree: '7',  label: '7',     color: 'var(--major7-color)' }
    }[normalized] || { degree: '?', label: '?', color: 'gray' };

    // Handle extensions (9, 11, 13)
    if (octave === 1) {
        if (normalized === 2)  { meta.degree = '9';  meta.label = '9'; }
        if (normalized === 5)  { meta.degree = '11'; meta.label = '11'; }
        if (normalized === 9)  { meta.degree = '13'; meta.label = '13'; }
        if (normalized === 1)  { meta.degree = 'b9'; meta.label = 'b9'; }
        if (normalized === 3)  { meta.degree = '#9'; meta.label = '#9'; }
        if (normalized === 6)  { meta.degree = '#11'; meta.label = '#11'; }
    }

    return meta;
};

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


// MODES object has been merged into SCALES

export const resolveNnsToChordType = (nns) => {
    if (!nns) return 'chord_major';
    if (nns.includes('maj7')) return 'chord_maj7';
    if (nns.includes('m7b5')) return 'chord_m7b5';
    if (nns.includes('m7')) return 'chord_m7';
    if (nns.includes('m9')) return 'chord_m9';
    if (nns.includes('dim7')) return 'chord_dim7';
    if (nns.includes('dim') || nns.includes('°')) return 'chord_dim';
    if (nns.includes('add9')) return 'chord_add9';
    if (nns.includes('9')) return 'chord_9';
    if (nns.includes('7')) return 'chord_7';
    if (nns.includes('m') || nns.includes('-')) return 'chord_minor';
    if (nns.includes('+') || nns.includes('aug')) return 'chord_aug';
    if (nns.includes('sus2')) return 'chord_sus2';
    if (nns.includes('sus4')) return 'chord_sus4';
    return 'chord_major';
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

export function getScaleNotes(rootValue, scaleKey) {
    return getScaleNotesAdapter(rootValue, scaleKey);
}

export function generateChordsFromNNS(rootValue, scaleKey, nnsArray) {
    const scaleNotes = getScaleNotes(rootValue, scaleKey);
    return nnsArray.map(nnsStr => {
        // NNS Notation: 1, 2-, 3-, 4, 5, 6-, 7°
        // Also support Roman: I, ii, iii, IV, V, vi, vii°
        
        let normalizedStr = nnsStr;
        const romanMap = { "I": "1", "II": "2", "III": "3", "IV": "4", "V": "5", "VI": "6", "VII": "7" };
        
        // Match Roman Numeral (case-insensitive for initial match)
        const romanMatch = nnsStr.match(/([#b]?)([iIivV]+)/);
        if (romanMatch) {
            const prefix = romanMatch[1];
            const romanUpper = romanMatch[2].toUpperCase();
            const baseDegree = romanMap[romanUpper] || "1";
            const isMinorRoman = romanMatch[2] === romanMatch[2].toLowerCase();
            const suffix = isMinorRoman ? "-" : "";
            // Reconstruct as NNS
            normalizedStr = prefix + baseDegree + suffix + nnsStr.replace(/^[#b]?[iIivV]+/i, '');
        }

        const isMinor = normalizedStr.includes('-') || normalizedStr.includes('m');
        const isDim = normalizedStr.includes('°') || normalizedStr.includes('dim');
        
        const degreeMatch = normalizedStr.match(/[1-7]/);
        let degree = degreeMatch ? parseInt(degreeMatch[0]) - 1 : 0; 
        let chordRootNote = scaleNotes[degree] || scaleNotes[0];

        // Handle flat degrees (e.g., b2, b7)
        if (normalizedStr.includes('b') && !normalizedStr.includes('b5')) {
            // Find chromatic distance from root
            let semitonesFromRoot = 0;
            const modeIntervals = SCALES[scaleKey]?.intervals || [2,2,1,2,2,2,1];
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
            nns: normalizedStr,
            chordNameUS: `${chordRootNote.us}${suffix}`,
            chordNameEU: `${chordRootNote.eu}${suffix}`,
            rootNote: chordRootNote,
            role: role
        };
    });
}

export function getClosestInversion(prevNotes, root, thirdInterval, fifthInterval, octaveOffset = 0) {
    // Legacy 3-note wrapper — delegates to the generalized version
    const semitones = [0, thirdInterval, fifthInterval];
    return getClosestInversionN(prevNotes, root, semitones, octaveOffset);
}

/**
 * Generalized voice-leading for chords with any number of notes.
 * Generates all inversions across octaves and picks the one closest to prevNotes.
 * @param {number[]|null} prevNotes - Previous chord's absolute MIDI pitches
 * @param {number} root - Chromatic root value (0-11)
 * @param {number[]} semitones - Intervals from root, e.g. [0, 4, 7] or [0, 4, 7, 11]
 * @param {number} octaveOffset - Offset from default octave 4
 * @returns {number[]} Array of absolute MIDI pitches
 */
export function getClosestInversionN(prevNotes, root, semitones, octaveOffset = 0) {
    const noteCount = semitones.length;
    const allInversions = [];

    for (let octave = 1; octave <= 7; octave++) {
        const base = octave * 12;
        // Generate all rotations (inversions) of the chord
        for (let inv = 0; inv < noteCount; inv++) {
            const voicing = [];
            for (let i = 0; i < noteCount; i++) {
                const idx = (inv + i) % noteCount;
                let pitch = base + root + semitones[idx];
                // Ensure ascending order: each note must be >= the previous
                if (voicing.length > 0 && pitch <= voicing[voicing.length - 1]) {
                    pitch += 12;
                }
                voicing.push(pitch);
            }
            allInversions.push(voicing);
        }
    }

    if (!prevNotes || prevNotes.length === 0) {
        const targetBase = 48 + (octaveOffset * 12);
        return allInversions.find(inv => inv[0] >= targetBase) ||
               allInversions.find(inv => inv[0] >= 48) ||
               allInversions[Math.floor(allInversions.length / 2)];
    }

    let bestInversion = allInversions[0];
    let minDistance = Infinity;

    allInversions.forEach(inv => {
        // Sum of absolute pitch differences for matching positions
        // For different-length chords, compare up to the shorter length
        const len = Math.min(inv.length, prevNotes.length);
        let dist = 0;
        for (let i = 0; i < len; i++) {
            dist += Math.abs(inv[i] - prevNotes[i]);
        }
        // Penalize length mismatch slightly
        dist += Math.abs(inv.length - prevNotes.length) * 6;
        if (dist < minDistance) {
            minDistance = dist;
            bestInversion = inv;
        }
    });

    return bestInversion;
}

export const SCALE_CATEGORIES = {
  diatonic: { labelKey: "catDiatonic", order: 1 },
  pentatonic: { labelKey: "catPentatonic", order: 2 },
  blues: { labelKey: "catBlues", order: 3 },
  exotic: { labelKey: "catExotic", order: 4 },
  symmetric: { labelKey: "catSymmetric", order: 5 },
};

const makeScale = (key, category, intervals, targetInterval = null, modeKey = null) => ({
  key,
  category,
  intervals,
  noteCount: intervals.length,
  targetInterval,
  modeKey,
  emotion: { fr: "", en: "", pt: "", zh: "" },
  description: { fr: "", en: "", pt: "", zh: "" }
});

export const SCALES = {
  scale_major: makeScale('scale_major', "diatonic", [2, 2, 1, 2, 2, 2, 1], 11, "Ionian"),
  scale_minor: makeScale('scale_minor', "diatonic", [2, 1, 2, 2, 1, 2, 2], 8, "Aeolian"),
  scale_harmonic_minor: makeScale('scale_harmonic_minor', "diatonic", [2, 1, 2, 2, 1, 3, 1]),
  // Note sur la mineure mélodique :
  // Implémentation du mode "Jazz" (invariant) : la descente utilise les mêmes intervalles
  // que la montée. La théorie classique nécessiterait de descendre en mineure naturelle.
  scale_melodic_minor: makeScale('scale_melodic_minor', "diatonic", [2, 1, 2, 2, 2, 2, 1]),
  scale_dorian: makeScale('scale_dorian', "diatonic", [2, 1, 2, 2, 2, 1, 2], 9, "Dorian"),
  scale_phrygian: makeScale('scale_phrygian', "diatonic", [1, 2, 2, 2, 1, 2, 2], 1, "Phrygian"),
  scale_lydian: makeScale('scale_lydian', "diatonic", [2, 2, 2, 1, 2, 2, 1], 6, "Lydian"),
  scale_mixolydian: makeScale('scale_mixolydian', "diatonic", [2, 2, 1, 2, 2, 1, 2], 10, "Mixolydian"),
  scale_locrian: makeScale('scale_locrian', "diatonic", [1, 2, 2, 1, 2, 2, 2], 6, "Locrian"),
  scale_phrygian_dominant: makeScale('scale_phrygian_dominant', "diatonic", [1, 3, 1, 2, 1, 2, 2], 1, "PhrygianDominant"),
  scale_pentatonic_major: makeScale('scale_pentatonic_major', "pentatonic", [2, 2, 3, 2, 3]),
  scale_pentatonic_minor: makeScale('scale_pentatonic_minor', "pentatonic", [3, 2, 2, 3, 2]),
  scale_blues_minor: makeScale('scale_blues_minor', "blues", [3, 2, 1, 1, 3, 2]),
  scale_blues_major: makeScale('scale_blues_major', "blues", [2, 1, 1, 3, 2, 3]),
  scale_hirajoshi: makeScale('scale_hirajoshi', "exotic", [2, 1, 4, 1, 4]),
  scale_hungarian_minor: makeScale('scale_hungarian_minor', "exotic", [2, 1, 3, 1, 1, 3, 1]),
  scale_whole_tone: makeScale('scale_whole_tone', "symmetric", [2, 2, 2, 2, 2, 2]),
  scale_chromatic: makeScale('scale_chromatic', "symmetric", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
};

export const resolveScaleIntervals = (dictType) => {
    if (!dictType || typeof dictType !== 'string' || !dictType.startsWith('scale_')) return null;
    return SCALES[dictType] || null;
};

/**
 * Resolves a scale to its cumulative semitones from root.
 * @param {string} dictType 
 * @returns {number[]|null}
 */
export const resolveScaleSemitones = (dictType) => {
    const scale = resolveScaleIntervals(dictType);
    if (!scale) return null;
    const semitones = [0];
    let current = 0;
    // Last interval wraps back to octave, don't include it as a separate note usually
    for (let i = 0; i < scale.intervals.length - 1; i++) {
        current += scale.intervals[i];
        semitones.push(current);
    }
    return semitones;
};

export const getRelatedScales = (rootValue, scaleKey) => {
    const root = Number(rootValue);
    const related = [];
    
    if (scaleKey === 'scale_major') {
        related.push({ label: 'Relative Minor', rootValue: (root + 9) % 12, scaleKey: 'scale_minor' });
        related.push({ label: 'Parallel Minor', rootValue: root, scaleKey: 'scale_minor' });
    } else if (scaleKey === 'scale_minor') {
        related.push({ label: 'Relative Major', rootValue: (root + 3) % 12, scaleKey: 'scale_major' });
        related.push({ label: 'Parallel Major', rootValue: root, scaleKey: 'scale_major' });
    }
    return related;
};

// ---------------------------------------------------------
// CHORDS REGISTRY (Phase 10.A)
// Same pattern as SCALES — extensible, no hardcoding needed
// ---------------------------------------------------------

export const CHORD_CATEGORIES = {
  triads:    { labelKey: "catTriads",    order: 1 },
  seventh:   { labelKey: "catSeventh",   order: 2 },
  extended:  { labelKey: "catExtended",  order: 3 },
  suspended: { labelKey: "catSuspended", order: 4 },
};

/**
 * @param {string} key - Unique identifier (e.g. 'chord_major')
 * @param {string} category - Category key from CHORD_CATEGORIES
 * @param {number[]} semitones - Semitone distances from root (e.g. [0, 4, 7])
 * @param {object} [emotion] - Optional emotion/mood text per language
 * @param {object} [description] - Optional description text per language
 */
const makeChord = (key, category, semitones, emotion = null, description = null) => ({
  key,
  category,
  semitones,
  noteCount: semitones.length,
  emotion: emotion || { fr: "", en: "", pt: "", zh: "" },
  description: description || { fr: "", en: "", pt: "", zh: "" },
});

export const CHORDS = {
  // --- Triads ---
  chord_major: makeChord('chord_major', 'triads', [0, 4, 7],
    { fr: "Stable, Joyeux", en: "Stable, Joyful", pt: "Estável, Alegre", zh: "稳定，快乐" },
    { fr: "La triade fondamentale. Repos et résolution.", en: "The fundamental triad. Rest and resolution.", pt: "A tríade fundamental.", zh: "基本三和弦。" }),
  chord_minor: makeChord('chord_minor', 'triads', [0, 3, 7],
    { fr: "Mélancolique, Introspectif", en: "Melancholic, Introspective", pt: "Melancólico", zh: "忧郁，内省" },
    { fr: "Tierce mineure : tristesse et profondeur.", en: "Minor 3rd: sadness and depth.", pt: "Terça menor: tristeza.", zh: "小三度：悲伤。" }),
  chord_dim: makeChord('chord_dim', 'triads', [0, 3, 6],
    { fr: "Tendu, Instable", en: "Tense, Unstable", pt: "Tenso, Instável", zh: "紧张，不稳定" },
    { fr: "Quinte diminuée : tension maximale.", en: "Diminished 5th: maximum tension.", pt: "Quinta diminuta.", zh: "减五度：最大张力。" }),
  chord_aug: makeChord('chord_aug', 'triads', [0, 4, 8],
    { fr: "Flottant, Onirique", en: "Floating, Dreamy", pt: "Flutuante, Onírico", zh: "漂浮，梦幻" },
    { fr: "Quinte augmentée : suspense et rêve.", en: "Augmented 5th: suspense and dream.", pt: "Quinta aumentada.", zh: "增五度：悬念。" }),

  // --- Suspended ---
  chord_sus2: makeChord('chord_sus2', 'suspended', [0, 2, 7],
    { fr: "Ouvert, Ambigu", en: "Open, Ambiguous", pt: "Aberto, Ambíguo", zh: "开放，模糊" },
    { fr: "Seconde remplace la tierce : ni majeur ni mineur.", en: "2nd replaces the 3rd: neither major nor minor.", pt: "Segunda substitui a terça.", zh: "二度替代三度。" }),
  chord_sus4: makeChord('chord_sus4', 'suspended', [0, 5, 7],
    { fr: "Suspendu, Attente", en: "Suspended, Expectant", pt: "Suspenso", zh: "悬挂，期待" },
    { fr: "Quarte remplace la tierce : appelle une résolution.", en: "4th replaces the 3rd: calls for resolution.", pt: "Quarta substitui a terça.", zh: "四度替代三度。" }),

  // --- Seventh ---
  chord_maj7: makeChord('chord_maj7', 'seventh', [0, 4, 7, 11],
    { fr: "Riche, Jazzy, Lumineux", en: "Rich, Jazzy, Bright", pt: "Rico, Jazz", zh: "丰富，爵士，明亮" },
    { fr: "Septième majeure : sophistication et chaleur.", en: "Major 7th: sophistication and warmth.", pt: "Sétima maior.", zh: "大七度：精致与温暖。" }),
  chord_m7: makeChord('chord_m7', 'seventh', [0, 3, 7, 10],
    { fr: "Doux, Funky, Sophistiqué", en: "Smooth, Funky, Sophisticated", pt: "Suave, Funk", zh: "柔和，放克" },
    { fr: "Accord de base du jazz et du funk.", en: "The bread and butter of jazz and funk.", pt: "Base do jazz e funk.", zh: "爵士和放克的基础。" }),
  chord_7: makeChord('chord_7', 'seventh', [0, 4, 7, 10],
    { fr: "Tension, Blues, Résolution", en: "Tension, Blues, Resolution", pt: "Tensão, Blues", zh: "张力，蓝调" },
    { fr: "Accord de dominante : crée le besoin de résoudre.", en: "Dominant chord: creates the need to resolve.", pt: "Acorde dominante.", zh: "属和弦：需要解决。" }),
  chord_dim7: makeChord('chord_dim7', 'seventh', [0, 3, 6, 9],
    { fr: "Chromatique, Mystérieux", en: "Chromatic, Mysterious", pt: "Cromático, Misterioso", zh: "半音，神秘" },
    { fr: "Symétrique : chaque note peut être la fondamentale.", en: "Symmetric: every note can be the root.", pt: "Simétrico.", zh: "对称：每个音都可以是根音。" }),
  chord_m7b5: makeChord('chord_m7b5', 'seventh', [0, 3, 6, 10],
    { fr: "Sombre, Jazz, Transition", en: "Dark, Jazz, Transitional", pt: "Sombrio, Jazz", zh: "黑暗，爵士" },
    { fr: "Demi-diminué : pont du ii-V-i mineur.", en: "Half-diminished: bridge of the minor ii-V-i.", pt: "Meio-diminuto.", zh: "半减七：小调 ii-V-i 的桥梁。" }),

  // --- Extended ---
  chord_add9: makeChord('chord_add9', 'extended', [0, 4, 7, 14],
    { fr: "Cristallin, Moderne", en: "Crystalline, Modern", pt: "Cristalino, Moderno", zh: "水晶般，现代" },
    { fr: "Triade + 9ème sans 7ème. Son pop/rock brillant.", en: "Triad + 9th without 7th. Bright pop/rock sound.", pt: "Tríade + 9ª sem 7ª.", zh: "三和弦 + 九度。" }),
  chord_9: makeChord('chord_9', 'extended', [0, 4, 7, 10, 14],
    { fr: "Funk, Soul, Riche", en: "Funk, Soul, Rich", pt: "Funk, Soul", zh: "放克，灵魂" },
    { fr: "Dominante + 9ème. Groove funk par excellence.", en: "Dominant + 9th. The quintessential funk groove.", pt: "Dominante + 9ª.", zh: "属和弦 + 九度。" }),
  chord_m9: makeChord('chord_m9', 'extended', [0, 3, 7, 10, 14],
    { fr: "Velouté, Nocturne", en: "Velvety, Nocturnal", pt: "Aveludado, Noturno", zh: "天鹅绒般，夜晚" },
    { fr: "Extension mineure douce pour le jazz et le R&B.", en: "Soft minor extension for jazz and R&B.", pt: "Extensão menor suave.", zh: "柔和的小调扩展。" }),
};

/**
 * Returns a short, human-readable name for a chord (e.g., "C7", "Gbm").
 * Uses the US notation by default for internal mapping.
 * @param {number} rootValue - Chromatic root (0-11, C=0)
 * @param {string} chordType - The dictType of the chord
 * @returns {string|null} e.g. "Cmaj7"
 */
export const getChordShortName = (rootValue, chordType) => {
    const root = NOTES[rootValue % 12]?.us;
    if (!root || !chordType) return null;
    
    // Map chord types to their common short suffixes
    const suffixMap = {
        chord_major: "",
        chord_minor: "m",
        chord_dim: "dim",
        chord_aug: "aug",
        chord_sus2: "sus2",
        chord_sus4: "sus4",
        chord_maj7: "maj7",
        chord_m7: "m7",
        chord_7: "7",
        chord_dim7: "dim7",
        chord_m7b5: "m7b5",
        chord_add9: "add9",
        chord_9: "9",
        chord_m9: "m9"
    };

    const suffix = suffixMap[chordType];
    return suffix !== undefined ? `${root}${suffix}` : `${root}?`;
};

/**
 * Resolves a short name (e.g. "C7", "Am") back to rootValue and dictType.
 * @param {string} shortName 
 * @returns {object|null} { rootValue, dictType }
 */
export const resolveChordFromShortName = (shortName) => {
    if (!shortName) return null;
    
    // Normalize flats to sharps for lookup if needed, but our NOTES us/eu often have both
    // Actually, let's just find the root part first.
    let rootPart = shortName.substring(0, 1);
    let suffixPart = shortName.substring(1);
    if (shortName.length > 1 && (shortName[1] === '#' || shortName[1] === 'b')) {
        rootPart = shortName.substring(0, 2);
        suffixPart = shortName.substring(2);
    }
    
    const rootIdx = NOTES.findIndex(n => n.us === rootPart || n.eu === rootPart);
    if (rootIdx === -1) return null;
    
    const reverseSuffixMap = {
        "": "chord_major",
        "m": "chord_minor",
        "dim": "chord_dim",
        "aug": "chord_aug",
        "sus2": "chord_sus2",
        "sus4": "chord_sus4",
        "maj7": "chord_maj7",
        "Maj7": "chord_maj7",
        "m7": "chord_m7",
        "7": "chord_7",
        "dim7": "chord_dim7",
        "m7b5": "chord_m7b5",
        "add9": "chord_add9",
        "9": "chord_9",
        "m9": "chord_m9"
    };
    
    const dictType = reverseSuffixMap[suffixPart];
    return dictType ? { rootValue: rootIdx, dictType } : null;
};


/**
 * Resolves a dictType string to its chord data (semitones, category, etc.)
 * @param {string} dictType - e.g. 'chord_major', 'chord_m7'
 * @returns {object|null} Chord data or null if not found
 */
export const resolveChordSemitones = (dictType) => {
    if (!dictType || typeof dictType !== 'string' || !dictType.startsWith('chord_')) return null;
    return CHORDS[dictType] || null;
};

/**
 * Converts a chord definition to absolute MIDI pitches.
 * @param {number} rootValue - Chromatic root (0-11, C=0)
 * @param {number[]} semitones - Intervals from root, e.g. [0, 4, 7]
 * @param {number} octave - Base octave (default 4)
 * @returns {number[]} Absolute MIDI pitches
 */
export const getChordNotesAbsolute = (rootValue, semitones, octave = 4) => {
    const base = (octave + 1) * 12; // MIDI: C4 = 60 = (4+1)*12
    return semitones.map(s => base + rootValue + s);
};

export const getScaleNotesGeneric = (rootValue, intervals) => {
    if (!intervals) return [];
    let currentNotes = [];
    let currentIndex = rootValue;
    let order = 1;
    intervals.forEach(interval => {
        const note = NOTES.at(currentIndex % 12);
        currentNotes.push({ ...note, order: order++ });
        currentIndex += interval;
    });
    return currentNotes;
};

export const toRoman = (nnsStr) => {
  if (!nnsStr || typeof nnsStr !== 'string') return "";
  const map = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII" };
  
  // Extract degree (e.g., 2, b2, #4)
  const degreeMatch = nnsStr.match(/([#b]?)([1-7])/);
  if (!degreeMatch) return nnsStr;
  
  const prefix = degreeMatch[1];
  const baseNum = degreeMatch[2];
  let roman = map[baseNum];
  
  // Detect quality
  const isMinor = nnsStr.includes("-") || nnsStr.includes("m");
  const isDim = nnsStr.includes("°") || nnsStr.includes("dim");
  
  if (isMinor || isDim) roman = roman.toLowerCase();
  
  // Extract extra suffix (7, maj7, 9, etc.)
  let extension = nnsStr
    .replace(/^[#b]?[1-7]/, '') // remove degree
    .replace(/[-m°]|dim/g, ''); // remove quality markers
    
  let suffix = isDim ? "°" : "";
  
  return prefix + roman + suffix + extension;
};

// ---------------------------------------------------------
// CHORD-SCALE THEORY (Phase 10.E)
// ---------------------------------------------------------

export const CHORD_SCALE_MAP = {
    chord_major: ['scale_major', 'scale_lydian', 'scale_pentatonic_major'],
    chord_minor: ['scale_minor', 'scale_dorian', 'scale_pentatonic_minor', 'scale_blues_minor'],
    chord_dim: ['scale_locrian'],
    chord_aug: ['scale_whole_tone'],
    chord_sus2: ['scale_mixolydian', 'scale_dorian', 'scale_major'],
    chord_sus4: ['scale_mixolydian', 'scale_dorian', 'scale_major'],
    chord_maj7: ['scale_major', 'scale_lydian'],
    chord_m7: ['scale_minor', 'scale_dorian', 'scale_pentatonic_minor'],
    chord_7: ['scale_mixolydian', 'scale_blues_major', 'scale_phrygian_dominant'],
    chord_dim7: ['scale_harmonic_minor'], // Harmonic minor of the target
    chord_m7b5: ['scale_locrian'],
    chord_add9: ['scale_major', 'scale_lydian'],
    chord_9: ['scale_mixolydian'],
    chord_m9: ['scale_dorian', 'scale_minor']
};

/**
 * Returns a list of recommended scale keys for a given chord type.
 * @param {string} chordType - The dictType of the chord (e.g. 'chord_major')
 * @returns {string[]} Array of scale keys (e.g. ['scale_major', ...])
 */
export const getRecommendedScalesForChord = (chordType) => {
    return CHORD_SCALE_MAP[chordType] || [];
};

/**
 * Returns suggested next chords (diatonic and secondary dominants) for a given NNS degree.
 * Accepts both numeric NNS format ('2-', '5', '7°') and roman format ('vi', 'VI7', 'vii°').
 * @param {string} currentNns - The NNS degree of the current chord (e.g. '2-', 'VI7')
 * @returns {Array} Array of suggestions { chord: string, reason: string }
 */
export const getNextChordSuggestions = (currentNns) => {
    if (!currentNns) return [];
    
    const mapping = expertData.harmonicSubstitutions.secondaryDominants;
    
    // If the current chord IS already a secondary dominant string (e.g. 'VI7', 'II7'),
    // check the raw input directly against the mapping values first.
    for (const [target, dom] of Object.entries(mapping)) {
        if (currentNns === dom) {
            return [{ chord: target, reason: 'Résolution naturelle (Dominante Secondaire)' }];
        }
    }

    // Convert numeric NNS to roman notation for diatonicFlow lookup ('2-' → 'ii', '5' → 'V').
    // toRoman handles both numeric and already-roman inputs gracefully.
    const romanNns = toRoman(currentNns);
    
    // Normalise: strip the diminished suffix '°' for the diatonicFlow lookup key
    // e.g. 'vii°' → 'vii', 'VII°' → 'VII'
    const romanBase = romanNns.replace('°', '');
    
    const suggestions = [];
    
    // Standard diatonic flow (Circle of fifths mostly)
    const diatonicFlow = {
        'I':   'IV', // I → IV or V (special case below)
        'ii':  'V',
        'iii': 'vi',
        'IV':  'V',
        'V':   'I',
        'vi':  'ii',
        'vii': 'I'
    };
    
    const nextDiatonic = diatonicFlow[romanBase];
    if (nextDiatonic) {
        suggestions.push({ chord: nextDiatonic, reason: 'Enchaînement diatonique classique' });
        // If the current chord can be transformed into a secondary dominant to reach the next chord
        const targetDominant = mapping[nextDiatonic];
        if (targetDominant) {
            suggestions.push({ 
                chord: targetDominant, 
                reason: `Transformation en dominante pour viser ${toRoman(nextDiatonic)}` 
            });
        }
    }
    
    // Special case for I: can also go to V or vi (in addition to IV)
    if (romanBase === 'I') {
        suggestions.push({ chord: 'V', reason: 'Mouvement vers la dominante' });
        suggestions.push({ chord: 'vi', reason: 'Mouvement vers la relative mineure' });
    }
    
    return suggestions;
};


/**
 * Returns suggested next chords for an absolute chord (Dictionary Mode).
 * Since we don't have a tonal context, we use standard functional harmony resolutions.
 * @param {number} rootValue - Chromatic root (0-11)
 * @param {string} dictType - Chord type key (e.g. 'chord_major', 'chord_7')
 * @returns {Array} Array of suggestions { targetRoot: number, targetType: string, reason: string }
 */
export const getAbsoluteChordSuggestions = (rootValue, dictType) => {
    const suggestions = [];
    
    // Perfect 4th ascending (5 semitones)
    const p4 = (rootValue + 5) % 12;
    
    if (dictType === 'chord_7' || dictType === 'chord_9' || dictType === 'chord_13') {
        suggestions.push({
            targetRoot: p4,
            targetType: 'chord_major',
            reason: 'Résolution parfaite (V -> I)'
        });
        suggestions.push({
            targetRoot: p4,
            targetType: 'chord_minor',
            reason: 'Résolution parfaite mineure (V -> i)'
        });
    } 
    else if (dictType === 'chord_minor' || dictType === 'chord_m7' || dictType === 'chord_m9') {
        suggestions.push({
            targetRoot: p4,
            targetType: 'chord_7',
            reason: 'Progression Jazz (ii -> V)'
        });
    }
    else if (dictType === 'chord_major' || dictType === 'chord_maj7') {
        suggestions.push({
            targetRoot: p4,
            targetType: 'chord_major',
            reason: 'Mouvement de Sous-Dominante (I -> IV)'
        });
        // Dominant transformation (Secondary dominant V/IV)
        suggestions.push({
            targetRoot: rootValue,
            targetType: 'chord_7',
            reason: 'Transformation en dominante (I -> I7)'
        });
    }
    else if (dictType === 'chord_m7b5' || dictType === 'chord_dim7') {
        suggestions.push({
            targetRoot: p4,
            targetType: 'chord_7',
            reason: 'Progression mineure (ii° -> V)'
        });
    }
    
    return suggestions;
};

export const PITCH_MAP = {
  'R': 0,
  '2': 2,
  'b3': 3,
  '3': 4,
  '4': 5,
  '#4': 6,
  'b5': 6,
  '5': 7,
  'b6': 8,
  '6': 9,
  'b7': 10,
  '7': 11,
  '8va': 12,
  'octave': 12
};

export function getBassNote(chordRootValue, intervalLabel = 'R', baseOctave = 2, notation = 'us') {
  const semitones = PITCH_MAP[intervalLabel] || 0;
  const midiNote = (chordRootValue % 12) + semitones + (baseOctave + 1) * 12;
  const noteName = notation === 'eu' ? NOTES[midiNote % 12].eu : NOTES[midiNote % 12].us;
  return {
    name: `${noteName}${Math.floor(midiNote / 12) - 1}`,
    midi: midiNote
  };
}

export function getLeadingTone(nextChordRootValue, baseOctave = 2, notation = 'us') {
  const targetMidi = (nextChordRootValue % 12) + (baseOctave + 1) * 12;
  const leadingMidi = targetMidi - 1; 
  const noteName = notation === 'eu' ? NOTES[leadingMidi % 12].eu : NOTES[leadingMidi % 12].us;
  return {
    name: `${noteName}${Math.floor(leadingMidi / 12) - 1}`,
    midi: leadingMidi
  };
}

// ---------------------------------------------------------
// OCTAVE RANGE UTILITIES
// ---------------------------------------------------------

/**
 * Physical MIDI note ranges for each instrument.
 * Guitar standard: E2 (40) → ~D6 (86) with 22 frets
 * Bass standard:   E1 (28) → ~B3 (59) with 22 frets
 * Piano:           A0 (21) → C8 (108)
 */
export const INSTRUMENT_MIDI_RANGES = {
  guitar: { min: 40, max: 86 },
  bass:   { min: 28, max: 59 },
  piano:  { min: 21, max: 108 },
};

/**
 * Computes the absolute MIDI note value for a root note at a given dictOctave offset.
 * Formula: absoluteValue = rootValue + (5 + dictOctave) * 12
 *   - dictOctave=0 → baseOctave=4 → (4+1)*12 = 60 → C at MIDI 60 (C5 in project convention)
 * @param {number} rootValue - Semitone value of the note (0=C, 1=C#, ..., 11=B)
 * @param {number} dictOctave - Octave offset, range -3 to +3
 * @returns {number} Absolute MIDI note number
 */
export function computeAbsoluteNote(rootValue, dictOctave) {
  const baseOctave = 4 + dictOctave;
  return rootValue + (baseOctave + 1) * 12;
}

/**
 * Returns true if a MIDI note is within the physical playable range of the instrument.
 * Returns true for unknown instruments (no restriction applied).
 * @param {number} midiNote - Absolute MIDI note number
 * @param {string} instrument - 'guitar' | 'bass' | 'piano' | other
 * @returns {boolean}
 */
export function isNoteInRange(midiNote, instrument) {
  const range = INSTRUMENT_MIDI_RANGES[instrument];
  if (!range) return true; // unknown instrument: no restriction
  return midiNote >= range.min && midiNote <= range.max;
}

/**
 * Returns true if ALL notes in the sequence are within the instrument's playable range.
 * Accepts an array of numbers (MIDI values) or objects with an `absoluteValue` property.
 * Returns true for an empty sequence.
 * @param {Array<number|{absoluteValue: number}>} notes - Sequence of notes
 * @param {string} instrument - 'guitar' | 'bass' | 'piano' | other
 * @returns {boolean}
 */
export function isSequenceInRange(notes, instrument) {
  if (!notes || notes.length === 0) return true;
  return notes.every((n) => {
    const midi = typeof n === 'object' ? n.absoluteValue : n;
    return isNoteInRange(midi, instrument);
  });
}
