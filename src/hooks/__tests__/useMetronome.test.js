import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMetronome } from "../useMetronome";
import * as metronomeModule from "../../audio/metronome";

vi.mock("../../audio/metronome", () => ({
  startMetronome: vi.fn(),
  stopMetronome: vi.fn(),
}));

describe("useMetronome (VMU-056)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mounts off (no persistence — VMU-050 is a separate ticket)", () => {
    const { result } = renderHook(() =>
      useMetronome({ isPlaying: false, ensureAudioReady: vi.fn() }),
    );
    expect(result.current.metronomeOn).toBe(false);
    expect(metronomeModule.startMetronome).not.toHaveBeenCalled();
  });

  it("toggling on unlocks audio first, then starts the module, then flips state", async () => {
    const calls = [];
    const ensureAudioReady = vi.fn(() => {
      calls.push("ensureAudioReady");
      return Promise.resolve();
    });
    metronomeModule.startMetronome.mockImplementation(() => calls.push("startMetronome"));

    const { result } = renderHook(() =>
      useMetronome({ isPlaying: false, ensureAudioReady }),
    );

    await act(async () => {
      await result.current.toggleMetronome();
    });

    expect(result.current.metronomeOn).toBe(true);
    expect(calls).toEqual(["ensureAudioReady", "startMetronome"]);
  });

  it("toggling off calls stopMetronome with the current isSequencerPlaying and flips state", async () => {
    let isPlaying = false;
    const { result, rerender } = renderHook(
      ({ isPlaying }) => useMetronome({ isPlaying, ensureAudioReady: vi.fn() }),
      { initialProps: { isPlaying } },
    );

    await act(async () => {
      await result.current.toggleMetronome(); // on
    });

    // Sequencer starts playing between the two clicks — the hook must read
    // the *current* isPlaying at toggle-off time, not the one captured when
    // the metronome was switched on.
    isPlaying = true;
    rerender({ isPlaying });

    await act(async () => {
      await result.current.toggleMetronome(); // off
    });

    expect(result.current.metronomeOn).toBe(false);
    expect(metronomeModule.stopMetronome).toHaveBeenCalledWith({ isSequencerPlaying: true });
  });

  it("unmounting while on tears down the schedule as a safety net", async () => {
    const { result, unmount } = renderHook(() =>
      useMetronome({ isPlaying: false, ensureAudioReady: vi.fn() }),
    );

    await act(async () => {
      await result.current.toggleMetronome(); // on
    });
    metronomeModule.stopMetronome.mockClear();

    unmount();

    expect(metronomeModule.stopMetronome).toHaveBeenCalledWith({ isSequencerPlaying: false });
  });
});
