// VMU-219 — the Studio's key: one effective tonic, held by useStudioMode.
//
// RED FIRST: useStudioMode has no key on main (keyRoot, setKeyRoot, keyedBrick).
//
// Domain values: pitch classes, C = 0. Ré = 2, Fa = 5, Mi = 4. The styles used
// here are found by their tonic, not by an index (which moves with the list).
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useStudioMode } from "../useStudioMode";
import { BRICKS } from "../../core/bricks";
import { buildStudioTimeline } from "../../core/timeline";

const D = 2;
const F = 5;
const indexOfRoot = (root, skip = -1) => BRICKS.findIndex((b, i) => b.rootValue === root && i !== skip);

beforeEach(() => window.localStorage.clear());

describe("VMU-219: the Studio's effective key", () => {
  it("is the style's own tonic until the user chooses one — and the document is the style's, untouched", () => {
    const { result } = renderHook(() => useStudioMode());
    const style = result.current.activeBrick;
    expect(result.current.keyRoot).toBe(style.rootValue);
    expect(result.current.keyedBrick).toBe(style);
    expect(result.current.timeline).toEqual(buildStudioTimeline({ brickIndex: 0, theme: "A" }));
  });

  it("a chosen tonic moves the document, the keyed brick and keyRoot — and not the style's brick", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => result.current.setCurrentBrickIndex(indexOfRoot(D)));
    const style = result.current.activeBrick;
    const before = result.current.timeline;
    act(() => result.current.setKeyRoot(F));
    expect(result.current.keyRoot).toBe(F);
    expect(result.current.timeline.key).toEqual({ rootValue: F, scaleKey: style.scaleKey });
    expect(result.current.timeline.chords.map((c) => c.rootPc)).toEqual(before.chords.map((c) => (c.rootPc + 3) % 12));
    expect(result.current.keyedBrick.rootValue).toBe(F);
    expect(result.current.keyedBrick.scaleKey).toBe(style.scaleKey);
    // The style's own brick keeps its identity: the page's "style changed" effect
    // (it clears the user's edits) must not fire on a key change.
    expect(result.current.activeBrick).toBe(style);
  });

  it("keeps the chosen tonic when the style changes", () => {
    const { result } = renderHook(() => useStudioMode());
    const first = indexOfRoot(D);
    const second = indexOfRoot(4);
    act(() => result.current.setCurrentBrickIndex(first));
    act(() => result.current.setKeyRoot(F));
    act(() => result.current.setCurrentBrickIndex(second));
    expect(result.current.keyRoot).toBe(F);
    expect(result.current.timeline.key.rootValue).toBe(F);
    expect(result.current.timeline.key.scaleKey).toBe(BRICKS[second].scaleKey);
  });

  it("follows the new style's tonic when the user never changed it", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => result.current.setCurrentBrickIndex(indexOfRoot(D)));
    expect(result.current.keyRoot).toBe(D);
    act(() => result.current.setCurrentBrickIndex(indexOfRoot(4)));
    expect(result.current.keyRoot).toBe(4);
    expect(result.current.timeline.key.rootValue).toBe(4);
  });

  it("choosing the style's own tonic again is no choice: the next style's tonic is followed", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => result.current.setCurrentBrickIndex(indexOfRoot(D)));
    act(() => result.current.setKeyRoot(F));
    act(() => result.current.setKeyRoot(D));
    expect(result.current.keyRoot).toBe(D);
    act(() => result.current.setCurrentBrickIndex(indexOfRoot(4)));
    expect(result.current.keyRoot).toBe(4);
  });

  it("changing the key clears the clicked chord and its notes (they were voiced in the old key)", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => {
      result.current.setClickedChord({ nns: "1", rootNote: { value: D } });
      result.current.setCurrentAbsoluteNotes([62, 66, 69]);
    });
    act(() => result.current.setKeyRoot(F));
    expect(result.current.clickedChord).toBeNull();
    expect(result.current.currentAbsoluteNotes).toEqual([]);
  });

  it("keeps the user's edits when the key changes", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => result.current.setCustomProgression(["1", "4", "5", "1"]));
    act(() => result.current.setKeyRoot(F));
    expect(result.current.customProgression).toEqual(["1", "4", "5", "1"]);
    expect(result.current.activeTracks.progression).toEqual(["1", "4", "5", "1"]);
  });

  it("does not survive a reload (the default of VMU-219)", () => {
    const first = renderHook(() => useStudioMode());
    act(() => first.result.current.setKeyRoot(F));
    first.unmount();
    const second = renderHook(() => useStudioMode());
    expect(second.result.current.keyRoot).toBe(second.result.current.activeBrick.rootValue);
  });
});
