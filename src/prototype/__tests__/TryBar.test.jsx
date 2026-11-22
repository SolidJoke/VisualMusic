// VMU-227 — the try bar: ↶ ↷ greyed when empty, and a "hear the original" that
// is HELD (mouse, touch, Space) and lets go when the hand does.
//
// RED FIRST: prototype/TryBar.jsx does not exist on main.
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TryBar from "../TryBar";
import { translations } from "../../i18n/translations";

const LANGS = ["fr", "en", "pt", "zh"];

function mount(extra = {}, lang = "fr") {
  const props = {
    T: translations[lang].protoA,
    canUndo: true,
    canRedo: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    hasEdits: true,
    holding: false,
    onHold: vi.fn(),
    ...extra,
  };
  render(<TryBar {...props} />);
  return props;
}

describe("VMU-227: the try bar", () => {
  it("greys ↶ and ↷ when there is nothing to undo or redo, and clicks call undo / redo", () => {
    const p = mount({ canUndo: false, canRedo: false });
    expect(screen.getByRole("button", { name: /annuler/i }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /rétablir/i }).disabled).toBe(true);
    document.body.innerHTML = "";
    const q = mount();
    fireEvent.click(screen.getByRole("button", { name: /annuler/i }));
    fireEvent.click(screen.getByRole("button", { name: /rétablir/i }));
    expect(q.onUndo).toHaveBeenCalledTimes(1);
    expect(q.onRedo).toHaveBeenCalledTimes(1);
    expect(p.onUndo).not.toHaveBeenCalled();
  });

  it("holds with the pointer (mouse or touch) and lets go on release or cancel", () => {
    const p = mount();
    const hold = screen.getByRole("button", { name: /écouter l'original/i });
    fireEvent.pointerDown(hold, { pointerId: 1, button: 0 });
    expect(p.onHold).toHaveBeenLastCalledWith(true);
    fireEvent.pointerUp(hold, { pointerId: 1 });
    expect(p.onHold).toHaveBeenLastCalledWith(false);
    fireEvent.pointerDown(hold, { pointerId: 2, button: 0 });
    fireEvent.pointerCancel(hold, { pointerId: 2 });
    expect(p.onHold).toHaveBeenLastCalledWith(false);
  });

  it("holds with the Space bar once focused — and a held key does not re-fire", () => {
    const p = mount();
    const hold = screen.getByRole("button", { name: /écouter l'original/i });
    fireEvent.keyDown(hold, { key: " ", code: "Space" });
    fireEvent.keyDown(hold, { key: " ", code: "Space", repeat: true });
    expect(p.onHold.mock.calls.filter(([on]) => on === true)).toHaveLength(1);
    fireEvent.keyUp(hold, { key: " ", code: "Space" });
    expect(p.onHold).toHaveBeenLastCalledWith(false);
  });

  it("lets go when the focus leaves, and a long press does not open the context menu", () => {
    const p = mount();
    const hold = screen.getByRole("button", { name: /écouter l'original/i });
    fireEvent.pointerDown(hold, { pointerId: 1, button: 0 });
    fireEvent.blur(hold);
    expect(p.onHold).toHaveBeenLastCalledWith(false);
    const notPrevented = fireEvent.contextMenu(hold);
    expect(notPrevented).toBe(false); // preventDefault was called
  });

  it("shows the button pressed while held, and is a keyboard stop marked for the shortcuts", () => {
    mount({ holding: true });
    const hold = screen.getByRole("button", { name: /écouter l'original/i });
    expect(hold.getAttribute("aria-pressed")).toBe("true");
    expect(hold.hasAttribute("data-hold-original")).toBe(true);
  });

  it("has a label and a hint in the 4 languages", () => {
    for (const lang of LANGS) {
      const T = translations[lang].protoA;
      for (const k of ["undoLabel", "redoLabel", "hearOriginal", "hearOriginalHint"]) {
        expect(typeof T[k], `${lang}.${k}`).toBe("string");
        expect(T[k].length).toBeGreaterThan(1);
      }
    }
  });
});
