// INST-B1 — the Dictionary state keeps one placement per instrument:
//   placementByInstrument = { piano: { octave }, guitar: { index }, bass: { index } }
// `index` points into core/placements.js listPlacements (nut -> body), null =
// the default placement. The piano's placement stays the common octave
// (dictOctave): B1 does not move it.
//
// What clears a chosen index: a new root or a new type (as before); the common
// octave for a single note (the octave changes the note itself). A chord shape
// and a scale position survive an octave change: the octave moves neither (a
// scale's start pitch picks its position, VMU-202).
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

describe("useDictionaryMode — placementByInstrument (INST-B1)", () => {
  it("starts with the defaults; the piano's placement is the common octave", () => {
    const { result } = setup("chord_major");
    expect(result.current.placementByInstrument).toEqual({
      piano: { octave: 0 },
      guitar: { index: null },
      bass: { index: null },
    });
    act(() => result.current.setDictOctave(2));
    expect(result.current.placementByInstrument.piano).toEqual({ octave: 2 });
  });

  it("setPlacementIndex sets one instrument, not the other; the old voicing indexes are gone", () => {
    const { result } = setup("chord_major");
    act(() => result.current.setPlacementIndex("guitar", 2));
    expect(result.current.placementByInstrument.guitar).toEqual({ index: 2 });
    expect(result.current.placementByInstrument.bass).toEqual({ index: null });
    act(() => result.current.setPlacementIndex("bass", 0));
    expect(result.current.placementByInstrument.bass).toEqual({ index: 0 });
    expect(result.current).not.toHaveProperty("selectedVoicingIndexGuitar");
    expect(result.current).not.toHaveProperty("setSelectedVoicingIndexBass");
  });

  it("a chord: the octave keeps both chosen shapes", () => {
    const { result } = setup("chord_major");
    act(() => {
      result.current.setPlacementIndex("guitar", 2);
      result.current.setPlacementIndex("bass", 1);
    });
    act(() => result.current.setDictOctave(1));
    expect(result.current.placementByInstrument.guitar.index).toBe(2);
    expect(result.current.placementByInstrument.bass.index).toBe(1);
  });

  it("a scale: the octave keeps the chosen position (the start pitch picks it, VMU-202); a note: it clears it", () => {
    const scale = setup("scale_major");
    act(() => {
      scale.result.current.setPlacementIndex("guitar", 3);
      scale.result.current.setPlacementIndex("bass", 1);
    });
    act(() => scale.result.current.setDictOctave(-2));
    expect(scale.result.current.placementByInstrument).toMatchObject({ guitar: { index: 3 }, bass: { index: 1 } });

    const note = setup("single_note");
    act(() => {
      note.result.current.setPlacementIndex("guitar", 3);
      note.result.current.setPlacementIndex("bass", 1);
    });
    act(() => note.result.current.setDictOctave(-2));
    expect(note.result.current.placementByInstrument).toMatchObject({ guitar: { index: null }, bass: { index: null } });
  });

  it("a new root or a new type clears both, as before", () => {
    const { result } = setup("chord_major");
    act(() => result.current.setPlacementIndex("guitar", 1));
    act(() => result.current.setDictRoot(5));
    expect(result.current.placementByInstrument.guitar.index).toBeNull();
    act(() => result.current.setPlacementIndex("bass", 2));
    act(() => result.current.setDictType("chord_minor"));
    expect(result.current.placementByInstrument.bass.index).toBeNull();
  });
});
