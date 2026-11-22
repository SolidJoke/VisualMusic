// VMU-227 — try without fear: undo / redo over the Studio's edits, and the
// hold-to-hear-the-original.
//
// RED FIRST: useStudioMode has no undo, redo, nor listenOriginal on main.
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useStudioMode } from "../useStudioMode";
import { BRICKS } from "../../core/bricks";
import { buildStudioTimeline } from "../../core/timeline";
import { exportTimelineDrums, exportTimelineChords } from "../../audio/MidiExporter";

// The Studio opens on the first style (nothing persisted): its tonic is the
// style's own; F is a key that is not it.
const D = BRICKS[0].rootValue;
const F = D === 5 ? 2 : 5;
const otherStyle = () => BRICKS.findIndex((b) => b.rootValue !== D);
const bytes = (doc) =>
  JSON.stringify([
    Array.from(new Uint8Array(exportTimelineDrums(doc, 100))),
    Array.from(new Uint8Array(exportTimelineChords(doc, 100))),
  ]);

beforeEach(() => window.localStorage.clear());

function setup() {
  return renderHook(() => useStudioMode());
}

describe("VMU-227: undo / redo", () => {
  it("starts with nothing to undo or redo", () => {
    const { result } = renderHook(() => useStudioMode());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("an undone override gives back the loop of before, byte for byte at the export", () => {
    const { result } = setup();
    const start = bytes(result.current.timeline);
    const drumName = result.current.activeTracks.drums[0].name;
    act(() => result.current.setCustomDrums({ [drumName]: [0, 4, 8, 12] }));
    expect(bytes(result.current.timeline)).not.toBe(start);
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(bytes(result.current.timeline)).toBe(start);
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.redo());
    expect(bytes(result.current.timeline)).not.toBe(start);
    expect(result.current.customDrums).toEqual({ [drumName]: [0, 4, 8, 12] });
  });

  it("covers the variation A/B, the style and the key — three undos walk back to the start", () => {
    const { result } = setup();
    const start = bytes(result.current.timeline);
    const startBrick = result.current.currentBrickIndex;
    act(() => result.current.setCurrentTheme("B"));
    act(() => result.current.setKeyRoot(F));
    act(() => result.current.setCurrentBrickIndex(otherStyle()));
    expect(result.current.keyRoot).toBe(F);
    act(() => result.current.undo()); // style
    expect(result.current.currentBrickIndex).toBe(startBrick);
    expect(result.current.keyRoot).toBe(F);
    act(() => result.current.undo()); // key
    expect(result.current.keyRoot).toBe(D);
    act(() => result.current.undo()); // variation
    expect(result.current.currentTheme).toBe("A");
    expect(bytes(result.current.timeline)).toBe(start);
    expect(result.current.canUndo).toBe(false);
  });

  it("a style change is ONE step, even though it clears the overrides", () => {
    const { result } = setup();
    const drumName = result.current.activeTracks.drums[0].name;
    act(() => result.current.setCustomDrums({ [drumName]: [1, 5] }));
    const withEdit = bytes(result.current.timeline);
    const brickBefore = result.current.currentBrickIndex;
    act(() => result.current.setCurrentBrickIndex(otherStyle()));
    expect(result.current.customDrums).toBe(null);
    act(() => result.current.undo());
    expect(result.current.currentBrickIndex).toBe(brickBefore);
    expect(result.current.customDrums).toEqual({ [drumName]: [1, 5] });
    expect(bytes(result.current.timeline)).toBe(withEdit);
  });

  it("a key chosen back where it was adds no step", () => {
    const { result } = setup();
    act(() => result.current.setKeyRoot(D)); // the style's own tonic: no choice at all
    expect(result.current.canUndo).toBe(false);
  });

  it("a new action after an undo clears what could be redone", () => {
    const { result } = setup();
    act(() => result.current.setCurrentTheme("B"));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.setKeyRoot(F));
    expect(result.current.canRedo).toBe(false);
  });

  it("keeps at most 50 steps", () => {
    const { result } = setup();
    for (let i = 0; i < 60; i++) act(() => result.current.setCustomRhythm([i % 16, (i + 1) % 16, 20 + i]));
    let undone = 0;
    while (result.current.canUndo) {
      act(() => result.current.undo());
      undone++;
      if (undone > 100) break;
    }
    expect(undone).toBe(50);
  });
});

describe("VMU-227: hold to hear the original", () => {
  it("plays the style's own fill (the document's base) in the same key, while held, and the edit again after", () => {
    const { result } = setup();
    const drumName = result.current.activeTracks.drums[0].name;
    act(() => result.current.setKeyRoot(F));
    act(() => result.current.setCustomDrums({ [drumName]: [0, 4, 8, 12] }));
    const edited = result.current.timeline;
    const original = buildStudioTimeline({ brickIndex: result.current.currentBrickIndex, theme: "A" });
    act(() => result.current.setListenOriginal(true));
    const heard = result.current.timeline;
    expect(result.current.isHearingOriginal).toBe(true);
    // the events: the base's tracks, cell for cell
    expect(heard.tracks.map((t) => t.steps)).toEqual(original.tracks.map((t) => t.steps));
    expect(heard.tracks.map((t) => t.steps)).toEqual(edited.base.tracks.map((t) => t.steps));
    // same key
    expect(heard.key.rootValue).toBe(F);
    act(() => result.current.setListenOriginal(false));
    expect(result.current.timeline).toEqual(edited);
    expect(result.current.isHearingOriginal).toBe(false);
  });

  it("is no history step, and does not touch the edits", () => {
    const { result } = setup();
    const drumName = result.current.activeTracks.drums[0].name;
    act(() => result.current.setCustomDrums({ [drumName]: [2] }));
    act(() => result.current.setListenOriginal(true));
    act(() => result.current.setListenOriginal(false));
    expect(result.current.customDrums).toEqual({ [drumName]: [2] });
    act(() => result.current.undo());
    expect(result.current.customDrums).toBe(null);
    expect(result.current.canUndo).toBe(false);
  });
});
