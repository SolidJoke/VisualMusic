/**
 * VMU-101 — the play button on an instrument tile selects that instrument AND
 * plays it, in one gesture.
 *
 * The obvious implementation is wrong:
 *
 *   onClick={() => { setPlaybackInstrument("bass"); playDictionaryAudio(); }}
 *
 * `playDictionaryAudio` is a useCallback closing over `playbackInstrument` and
 * over the notes realized for it. Called in the same event as the setter, it is
 * still the callback from the previous render: it plays the instrument that was
 * selected BEFORE the click, with that instrument's notes, while the screen
 * switches to the new one. The exact class of defect #103 removed — what is
 * heard is not what is shown — reintroduced by a button.
 *
 * The harness below reproduces that closure faithfully: `play` records the
 * selection it was bound to, and is rebound on every render, as
 * playDictionaryAudio is.
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useState, useCallback, useRef } from "react";
import { useSelectThenPlay } from "../useSelectThenPlay";

function useHarness(initial) {
  const [selected, setSelected] = useState(initial);
  const heard = useRef([]);
  const play = useCallback(() => {
    heard.current.push(selected);
  }, [selected]);
  const selectAndPlay = useSelectThenPlay({ selected, setSelected, play });
  return { selected, selectAndPlay, heard };
}

describe("useSelectThenPlay", () => {
  it("plays the newly selected instrument, not the one selected before the click", () => {
    const { result } = renderHook(() => useHarness("piano"));

    act(() => result.current.selectAndPlay("bass"));

    expect(result.current.selected).toBe("bass");
    expect(result.current.heard.current).toEqual(["bass"]);
  });

  it("plays at once when the instrument is already selected", () => {
    const { result } = renderHook(() => useHarness("guitar"));

    act(() => result.current.selectAndPlay("guitar"));

    expect(result.current.heard.current).toEqual(["guitar"]);
  });

  it("plays only the last choice when two tiles are pressed before a render", () => {
    // A double tap across two tiles on a phone. Playing both would sound the
    // first instrument for a fraction of a second, then cut it off.
    const { result } = renderHook(() => useHarness("piano"));

    act(() => {
      result.current.selectAndPlay("bass");
      result.current.selectAndPlay("guitar");
    });

    expect(result.current.selected).toBe("guitar");
    expect(result.current.heard.current).toEqual(["guitar"]);
  });

  it("does not replay on a later, unrelated render", () => {
    const { result, rerender } = renderHook(() => useHarness("piano"));

    act(() => result.current.selectAndPlay("bass"));
    rerender();
    rerender();

    expect(result.current.heard.current).toEqual(["bass"]);
  });
});
