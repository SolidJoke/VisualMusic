// @ts-check
// VMU-234 — the promise of the registry: a generator added to it plugs into
// the Studio WITHOUT any change to hooks/useStudioMode.js. The registry is
// replaced here by the real one plus a dummy generator; the hook is the real,
// unmodified one. Everything the Studio does for its generators must then
// work for the dummy: the played document, the marks, "has edits", "hear the
// original", the change of style, and the history (one undo step per change).
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../registry", async (importOriginal) => {
  /** @type {any} */
  const actual = await importOriginal();
  const { defineGenerator } = await import("../contract");
  const dummy = defineGenerator({
    id: "dummy",
    kind: "edit",
    reads: ["theme"],
    initial: () => 0,
    isActive: (n) => n > 0,
    forNewStyle: (n) => (n === 0 ? n : 0),
    // Removes the first n hits of the first drum track, and says so.
    apply: (doc, n, { theme }) => {
      if (!n) return { doc };
      const track = doc.tracks.find((t) => t.role === "kick");
      const hits = track.steps.flatMap((cell, i) => (cell ? [i] : [])).slice(0, n);
      const steps = track.steps.map((cell, i) => (hits.includes(i) ? null : cell));
      return { doc: { ...doc, dummyTheme: theme, tracks: doc.tracks.map((t) => (t === track ? { ...t, steps } : t)) }, dropped: { [track.id]: hits } };
    },
  });
  // At the end of the chain: after the groove.
  return { ...actual, GENERATORS: Object.freeze([...actual.GENERATORS, dummy]) };
});

const { useStudioMode } = await import("../../../hooks/useStudioMode");

beforeEach(() => window.localStorage.clear());

describe("VMU-234: a generator added to the registry, the hook unchanged", () => {
  it("gets its settings, plays in the document and marks its hits", () => {
    const { result } = renderHook(() => useStudioMode());
    expect(result.current.generators.dummy).toBe(0);
    expect(/** @type {any} */ (result.current.timeline).dummyTheme).toBeUndefined();
    act(() => result.current.updateGenerator("dummy", () => 2));
    expect(/** @type {any} */ (result.current.timeline).dummyTheme).toBe("A");
    const kick = result.current.timeline.tracks.find((t) => t.role === "kick");
    expect(result.current.chanceDropped[kick.id]).toHaveLength(2);
  });

  it("counts as an edit, and \"hear the original\" leaves it out", () => {
    const { result } = renderHook(() => useStudioMode());
    expect(result.current.hasEdits).toBe(false);
    act(() => result.current.updateGenerator("dummy", () => 1));
    expect(result.current.hasEdits).toBe(true);
    act(() => result.current.setListenOriginal(true));
    expect(result.current.isHearingOriginal).toBe(true);
    expect(/** @type {any} */ (result.current.timeline).dummyTheme).toBeUndefined();
    expect(result.current.chanceDropped).toEqual({});
  });

  it("is one undo step per change, and a gesture is one step whatever it moves", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => result.current.updateGenerator("dummy", () => 1));
    act(() => result.current.beginGesture());
    act(() => result.current.updateGenerator("dummy", () => 2));
    act(() => result.current.updateGenerator("dummy", () => 3));
    act(() => result.current.endGesture());
    act(() => result.current.undo());
    expect(result.current.generators.dummy).toBe(1);
    act(() => result.current.undo());
    expect(result.current.generators.dummy).toBe(0);
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.redo());
    act(() => result.current.redo());
    expect(result.current.generators.dummy).toBe(3);
  });

  it("follows its own rule on a change of style", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => result.current.updateGenerator("dummy", () => 2));
    act(() => result.current.setCurrentBrickIndex(3));
    expect(result.current.generators.dummy).toBe(0);
    act(() => result.current.undo());
    expect(result.current.generators.dummy).toBe(2);
  });
});
