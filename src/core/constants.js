/**
 * Shared musical constants — single source of truth.
 * Import from here instead of duplicating across modules.
 */

/**
 * Chromatic note definitions with enharmonic equivalents.
 * Used by theory.js, tonal-adapter.js, and audio modules.
 * @constant
 */
export const NOTES = [
    { value: 0, us: 'C', eu: 'Do' }, { value: 1, us: 'C#', eu: 'Do#' },
    { value: 2, us: 'D', eu: 'Ré' }, { value: 3, us: 'D#', eu: 'Ré#' },
    { value: 4, us: 'E', eu: 'Mi' }, { value: 5, us: 'F', eu: 'Fa' },
    { value: 6, us: 'F#', eu: 'Fa#' }, { value: 7, us: 'G', eu: 'Sol' },
    { value: 8, us: 'G#', eu: 'Sol#' }, { value: 9, us: 'A', eu: 'La' },
    { value: 10, us: 'A#', eu: 'La#' }, { value: 11, us: 'B', eu: 'Si' }
];

/**
 * Physical MIDI note ranges for each instrument.
 * Guitar standard: E2 (40) → ~D6 (86) with 22 frets
 * Bass standard:   E1 (28) → ~B3 (59) with 22 frets
 * Piano:           A0 (21) → C8 (108)
 * @constant
 */
export const INSTRUMENT_MIDI_RANGES = {
  guitar: { min: 40, max: 86 },
  bass:   { min: 28, max: 59 },
  piano:  { min: 21, max: 108 },
};

/**
 * Maps chord dictType keys to i18n translation keys.
 * @constant
 */
export const CHORD_LABEL_MAP = {
  chord_major: "chordMaj",
  chord_minor: "chordMin",
  chord_dim: "chordDim",
  chord_aug: "chordAug",
  chord_sus2: "chordSus2",
  chord_sus4: "chordSus4",
  chord_maj7: "chordMaj7",
  chord_m7: "chordM7",
  chord_7: "chord7",
  chord_dim7: "chordDim7",
  chord_m7b5: "chordM7b5",
  chord_add9: "chordAdd9",
  chord_9: "chord9",
  chord_m9: "chordM9",
};

/**
 * Maps scale dictType keys to i18n translation keys.
 * @constant
 */
export const SCALE_LABEL_MAP = {
  scale_major: "scaleMaj",
  scale_minor: "scaleMin",
  scale_harmonic_minor: "scaleHarmonicMinor",
  scale_melodic_minor: "scaleMelodicMinor",
  scale_dorian: "scaleDorian",
  scale_phrygian: "scalePhrygian",
  scale_lydian: "scaleLydian",
  scale_mixolydian: "scaleMixolydian",
  scale_locrian: "scaleLocrian",
  scale_phrygian_dominant: "scalePhrygianDom",
  scale_pentatonic_major: "scalePentaMaj",
  scale_pentatonic_minor: "scalePentaMin",
  scale_blues_minor: "scaleBluesMin",
  scale_blues_major: "scaleBluesMaj",
  scale_hirajoshi: "scaleHirajoshi",
  scale_hungarian_minor: "scaleHungarianMin",
  scale_whole_tone: "scaleWholeTone",
  scale_chromatic: "scaleChromatic",
};
