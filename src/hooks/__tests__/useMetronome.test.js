import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMetronome } from "../useMetronome";
import * as metronomeModule from "../../audio/metronome";
import { enableMetronome } from "../../audio/transportOwner";

// T2 (VMU-025, decision 4): the hook no longer flips a React state of its
// own — it displays the transport owner's `metronomeOn`. A mocked
// startMetronome/stopMetronome that did nothing would therefore leave the
// hook "off" whatever happened, so the mocks report to the real owner, the
// way the real metronome.js does (enableMetronome / disableMetronome), on a
// fake transport (jsdom has no Web Audio).
vi.mock("tone", () => {
  const transport = {
    state: "stopped",
    start: vi.fn(function () {
      this.state = "started";
    }),
    stop: vi.fn(function () {
      this.state = "stopped";
    }),
  };
  return { getTransport: () => transport };
});

vi.mock("../../audio/metronome", async () => {
  const owner = await import("../../audio/transportOwner");
  return {
    startMetronome: vi.fn(() => owner.enableMetronome(() => {})),
    stopMetronome: vi.fn(() => owner.disableMetronome(() => {})),
  };
});

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
    metronomeModule.startMetronome.mockImplementation(() => {
      calls.push("startMetronome");
      enableMetronome(() => {});
    });

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
