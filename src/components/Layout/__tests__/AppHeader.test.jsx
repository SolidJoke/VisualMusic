import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { HeaderActions } from "../AppHeader";
import { translations } from "../../../i18n/translations";

/**
 * VMU-134 — the US/EU notation control moves out of DictionaryPanel and into
 * HeaderActions, the component AppHeader renders in the header row *and*
 * AppDesktop.jsx renders again inside the phone drawer (see AppHeader.jsx's
 * file banner). Testing HeaderActions directly, once, is therefore proof for
 * both places at once: jsdom does no media query and no layout (repo's
 * "Pieges du depot"), so there is no reliable way to assert "the header row
 * is hidden and the drawer shows this instead" from here — and no need to,
 * since it is the same component instance either way.
 *
 * Single btn-header-action button, not the DualToggle used in the old
 * DictionaryPanel location: measured in-browser (report VMU-134) that at
 * 1280px the header already overflows by 165px before this control exists;
 * a label + always-both-pills DualToggle (~250px) would have added ~78px
 * more, a single button matching the row's own idiom (~150px, same as the
 * theme switch button right above it) adds far less.
 */
describe("VMU-134 — HeaderActions carries the global notation control", () => {
  afterEach(() => cleanup());

  const baseProps = (overrides = {}) => ({
    txt: translations.fr,
    uiTheme: "modern",
    setUiTheme: vi.fn(),
    lang: "fr",
    setLang: vi.fn(),
    setShowHelp: vi.fn(),
    setShowAbout: vi.fn(),
    setShowTheory: vi.fn(),
    exportDebugSnapshot: vi.fn(),
    notation: "eu",
    setNotation: vi.fn(),
    ...overrides,
  });

  it("renders a notation control carrying an understandable, translated accessible name", () => {
    render(<HeaderActions {...baseProps()} />);

    const toggle = screen.getByTestId("header-notation-toggle");
    expect(toggle).not.toBeNull();
    expect(toggle.tagName).toBe("BUTTON");
    // Names the setting ("Noms des notes" in fr) rather than leaving the
    // two technical option labels ("US (A, B, C)" / "EU (Do, Ré)") to speak
    // for themselves — decision #4 of the brief.
    expect(toggle.getAttribute("aria-label")).toBe(translations.fr.noteNamesLabel);
  });

  it("the label is translated in all four shipped languages, not left in jargon", () => {
    for (const langCode of Object.keys(translations)) {
      const label = translations[langCode].noteNamesLabel;
      expect(label, `missing noteNamesLabel for "${langCode}"`).toBeTruthy();
    }
  });

  it('shows the current option and clicking it from "eu" calls setNotation("us")', () => {
    const props = baseProps({ notation: "eu" });
    render(<HeaderActions {...props} />);

    const toggle = screen.getByTestId("header-notation-toggle");
    expect(toggle.textContent).toMatch(/EU \(Do, Ré\)/i);

    fireEvent.click(toggle);

    expect(props.setNotation).toHaveBeenCalledWith("us");
  });

  it('shows "US (A, B, C)" when notation is "us", and toggles back to "eu" on click', () => {
    const props = baseProps({ notation: "us" });
    render(<HeaderActions {...props} />);

    const toggle = screen.getByTestId("header-notation-toggle");
    expect(toggle.textContent).toMatch(/US \(A, B, C\)/i);

    fireEvent.click(toggle);

    expect(props.setNotation).toHaveBeenCalledWith("eu");
  });
});
