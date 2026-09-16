// @ts-check
/**
 * Tests for the arithmetic half of the audio harness (VMU-026).
 *
 * These run in the normal vitest/jsdom suite, on synthetic signals whose
 * correct answer is known in closed form. That is the point: before the
 * harness is allowed to say anything about the application's audio, it has to
 * get the right answer on a signal we built ourselves. The ticket's TDD step 1
 * is the first test below — assert the FFT peak of a 440 Hz sine lands on
 * 440 Hz, then prove the assertion is load-bearing by feeding it 880 Hz.
 */
import { describe, it, expect } from "vitest";
import {
  toDbfs,
  fromDbfs,
  levelMetrics,
  silenceMetrics,
  discontinuityMetrics,
  gainReductionMetrics,
  fftInPlace,
  magnitudeSpectrum,
  detectPitches,
  comparePitches,
  comparePitchContent,
  estimateAlignmentSamples,
  freqToMidi,
  midiToFreq,
  noteNameToMidi,
  centsFromEqualTemperament,
  analyzeChannel,
} from "../signalMetrics";

const SR = 44100;

/**
 * @param {number[]} freqs
 * @param {Object} [opts]
 * @returns {Float32Array}
 */
function sineSum(freqs, opts = {}) {
  const { sampleRate = SR, seconds = 1, amplitude = 0.5 } = opts;
  const n = Math.round(sampleRate * seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const f of freqs) s += Math.sin((2 * Math.PI * f * i) / sampleRate);
    out[i] = (s / freqs.length) * amplitude;
  }
  return out;
}

describe("spectral peak — the harness measuring a signal we built", () => {
  // Ticket VMU-026, TDD step 1.
  it("puts the FFT peak of a 440 Hz sine on 440 Hz, within one bin", () => {
    const fftSize = 16384;
    const binHz = SR / fftSize;
    const { pitches } = detectPitches(sineSum([440]), { sampleRate: SR, fftSize });

    expect(pitches.length).toBe(1);
    expect(Math.abs(pitches[0].freq - 440)).toBeLessThan(binHz);
    expect(pitches[0].note).toBe("A4");
  });

  // The break proof for the test above, kept as a test rather than as a
  // comment claiming it was run once: if the peak search ever stops depending
  // on the input frequency, this is what notices.
  it("does NOT put the peak on 440 Hz when the signal is 880 Hz", () => {
    const { pitches } = detectPitches(sineSum([880]), { sampleRate: SR });
    expect(pitches.length).toBe(1);
    expect(Math.abs(pitches[0].freq - 440)).toBeGreaterThan(400);
    expect(pitches[0].note).toBe("A5");
  });

  it("resolves a three-note chord to three pitches", () => {
    // C4 / E4 / G4 at equal-tempered frequencies.
    const { pitches } = detectPitches(sineSum([261.63, 329.63, 392.0]), { sampleRate: SR });
    const verdict = comparePitches(pitches, ["C4", "E4", "G4"]);
    expect(verdict.missing).toEqual([]);
    expect(verdict.unexpected).toEqual([]);
    expect(verdict.ok).toBe(true);
    expect(verdict.worstCents).toBeLessThan(10);
  });

  it("marks partials as partials instead of reporting them as notes", () => {
    // A harmonic stack on C4 — what a piano sample actually looks like.
    const n = SR;
    const out = new Float32Array(n);
    const f0 = 261.63;
    for (let i = 0; i < n; i++) {
      out[i] =
        0.5 * Math.sin((2 * Math.PI * f0 * i) / SR) +
        0.3 * Math.sin((2 * Math.PI * 2 * f0 * i) / SR) +
        0.2 * Math.sin((2 * Math.PI * 3 * f0 * i) / SR) +
        0.1 * Math.sin((2 * Math.PI * 4 * f0 * i) / SR);
    }
    const { pitches, fundamentals } = detectPitches(out, { sampleRate: SR });
    // Every partial is seen...
    expect(pitches.map((p) => p.note)).toEqual(["C4", "C5", "G5", "C6"]);
    // ...and exactly one of them is a fundamental.
    expect(fundamentals.map((p) => p.note)).toEqual(["C4"]);
    expect(pitches[1].partialNumber).toBe(2);
    expect(pitches[2].partialNumber).toBe(3);
  });

  it("does not depend on the fundamental being the loudest partial", () => {
    // The case that broke the first implementation: a second partial louder
    // than the fundamental, which is ordinary in a piano sample.
    const n = SR;
    const out = new Float32Array(n);
    const f0 = 261.63;
    for (let i = 0; i < n; i++) {
      out[i] =
        0.2 * Math.sin((2 * Math.PI * f0 * i) / SR) +
        0.6 * Math.sin((2 * Math.PI * 2 * f0 * i) / SR);
    }
    const { fundamentals } = detectPitches(out, { sampleRate: SR });
    expect(fundamentals.map((p) => p.note)).toEqual(["C4"]);
  });

  it("refines the peak past the bin grid", () => {
    // 448 Hz sits between bins at any sane FFT size; the parabolic refinement
    // is what makes a 50-cent tolerance a claim about audio, not about the FFT.
    const fftSize = 8192;
    const { pitches } = detectPitches(sineSum([448]), { sampleRate: SR, fftSize });
    expect(Math.abs(pitches[0].freq - 448)).toBeLessThan(1);
  });

  it("rejects an FFT length that is not a power of two", () => {
    expect(() => fftInPlace(new Float64Array(1000), new Float64Array(1000))).toThrow(/power of two/);
  });

  it("returns a spectrum whose bin width matches the FFT size", () => {
    const { binHz, magnitudes } = magnitudeSpectrum(sineSum([1000], { seconds: 0.5 }), {
      sampleRate: SR,
      fftSize: 4096,
    });
    expect(binHz).toBeCloseTo(SR / 4096, 6);
    expect(magnitudes.length).toBe(2048);
  });
});

describe("level metrics", () => {
  it("reads the peak and RMS of a sine of known amplitude", () => {
    const { peak, peakDbfs, rmsDbfs, clippedSamples } = levelMetrics(sineSum([1000], { amplitude: 0.5 }));
    expect(peak).toBeCloseTo(0.5, 2);
    expect(peakDbfs).toBeCloseTo(-6.02, 1);
    // A sine's RMS is its amplitude / sqrt(2), i.e. 3.01 dB below peak.
    expect(rmsDbfs).toBeCloseTo(-9.03, 1);
    expect(clippedSamples).toBe(0);
  });

  it("sees a mix above full scale — the shape of the VMU-020 measurement", () => {
    // +5 dBFS, the level VMU-020 measured entering the compressor. An
    // OfflineAudioContext buffer is not clamped, so this survives to be seen.
    const { peakDbfs, clippedSamples } = levelMetrics(sineSum([220], { amplitude: fromDbfs(5) }));
    expect(peakDbfs).toBeCloseTo(5, 1);
    expect(clippedSamples).toBeGreaterThan(0);
  });

  it("floors dBFS instead of returning -Infinity", () => {
    expect(toDbfs(0)).toBe(-200);
    expect(Number.isFinite(toDbfs(0))).toBe(true);
  });
});

describe("silence detection", () => {
  it("calls an all-zero buffer silent", () => {
    expect(silenceMetrics(new Float32Array(1024)).silent).toBe(true);
  });

  it("does not call an audible note silent", () => {
    expect(silenceMetrics(sineSum([440], { seconds: 0.1 })).silent).toBe(false);
  });

  it("calls a buffer below the floor silent", () => {
    const quiet = sineSum([440], { seconds: 0.1, amplitude: fromDbfs(-120) });
    expect(silenceMetrics(quiet).silent).toBe(true);
  });
});

describe("discontinuity detection", () => {
  it("finds a step in an otherwise smooth signal", () => {
    const s = sineSum([200], { seconds: 0.1, amplitude: 0.2 });
    s[1000] = 1;
    s[1001] = -1;
    const { maxJump, jumpsOverThreshold } = discontinuityMetrics(s);
    expect(maxJump).toBeGreaterThan(1.9);
    expect(jumpsOverThreshold).toBeGreaterThan(0);
  });

  it("finds no step in a smooth sine", () => {
    const { jumpsOverThreshold } = discontinuityMetrics(sineSum([200], { seconds: 0.1 }));
    expect(jumpsOverThreshold).toBe(0);
  });
});

describe("gain reduction between two taps of one render", () => {
  it("measures a known 6 dB of reduction", () => {
    const pre = sineSum([220], { seconds: 0.2, amplitude: 0.8 });
    const post = pre.map((s) => s * 0.5);
    const gr = gainReductionMetrics(pre, Float32Array.from(post));
    expect(gr.maxDb).toBeCloseTo(6.02, 1);
    expect(gr.meanDb).toBeCloseTo(6.02, 1);
    expect(gr.framesCounted).toBeGreaterThan(10);
  });

  it("measures no reduction when the taps are identical", () => {
    const pre = sineSum([220], { seconds: 0.2, amplitude: 0.8 });
    const gr = gainReductionMetrics(pre, pre);
    expect(gr.maxDb).toBeCloseTo(0, 6);
  });

  it("counts the share of frames above the processor threshold", () => {
    // Every frame of a -3 dBFS signal is above a -6 dB threshold.
    const pre = sineSum([220], { seconds: 0.2, amplitude: fromDbfs(-3) });
    const gr = gainReductionMetrics(pre, pre, { thresholdDbfs: -6 });
    expect(gr.framesOverThresholdRatio).toBeCloseTo(1, 2);
    // And none of a -20 dBFS one is.
    const quiet = sineSum([220], { seconds: 0.2, amplitude: fromDbfs(-20) });
    expect(gainReductionMetrics(quiet, quiet, { thresholdDbfs: -6 }).framesOverThresholdRatio).toBe(0);
  });

  it("ignores silent frames, which say nothing about reduction", () => {
    const pre = new Float32Array(SR * 0.1);
    const gr = gainReductionMetrics(pre, pre);
    expect(gr.framesCounted).toBe(0);
    expect(gr.maxDb).toBe(0);
  });
});

describe("pitch naming and conversion", () => {
  it("agrees with the project's MIDI convention: middle C = C4 = 60", () => {
    expect(noteNameToMidi("C4")).toBe(60);
    expect(noteNameToMidi("A4")).toBe(69);
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(freqToMidi(440)).toBeCloseTo(69, 6);
    expect(midiToFreq(noteNameToMidi("C4"))).toBeCloseTo(261.626, 2);
  });

  it("parses accidentals in both spellings", () => {
    expect(noteNameToMidi("F#3")).toBe(54);
    expect(noteNameToMidi("Gb3")).toBe(54);
  });

  it("reads zero cents of error on an equal-tempered frequency", () => {
    expect(Math.abs(centsFromEqualTemperament(440))).toBeLessThan(0.001);
    expect(centsFromEqualTemperament(440 * Math.pow(2, 25 / 1200))).toBeCloseTo(25, 3);
  });

  it("reports missing and unexpected notes separately", () => {
    const detected = [
      { note: "C5", freq: 523.25, midi: freqToMidi(523.25) },
      { note: "E5", freq: 659.26, midi: freqToMidi(659.26) },
      { note: "G5", freq: 783.99, midi: freqToMidi(783.99) },
    ];
    // The VMU-080 failure shape: the right chord, one octave up.
    const verdict = comparePitches(detected, ["C4", "E4", "G4"]);
    expect(verdict.ok).toBe(false);
    expect(verdict.missing).toEqual(["C4", "E4", "G4"]);
    expect(verdict.unexpected).toEqual(["C5", "E5", "G5"]);
  });
});

describe("analyzeChannel", () => {
  it("returns level, silence, discontinuity and pitches in one call", () => {
    const report = analyzeChannel(sineSum([440], { seconds: 0.5 }), { sampleRate: SR });
    expect(report.peakDbfs).toBeCloseTo(-6.02, 1);
    expect(report.silence.silent).toBe(false);
    expect(report.discontinuity.jumpsOverThreshold).toBe(0);
    expect(report.pitches[0].note).toBe("A4");
    expect(report.durationSec).toBeCloseTo(0.5, 6);
  });

  it("skips pitch detection on silence instead of reporting noise as notes", () => {
    const report = analyzeChannel(new Float32Array(4096), { sampleRate: SR });
    expect(report.pitches).toEqual([]);
    expect(report.silence.silent).toBe(true);
  });
});

describe("comparePitchContent — what can honestly be asserted about a real sample", () => {
  const detectedC4WithPartials = [
    { note: "C4", freq: 261.4, midi: freqToMidi(261.4) },
    { note: "C5", freq: 523.4, midi: freqToMidi(523.4) },
    { note: "G5", freq: 784.2, midi: freqToMidi(784.2) },
  ];

  it("accepts a requested note that arrives with its partials", () => {
    const verdict = comparePitchContent(detectedC4WithPartials, ["C4"]);
    expect(verdict.missing).toEqual([]);
    expect(verdict.unexplained).toEqual([]);
    expect(verdict.ok).toBe(true);
  });

  it("still catches the VMU-080 failure: the right chord, one octave up", () => {
    const detected = [
      { note: "C5", freq: 523.25, midi: freqToMidi(523.25) },
      { note: "E5", freq: 659.26, midi: freqToMidi(659.26) },
      { note: "G5", freq: 783.99, midi: freqToMidi(783.99) },
    ];
    const verdict = comparePitchContent(detected, ["C4", "E4", "G4"]);
    expect(verdict.ok).toBe(false);
    // E5 and G5 are not integer multiples of C4/E4/G4, so they are unexplained;
    // C5 is C4's second partial, which is why "missing" is what proves the bug.
    expect(verdict.missing).toEqual(["C4", "E4", "G4"]);
  });

  it("flags a note nobody asked for", () => {
    const detected = [
      { note: "C4", freq: 261.63, midi: freqToMidi(261.63) },
      { note: "F#4", freq: 369.99, midi: freqToMidi(369.99) },
    ];
    const verdict = comparePitchContent(detected, ["C4"]);
    expect(verdict.ok).toBe(false);
    expect(verdict.unexplained).toEqual(["F#4"]);
  });

  it("flags a silent render as every note missing", () => {
    const verdict = comparePitchContent([], ["C4", "E4", "G4"]);
    expect(verdict.ok).toBe(false);
    expect(verdict.missing).toEqual(["C4", "E4", "G4"]);
  });
});

describe("estimateAlignmentSamples — finding a processor's look-ahead delay", () => {
  it("recovers a delay it was given", () => {
    const pre = new Float32Array(SR);
    // A burst, so the envelope has something to correlate on.
    for (let i = 5000; i < 9000; i++) pre[i] = Math.sin((2 * Math.PI * 300 * i) / SR);
    const lag = 288;
    const post = new Float32Array(SR);
    for (let i = 0; i < SR - lag; i++) post[i + lag] = pre[i];
    // Resolution is the envelope hop (32 samples by default).
    expect(Math.abs(estimateAlignmentSamples(pre, post) - lag)).toBeLessThanOrEqual(32);
  });

  it("reports no delay for an undelayed pair", () => {
    const pre = new Float32Array(SR);
    for (let i = 5000; i < 9000; i++) pre[i] = Math.sin((2 * Math.PI * 300 * i) / SR);
    expect(estimateAlignmentSamples(pre, pre)).toBe(0);
  });

  it("makes gain reduction non-negative on a delayed, attenuated copy", () => {
    // Without alignment this returns a negative mean, which is what exposed
    // Chrome's compressor look-ahead in the first place.
    const pre = new Float32Array(SR);
    for (let i = 0; i < SR; i++) {
      const env = i < 2000 ? i / 2000 : Math.exp(-(i - 2000) / 8000);
      pre[i] = 0.8 * env * Math.sin((2 * Math.PI * 300 * i) / SR);
    }
    const lag = 288;
    const post = new Float32Array(SR);
    for (let i = 0; i < SR - lag; i++) post[i + lag] = pre[i] * 0.5;

    const aligned = gainReductionMetrics(pre, post);
    expect(aligned.alignmentSamples).toBeGreaterThan(0);
    expect(aligned.meanDb).toBeCloseTo(6.02, 0);

    const naive = gainReductionMetrics(pre, post, { align: false });
    expect(naive.meanDb).toBeLessThan(aligned.meanDb);
  });
});
