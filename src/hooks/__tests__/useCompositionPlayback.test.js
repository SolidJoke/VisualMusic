import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCompositionPlayback } from "../useCompositionPlayback";
import * as Tone from "tone";

vi.mock("tone", () => ({
  Transport: {
    bpm: { value: 120 },
    start: vi.fn(),
    stop: vi.fn(),
    scheduleRepeat: vi.fn().mockReturnValue(1),
    clear: vi.fn(),
  },
  context: { state: "suspended" },
  start: vi.fn(),
  Draw: {
    schedule: vi.fn((cb) => cb()),
  },
}));

vi.mock("../../audio/AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
}));

describe("useCompositionPlayback Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with correct default state", () => {
    const { result } = renderHook(() =>
      useCompositionPlayback([1, 0, 0, 1], [0, 1, 0, 0], true)
    );

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.bpm).toBe(120);
    expect(result.current.currentStep).toBe(-1);
  });

  it("updates bpm on setBpm call", () => {
    const { result } = renderHook(() =>
      useCompositionPlayback([1, 0, 0], [0, 1, 0], true)
    );

    act(() => {
      result.current.setBpm(140);
    });

    expect(result.current.bpm).toBe(140);
    expect(Tone.Transport.bpm.value).toBe(140);
  });

  it("toggles playback state and handles Tone.js transport", async () => {
    const { result } = renderHook(() =>
      useCompositionPlayback([1, 0], [0, 1], true)
    );

    await act(async () => {
      await result.current.togglePlayback();
    });

    expect(result.current.isPlaying).toBe(true);
    // Transport.scheduleRepeat should have been called when playing
    expect(Tone.Transport.scheduleRepeat).toHaveBeenCalled();
  });
});
