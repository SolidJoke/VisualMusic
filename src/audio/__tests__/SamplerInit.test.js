/**
 * VMU-021 — the sampled instruments must exist in every mode, not only behind
 * the sequencer's Play button.
 *
 * `initPianoSampler` / `initGuitarSampler` were called from exactly one place:
 * `useSequencer.togglePlayback`. Every other audible interaction — clicking a
 * chord in the Dictionary, a note on the fretboard, a single note in the Studio
 * — goes through `useAudioScheduler.ensureAudioReady()` → `initAudio()`, which
 * unlocks the audio context and creates no sampler at all. Those paths
 * therefore played the PolySynth fallback permanently, even with the samples
 * hosted correctly.
 *
 * Second contract here: with two callers, `initPianoSampler(onReady)` must not
 * silently drop the callback of whoever arrives second. It used to `return`
 * early on `if (pianoSampler)`, discarding the callback with it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

globalThis.__samplerCalls = [];

vi.mock("tone", () => {
  const node = () => ({
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis(),
    set: vi.fn(),
    start: vi.fn(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    volume: { rampTo: vi.fn(), value: 0 },
  });

  return {
    start: vi.fn().mockResolvedValue(true),
    context: { lookAhead: 0 },
    Destination: { volume: { rampTo: vi.fn(), value: 0 }, connect: vi.fn() },
    Transport: { bpm: { value: 120 } },
    Volume: vi.fn().mockImplementation(node),
    PolySynth: vi.fn().mockImplementation(node),
    MonoSynth: vi.fn().mockImplementation(node),
    MembraneSynth: vi.fn().mockImplementation(node),
    NoiseSynth: vi.fn().mockImplementation(node),
    Synth: vi.fn().mockImplementation(node),
    FMSynth: vi.fn().mockImplementation(node),
    Filter: vi.fn().mockImplementation(node),
    Reverb: vi.fn().mockImplementation(node),
    Chorus: vi.fn().mockImplementation(node),
    Analyser: vi.fn().mockImplementation(node),
    Compressor: vi.fn().mockImplementation(node),
    Frequency: vi.fn().mockImplementation(() => ({ toMidi: () => 60 })),
    Sampler: vi.fn().mockImplementation((options) => {
      const instance = node();
      globalThis.__samplerCalls.push({ options, instance });
      return instance;
    }),
  };
});

import { initAudio, initPianoSampler, getPianoSynth } from "../AudioEngine";

/** @returns {string[]} one marker per sampler constructed so far */
const constructedSamplers = () =>
  globalThis.__samplerCalls.map(({ options }) =>
    "A1" in options.urls ? "piano" : "E2" in options.urls ? "guitar" : "unknown"
  );

describe("VMU-021 — unlocking the audio context creates the samplers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates no sampler before the audio context is unlocked", () => {
    expect(constructedSamplers()).toEqual([]);
  });

  it("creates both samplers on initAudio(), the path every click goes through", async () => {
    await initAudio();
    expect(constructedSamplers().sort()).toEqual(["guitar", "piano"]);
  });

  it("still calls back a listener that arrives after loading has settled", () => {
    const pianoCall = globalThis.__samplerCalls.find((c) => "A1" in c.options.urls);
    pianoCall.options.onload();
    expect(getPianoSynth()).toBe(pianoCall.instance);

    const late = vi.fn();
    initPianoSampler(late);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("creates the samplers only once however many times initAudio() is called", async () => {
    await initAudio();
    await initAudio();
    expect(constructedSamplers().sort()).toEqual(["guitar", "piano"]);
  });
});
