// VMU-031 lot 2 — the phone piano's ‹ ›: a move holds until the active notes
// change, then the window falls back on the notes; the buttons' state follows
// the keyboard's ends.
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePianoWindow } from "../usePianoWindow";
import { realizeChord, realizeScale } from "../../core/noteEngine";

const KB = { lowestOctave: 2, octaveCount: 7, windowOctaves: 2 };
const CMAJ4 = realizeChord(0, [0, 4, 7], 4); // C4 E4 G4 -> window C3..C5 (start 3)
const CMAJ5 = realizeChord(0, [0, 4, 7], 5); // +1 octave -> start 4

describe("usePianoWindow", () => {
  it("follows the notes", () => {
    const { result, rerender } = renderHook(({ p }) => usePianoWindow(p, 0, KB), { initialProps: { p: CMAJ4 } });
    expect(result.current.startOctave).toBe(3);
    expect(result.current.manual).toBe(false);
    rerender({ p: CMAJ5 });
    expect(result.current.startOctave).toBe(4);
  });

  it("‹ › move by an octave and the move holds across renders with the same notes", () => {
    const { result, rerender } = renderHook(({ p }) => usePianoWindow(p, 0, KB), { initialProps: { p: CMAJ4 } });
    act(() => result.current.shift(1));
    expect(result.current.startOctave).toBe(4);
    expect(result.current.manual).toBe(true);
    // A new array with the same pitches is "the same notes": the move stays.
    rerender({ p: [...CMAJ4] });
    expect(result.current.startOctave).toBe(4);
    act(() => result.current.shift(-1));
    act(() => result.current.shift(-1));
    expect(result.current.startOctave).toBe(2);
  });

  it("falls back on the notes the moment they change", () => {
    const { result, rerender } = renderHook(({ p }) => usePianoWindow(p, 0, KB), { initialProps: { p: CMAJ4 } });
    act(() => result.current.shift(3));
    expect(result.current.startOctave).toBe(6);
    rerender({ p: CMAJ5 }); // +1 octave in the Dictionary / a new chord in the Studio
    expect(result.current.startOctave).toBe(4);
    expect(result.current.manual).toBe(false);
  });

  it("an old move does not come back when the first notes return", () => {
    const { result, rerender } = renderHook(({ p }) => usePianoWindow(p, 0, KB), { initialProps: { p: CMAJ4 } });
    act(() => result.current.shift(2));
    expect(result.current.startOctave).toBe(5);
    rerender({ p: CMAJ5 });
    rerender({ p: CMAJ4 });
    expect(result.current.startOctave).toBe(3);
    expect(result.current.manual).toBe(false);
  });

  it("stops at the ends and says so", () => {
    const { result } = renderHook(() => usePianoWindow(CMAJ4, 0, KB));
    act(() => result.current.shift(-10));
    expect(result.current.startOctave).toBe(2);
    expect(result.current.canPrev).toBe(false);
    expect(result.current.canNext).toBe(true);
    act(() => result.current.shift(10));
    expect(result.current.startOctave).toBe(7);
    expect(result.current.canPrev).toBe(true);
    expect(result.current.canNext).toBe(false);
  });

  it("a high scale is held and the next button starts disabled", () => {
    const pitches = realizeScale(11, "scale_major", 7);
    const { result } = renderHook(() => usePianoWindow(pitches, 11, KB));
    expect(result.current.holdsAll).toBe(true);
    expect(result.current.canNext).toBe(false);
  });
});
