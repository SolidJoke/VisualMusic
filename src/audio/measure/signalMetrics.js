// @ts-check
/**
 * signalMetrics.js — the arithmetic half of the offline audio harness (VMU-026).
 *
 * Pure functions over Float32Array/number[] sample buffers. No Web Audio, no
 * Tone.js, no DOM: this module runs unchanged in jsdom under vitest (so CI
 * covers it today) and inside a real Chromium page, where `offlineRender.js`
 * feeds it the samples an `OfflineAudioContext` actually produced. One
 * implementation, two callers — a second copy of an FFT is how two answers to
 * "what note is this" start disagreeing.
 *
 * Note naming goes through `midiToNoteName` from core/theory rather than a
 * local formatter. VMU-080 was nine sites naming MIDI values with their own
 * `Math.floor(v / 12)`; this file does not become the tenth.
 *
 * @module audio/measure/signalMetrics
 */
import { midiToNoteName } from "../../core/theory";

/** Amplitude below which we call a buffer silent, in dBFS. */
export const SILENCE_FLOOR_DBFS = -90;

/** Floor used instead of -Infinity when a level is exactly zero. */
const DB_FLOOR = -200;

/**
 * Linear amplitude to dBFS, floored at DB_FLOOR so callers never have to
 * special-case -Infinity in a printed table or a comparison.
 * @param {number} amplitude linear, 1.0 = full scale
 * @returns {number} dBFS
 */
export function toDbfs(amplitude) {
  const a = Math.abs(amplitude);
  if (!(a > 0)) return DB_FLOOR;
  return Math.max(DB_FLOOR, 20 * Math.log10(a));
}

/** dBFS back to linear amplitude. @param {number} db @returns {number} */
export function fromDbfs(db) {
  return Math.pow(10, db / 20);
}

/**
 * Peak and RMS level of a buffer.
 *
 * Peak answers "does this clip" (VMU-020: the mix was measured entering the
 * compressor at +5 dBFS, i.e. peak > 1.0). RMS answers "how loud is it",
 * which is the gain-staging question (VMU-024).
 *
 * @param {Float32Array|number[]} samples
 * @returns {{ peak: number, peakDbfs: number, rms: number, rmsDbfs: number,
 *             clippedSamples: number, length: number }}
 */
export function levelMetrics(samples) {
  let peak = 0;
  let sumSquares = 0;
  let clippedSamples = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const a = Math.abs(s);
    if (a > peak) peak = a;
    // Full scale is 1.0. A rendered OfflineAudioContext buffer is *not*
    // clamped, so values above 1.0 survive into the buffer and are exactly
    // what would clip on a real device — this is why the harness can see
    // VMU-020's +5 dBFS at all.
    if (a > 1) clippedSamples++;
    sumSquares += s * s;
  }
  const rms = samples.length > 0 ? Math.sqrt(sumSquares / samples.length) : 0;
  return {
    peak,
    peakDbfs: toDbfs(peak),
    rms,
    rmsDbfs: toDbfs(rms),
    clippedSamples,
    length: samples.length,
  };
}

/**
 * Whether a buffer carries no audible signal.
 *
 * This is the check that would have caught VMU-100 (EU notation played
 * silence): a code path that renders nothing produces a buffer whose peak sits
 * at the floor, and no human has to notice the absence.
 *
 * @param {Float32Array|number[]} samples
 * @param {number} [floorDbfs] level at or below which the buffer counts as silent
 * @returns {{ silent: boolean, peakDbfs: number, floorDbfs: number }}
 */
export function silenceMetrics(samples, floorDbfs = SILENCE_FLOOR_DBFS) {
  const { peakDbfs } = levelMetrics(samples);
  return { silent: peakDbfs <= floorDbfs, peakDbfs, floorDbfs };
}

/**
 * Largest jump between consecutive samples, a proxy for clicks and
 * discontinuities (VMU-081: crackle at playback start and on repeat).
 *
 * A band-limited musical signal moves smoothly; an ungated envelope or a
 * buffer restart shows up as a step. Reported as the raw jump plus how many
 * jumps exceed `threshold`, so a caller can assert "no step above x".
 *
 * @param {Float32Array|number[]} samples
 * @param {number} [threshold] jump size counted as a discontinuity
 * @returns {{ maxJump: number, maxJumpAt: number, jumpsOverThreshold: number, threshold: number }}
 */
export function discontinuityMetrics(samples, threshold = 0.5) {
  let maxJump = 0;
  let maxJumpAt = -1;
  let jumpsOverThreshold = 0;
  for (let i = 1; i < samples.length; i++) {
    const jump = Math.abs(samples[i] - samples[i - 1]);
    if (jump > maxJump) {
      maxJump = jump;
      maxJumpAt = i;
    }
    if (jump > threshold) jumpsOverThreshold++;
  }
  return { maxJump, maxJumpAt, jumpsOverThreshold, threshold };
}

/**
 * Frame-wise gain reduction between a tap before a dynamics processor and the
 * tap after it.
 *
 * Both taps come from the *same* render (see offlineRender.js, which merges
 * pre into channel 0 and post into channel 1), so the comparison is
 * sample-aligned. Rendering twice and diffing would not work: the drum voices
 * are NoiseSynths, so two renders are not the same signal.
 *
 * `framesOverThresholdRatio` is the number VMU-020 quotes as "31 % of frames
 * above the threshold", recomputed rather than trusted.
 *
 * The two taps are aligned first. Chrome's DynamicsCompressorNode applies a
 * fixed look-ahead delay (measured here, 2026-09-16: ~6.4 ms, 282 samples at
 * 44.1 kHz), so a naive frame-by-frame comparison lines each onset in `pre`
 * up against silence in `post` and each decay against a louder earlier frame.
 * Unaligned, this function reported max 16.4 dB of reduction and a *negative*
 * mean on a single piano note — reduction cannot be negative, which is what
 * gave the delay away.
 *
 * @param {Float32Array|number[]} pre samples before the processor
 * @param {Float32Array|number[]} post samples after it
 * @param {Object} [options]
 * @param {number} [options.frameSize] samples per frame
 * @param {number} [options.floorDbfs] frames whose pre-level is below this are ignored
 * @param {number} [options.thresholdDbfs] processor threshold, for the ratio above
 * @param {boolean} [options.align] compensate the processor's look-ahead delay
 * @param {number} [options.sampleRate] only used to report the alignment in ms
 * @returns {{ maxDb: number, meanDb: number, p95Db: number, framesCounted: number,
 *             framesOverThresholdRatio: number, thresholdDbfs: number, frameSize: number,
 *             alignmentSamples: number, alignmentMs: number }}
 */
export function gainReductionMetrics(pre, post, options = {}) {
  const { frameSize = 512, floorDbfs = -60, thresholdDbfs = -6, align = true, sampleRate = 44100 } = options;
  const lag = align ? estimateAlignmentSamples(pre, post) : 0;
  const n = Math.min(pre.length - lag, post.length - lag);
  /** @type {number[]} */
  const reductions = [];
  let framesOverThreshold = 0;
  let framesWithSignal = 0;

  for (let start = 0; start + frameSize <= n; start += frameSize) {
    let prePeak = 0;
    let postPeak = 0;
    for (let i = start; i < start + frameSize; i++) {
      const a = Math.abs(pre[i]);
      const b = Math.abs(post[i + lag]);
      if (a > prePeak) prePeak = a;
      if (b > postPeak) postPeak = b;
    }
    const preDb = toDbfs(prePeak);
    if (preDb < floorDbfs) continue; // silence tells us nothing about reduction
    framesWithSignal++;
    if (preDb > thresholdDbfs) framesOverThreshold++;
    reductions.push(preDb - toDbfs(postPeak));
  }

  if (reductions.length === 0) {
    return {
      maxDb: 0, meanDb: 0, p95Db: 0, framesCounted: 0,
      framesOverThresholdRatio: 0, thresholdDbfs, frameSize,
      alignmentSamples: lag, alignmentMs: (lag / sampleRate) * 1000,
    };
  }
  const sorted = [...reductions].sort((a, b) => a - b);
  const sum = reductions.reduce((acc, v) => acc + v, 0);
  return {
    maxDb: sorted[sorted.length - 1],
    meanDb: sum / reductions.length,
    p95Db: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    framesCounted: reductions.length,
    framesOverThresholdRatio: framesWithSignal > 0 ? framesOverThreshold / framesWithSignal : 0,
    thresholdDbfs,
    frameSize,
    alignmentSamples: lag,
    alignmentMs: (lag / sampleRate) * 1000,
  };
}

/**
 * How many samples `post` lags behind `pre`, by correlating their rectified
 * envelopes.
 *
 * Needed because a dynamics processor is not a pure gain: Chrome's compressor
 * delays its output by a fixed look-ahead. Correlating envelopes rather than
 * waveforms keeps this robust when the processor has also changed the signal's
 * shape, which is the whole point of comparing the two taps.
 *
 * @param {Float32Array|number[]} pre
 * @param {Float32Array|number[]} post
 * @param {Object} [options]
 * @param {number} [options.maxLagSamples] widest delay considered
 * @param {number} [options.hop] envelope resolution, in samples
 * @returns {number} lag in samples, never negative
 */
export function estimateAlignmentSamples(pre, post, options = {}) {
  const { maxLagSamples = 2048, hop = 32 } = options;
  const n = Math.min(pre.length, post.length);
  if (n <= maxLagSamples * 2) return 0;

  const envelope = (buf) => {
    const out = new Float64Array(Math.floor(n / hop));
    for (let f = 0; f < out.length; f++) {
      let peak = 0;
      for (let i = f * hop; i < (f + 1) * hop; i++) {
        const a = Math.abs(buf[i]);
        if (a > peak) peak = a;
      }
      out[f] = peak;
    }
    return out;
  };

  const a = envelope(pre);
  const b = envelope(post);
  const maxLagFrames = Math.floor(maxLagSamples / hop);
  let bestLag = 0;
  let bestScore = -Infinity;

  for (let lag = 0; lag <= maxLagFrames; lag++) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i + lag < b.length && i < a.length; i++) {
      dot += a[i] * b[i + lag];
      normA += a[i] * a[i];
      normB += b[i + lag] * b[i + lag];
    }
    const denom = Math.sqrt(normA * normB);
    if (denom <= 0) continue;
    const score = dot / denom;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return bestLag * hop;
}

// ─── Spectrum ────────────────────────────────────────────────────────

/**
 * In-place iterative radix-2 Cooley-Tukey FFT.
 *
 * Hand-rolled rather than pulled from a package: it is thirty lines, it has to
 * run identically in jsdom and in Chromium, and a native dependency for this
 * would have to be justified against exactly thirty lines.
 *
 * @param {Float64Array} re real parts, length must be a power of two
 * @param {Float64Array} im imaginary parts, same length
 * @returns {void} transforms in place
 */
export function fftInPlace(re, im) {
  const n = re.length;
  if (n !== im.length) throw new Error("fftInPlace: re and im must be the same length");
  if (n < 2 || (n & (n - 1)) !== 0) throw new Error(`fftInPlace: length must be a power of two, got ${n}`);

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * Magnitude spectrum of one window of samples.
 *
 * @param {Float32Array|number[]} samples
 * @param {Object} options
 * @param {number} options.sampleRate
 * @param {number} [options.fftSize] power of two; defaults to 16384 (~2.7 Hz/bin at 44.1 kHz)
 * @param {number} [options.offset] first sample of the analysis window
 * @returns {{ magnitudes: Float64Array, binHz: number, fftSize: number, offset: number }}
 */
export function magnitudeSpectrum(samples, options) {
  const { sampleRate, fftSize = 16384, offset = 0 } = options;
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const available = Math.max(0, Math.min(fftSize, samples.length - offset));
  for (let i = 0; i < available; i++) {
    // Hann window: the sidelobes of a rectangular window are tall enough to
    // invent peaks a semitone away from a real one.
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    re[i] = samples[offset + i] * w;
  }
  fftInPlace(re, im);
  const half = fftSize / 2;
  const magnitudes = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    magnitudes[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return { magnitudes, binHz: sampleRate / fftSize, fftSize, offset };
}

/**
 * Refines a spectral peak to sub-bin accuracy by fitting a parabola through
 * the log-magnitudes of the peak bin and its two neighbours.
 *
 * Without this, resolution is the bin width: 2.7 Hz at 44.1 kHz / 16384, which
 * is 18 cents at C4 and would make any "is this the right note" tolerance a
 * statement about the FFT size rather than about the audio.
 *
 * @param {Float64Array} magnitudes
 * @param {number} k index of the local maximum
 * @returns {number} fractional bin index
 */
export function refinePeakBin(magnitudes, k) {
  if (k <= 0 || k >= magnitudes.length - 1) return k;
  const l = Math.log(magnitudes[k - 1] + 1e-20);
  const c = Math.log(magnitudes[k] + 1e-20);
  const r = Math.log(magnitudes[k + 1] + 1e-20);
  const denom = l - 2 * c + r;
  if (denom === 0) return k;
  const delta = (0.5 * (l - r)) / denom;
  return k + Math.max(-0.5, Math.min(0.5, delta));
}

/** Frequency in Hz to fractional MIDI number (A4 = 440 Hz = 69). */
export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

/** Fractional MIDI number to Hz. */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Signed distance in cents from `freq` to the nearest equal-tempered semitone. */
export function centsFromEqualTemperament(freq) {
  const midi = freqToMidi(freq);
  return (midi - Math.round(midi)) * 100;
}

/**
 * Which pitches are actually present in rendered audio.
 *
 * This is the "do we hear what the screen shows" measurement: VMU-080 (chords
 * played an octave above the display), VMU-103, VMU-104 and VMU-105 were all
 * found by hand because nobody could ask the audio what it contained.
 *
 * Harmonic suppression matters more than the FFT here. A piano C4 puts real
 * energy at C5 and G5; without dropping peaks that sit on an integer multiple
 * of a stronger, lower peak, a single note reports as a chord.
 *
 * @param {Float32Array|number[]} samples
 * @param {Object} options
 * @param {number} options.sampleRate
 * @param {number} [options.fftSize]
 * @param {number} [options.offset] analysis window start, in samples
 * @param {number} [options.maxPitches] keep at most this many, strongest first
 * @param {number} [options.peakFloorDb] ignore peaks this far below the strongest one
 * @param {number} [options.minHz] low edge of the fundamental search band
 * @param {number} [options.maxHz] high edge of the fundamental search band
 * @param {number} [options.harmonicToleranceCents] how close to n*f counts as a harmonic
 * @returns {{ pitches: Array<{ freq: number, midi: number, note: string, cents: number,
 *                               magDb: number, partialOf: number|null, partialNumber: number|null }>,
 *             fundamentals: Array<Object>, binHz: number, fftSize: number }}
 */
export function detectPitches(samples, options) {
  const {
    sampleRate,
    fftSize = 16384,
    offset = 0,
    maxPitches = 8,
    peakFloorDb = -32,
    minHz = 50,
    maxHz = 5000,
    harmonicToleranceCents = 60,
  } = options;

  const { magnitudes, binHz } = magnitudeSpectrum(samples, { sampleRate, fftSize, offset });
  const loBin = Math.max(1, Math.floor(minHz / binHz));
  const hiBin = Math.min(magnitudes.length - 2, Math.ceil(maxHz / binHz));

  let globalMax = 0;
  for (let i = loBin; i <= hiBin; i++) if (magnitudes[i] > globalMax) globalMax = magnitudes[i];
  if (globalMax <= 0) return { pitches: [], fundamentals: [], binHz, fftSize };
  const floor = globalMax * fromDbfs(peakFloorDb);

  /** @type {Array<{ freq: number, mag: number }>} */
  const candidates = [];
  for (let i = loBin; i <= hiBin; i++) {
    const m = magnitudes[i];
    if (m < floor) continue;
    if (m <= magnitudes[i - 1] || m < magnitudes[i + 1]) continue; // local maximum only
    candidates.push({ freq: refinePeakBin(magnitudes, i) * binHz, mag: m });
  }

  // Strongest first, so that when two bins land on the same semitone the more
  // prominent one is the one kept.
  candidates.sort((a, b) => b.mag - a.mag);

  /** @type {Array<{ freq: number, mag: number }>} */
  const distinct = [];
  for (const cand of candidates) {
    // Two bins on the same semitone are one pitch, not two.
    if (distinct.some((k) => Math.abs(1200 * Math.log2(cand.freq / k.freq)) < 50)) continue;
    distinct.push(cand);
    if (distinct.length >= maxPitches) break;
  }
  distinct.sort((a, b) => a.freq - b.freq);

  const pitches = distinct.map((k, index) => {
    const midi = freqToMidi(k.freq);
    // Which lower peak this one is an integer multiple of, if any.
    //
    // Annotated, not dropped. Dropping was tried first and was wrong: it
    // depended on which peak the magnitude sort reached first, and in a real
    // piano sample the second partial routinely beats the fundamental, so a
    // single C4 came back as "C4 and C5" — C5 was kept first, and C4, which
    // only ever looks upward, never suppressed it. Annotating is also the
    // honest shape of the problem: a played C5 and the second partial of a
    // played C4 are the same spectral line, and no arithmetic separates them.
    // Callers decide, in domain terms, whether a partial is expected —
    // see comparePitchContent.
    let partialOf = null;
    let partialNumber = null;
    for (let j = 0; j < index; j++) {
      const ratio = k.freq / distinct[j].freq;
      const nearest = Math.round(ratio);
      if (nearest < 2 || nearest > 10) continue;
      if (Math.abs(1200 * Math.log2(ratio / nearest)) < harmonicToleranceCents) {
        partialOf = distinct[j].freq;
        partialNumber = nearest;
        break;
      }
    }
    return {
      freq: k.freq,
      midi,
      note: midiToNoteName(Math.round(midi)),
      cents: centsFromEqualTemperament(k.freq),
      magDb: toDbfs(k.mag / globalMax),
      partialOf,
      partialNumber,
    };
  });

  return {
    pitches,
    fundamentals: pitches.filter((p) => p.partialOf === null),
    binHz,
    fftSize,
  };
}

/**
 * Whether rendered audio contains the notes that were asked for, and nothing
 * it cannot account for.
 *
 * This is the assertion that can honestly be made about a real instrument, as
 * opposed to a synthetic sine. A played note brings its partials with it, so
 * "the set of detected pitches equals the set of requested notes" is false for
 * every real sample. What must hold instead is:
 *
 *   - every requested note is present, and
 *   - every detected pitch is either a requested note or an integer multiple
 *     of one.
 *
 * It still catches the failures this harness exists for. VMU-080 played
 * C5/E5/G5 where C4/E4/G4 were shown: C4 is then absent, so `missing` is not
 * empty and the check fails — even though C5 is a legitimate partial of C4.
 *
 * @param {Array<{ note: string, freq: number, midi: number }>} detected
 * @param {string[]} expectedNotes
 * @param {Object} [options]
 * @param {number} [options.toleranceCents]
 * @param {number} [options.harmonicToleranceCents]
 * @returns {{ ok: boolean, missing: string[], unexplained: string[], worstCents: number }}
 */
export function comparePitchContent(detected, expectedNotes, options = {}) {
  const { toleranceCents = 50, harmonicToleranceCents = 60 } = options;
  const expectedFreqs = expectedNotes.map((n) => midiToFreq(noteNameToMidi(n)));

  /** @type {string[]} */
  const missing = [];
  let worstCents = 0;
  expectedNotes.forEach((name, i) => {
    let best = Infinity;
    for (const d of detected) {
      best = Math.min(best, Math.abs(1200 * Math.log2(d.freq / expectedFreqs[i])));
    }
    if (best > toleranceCents) missing.push(name);
    else worstCents = Math.max(worstCents, best);
  });

  const unexplained = detected
    .filter((d) => {
      for (const f of expectedFreqs) {
        if (Math.abs(1200 * Math.log2(d.freq / f)) <= toleranceCents) return false;
        const ratio = d.freq / f;
        const nearest = Math.round(ratio);
        if (nearest >= 2 && nearest <= 10 && Math.abs(1200 * Math.log2(ratio / nearest)) < harmonicToleranceCents) {
          return false;
        }
      }
      return true;
    })
    .map((d) => d.note);

  return { ok: missing.length === 0 && unexplained.length === 0, missing, unexplained, worstCents };
}

/**
 * Compares detected pitches against expected note names, within a cents
 * tolerance. Returns the comparison rather than throwing, so both the vitest
 * assertions and the printed table use the same verdict.
 *
 * @param {Array<{ note: string, freq: number, midi: number }>} detected
 * @param {string[]} expectedNotes e.g. ["C4", "E4", "G4"]
 * @param {number} [toleranceCents]
 * @returns {{ ok: boolean, matched: string[], missing: string[], unexpected: string[], worstCents: number }}
 */
export function comparePitches(detected, expectedNotes, toleranceCents = 50) {
  const remaining = [...detected];
  /** @type {string[]} */
  const matched = [];
  /** @type {string[]} */
  const missing = [];
  let worstCents = 0;

  for (const expected of expectedNotes) {
    const expectedMidi = noteNameToMidi(expected);
    let bestIndex = -1;
    let bestCents = Infinity;
    remaining.forEach((d, i) => {
      const cents = Math.abs((d.midi - expectedMidi) * 100);
      if (cents < bestCents) {
        bestCents = cents;
        bestIndex = i;
      }
    });
    if (bestIndex >= 0 && bestCents <= toleranceCents) {
      matched.push(expected);
      worstCents = Math.max(worstCents, bestCents);
      remaining.splice(bestIndex, 1);
    } else {
      missing.push(expected);
    }
  }

  return {
    ok: missing.length === 0 && remaining.length === 0,
    matched,
    missing,
    unexpected: remaining.map((d) => d.note),
    worstCents,
  };
}

const PITCH_CLASS_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Note name to MIDI, US naming, middle C = C4 = 60 — the convention
 * `midiToNoteName` and the whole project use.
 * @param {string} name e.g. "C4", "F#3", "Eb5"
 * @returns {number}
 */
export function noteNameToMidi(name) {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(String(name).trim());
  if (!match) throw new Error(`noteNameToMidi: cannot parse "${name}"`);
  const [, letter, accidental, octave] = match;
  let semitone = PITCH_CLASS_SEMITONES[letter.toUpperCase()];
  if (accidental === "#") semitone += 1;
  if (accidental === "b") semitone -= 1;
  return semitone + (Number(octave) + 1) * 12;
}

/**
 * Everything the harness reports about one rendered channel, in one call.
 *
 * @param {Float32Array|number[]} samples
 * @param {Object} options
 * @param {number} options.sampleRate
 * @param {number} [options.pitchOffset] analysis window start for pitch detection
 * @param {number} [options.fftSize]
 * @param {number} [options.maxPitches]
 * @returns {Object}
 */
export function analyzeChannel(samples, options) {
  const { sampleRate, pitchOffset = 0, fftSize = 16384, maxPitches = 8 } = options;
  const level = levelMetrics(samples);
  return {
    ...level,
    sampleRate,
    durationSec: samples.length / sampleRate,
    silence: silenceMetrics(samples),
    discontinuity: discontinuityMetrics(samples),
    ...(level.peak > 0
      ? detectPitches(samples, { sampleRate, fftSize, offset: pitchOffset, maxPitches })
      : { pitches: [], fundamentals: [], binHz: sampleRate / fftSize, fftSize }),
  };
}
