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

/**
 * Highest partial number still recognised as a harmonic of a lower peak.
 * Measured on the Salamander piano samples: the 9th partial shows up above the
 * detection floor on a C major triad, so a window of 10 was too narrow and
 * reported real partials as notes nobody asked for.
 */
export const MAX_PARTIAL = 16;

/**
 * A detected peak is only *judged* if it is within this many dB of the
 * strongest peak in the spectrum.
 *
 * Weak peaks are still listed — they are useful in the printed table — but
 * they must not decide a pass/fail, because they are not reproducible.
 * `Tone.Reverb` builds its impulse response from noise, so no two renders are
 * bit-identical: measured 2026-09-16, the 8th-strongest peak of the same
 * triad came back as D7 in one run and G#6 in the next, both around -17 dB.
 * Judging those made the verdict a coin toss. Everything that matters is far
 * above this line: the three fundamentals of that triad sit between -2 and
 * -4.7 dB.
 */
export const SIGNIFICANCE_DB = -15;

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
 * @param {Float32Array|Float64Array|number[]} samples
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

// ─── Loudness (ITU-R BS.1770) ──────────────────────────────────────────
//
// VMU-144 — Gabriel's ear says guitar and bass sit quieter than piano in the
// Dictionary. Peak and RMS above are both physical measures; neither is a
// perceptual one, and a same-RMS bass and piano note do not sound equally
// loud (K-weighting rolls off sub-bass and lifts presence). This section adds
// the perceptual measure BS.1770 defines, so the phase A table can report
// "how loud does the ear judge this" alongside "how big is this waveform".
//
// Sources, cited rather than guessed (VMU-144 brief: "n'invente pas de
// coefficients ; cite ta source dans le code") —
//
// - ITU-R BS.1770-4 (10/2015), "Algorithms to measure audio programme
//   loudness and true-peak audio level": Annex 1 Table 1 gives the K-weighting
//   biquad coefficients, but *only* at 48 kHz, with the standard's own
//   instruction for other rates: "Loudness values for signals sampled at
//   rates other than 48 kHz should be calculated using coefficients that
//   provide the same frequency response as that of the 48 kHz filters."
//   §2.3 / Equation (2) gives the mean-square-to-loudness formula and the
//   gating-block algorithm (400 ms blocks, 75% overlap, -70 LUFS absolute
//   gate, -10 LU relative gate) this file implements below.
//   Recommendation page: https://www.itu.int/rec/R-REC-BS.1770
// - The filter design formula (below, `designPreFilter`/`designHighPass`) is
//   not the classic bilinear-transform "Audio EQ Cookbook" shelf/high-pass —
//   that was tried first here and, checked against the values below, missed
//   the official 48 kHz table by up to 3.7% on a2 (wrong stopband shape, not
//   a rounding difference). What actually reproduces the table is the
//   tangent-prewarped design (`K = tan(pi*f0/Fs)`, an `(A,B)`-shelf variant)
//   used by libebur128 (https://github.com/jiixyj/libebur128,
//   `ebur128/ebur128.c`, function `filter_create_hp`/`init_filter`; BSD-2,
//   widely used — it is what ffmpeg's `ebur128` filter links against, tested
//   there against the EBU PLOUD conformance streams). Reproduced verbatim
//   below, hand-verified here (2026-09-22) against ITU-R BS.1770-4 Annex 1
//   Table 1 at 48 kHz: the pre-filter matches to 9 significant figures
//   (b0 1.53512486 vs table's 1.53512485958697); the RLB stage's a1/a2 match
//   to 10 figures, and its numerator is the table's own exact [1, -2, 1] —
//   libebur128 leaves that numerator un-normalised by a0 rather than
//   dividing through, which is what the standard's own table does too (its
//   b0 is exactly 1.0, not division of Table 1). Design constants (f0, gain,
//   Q for each stage) below are libebur128's, which is where the RBJ attempt
//   above got its own gain/Q/frequency numbers from in the first place —
//   they were right, only the biquad formula built from them was wrong.

/**
 * K-weighting filter design constants (libebur128, cited above): centre
 * frequency, shelf gain (stage 1 only) and Q for each of the cascade's two
 * stages. Not directly usable as biquad coefficients — `designPreFilter` and
 * `designHighPass` below build those, tangent-prewarped for `sampleRate`.
 */
export const K_WEIGHTING_STAGES = [
  // Stage 1 — "pre-filter": head-diffraction high shelf, BS.1770-4 Annex 1.
  { freq: 1681.974450955533, gainDb: 3.999843853973347, q: 0.7071752369554196 },
  // Stage 2 — RLB ("Revised Low-frequency B-curve") high-pass, same annex.
  // gainDb is unused by designHighPass; kept at 0 only so both array entries
  // share one shape (TS otherwise infers a two-member union and loses track
  // of which entry is which after destructuring in kWeight below).
  { freq: 38.13547087602444, gainDb: 0, q: 0.5003270373238773 },
];

/**
 * Stage 1: the K-weighting pre-filter, a high shelf built with the
 * tangent-prewarped two-pole design libebur128 uses (cited above) rather
 * than a textbook bilinear-transform shelf — that substitution is exactly
 * what produced the wrong table match this comment block explains.
 * @param {{freq:number, gainDb:number, q:number}} stage
 * @param {number} sampleRate
 * @returns {{b0:number,b1:number,b2:number,a1:number,a2:number}}
 */
function designPreFilter(stage, sampleRate) {
  const K = Math.tan((Math.PI * stage.freq) / sampleRate);
  const Vh = Math.pow(10, stage.gainDb / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416); // libebur128's own fitted exponent, not derived here
  const a0 = 1 + K / stage.q + K * K;
  return {
    b0: (Vh + (Vb * K) / stage.q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / stage.q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / stage.q + K * K) / a0,
  };
}

/**
 * Stage 2: the RLB high-pass. Numerator is the fixed [1, -2, 1] the official
 * table itself publishes (a double zero at DC, un-normalised by a0 — see the
 * module comment above for why that is not a bug); only the denominator
 * depends on sample rate via the same tangent prewarping as stage 1.
 * @param {{freq:number, q:number}} stage
 * @param {number} sampleRate
 * @returns {{b0:number,b1:number,b2:number,a1:number,a2:number}}
 */
function designHighPass(stage, sampleRate) {
  const K = Math.tan((Math.PI * stage.freq) / sampleRate);
  const a0 = 1 + K / stage.q + K * K;
  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / stage.q + K * K) / a0,
  };
}

/**
 * Direct Form I biquad, applied sample by sample (block processing would
 * need overlap bookkeeping this harness has no use for — buffers here are
 * single offline renders, not a stream).
 * @param {Float32Array|Float64Array|number[]} samples
 * @param {{b0:number,b1:number,b2:number,a1:number,a2:number}} c
 * @returns {Float64Array}
 */
function applyBiquad(samples, c) {
  const out = new Float64Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

/**
 * K-weights a mono buffer: BS.1770's two-stage cascade (pre-filter, then RLB
 * high-pass), designed fresh for `sampleRate` — see K_WEIGHTING_STAGES above.
 * @param {Float32Array|number[]} samples
 * @param {number} sampleRate
 * @returns {Float64Array}
 */
export function kWeight(samples, sampleRate) {
  const [preFilterStage, highPassStage] = K_WEIGHTING_STAGES;
  const preFiltered = applyBiquad(samples, designPreFilter(preFilterStage, sampleRate));
  return applyBiquad(preFiltered, designHighPass(highPassStage, sampleRate));
}

/** Floor used for LUFS when there is no signal to take a log of, matching DB_FLOOR's role for dBFS. */
const LUFS_FLOOR = DB_FLOOR;

/**
 * Mean-square power to LUFS. ITU-R BS.1770-4 §2.3, Equation (2):
 * L_K = -0.691 + 10*log10(z), single-channel weight Gi = 1.0 (mono — VMU-144
 * brief: "Mono suffit").
 * @param {number} z mean square of the K-weighted signal
 * @returns {number} LUFS, floored at LUFS_FLOOR instead of -Infinity
 */
export function meanSquareToLufs(z) {
  if (!(z > 0)) return LUFS_FLOOR;
  return -0.691 + 10 * Math.log10(z);
}

/**
 * Integrated loudness of a mono buffer, ITU-R BS.1770-4 §2.3: 400 ms gating
 * blocks at 100 ms hop (75% overlap), absolute gate at -70 LUFS, relative
 * gate at (ungated loudness - 10) LU. The mean at each stage is taken over
 * the blocks' *power* (z), not over their dB values — averaging loudness
 * values directly is a different, wrong quantity, since dB is already a log
 * of power.
 *
 * Mono-only per the VMU-144 brief: channel weight Gi = 1.0, no multichannel
 * sum (BS.1770's L/R/C/Ls/Rs weighting is out of scope here).
 *
 * @param {Float32Array|number[]} samples
 * @param {Object} options
 * @param {number} options.sampleRate
 * @param {number} [options.blockSec] gating block length; 0.4 s per the standard
 * @param {number} [options.hopSec] block hop; 0.1 s (75% overlap) per the standard
 * @returns {{ lufs: number, ungatedLufs: number, blockCount: number, gatedBlockCount: number }}
 */
export function integratedLoudness(samples, options) {
  const { sampleRate, blockSec = 0.4, hopSec = 0.1 } = options;
  const weighted = kWeight(samples, sampleRate);
  const blockSamples = Math.round(blockSec * sampleRate);
  const hopSamples = Math.round(hopSec * sampleRate);

  /** @type {number[]} */
  const blockPowers = [];
  for (let start = 0; start + blockSamples <= weighted.length; start += hopSamples) {
    let sumSquares = 0;
    for (let i = start; i < start + blockSamples; i++) sumSquares += weighted[i] * weighted[i];
    blockPowers.push(sumSquares / blockSamples);
  }

  if (blockPowers.length === 0) {
    return { lufs: LUFS_FLOOR, ungatedLufs: LUFS_FLOOR, blockCount: 0, gatedBlockCount: 0 };
  }

  const ABSOLUTE_GATE_LUFS = -70;
  const absoluteGated = blockPowers.filter((z) => meanSquareToLufs(z) >= ABSOLUTE_GATE_LUFS);
  if (absoluteGated.length === 0) {
    return { lufs: LUFS_FLOOR, ungatedLufs: LUFS_FLOOR, blockCount: blockPowers.length, gatedBlockCount: 0 };
  }

  const ungatedMean = absoluteGated.reduce((a, b) => a + b, 0) / absoluteGated.length;
  const ungatedLufs = meanSquareToLufs(ungatedMean);
  const RELATIVE_GATE_OFFSET_LU = 10;
  const relativeThreshold = ungatedLufs - RELATIVE_GATE_OFFSET_LU;

  const relativeGated = absoluteGated.filter((z) => meanSquareToLufs(z) >= relativeThreshold);
  // Guard rather than a spec deviation: with too little material (a single
  // gating block, e.g. a very short note) the relative gate can legitimately
  // discard everything only if that one block is quieter than itself minus
  // 10 LU, which never happens — but fall back to the absolute-gated set
  // rather than divide by zero if it ever does.
  const finalPowers = relativeGated.length > 0 ? relativeGated : absoluteGated;
  const finalMean = finalPowers.reduce((a, b) => a + b, 0) / finalPowers.length;

  return {
    lufs: meanSquareToLufs(finalMean),
    ungatedLufs,
    blockCount: blockPowers.length,
    gatedBlockCount: finalPowers.length,
  };
}

/**
 * Onset (attack) times of short, separated transients — a metronome click
 * (VMU-056) is exactly this shape — via a sliding energy window compared to a
 * fixed level threshold.
 *
 * Deliberately simple, not a general-purpose onset detector (no spectral
 * flux, no adaptive threshold): a synthesized click against near-silence
 * between beats needs only a level floor and a minimum gap to tell one click
 * from the tail of the previous one. `Tone.Offline` renders deterministically
 * (unlike `Tone.Reverb`'s noise-seeded impulse response, see SIGNIFICANCE_DB
 * above), so a fixed threshold is reliable here.
 *
 * @param {Float32Array|number[]} samples
 * @param {Object} options
 * @param {number} options.sampleRate
 * @param {number} [options.windowSize] samples per energy frame
 * @param {number} [options.thresholdDbfs] a frame's RMS above this counts as an onset
 * @param {number} [options.minGapMs] minimum time between two reported onsets,
 *   so one click's decay is not counted as a second onset
 * @returns {{ onsets: number[], intervalsSec: number[], meanIntervalSec: number|null }}
 */
export function detectOnsets(samples, options) {
  const { sampleRate, windowSize = 256, thresholdDbfs = -30, minGapMs = 100 } = options;
  const minGapSamples = (minGapMs / 1000) * sampleRate;

  /** @type {number[]} */
  const onsets = [];
  let lastOnsetSample = -Infinity;

  for (let i = 0; i + windowSize <= samples.length; i += windowSize) {
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j++) {
      const s = samples[i + j];
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / windowSize);
    if (toDbfs(rms) >= thresholdDbfs && i - lastOnsetSample >= minGapSamples) {
      onsets.push(i / sampleRate);
      lastOnsetSample = i;
    }
  }

  /** @type {number[]} */
  const intervalsSec = [];
  for (let i = 1; i < onsets.length; i++) intervalsSec.push(onsets[i] - onsets[i - 1]);
  const meanIntervalSec = intervalsSec.length
    ? intervalsSec.reduce((a, b) => a + b, 0) / intervalsSec.length
    : null;

  return { onsets, intervalsSec, meanIntervalSec };
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
      if (nearest < 2 || nearest > MAX_PARTIAL) continue;
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
 * @param {Array<{ note: string, freq: number, midi: number, magDb?: number }>} detected
 * @param {string[]} expectedNotes
 * @param {Object} [options]
 * @param {number} [options.toleranceCents]
 * @param {number} [options.harmonicToleranceCents]
 * @param {number} [options.significanceDb] peaks weaker than this, relative to the
 *   strongest, are listed but never fail the check — see SIGNIFICANCE_DB
 * @returns {{ ok: boolean, missing: string[], unexplained: string[], worstCents: number,
 *             significanceDb: number }}
 */
export function comparePitchContent(detected, expectedNotes, options = {}) {
  const { toleranceCents = 50, harmonicToleranceCents = 60, significanceDb = SIGNIFICANCE_DB } = options;
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
    // A missing note is a missing note at any level, so `missing` above looks
    // at every peak. An *extra* one only counts if it is loud enough to be a
    // note rather than a reverb tail.
    .filter((d) => d.magDb === undefined || d.magDb >= significanceDb)
    .filter((d) => {
      for (const f of expectedFreqs) {
        if (Math.abs(1200 * Math.log2(d.freq / f)) <= toleranceCents) return false;
        const ratio = d.freq / f;
        const nearest = Math.round(ratio);
        if (nearest >= 2 && nearest <= MAX_PARTIAL && Math.abs(1200 * Math.log2(ratio / nearest)) < harmonicToleranceCents) {
          return false;
        }
      }
      return true;
    })
    .map((d) => d.note);

  return {
    ok: missing.length === 0 && unexplained.length === 0,
    missing,
    unexplained,
    worstCents,
    significanceDb,
  };
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
  const silence = silenceMetrics(samples);
  return {
    ...level,
    sampleRate,
    durationSec: samples.length / sampleRate,
    silence,
    // BS.1770's own -70 LUFS absolute gate (integratedLoudness above) already
    // excludes a silent lead-in from the result, so this runs over the whole
    // buffer, the same span levelMetrics/silenceMetrics use — not just the
    // pitch-detection window.
    loudness: integratedLoudness(samples, { sampleRate }),
    discontinuity: discontinuityMetrics(samples),
    // Gated on audibility, not on `peak > 0`. A buffer 140 dB down is still
    // perfectly periodic, so the FFT happily returns its pitch — measured
    // 2026-09-16, a render at -177 dBFS reported A3 while being flagged
    // SILENT in the same breath. Reporting notes in a buffer this function
    // calls silent is how a dead audio path passes a pitch check.
    ...(!silence.silent
      ? detectPitches(samples, { sampleRate, fftSize, offset: pitchOffset, maxPitches })
      : { pitches: [], fundamentals: [], binHz: sampleRate / fftSize, fftSize }),
  };
}
