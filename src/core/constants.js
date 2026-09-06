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
