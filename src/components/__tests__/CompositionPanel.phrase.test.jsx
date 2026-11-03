import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import { balanceWordFor } from "../Intelligence/balanceWord";
import { translations } from "../../i18n/translations";

// VMU-195-B. The three sliders become one phrase whose numbers are set with − / +
// ("5 coups sur 16 cases, départ décalé de 0, joués par …"). The words replace
// the old jargon: "6 sur 16" instead of "E(6,16)", "Rythme 1 · 3 coups" instead
// of "▲-1 k", and one balance word instead of "Écart 12.8 %".
const props = (setters = {}) => ({
  activeTracks: { drums: [], melody: [], progression: ["I"], rhythm: [0] },
  setSuggestedBassTrack: vi.fn(),
  setCustomRhythm: vi.fn(),
  setCustomDrums: vi.fn(),
  currentStep: -1,
  txt: translations.fr.comp,
  ...setters,
});

const lastKick = (setCustomDrums) =>
  setCustomDrums.mock.calls[setCustomDrums.mock.calls.length - 1][0]({}).Kick;

describe("CompositionPanel — the phrase (VMU-195-B)", () => {
  it("renders the whole sentence as one phrase", () => {
    render(<CompositionPanel {...props()} />);
    const phrase = screen.getByTestId("comp-phrase");
    expect(phrase.textContent).toContain("coups sur");
    expect(phrase.textContent).toContain("cases");
    expect(phrase.textContent).toContain("départ décalé de");
    expect(phrase.textContent).toContain("joués par");
    expect(screen.getByTestId("comp-k-value").textContent).toBe("5");
    expect(screen.getByTestId("comp-n-value").textContent).toBe("16");
    expect(screen.getByTestId("comp-r-value").textContent).toBe("0");
  });

  it("the + and − of k drive the same pattern with an identical cycle length", () => {
    const setCustomDrums = vi.fn();
    render(<CompositionPanel {...props({ setCustomDrums })} />);

    fireEvent.click(screen.getByTestId("comp-k-plus")); // 5 -> 6
    const six = lastKick(setCustomDrums);
    expect(six.cycleLength).toBe(16);
    expect(six.activeSteps).toHaveLength(6);

    fireEvent.click(screen.getByTestId("comp-k-minus")); // 6 -> 5
    const five = lastKick(setCustomDrums);
    expect(five.cycleLength).toBe(16);
    expect(five.activeSteps).toHaveLength(5);
    expect(five.activeSteps).toEqual([0, 3, 6, 9, 12]);
  });

  it("the + and − of the start shift the same hits, keeping the cycle length", () => {
    const setCustomDrums = vi.fn();
    render(<CompositionPanel {...props({ setCustomDrums })} />);

    fireEvent.click(screen.getByTestId("comp-r-plus")); // 0 -> 1
    const rotated = lastKick(setCustomDrums);
    expect(rotated.cycleLength).toBe(16);
    expect(rotated.activeSteps).toHaveLength(5);
    expect(rotated.activeSteps).not.toEqual([0, 3, 6, 9, 12]);
  });
});

describe("the replaced words (VMU-195-B)", () => {
  it("the circle says 'k coups sur n', never 'E(k,n)'", () => {
    const { container } = render(<CompositionPanel {...props()} />);
    expect(container.querySelector('[data-testid="center-formula"]').textContent).toBe("coups sur 16");
    expect(container.querySelector('[data-testid="center-formula"]').textContent).not.toContain("E(");
  });

  it("the balance is one word in three bands, not a percentage", () => {
    const words = { even: "Équilibré", almost: "Presque équilibré", tilted: "Penché" };
    expect(balanceWordFor(0, words)).toBe("Équilibré");
    expect(balanceWordFor(0.05, words)).toBe("Presque équilibré");
    expect(balanceWordFor(0.5, words)).toBe("Penché");
  });

  it("a stacked rhythm is named 'Rythme N · k coups', not '▲-N k'", () => {
    render(<CompositionPanel {...props()} />);
    fireEvent.click(screen.getByTestId("comp-advanced-toggle"));
    fireEvent.click(screen.getByTestId("comp-mode-poly"));

    expect(screen.getByText("Rythme 1")).toBeTruthy();
    // The voice's k field shows the count with the unit "coups".
    const section = screen.getByTestId("comp-advanced");
    expect(section.textContent).toContain("coups");
    expect(section.textContent).not.toContain("▲");
  });
});

describe("the recipes are reachable (VMU-195-B)", () => {
  it("offers the four recipes, each with its one-line explanation", () => {
    render(<CompositionPanel {...props()} />);
    fireEvent.click(screen.getByTestId("comp-advanced-toggle"));
    for (const id of ["phasing", "iso", "mesh", "poly"]) {
      const btn = screen.getByTestId(`comp-mode-${id}`);
      expect(btn.getAttribute("aria-pressed")).toBe("false");
      expect(btn.textContent.length).toBeGreaterThan(0);
    }
  });
});
