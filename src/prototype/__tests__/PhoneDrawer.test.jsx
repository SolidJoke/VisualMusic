// C-109 (phone, lot 1) — the bottom sheet (src/prototype/PhoneDrawer.jsx).
// The parent owns the height (remembered per mode); this test plays the parent
// with a small harness and stops the real history navigation (pushState / back
// / go are spied) so the sheet's own rules are what is measured: the three
// heights, the handle's cycle, Escape and popstate stepping down, and the
// per-mode memory. The stage press is the parent's (PrototypeAPhone.test.jsx).
import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import PhoneDrawer from "../PhoneDrawer";
import { translations } from "../../i18n/translations";

const T = translations.fr.protoA;

function Harness() {
  const [mode, setMode] = useState("studio");
  const [heights, setHeights] = useState({ studio: "folded", dictionary: "folded" });
  return (
    <>
      <button type="button" data-testid="to-studio" onClick={() => setMode("studio")}>
        studio
      </button>
      <button type="button" data-testid="to-dictionary" onClick={() => setMode("dictionary")}>
        dictionary
      </button>
      <PhoneDrawer
        height={heights[mode]}
        onHeightChange={(next) => setHeights((all) => ({ ...all, [mode]: next }))}
        label={T.drawer}
        handleLabel={T.drawerHandle}
      >
        <p data-testid="content">centre</p>
      </PhoneDrawer>
    </>
  );
}

const drawer = () => document.querySelector(".phone-drawer");
const handle = () => document.querySelector('[data-fn="nav.tiroir-poignee"]');
const height = () => drawer().getAttribute("data-drawer-height");

async function press(el) {
  await act(async () => {
    fireEvent.click(el);
  });
}

async function escape() {
  await act(async () => {
    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
  });
}

async function pop(state) {
  await act(async () => {
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  });
}

beforeEach(() => {
  vi.spyOn(window.history, "pushState").mockImplementation(() => {});
  vi.spyOn(window.history, "back").mockImplementation(() => {});
  vi.spyOn(window.history, "go").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("C-109: the phone drawer's three heights", () => {
  it("starts folded, is a region with its accessible name and its content", () => {
    render(<Harness />);
    expect(height()).toBe("folded");
    expect(drawer().getAttribute("role")).toBe("region");
    expect(drawer().getAttribute("aria-label")).toBe(T.drawer);
    expect(drawer().querySelector('[data-testid="content"]')).not.toBeNull();
  });

  it("walks folded -> half -> full -> half with the handle", async () => {
    render(<Harness />);
    expect(handle().tagName).toBe("BUTTON");
    expect(handle().getAttribute("aria-label")).toBe(T.drawerHandle);

    await press(handle());
    expect(height()).toBe("half");
    // Each rise pushed one entry.
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(window.history.pushState.mock.calls[0][0]).toMatchObject({ phoneDrawerHeight: "half" });

    await press(handle());
    expect(height()).toBe("full");
    expect(window.history.pushState).toHaveBeenCalledTimes(2);
    expect(window.history.pushState.mock.calls[1][0]).toMatchObject({ phoneDrawerHeight: "full" });

    // At full, the handle goes back down one step.
    await press(handle());
    expect(height()).toBe("half");
    expect(window.history.back).toHaveBeenCalledTimes(1);
  });

  it("Escape steps down one height, and does nothing at folded", async () => {
    render(<Harness />);
    await escape();
    expect(height()).toBe("folded");
    expect(window.history.back).not.toHaveBeenCalled();

    await press(handle()); // half
    await press(handle()); // full
    await escape();
    expect(height()).toBe("half");
    expect(window.history.back).toHaveBeenCalledTimes(1);

    await escape();
    expect(height()).toBe("folded");
    expect(window.history.back).toHaveBeenCalledTimes(2);
  });

  it("a popstate (the browser's Back) lands on the height its entry names", async () => {
    render(<Harness />);
    await press(handle()); // half
    await press(handle()); // full
    expect(height()).toBe("full");

    await pop({ phoneDrawerHeight: "half" });
    expect(height()).toBe("half");

    // The app's original entry carries no height: folded.
    await pop(null);
    expect(height()).toBe("folded");
  });

  it("remembers the height per mode (Studio / Dictionary), in the parent's state", async () => {
    render(<Harness />);
    await press(handle()); // Studio: half
    expect(height()).toBe("half");

    await press(document.querySelector('[data-testid="to-dictionary"]'));
    expect(height()).toBe("folded");

    await press(handle()); // Dictionary: half
    expect(height()).toBe("half");

    await press(document.querySelector('[data-testid="to-studio"]'));
    expect(height()).toBe("half");

    await press(handle()); // Studio: full
    await press(document.querySelector('[data-testid="to-dictionary"]'));
    expect(height()).toBe("half");
    await press(document.querySelector('[data-testid="to-studio"]'));
    expect(height()).toBe("full");
  });
});
