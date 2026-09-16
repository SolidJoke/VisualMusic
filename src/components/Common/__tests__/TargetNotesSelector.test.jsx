// VMU-123 — TargetNotesSelector: the four-preset control that replaces the
// old "Aide Impro" boolean. One component shared by Dictionary and Studio.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import TargetNotesSelector from "../TargetNotesSelector";
import { AppProvider } from "../../../context/AppContext";
import { TARGET_NOTES_PRESETS } from "../../../core/targetNotes";

afterEach(cleanup);

function renderSelector(preset, onChange = vi.fn()) {
  return render(
    <AppProvider>
      <TargetNotesSelector preset={preset} onChange={onChange} />
    </AppProvider>
  );
}

describe("TargetNotesSelector (VMU-123)", () => {
  it("renders one button per preset (off, majorMinor, color, skeleton)", () => {
    renderSelector("majorMinor");
    const group = screen.getByTestId("target-notes-selector");
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(TARGET_NOTES_PRESETS.length);
  });

  it("marks the current preset's button as pressed/active, and no other", () => {
    renderSelector("skeleton");
    const group = screen.getByTestId("target-notes-selector");
    const buttons = within(group).getAllByRole("button");
    const pressed = buttons.filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toMatch(/squelette|skeleton/i);
  });

  it("clicking a preset button calls onChange with that preset's key", () => {
    const onChange = vi.fn();
    renderSelector("off", onChange);
    const group = screen.getByTestId("target-notes-selector");
    const colorBtn = within(group).getAllByRole("button").find((b) => /couleur|color/i.test(b.textContent));
    colorBtn.click();
    expect(onChange).toHaveBeenCalledWith("color");
  });

  it("shows the default French labels from translations.js, not hard-coded English", () => {
    // AppProvider defaults to lang 'fr' — the labels must come from i18n,
    // never a literal string baked into the component (VMU-136 anti-jargon
    // rule lives in the translation files, not in component code).
    renderSelector("majorMinor");
    expect(screen.getByText("Ce qui dit majeur ou mineur")).not.toBeNull();
    expect(screen.getByText("Aucune")).not.toBeNull();
    expect(screen.getByText("Les notes de couleur")).not.toBeNull();
    expect(screen.getByText("Le squelette")).not.toBeNull();
  });

  it("renders an InfoTooltip icon next to the label", () => {
    const { container } = renderSelector("majorMinor");
    expect(container.querySelector(".info-tooltip-icon")).not.toBeNull();
  });
});
