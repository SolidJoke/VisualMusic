// VMU-202 (slice 2) — the Dictionary keeps one start pitch per neck for a
// scale, next to its chosen position (placementIndex): `startPitchByInstrument`
// = { guitar: number|null, bass: number|null }, null = the neck's preset
// (guitar Do3 / bass Do2). Changing it resets the position to the default,
// exactly as a new root or type does; the common octave no longer does.
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { useDictionaryMode } from "../useDictionaryMode";
import { AppProvider } from "../../context/AppContext";

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

function setup(type) {
  const hook = renderHook(() => useDictionaryMode(), { wrapper });
  act(() => hook.result.current.setDictType(type));
  return hook;
}

describe("useDictionaryMode — startPitchByInstrument (VMU-202)", () => {
  it("starts with no chosen start pitch on either neck", () => {
    const { result } = setup("scale_major");
    expect(result.current.startPitchByInstrument).toEqual({ guitar: null, bass: null });
  });

  it("setStartPitch sets one neck, not the other", () => {
    const { result } = setup("scale_major");
    act(() => result.current.setStartPitch("guitar", 60));
    expect(result.current.startPitchByInstrument).toEqual({ guitar: 60, bass: null });
    act(() => result.current.setStartPitch("bass", 48));
    expect(result.current.startPitchByInstrument).toEqual({ guitar: 60, bass: 48 });
    act(() => result.current.setStartPitch("piano", 60));
    expect(result.current.startPitchByInstrument).toEqual({ guitar: 60, bass: 48 });
  });

  it("a new start pitch resets the chosen position, as a new root or type does", () => {
    const { result } = setup("scale_major");
    act(() => result.current.setPlacementIndex("guitar", 3));
    act(() => result.current.setPlacementIndex("bass", 1));
    expect(result.current.placementByInstrument.guitar.index).toBe(3);
    act(() => result.current.setStartPitch("guitar", 60));
    expect(result.current.placementByInstrument.guitar.index).toBeNull();
    expect(result.current.placementByInstrument.bass.index).toBe(1);
  });

  it("the common octave no longer clears a chosen scale position", () => {
    const { result } = setup("scale_major");
    act(() => result.current.setPlacementIndex("guitar", 2));
    act(() => result.current.setDictOctave(-2));
    expect(result.current.placementByInstrument.guitar.index).toBe(2);
  });

  it("a new root or type still clears both, as before", () => {
    const { result } = setup("scale_major");
    act(() => result.current.setPlacementIndex("guitar", 1));
    act(() => result.current.setDictRoot(5));
    expect(result.current.placementByInstrument.guitar.index).toBeNull();
  });
});
