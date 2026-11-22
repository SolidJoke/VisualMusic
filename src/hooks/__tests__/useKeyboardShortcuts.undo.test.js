// VMU-227 — Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z (Cmd on a Mac) undo and redo; they stay
// out of the way of a text field, and of the "hear the original" button's Space.
//
// RED FIRST: useKeyboardShortcuts knows no undo nor redo on main.
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

afterEach(() => {
  document.body.innerHTML = "";
});

function press(init, target = window) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function mount(appMode = "studio") {
  const calls = { undo: vi.fn(), redo: vi.fn(), togglePlayback: vi.fn() };
  renderHook(() => useKeyboardShortcuts({ appMode, setAppMode: vi.fn(), ...calls }));
  return calls;
}

describe("VMU-227: undo / redo shortcuts", () => {
  it("Ctrl+Z undoes, Ctrl+Y and Ctrl+Shift+Z redo — Cmd on a Mac", () => {
    const c = mount();
    expect(press({ key: "z", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(c.undo).toHaveBeenCalledTimes(1);
    press({ key: "y", ctrlKey: true });
    press({ key: "Z", ctrlKey: true, shiftKey: true });
    expect(c.redo).toHaveBeenCalledTimes(2);
    press({ key: "z", metaKey: true });
    press({ key: "z", metaKey: true, shiftKey: true });
    expect(c.undo).toHaveBeenCalledTimes(2);
    expect(c.redo).toHaveBeenCalledTimes(3);
  });

  it("a bare Z, or Ctrl+Alt+Z, does nothing", () => {
    const c = mount();
    press({ key: "z" });
    press({ key: "z", ctrlKey: true, altKey: true });
    expect(c.undo).not.toHaveBeenCalled();
  });

  it("is ignored while the focus is in a text field — the field keeps its own undo", () => {
    const c = mount();
    for (const tag of ["input", "textarea", "select"]) {
      const el = document.createElement(tag);
      document.body.appendChild(el);
      el.focus();
      const event = press({ key: "z", ctrlKey: true }, el);
      expect(event.defaultPrevented).toBe(false);
    }
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.tabIndex = 0;
    document.body.appendChild(editable);
    editable.focus();
    press({ key: "z", ctrlKey: true }, editable);
    expect(c.undo).not.toHaveBeenCalled();
  });

  it("only acts in the Studio", () => {
    const c = mount("dictionary");
    press({ key: "z", ctrlKey: true });
    expect(c.undo).not.toHaveBeenCalled();
  });

  it("Space on the hold-to-hear button does not toggle playback", () => {
    const c = mount();
    const button = document.createElement("button");
    button.setAttribute("data-hold-original", "");
    document.body.appendChild(button);
    button.focus();
    press({ key: " ", code: "Space" }, button);
    expect(c.togglePlayback).not.toHaveBeenCalled();
    document.body.focus();
    button.blur();
    press({ key: " ", code: "Space" });
    expect(c.togglePlayback).toHaveBeenCalledTimes(1);
  });
});
