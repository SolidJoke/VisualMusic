// VMU-223 — the swing and the humanisation, wired into the Studio.
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useStudioMode } from "../useStudioMode";

beforeEach(() => window.localStorage.clear());

const setup = () => renderHook(() => useStudioMode());

describe("VMU-223: nothing set", () => {
  it("starts straight and not humanised: the document carries no groove, and it is no edit", () => {
    const { result } = setup();
    expect(result.current.swing).toBe(50);
    expect(result.current.humanize).toBe(0);
    expect(result.current.timeline.groove).toBeUndefined();
    expect(result.current.hasEdits).toBe(false);
  });

  it("a new version with nothing set changes nothing (the very same document)", () => {
    const { result } = setup();
    const before = result.current.timeline;
    act(() => result.current.newChanceVersion());
    expect(result.current.timeline).toBe(before);
  });
});

describe("VMU-223: the settings ride on the document", () => {
  it("swing 66 puts the groove on the timeline with the Studio's seed; the settings are clamped", () => {
    const { result } = setup();
    act(() => result.current.setSwing(66));
    expect(result.current.timeline.groove).toEqual({ swing: 66, humanize: 0, seed: result.current.chance.seed });
    act(() => result.current.setSwing(99));
    expect(result.current.swing).toBe(75);
    act(() => result.current.setHumanize(-3));
    expect(result.current.humanize).toBe(0);
  });

  it("they are settings of play, not edits: hasEdits stays false", () => {
    const { result } = setup();
    act(() => {
      result.current.setSwing(66);
      result.current.setHumanize(40);
    });
    expect(result.current.hasEdits).toBe(false);
  });

  it("a change of style keeps them", () => {
    const { result } = setup();
    act(() => {
      result.current.setSwing(62);
      result.current.setHumanize(30);
    });
    act(() => result.current.setCurrentBrickIndex(3));
    expect(result.current.swing).toBe(62);
    expect(result.current.humanize).toBe(30);
    expect(result.current.timeline.groove.swing).toBe(62);
  });

  it("\"hear the original\" keeps them", () => {
    const { result } = setup();
    const track = result.current.timeline.tracks.find((t) => t.role === "hat");
    act(() => {
      result.current.setSwing(66);
      result.current.setTrackDensity(track.id, 50); // an edit, so that the original is something else
    });
    act(() => result.current.setListenOriginal(true));
    expect(result.current.isHearingOriginal).toBe(true);
    expect(result.current.timeline.groove).toEqual({ swing: 66, humanize: 0, seed: result.current.chance.seed });
  });

  it("the humanisation draws from the version's seed: another version, another draw", () => {
    const { result } = setup();
    act(() => result.current.setHumanize(50));
    const seed = result.current.timeline.groove.seed;
    act(() => result.current.newChanceVersion());
    expect(result.current.timeline.groove.seed).not.toBe(seed);
  });
});

describe("VMU-223: undo and redo", () => {
  it("↶ takes a setting back, ↷ puts it again", () => {
    const { result } = setup();
    act(() => result.current.setSwing(66));
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.swing).toBe(50);
    expect(result.current.timeline.groove).toBeUndefined();
    act(() => result.current.redo());
    expect(result.current.swing).toBe(66);
  });

  it("a held gesture (a slider drag) is ONE step, however many values it passes through", () => {
    const { result } = setup();
    act(() => result.current.beginGrooveGesture());
    for (const value of [52, 55, 58, 61, 64, 66]) act(() => result.current.setSwing(value));
    // Nothing is recorded while the hand is on the slider...
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.endGrooveGesture());
    // ...then one step, which one press takes all the way back.
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.swing).toBe(50);
    expect(result.current.canUndo).toBe(false);
  });

  it("without a gesture, each value is its own step (a keyboard or a script, one change at a time)", () => {
    const { result } = setup();
    act(() => result.current.setSwing(60));
    act(() => result.current.setSwing(66));
    act(() => result.current.undo());
    expect(result.current.swing).toBe(60);
  });

  it("ending a gesture that never started, or that changed nothing, adds no step", () => {
    const { result } = setup();
    act(() => result.current.endGrooveGesture());
    expect(result.current.canUndo).toBe(false);
    act(() => result.current.beginGrooveGesture());
    act(() => result.current.endGrooveGesture());
    expect(result.current.canUndo).toBe(false);
  });
});
