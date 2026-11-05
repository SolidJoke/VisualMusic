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
// VMU-195-D moves each "?" after its word: "5 coups ? sur 16 cases ?,
// départ décalé de 0 ?, joués par …".
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

// The phrase's direct children, in order, as short labels.
const phraseParts = () => {
  const phrase = screen.getByTestId("comp-phrase");
  return [...phrase.children].map((el) => {
    if (el.matches("select")) return "select";
    if (el.classList.contains("help-btn")) return `?${el.getAttribute("data-testid")}`;
    if (el.classList.contains("phrase-unit")) {
      const help = el.querySelector(".help-btn");
      return help ? `?${help.getAttribute("data-testid")},` : el.textContent.trim();
    }
    if (el.querySelector('[data-testid="comp-k-value"]')) return "stepper-k";
    if (el.querySelector('[data-testid="comp-n-value"]')) return "stepper-n";
    if (el.querySelector('[data-testid="comp-r-value"]')) return "stepper-r";
    return el.textContent.trim();
  });
};

describe("CompositionPanel — the phrase (VMU-195-B)", () => {
  it("renders the whole sentence as one phrase", () => {
    render(<CompositionPanel {...props()} />);
    const phrase = screen.getByTestId("comp-phrase");
    expect(phrase.textContent).toContain("coups");
    expect(phrase.textContent).toContain("sur");
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

describe("the phrase order (VMU-195-D)", () => {
  it("reads 'coups ? sur … cases ?, départ décalé de … ?, joués par' in FR", () => {
    render(<CompositionPanel {...props()} />);
    expect(phraseParts()).toEqual([
      "stepper-k", "coups", "?comp-help-pulses", "sur",
      "stepper-n", "cases", "?comp-help-subdivisions,",
      "départ décalé de", "stepper-r", "?comp-help-rotation,",
      "joués par", "select",
    ]);
  });

  it("reads the same order in EN", () => {
    render(<CompositionPanel {...props({ txt: translations.en.comp })} />);
    expect(phraseParts()).toEqual([
      "stepper-k", "hits", "?comp-help-pulses", "over",
      "stepper-n", "steps", "?comp-help-subdivisions,",
      "start moved by", "stepper-r", "?comp-help-rotation,",
      "played by", "select",
    ]);
  });

  it("glues each comma to the '?' before it, not to the sentence (VMU-195-D)", () => {
    render(<CompositionPanel {...props()} />);
    const phrase = screen.getByTestId("comp-phrase");
    const commas = [...phrase.querySelectorAll(".phrase-word")].filter(
      (el) => el.textContent.trim() === ","
    );
    expect(commas).toHaveLength(2);
    commas.forEach((comma) => {
      const unit = comma.parentElement;
      expect(unit.classList.contains("phrase-unit")).toBe(true);
      expect(unit.classList.contains("phrase-sentence")).toBe(false);
      const help = unit.querySelector(".help-btn");
      expect(help).toBeTruthy();
      expect(help.parentElement).toBe(unit);
      expect(help.textContent.trim()).toBe("?");
    });
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
    const { container } = render(<CompositionPanel {...props()} />);
    fireEvent.click(screen.getByTestId("comp-advanced-toggle"));
    fireEvent.click(screen.getByTestId("comp-mode-poly"));

    expect(screen.getByText("Rythme 1 · 3 coups")).toBeTruthy();
    expect(screen.getByText("Rythme 2 · 4 coups")).toBeTruthy();
    // The voice's k field shows the count with the unit "coups".
    const section = screen.getByTestId("comp-advanced");
    expect(section.textContent).toContain("coups");
    expect(section.textContent).not.toContain("▲");

    // No text node "k" or "⊕" left in the poly rows.
    const editor = container.querySelector(".poly-ops-editor");
    expect(editor.textContent).not.toContain("k");
    expect(editor.textContent).not.toContain("⊕");
  });

  it("the poly row's name follows its slider", () => {
    render(<CompositionPanel {...props()} />);
    fireEvent.click(screen.getByTestId("comp-advanced-toggle"));
    fireEvent.click(screen.getByTestId("comp-mode-poly"));

    const slider = screen.getByRole("slider", { name: "Rythme 1 : coups" });
    expect(slider).toBeTruthy();
    fireEvent.change(slider, { target: { value: "4" } });
    expect(screen.getByText("Rythme 1 · 4 coups")).toBeTruthy();
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
