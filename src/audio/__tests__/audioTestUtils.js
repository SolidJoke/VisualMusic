/**
 * audioTestUtils.js — Mathematical audio validation utilities
 *
 * These utilities enable "earless" audio testing: validating frequencies,
 * rhythmic patterns, and harmonic purity through math, not listening.
 *
 * Uses OfflineAudioContext for non-real-time buffer rendering,
 * and custom FFT/spectral analysis on the resulting Float32Arrays.
 *
 * @module audioTestUtils
 */

/**
 * Render audio offline using a setup function.
 *
 * @param {number} durationSec - Duration to render in seconds
 * @param {number} sampleRate - Sample rate (default 44100)
 * @param {function} setupFn - Receives (offlineCtx) to build the audio graph
 * @returns {Promise<Float32Array>} - The rendered audio buffer (mono, channel 0)
 */
export async function renderOffline(durationSec, sampleRate = 44100, setupFn) {
  const length = Math.ceil(sampleRate * durationSec);
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
  await setupFn(offlineCtx);
  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

/**
 * Compute a simple DFT magnitude spectrum from a time-domain buffer.
 * For test purposes we don't need full FFT performance — correctness matters.
 *
 * @param {Float32Array} buffer - Time-domain samples
 * @param {number} sampleRate - Sample rate
 * @returns {{ frequencies: Float64Array, magnitudes: Float64Array }}
 */
export function computeSpectrum(buffer, sampleRate) {
  const N = buffer.length;
  const halfN = Math.floor(N / 2);
  const magnitudes = new Float64Array(halfN);
  const frequencies = new Float64Array(halfN);

  for (let k = 0; k < halfN; k++) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real += buffer[n] * Math.cos(angle);
      imag -= buffer[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(real * real + imag * imag) / N;
    frequencies[k] = (k * sampleRate) / N;
  }

  return { frequencies, magnitudes };
}

/**
 * Find the frequency with the highest magnitude in a spectrum.
 *
 * @param {Float64Array} frequencies
 * @param {Float64Array} magnitudes
 * @param {number} [minFreq=20] - Ignore frequencies below this (skip DC)
 * @returns {{ frequency: number, magnitude: number }}
 */
export function getPeakFrequency(frequencies, magnitudes, minFreq = 20) {
  let maxMag = -Infinity;
  let peakFreq = 0;

  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] < minFreq) continue;
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      peakFreq = frequencies[i];
    }
  }

  return { frequency: peakFreq, magnitude: maxMag };
}

/**
 * Calculate Spectral Flatness (Wiener entropy).
 * A pure tone → near 0. White noise → near 1.
 *
 * Formula: geometric_mean(magnitudes) / arithmetic_mean(magnitudes)
 *
 * @param {Float64Array} magnitudes - Magnitude spectrum (positive values)
 * @returns {number} - Spectral flatness in [0, 1]
 */
export function spectralFlatness(magnitudes) {
  const N = magnitudes.length;
  if (N === 0) return 0;

  let logSum = 0;
  let arithmeticSum = 0;
  let count = 0;

  for (let i = 0; i < N; i++) {
    const val = Math.max(magnitudes[i], 1e-12); // avoid log(0)
    logSum += Math.log(val);
    arithmeticSum += val;
    count++;
  }

  if (count === 0 || arithmeticSum === 0) return 0;

  const geometricMean = Math.exp(logSum / count);
  const arithmeticMean = arithmeticSum / count;

  return geometricMean / arithmeticMean;
}

/**
 * Detect onsets (transients) in a time-domain buffer.
 * Uses a simple energy-threshold approach with a sliding window.
 *
 * @param {Float32Array} buffer - Time-domain samples
 * @param {number} sampleRate - Sample rate
 * @param {object} [opts]
 * @param {number} [opts.windowSize=512] - Window size in samples
 * @param {number} [opts.threshold=0.02] - Energy threshold for onset
 * @param {number} [opts.minGapMs=50] - Minimum gap between onsets in ms
 * @returns {number[]} - Array of onset times in seconds
 */
export function detectOnsets(buffer, sampleRate, opts = {}) {
  const {
    windowSize = 512,
    threshold = 0.02,
    minGapMs = 50,
  } = opts;

  const minGapSamples = (minGapMs / 1000) * sampleRate;
  const onsets = [];
  let lastOnsetSample = -minGapSamples;

  for (let i = 0; i < buffer.length - windowSize; i += windowSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += buffer[i + j] * buffer[i + j];
    }
    energy /= windowSize;

    if (energy > threshold && (i - lastOnsetSample) >= minGapSamples) {
      onsets.push(i / sampleRate);
      lastOnsetSample = i;
    }
  }

  return onsets;
}

/**
 * Calculate BPM from onset times via Inter-Beat Intervals.
 *
 * @param {number[]} onsets - Onset times in seconds
 * @returns {number|null} - Estimated BPM, or null if insufficient data
 */
export function estimateBPM(onsets) {
  if (onsets.length < 3) return null;

  const intervals = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  // Median IBI (more robust than mean)
  intervals.sort((a, b) => a - b);
  const medianIBI = intervals[Math.floor(intervals.length / 2)];

  if (medianIBI <= 0) return null;
  return 60 / medianIBI;
}

/**
 * Check that no sample in the buffer exceeds a given dBFS ceiling.
 *
 * @param {Float32Array} buffer - Time-domain samples
 * @param {number} ceilingDbFS - Maximum allowed level in dBFS (e.g. -1)
 * @returns {{ passed: boolean, peakDbFS: number }}
 */
export function checkPeakLevel(buffer, ceilingDbFS = -1) {
  let peakAbs = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > peakAbs) peakAbs = abs;
  }

  const peakDbFS = peakAbs > 0 ? 20 * Math.log10(peakAbs) : -Infinity;
  return {
    passed: peakDbFS <= ceilingDbFS,
    peakDbFS,
  };
}
