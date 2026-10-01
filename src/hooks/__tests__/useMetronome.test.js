import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMetronome } from "../useMetronome";
import * as metronomeModule from "../../audio/metronome";

vi.mock("../../audio/metronome", () => ({
  startMetronome: vi.fn(),
  stopMetronome: vi.fn(),
}));

/**
 * VMU-163-fix2: `isPlaying` is gone from this hook's own contract. Whether an
 * extinction is allowed to stop the transport is decided in
 * `transportOwner.js` now (it already knows because useSequencer.js reports
 * Play/Stop to the same module) — `stopMetronome()` takes no argument, so
 * this hook has nothing left to thread through to it. The four tests below
 * are the same behaviour VMU-056 established, re-asserted against the
 * simplified contract.
 */
describe("useMetronome (VMU-056 / VMU-163-fix2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mounts off (no persistence — VMU-050 is a separate ticket)", () => {
    const { result } = renderHook(() => useMetronome({ ensureAudioReady: vi.fn() }));
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

    const { result } = renderHook(() => useMetronome({ ensureAudioReady }));

    await act(async () => {
      await result.current.toggleMetronome();
    });

    expect(result.current.metronomeOn).toBe(true);
    expect(calls).toEqual(["ensureAudioReady", "startMetronome"]);
  });

  it("toggling off calls stopMetronome (no argument) and flips state", async () => {
    const { result } = renderHook(() => useMetronome({ ensureAudioReady: vi.fn() }));

    await act(async () => {
      await result.current.toggleMetronome(); // on
    });

    await act(async () => {
      await result.current.toggleMetronome(); // off
    });

    expect(result.current.metronomeOn).toBe(false);
    expect(metronomeModule.stopMetronome).toHaveBeenCalledWith();
  });

  it("unmounting while on tears down the schedule as a safety net", async () => {
    const { result, unmount } = renderHook(() => useMetronome({ ensureAudioReady: vi.fn() }));

    await act(async () => {
      await result.current.toggleMetronome(); // on
    });
    metronomeModule.stopMetronome.mockClear();

    unmount();

    expect(metronomeModule.stopMetronome).toHaveBeenCalledWith();
  });
});
