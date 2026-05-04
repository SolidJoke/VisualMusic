/**
 * VisualMusic Acoustic Engine
 * Handles the physics of sound and harmonic calculations.
 */

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Converts a frequency in Hz to a floating point MIDI note value.
 * @param {number} freq - Frequency in Hz
 * @returns {number} MIDI note value (float)
 */
export function freqToMidi(freq) {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Converts a MIDI note integer to its standard musical name.
 * @param {number} midi - MIDI note number
 * @returns {string} Note name (e.g. "A4")
 */
export function midiToNoteName(midi) {
  const roundedMidi = Math.round(midi);
  const noteIdx = roundedMidi % 12;
  // Handle negative index just in case, though MIDI shouldn't be negative in this context
  const safeIdx = (noteIdx + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return `${NOTES[safeIdx]}${octave}`;
}

/**
 * Generates the harmonic series for a given base frequency.
 * Calculates the exact frequency, nearest equal temperament note, and the deviation in cents.
 * 
 * @param {number} baseFreq - Fundamental frequency in Hz
 * @param {number} [maxHarmonics=16] - Number of harmonics to generate
 * @returns {Array} Array of harmonic objects
 */
export function getHarmonicSeries(baseFreq, maxHarmonics = 16) {
  const series = [];
  
  for (let n = 1; n <= maxHarmonics; n++) {
    const freq = baseFreq * n;
    const midiFloat = freqToMidi(freq);
    const nearestMidi = Math.round(midiFloat);
    const centsOffset = Math.round((midiFloat - nearestMidi) * 100);
    const noteName = midiToNoteName(nearestMidi);
    
    series.push({
      order: n,
      frequency: freq,
      noteName,
      centsOffset
    });
  }
  
  return series;
}
