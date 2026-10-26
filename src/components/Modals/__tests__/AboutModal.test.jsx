// L1b-1c — the copyright line moves from the classic page's footer into the
// "À propos" window, which both pages share (the classic footer is going).
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AppProvider } from "../../../context/AppContext";
import { translations } from "../../../i18n/translations";
import AboutModal from "../AboutModal";

afterEach(cleanup);

const LINE = "© 2026 Gabriel Resende • Vmu (VisualMusic Coach)";

describe("L1b-1c — 'À propos' carries the copyright line", () => {
  it("shows the line when open", () => {
    const { container } = render(
      <AppProvider>
        <AboutModal isOpen onClose={() => {}} />
      </AppProvider>
    );
    expect(container.textContent).toContain(LINE);
  });

  it("the same text in the four languages, none empty (a name and a year are not translated)", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      expect(translations[lang].aboutCopyright, lang).toBe(LINE);
    }
  });
});
