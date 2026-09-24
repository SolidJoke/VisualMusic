// VMU-142 — the scale/chord-type dropdown (and every other CustomSelect)
// used to render its open list as a `position: absolute` descendant, which
// a clipping ancestor (e.g. the popup's `.modal-container { overflow:
// hidden }` / `.modal-body { overflow-y: auto }`, Modal.css) cuts off
// regardless of z-index — Gabriel's report. Fix: portal the open list into
// `document.body`, `position: fixed`, computed from the field's own
// `getBoundingClientRect()`. These tests cover what jsdom *can* verify (DOM
// structure, event wiring) — real pixel positioning/clipping is verified
// separately with `npm run layout:probe` (Chromium), since jsdom does no
// layout at all (see CLAUDE.md "Pièges du dépôt").
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import CustomSelect from "../CustomSelect";

afterEach(cleanup);

const OPTIONS = [
  { value: "major", label: "Majeur" },
  { value: "minor", label: "Mineur" },
  {
    label: "Modes",
    items: [
      { value: "dorian", label: "Dorien" },
      { value: "phrygian", label: "Phrygien" },
    ],
  },
];

function renderSelect(props = {}) {
  const onChange = props.onChange || vi.fn();
  const utils = render(
    <CustomSelect options={OPTIONS} value={props.value ?? "major"} onChange={onChange} className={props.className} data-testid={props["data-testid"]} />
  );
  return { ...utils, onChange };
}

function openViaClick(container) {
  const header = container.querySelector(".custom-select-header");
  fireEvent.click(header);
  return header;
}

// The click-outside handler listens for "mousedown" (CustomSelect.jsx), not
// "click" — fire both, in the real browser order, to exercise the actual
// interaction a click on a dropdown item goes through instead of the
// single synthetic "click" `fireEvent.click` would dispatch on its own.
function clickLikeAUser(element) {
  fireEvent.mouseDown(element);
  fireEvent.click(element);
}

describe("CustomSelect (VMU-142 — portal)", () => {
  describe("1. Out of the clipping frame", () => {
    it("renders the open panel in document.body, not as a descendant of a clipping ancestor (e.g. .modal-container)", () => {
      const modalContainer = document.createElement("div");
      modalContainer.className = "modal-container";
      document.body.appendChild(modalContainer);

      const { container } = render(
        <CustomSelect options={OPTIONS} value="major" onChange={vi.fn()} />,
        { container: modalContainer }
      );

      openViaClick(container);

      const panel = document.body.querySelector('[data-testid="custom-select-dropdown"]');
      expect(panel).not.toBeNull();
      expect(modalContainer.contains(panel)).toBe(false);
      expect(document.body.contains(panel)).toBe(true);
      // Sanity check on the pre-fix shape this replaces: the panel is not
      // inside the field's own container either.
      expect(container.querySelector(".custom-select-container").contains(panel)).toBe(false);

      document.body.removeChild(modalContainer);
    });

    it("closed field is unchanged: nothing from the panel exists before opening", () => {
      const { container } = renderSelect();
      expect(container.querySelector(".custom-select-header")).not.toBeNull();
      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).toBeNull();
    });
  });

  describe("3. Flip when the field is near the bottom of the viewport", () => {
    let originalInnerHeight;
    beforeEach(() => {
      originalInnerHeight = window.innerHeight;
    });
    afterEach(() => {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalInnerHeight });
    });

    function mockHeaderRect(rect) {
      // jsdom does no layout (CLAUDE.md "Pièges du dépôt"): getBoundingClientRect
      // always returns zeros unless mocked — mock it explicitly to simulate the
      // field's position, the same technique used to unit-test the flip
      // decision itself (the real pixel result is checked by layout:probe).
      Element.prototype.getBoundingClientRect = vi.fn(function () {
        if (this.className === "custom-select-header") return rect;
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
      });
    }

    it("opens downward when there is room below", () => {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
      mockHeaderRect({ top: 100, bottom: 140, left: 50, right: 250, width: 200, height: 40 });

      const { container } = renderSelect();
      openViaClick(container);

      const panel = document.body.querySelector('[data-testid="custom-select-dropdown"]');
      expect(panel.getAttribute("data-open-direction")).toBe("down");
      expect(panel.style.top).not.toBe("auto");
      expect(panel.style.bottom).toBe("auto");
    });

    it("opens upward and stays on screen when the field is near the bottom of the viewport", () => {
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
      // Field near the very bottom: almost no room below, plenty above.
      mockHeaderRect({ top: 860, bottom: 895, left: 50, right: 250, width: 200, height: 35 });

      const { container } = renderSelect();
      openViaClick(container);

      const panel = document.body.querySelector('[data-testid="custom-select-dropdown"]');
      expect(panel.getAttribute("data-open-direction")).toBe("up");
      expect(panel.style.bottom).not.toBe("auto");
      expect(panel.style.top).toBe("auto");
      // Bounded height with internal scroll rather than spilling off-screen.
      expect(parseFloat(panel.style.maxHeight)).toBeGreaterThan(0);
      expect(parseFloat(panel.style.maxHeight)).toBeLessThanOrEqual(500);
    });
  });

  describe("Width follows content (VMU-142 width follow-up)", () => {
    // Grouped items (`.opt-group`) always counted 1 for 1 as leaf items by
    // countLeafItems regardless of grouping — flat options are enough to
    // exercise the width formula itself; the `display: contents` structural
    // fix that lets *grouped* items actually use the extra columns is
    // verified live (Chromium — jsdom has no layout), numbers in the report.
    let originalInnerWidth, originalInnerHeight;
    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
      originalInnerHeight = window.innerHeight;
    });
    afterEach(() => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalInnerWidth });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalInnerHeight });
    });

    function mockHeaderRect(rect) {
      Element.prototype.getBoundingClientRect = vi.fn(function () {
        if (this.className === "custom-select-header") return rect;
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
      });
    }

    function flatOptions(n) {
      return Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `Item ${i}` }));
    }

    function openWith(itemCount, extraProps = {}) {
      const { container } = render(
        <CustomSelect options={flatOptions(itemCount)} value="v0" onChange={vi.fn()} {...extraProps} />
      );
      openViaClick(container);
      return document.body.querySelector('[data-testid="custom-select-dropdown"]');
    }

    it("a short list (4 items — the header language select's real count) keeps today's 400px width, unchanged", () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 2560 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 1440 });
      mockHeaderRect({ top: 100, bottom: 140, left: 1000, right: 1200, width: 200, height: 40 });

      const panel = openWith(4);
      expect(panel.style.width).toBe("400px");
    });

    it("a long list (18 items — measured live: the Gammes scale-type list) widens to fit several columns", () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 2560 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 1440 });
      mockHeaderRect({ top: 100, bottom: 140, left: 1000, right: 1200, width: 200, height: 40 });

      const panel = openWith(18);
      // ceil(18/ITEMS_PER_COLUMN_TARGET=5) = 4 columns;
      // 4*140 + 3*10 + 32 = 622px (CustomSelect.jsx, computePanelWidth).
      expect(panel.style.width).toBe("622px");
    });

    it("width never exceeds the viewport minus margin, even for a very long list", () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
      mockHeaderRect({ top: 100, bottom: 140, left: 100, right: 300, width: 200, height: 40 });

      const panel = openWith(60);
      expect(parseFloat(panel.style.width)).toBeLessThanOrEqual(500 - 24); // 2 * VIEWPORT_MARGIN
    });

    it("a wide panel is clamped to the viewport's right edge when the field sits near it", () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
      mockHeaderRect({ top: 100, bottom: 140, left: 900, right: 980, width: 80, height: 40 });

      const panel = openWith(18);
      const left = parseFloat(panel.style.left);
      const width = parseFloat(panel.style.width);
      expect(left).toBeGreaterThanOrEqual(12); // VIEWPORT_MARGIN
      expect(left + width).toBeLessThanOrEqual(1000 - 12);
    });

    it("a wide panel is clamped to the viewport's left edge when the field sits near it", () => {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
      mockHeaderRect({ top: 100, bottom: 140, left: 10, right: 90, width: 80, height: 40 });

      const panel = openWith(18);
      expect(parseFloat(panel.style.left)).toBeGreaterThanOrEqual(12); // VIEWPORT_MARGIN
    });
  });

  describe("4. Closing", () => {
    it("Escape closes the panel and returns focus to the field", () => {
      const { container } = renderSelect();
      const header = openViaClick(container);
      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).not.toBeNull();

      fireEvent.keyDown(document, { key: "Escape" });

      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).toBeNull();
      expect(document.activeElement).toBe(header);
    });

    it("Escape does not also reach an outer Escape listener (e.g. Modal.jsx closing the whole popup)", () => {
      // Regression: Modal.jsx registers its own bubble-phase `keydown`
      // listener on `document` to close the popup on Escape, and it is
      // registered *before* CustomSelect's (the modal has to already be
      // open for a CustomSelect inside it to be openable). Listeners on the
      // same node fire in registration order regardless of stopPropagation,
      // so without capture + stopPropagation, one Escape press closed the
      // dropdown *and* the popup underneath it — found live while building
      // the VMU-142 width follow-up probe (D:/IA/VisualMusic/scratch-width-probe.mjs).
      const outerHandler = vi.fn();
      document.addEventListener("keydown", outerHandler); // simulates Modal.jsx's own listener, registered first
      const { container } = renderSelect();
      openViaClick(container);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).toBeNull();
      expect(outerHandler).not.toHaveBeenCalled();
      document.removeEventListener("keydown", outerHandler);
    });

    it("scrolling the window (e.g. the popup body) closes the panel", () => {
      const { container } = renderSelect();
      openViaClick(container);
      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).not.toBeNull();

      fireEvent.scroll(window);

      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).toBeNull();
    });

    it("scrolling inside the open panel's own list does NOT close it", () => {
      const { container } = renderSelect();
      openViaClick(container);
      const panel = document.body.querySelector('[data-testid="custom-select-dropdown"]');
      expect(panel).not.toBeNull();

      fireEvent.scroll(panel);

      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).not.toBeNull();
    });

    it("resizing the window closes the panel", () => {
      const { container } = renderSelect();
      openViaClick(container);
      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).not.toBeNull();

      fireEvent(window, new Event("resize"));

      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).toBeNull();
    });

    it("clicking outside both the field and the panel still closes it", () => {
      const outside = document.createElement("div");
      document.body.appendChild(outside);
      const { container } = renderSelect();
      openViaClick(container);
      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).not.toBeNull();

      clickLikeAUser(outside);

      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).toBeNull();
      document.body.removeChild(outside);
    });

    it("clicking an item INSIDE the portaled panel selects it rather than being treated as an outside click", () => {
      // Regression guard: once the panel moved out of the field's own DOM
      // subtree, the pre-existing click-outside check (container-only) would
      // wrongly treat every click on a list item as "outside" and close the
      // panel on mousedown before the item's own click could register.
      const { container, onChange } = renderSelect();
      openViaClick(container);
      const item = Array.from(document.body.querySelectorAll(".select-item")).find((el) => el.textContent === "Mineur");
      expect(item).toBeTruthy();

      clickLikeAUser(item);

      expect(onChange).toHaveBeenCalledWith("minor");
      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).toBeNull();
    });
  });

  describe("5. Outside a popup (e.g. AppHeader) — unchanged behaviour", () => {
    it("opens and selects an option, same as before the portal change", () => {
      const { container, onChange } = renderSelect();
      openViaClick(container);

      const item = Array.from(document.body.querySelectorAll(".select-item")).find((el) => el.textContent === "Dorien");
      clickLikeAUser(item);

      expect(onChange).toHaveBeenCalledWith("dorian");
    });

    it("the hidden native <select> is preserved, with the same options", () => {
      const { container } = renderSelect({ "data-testid": "lang-select" });
      const nativeSelect = container.querySelector('select[data-testid="lang-select"]');
      expect(nativeSelect).not.toBeNull();
      expect(nativeSelect.style.display).toBe("none");
      expect(nativeSelect.querySelectorAll("option")).toHaveLength(4); // major, minor, dorian, phrygian
    });

    it("the field is keyboard-focusable and Enter opens it", () => {
      const { container } = renderSelect();
      const header = container.querySelector(".custom-select-header");
      expect(header.tabIndex).toBe(0);

      header.focus();
      fireEvent.keyDown(header, { key: "Enter" });

      expect(document.body.querySelector('[data-testid="custom-select-dropdown"]')).not.toBeNull();
    });
  });
});
