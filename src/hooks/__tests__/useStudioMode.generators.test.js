// @ts-check
// VMU-234 — useStudioMode through the generator registry: at every step of a
// mixed sequence (key, chord, chance, density, a swing slider gesture) the
// document the hook plays is the one the code of before computed for the
// same state, byte for byte in JSON; undo / redo walk back through exactly
// those states, the gesture being one step; the identities the separate
// memos used to keep still hold.
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useStudioMode } from "../useStudioMode";
import { BRICKS } from "../../core/bricks";
import { replaceChord } from "../../core/progressionEdit";
import { oldPlayed } from "../../core/generate/__tests__/oldStudioChain";

beforeEach(() => window.localStorage.clear());

const D = BRICKS[0].rootValue;
const F = D === 5 ? 2 : 5;

/** What the code of before played for the hook's present state. */
function reference(current) {
  return oldPlayed({
    brickIndex: current.currentBrickIndex,
    theme: current.currentTheme,
    overrides: {
      customDrums: current.customDrums,
      customRhythm: current.customRhythm,
      customProgression: current.customProgression,
      suggestedBassTrack: current.suggestedBassTrack,
    },
    customChords: current.customChords,
    chance: current.chance,
    keyChoice: current.keyRoot === current.activeBrick.rootValue ? null : current.keyRoot,
    swing: current.swing,
    humanize: current.humanize,
    listenOriginal: current.listenOriginal,
  });
}

/** The state a step leaves, as one comparable string. */
function stateOf(current) {
  return JSON.stringify({
    timeline: current.timeline,
    dropped: current.chanceDropped,
    keyRoot: current.keyRoot,
    customChords: current.customChords,
    chance: current.chance,
    swing: current.swing,
    humanize: current.humanize,
    hasEdits: current.hasEdits,
  });
}

function expectReference(current) {
  const ref = reference(current);
  expect(JSON.stringify(current.timeline)).toBe(JSON.stringify(ref.timeline));
  expect(JSON.stringify(current.chanceDropped)).toBe(JSON.stringify(ref.chanceDropped));
  expect(current.hasEdits).toBe(ref.hasEdits);
  expect(current.isHearingOriginal).toBe(ref.isHearingOriginal);
}

describe("VMU-234: a mixed sequence, step by step", () => {
  it("plays what the code of before played, and undo / redo walk back through the same states", () => {
    const { result } = renderHook(() => useStudioMode());
    const kick = result.current.timeline.tracks.find((t) => t.role === "kick").id;
    const states = [stateOf(result.current)];
    expectReference(result.current);

    const steps = [
      () => result.current.setKeyRoot(F),
      () => result.current.editChords((list) => replaceChord(list, 0, list[0].nns === "4" ? "5" : "4")),
      () => result.current.cycleCellChance(kick, 0),
      () => result.current.setTrackDensity(kick, 40),
    ];
    for (const step of steps) {
      act(step);
      expectReference(result.current);
      states.push(stateOf(result.current));
    }
    // The swing slider: many values, one gesture, one step.
    act(() => result.current.beginGrooveGesture());
    for (const value of [52, 57, 61, 66]) {
      act(() => result.current.setSwing(value));
      expectReference(result.current);
    }
    act(() => result.current.endGrooveGesture());
    states.push(stateOf(result.current));
    expect(new Set(states).size).toBe(states.length); // every step changed something

    // "Hear the original" in the middle: the style alone, same key and groove.
    act(() => result.current.setListenOriginal(true));
    expect(result.current.isHearingOriginal).toBe(true);
    expectReference(result.current);
    act(() => result.current.setListenOriginal(false));

    for (let i = states.length - 2; i >= 0; i -= 1) {
      act(() => result.current.undo());
      expect(stateOf(result.current)).toBe(states[i]);
      expectReference(result.current);
    }
    expect(result.current.canUndo).toBe(false);
    for (let i = 1; i < states.length; i += 1) {
      act(() => result.current.redo());
      expect(stateOf(result.current)).toBe(states[i]);
    }
    expect(result.current.canRedo).toBe(false);
  });
});

describe("VMU-234: the identities the separate memos kept", () => {
  it("a new seed, chance neutral and no groove, keeps the very same document, even transposed", () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => result.current.setKeyRoot(F));
    const before = result.current.timeline;
    act(() => result.current.newChanceVersion());
    expect(result.current.timeline).toBe(before);
  });

  it("moving the swing keeps the very same marks while the chance is set", () => {
    const { result } = renderHook(() => useStudioMode());
    const kick = result.current.timeline.tracks.find((t) => t.role === "kick").id;
    act(() => result.current.setTrackDensity(kick, 30));
    const marks = result.current.chanceDropped;
    expect(Object.keys(marks).length).toBeGreaterThan(0);
    act(() => result.current.setSwing(64));
    expect(result.current.chanceDropped).toBe(marks);
  });

  it("a re-render with nothing changed keeps the document", () => {
    const { result, rerender } = renderHook(() => useStudioMode());
    const before = result.current.timeline;
    rerender();
    expect(result.current.timeline).toBe(before);
  });
});
