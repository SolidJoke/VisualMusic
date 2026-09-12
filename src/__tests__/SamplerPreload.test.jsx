/**
 * VMU-102 — sample loading must start at mount, not at the first click.
 *
 * VMU-021 moved sampler construction into `initAudio()`, the call every audible
 * path shares. That fixed "the fallback plays forever" but left "the fallback
 * plays once": `Tone.Sampler` loads asynchronously — 19 files to fetch and
 * decode — while the first note is triggered immediately after
 * `await scheduler.ensureAudioReady()`. `getPianoSynth()` still returns the
 * PolySynth for that first note.
 *
 * Measured in the browser before writing this: `decodeAudioData` resolves on a
 * *suspended* AudioContext (state stays "suspended" throughout), 19 files =
 * 1361 kB, 73 ms to decode. So loading needs no user gesture and can start the
 * moment the app mounts, while the user is still looking at the interface.
 *
 * What this asserts is the timing contract, which is the whole defect:
 * construction happens on mount, and it happens without `Tone.start()`.
 */
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";

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

// The three layout components are irrelevant here and pull in the whole app.
vi.mock("../AppDesktop", () => ({ default: () => null }));
vi.mock("../AppTablet", () => ({ default: () => null }));
vi.mock("../AppMobile", () => ({ default: () => null }));

import * as Tone from "tone";
import AppRouter from "../AppRouter";

/** @returns {string[]} one label per sampler constructed so far */
const constructedSamplers = () =>
  globalThis.__samplerCalls.map(({ options }) =>
    "A1" in options.urls ? "piano" : "E2" in options.urls ? "guitar" : "unknown"
  );

describe("VMU-102 — samples start loading at mount", () => {
  it("constructs both samplers on mount, before any user gesture", async () => {
    expect(constructedSamplers()).toEqual([]);
    render(<AppRouter />);
    await waitFor(() =>
      expect(constructedSamplers().sort()).toEqual(["guitar", "piano"])
    );
  });

  it("does so without unlocking the audio context", () => {
    // Tone.start() requires a user gesture. If preloading needed it, the whole
    // point would be lost — the first click would still arrive before the
    // buffers. decodeAudioData on a suspended context is what makes this work.
    expect(Tone.start).not.toHaveBeenCalled();
  });
});
