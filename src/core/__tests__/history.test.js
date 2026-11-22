import { describe, it, expect } from "vitest";
import { createHistory, record, undo, redo, canUndo, canRedo, HISTORY_LIMIT, sameState } from "../history";

const s = (n) => ({ a: n, b: { c: [n] } });

describe("history (VMU-227)", () => {
  it("starts with nothing to undo or redo", () => {
    const h = createHistory(s(0));
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toEqual(s(0));
  });

  it("undoes and redoes, one step at a time", () => {
    let h = createHistory(s(0));
    h = record(h, s(1));
    h = record(h, s(2));
    h = undo(h);
    expect(h.present).toEqual(s(1));
    h = undo(h);
    expect(h.present).toEqual(s(0));
    expect(canUndo(h)).toBe(false);
    h = redo(h);
    expect(h.present).toEqual(s(1));
    h = redo(h);
    expect(h.present).toEqual(s(2));
    expect(canRedo(h)).toBe(false);
  });

  it("undo / redo with nothing to do return the same history", () => {
    const h = createHistory(s(0));
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it("a new action clears the future", () => {
    let h = createHistory(s(0));
    h = record(h, s(1));
    h = record(h, s(2));
    h = undo(h);
    h = record(h, s(9));
    expect(canRedo(h)).toBe(false);
    expect(h.present).toEqual(s(9));
    h = undo(h);
    expect(h.present).toEqual(s(1));
  });

  it("an identical state (by value) adds no step", () => {
    let h = createHistory(s(0));
    const same = record(h, s(0));
    expect(same).toBe(h);
    h = record(h, s(1));
    expect(record(h, s(1))).toBe(h);
    expect(h.past).toHaveLength(1);
  });

  it("keeps at most 50 steps, dropping the oldest", () => {
    expect(HISTORY_LIMIT).toBe(50);
    let h = createHistory(s(0));
    for (let i = 1; i <= 60; i++) h = record(h, s(i));
    expect(h.past).toHaveLength(50);
    for (let i = 0; i < 50; i++) h = undo(h);
    expect(canUndo(h)).toBe(false);
    expect(h.present).toEqual(s(10)); // 0..9 fell out of the window
  });

  it("sameState compares by value, including null, arrays and key order", () => {
    expect(sameState({ x: [1, { y: null }], z: 2 }, { z: 2, x: [1, { y: null }] })).toBe(true);
    expect(sameState({ x: [1] }, { x: [2] })).toBe(false);
    expect(sameState({ x: null }, { x: undefined })).toBe(false);
    expect(sameState(null, null)).toBe(true);
    expect(sameState(null, {})).toBe(false);
  });
});
