import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSequencer } from "../useSequencer";
import * as Tone from "tone";

vi.mock("tone", () => {
  const scheduleRepeat = vi.fn((cb, interval) => {
    // we want to test if cb is called multiple times when it shouldn't be
    return 123;
  });
  return {
    Transport: {
      bpm: { value: 120 },
      scheduleRepeat,
      cancel: vi.fn(),
      clear: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
    },
    Draw: { schedule: vi.fn((cb) => cb()) },
    start: vi.fn().mockResolvedValue(),
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
  };
});

vi.mock("../AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  snareSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
  bassSynth: { triggerAttackRelease: vi.fn() },
  initPianoSampler: vi.fn((cb) => cb && cb()),
  initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(),
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
}));

describe("Sequencer Bug Reproduction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not schedule repeat multiple times or recreate stepCounter if not needed", async () => {
    const setCurrentlyPlayingNotes = vi.fn();
    
    const { result, rerender } = renderHook(
      (props) => useSequencer(props),
      {
        initialProps: {
          appMode: "studio",
          activeBrick: { rootValue: 0, modeName: "scale_major", _group: "pop", bpm: 120 },
          activeDrums: [{ name: "kick", activeSteps: [0, 4, 8, 12] }],
          activeMelody: [],
          activeProgression: ["I", "IV", "V", "I"],
          activeRhythm: [0, 4, 8, 12],
          currentRootValue: 0,
          setCurrentlyPlayingNotes,
          chordOctaveOffset: 0,
          notation: "us",
        }
      }
    );

    // Initial state: not playing
    expect(result.current.isPlaying).toBe(false);
    expect(Tone.Transport.scheduleRepeat).not.toHaveBeenCalled();

    // Toggle playback to start
    await act(async () => {
      await result.current.togglePlayback();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(Tone.Transport.start).toHaveBeenCalled();
    expect(Tone.Transport.scheduleRepeat).toHaveBeenCalledTimes(1);

    // Simulate Tone.js firing the repeat function a few times
    const repeatFn = Tone.Transport.scheduleRepeat.mock.calls[0][0];

    act(() => {
      repeatFn(0); // step 0
    });
    expect(result.current.currentStep).toBe(0);

    act(() => {
      repeatFn(0.5); // step 1
    });
    expect(result.current.currentStep).toBe(1);

    // Re-render the hook (e.g. parent re-renders)
    rerender({
      appMode: "studio",
      activeBrick: { rootValue: 0, modeName: "scale_major", _group: "pop", bpm: 120 },
      activeDrums: [{ name: "kick", activeSteps: [0, 4, 8, 12] }],
      activeMelody: [],
      activeProgression: ["I", "IV", "V", "I"],
      activeRhythm: [0, 4, 8, 12],
      currentRootValue: 0,
      setCurrentlyPlayingNotes,
      chordOctaveOffset: 0,
      notation: "us",
    });

    // Check if scheduleRepeat was called again due to re-render
    // (It shouldn't be, because dependencies [isPlaying, setCurrentlyPlayingNotes] haven't changed)
    expect(Tone.Transport.scheduleRepeat).toHaveBeenCalledTimes(1);

    act(() => {
      repeatFn(1.0); // step 2
    });
    expect(result.current.currentStep).toBe(2);

    // Toggle playback to stop
    await act(async () => {
      await result.current.togglePlayback();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(Tone.Transport.stop).toHaveBeenCalled();
    expect(Tone.Transport.clear).toHaveBeenCalled();
  });
});
