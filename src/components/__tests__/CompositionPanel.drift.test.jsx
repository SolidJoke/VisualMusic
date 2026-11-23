import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import { translations } from "../../i18n/translations";
import { generateEuclideanRhythm, rotate } from "../../core/compositionEngine";
import { driftCopy } from "../../core/phasingDrift";

// VMU-211: "Deux copies qui glissent" — the copy slips one case every N turns.
// setCustomDrums is a vi.fn(); every functional update is applied in order to a
// local object, as CompositionPanel.phasing.test.jsx does.

const props = (setters = {}) => ({
  activeTracks: { drums: [], melody: [], progression: ["I"], rhythm: [0] },
  setSuggestedBassTrack: vi.fn(),
  setCustomRhythm: vi.fn(),
  setCustomDrums: vi.fn(),
  currentStep: -1,
  txt: translations.fr.comp,
  ...setters,
});

const hitsOf = (pattern) => pattern.flatMap((v, i) => (v === 1 ? [i] : []));
const BASE_PATTERN = generateEuclideanRhythm(16, 5, 0).pattern;

const openPhasing = (setters = {}) => {
  const utils = render(<CompositionPanel {...props(setters)} />);
  fireEvent.click(screen.getByTestId("comp-advanced-toggle"));
  fireEvent.click(screen.getByTestId("comp-mode-phasing"));
  return utils;
};

const applyDrums = (setter) => {
  let drums = null;
  for (const call of setter.mock.calls) drums = call[0](drums);
  return drums || {};
};

describe("the drift setting's choices", () => {
  it("offers Off, 1, 2 and 4 turns, Off by default, in a 48 px select", () => {
    openPhasing();
    const select = screen.getByTestId("comp-phasing-every");
    expect(select.value).toBe("0");
    expect([...select.options].map((o) => o.value)).toEqual(["0", "1", "2", "4"]);
    expect(select.className).toContain("retro-select");
  });

  it("has its label and its plain-words help in the four languages", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const comp = translations[lang].comp;
      for (const key of ["phasingEveryLabel", "phasingEveryOff", "phasingEveryOne", "phasingEveryMany", "phasingEveryHelp", "phasingCut"]) {
        expect(typeof comp[key], `${lang}.${key}`).toBe("string");
        expect(comp[key].length).toBeGreaterThan(2);
      }
      expect(comp.phasingEveryMany).toContain("{n}");
      expect(comp.phasingCut).toContain("{loop}");
      expect(comp.phasingCut).toContain("{measures}");
    }
  });
});

describe("Off gives exactly today's copy", () => {
  it("the copy is the phrase rotated by the slider, one circle long", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });
    fireEvent.change(screen.getByTestId("comp-slider-shift"), { target: { value: "3" } });

    const drums = applyDrums(setCustomDrums);
    expect(drums.Snare.activeSteps).toEqual(hitsOf(rotate(BASE_PATTERN, 3)));
    expect(drums.Snare.cycleLength).toBe(16);
    expect(drums.Kick.cycleLength).toBe(16);
  });
});

describe("the copy's track carries the drift", () => {
  it("n = 8, every 1 turn: the track has the right steps and a 64-step cycle", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });
    // 8 cases: the "−" stepper of the phrase, 8 times (16 → 8).
    for (let i = 0; i < 8; i += 1) fireEvent.click(screen.getByTestId("comp-n-minus"));
    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "1" } });

    const pattern = generateEuclideanRhythm(8, 5, 0).pattern;
    const expected = driftCopy(pattern, 0, 1);
    const snare = applyDrums(setCustomDrums).Snare;
    expect(snare.cycleLength).toBe(64);
    expect(snare.activeSteps).toEqual(expected.activeSteps);
    // The phrase keeps one circle.
    expect(applyDrums(setCustomDrums).Kick.cycleLength).toBe(8);
  });

  it("the start offset is the slider's: every 2 turns, start 3", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });
    for (let i = 0; i < 8; i += 1) fireEvent.click(screen.getByTestId("comp-n-minus"));
    fireEvent.change(screen.getByTestId("comp-slider-shift"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "2" } });

    const pattern = generateEuclideanRhythm(8, 5, 0).pattern;
    const snare = applyDrums(setCustomDrums).Snare;
    expect(snare.activeSteps).toEqual(driftCopy(pattern, 3, 2).activeSteps);
    expect(snare.cycleLength).toBe(128);
  });

  it("a cycle past 128 steps is cut at 128 and the dock says so in a plain sentence", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });
    // 16 cases, every 1 turn: 256 steps, does not fit.
    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "1" } });

    expect(applyDrums(setCustomDrums).Snare.cycleLength).toBe(128);
    const note = screen.getByTestId("comp-phasing-cut");
    expect(note.textContent).toBe("La copie repart du début à chaque boucle de 128 cases (8 mesures).");
  });

  it("no cut sentence when the cycle fits, or when Off", () => {
    openPhasing();
    expect(screen.queryByTestId("comp-phasing-cut")).toBeNull();
    for (let i = 0; i < 8; i += 1) fireEvent.click(screen.getByTestId("comp-n-minus"));
    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "1" } });
    expect(screen.queryByTestId("comp-phasing-cut")).toBeNull();
  });
});

describe("one change of the setting is one undo step", () => {
  it("changing the drift makes exactly one override write", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });
    const before = setCustomDrums.mock.calls.length;

    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "2" } });
    expect(setCustomDrums.mock.calls.length - before).toBe(1);

    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "0" } });
    expect(setCustomDrums.mock.calls.length - before).toBe(2);
  });

  it("playing never writes: a moving step does not touch the overrides", () => {
    const setCustomDrums = vi.fn();
    const { rerender } = openPhasing({ setCustomDrums });
    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "1" } });
    const before = setCustomDrums.mock.calls.length;

    for (let step = 0; step < 64; step += 1) {
      rerender(<CompositionPanel {...props({ setCustomDrums, currentStep: step })} />);
    }
    expect(setCustomDrums.mock.calls.length).toBe(before);
  });
});

describe("the grid shows the offset of the turn in progress", () => {
  const copyLabel = () =>
    screen.getByTestId("comp-phasing-section").querySelectorAll(".voice-label")[1].textContent.trim();

  it("n = 16, every 1 turn: turn 0 → 0, turn 1 → 1, turn 2 → 2", () => {
    const setCustomDrums = vi.fn();
    const { rerender } = openPhasing({ setCustomDrums });
    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "1" } });

    const at = (step) => {
      rerender(<CompositionPanel {...props({ setCustomDrums, currentStep: step })} />);
      return copyLabel();
    };
    expect(at(0)).toBe("La copie, décalée de 0");
    expect(at(15)).toBe("La copie, décalée de 0");
    expect(at(16)).toBe("La copie, décalée de 1");
    expect(at(32)).toBe("La copie, décalée de 2");
    // The cut loop restarts: step 128 is turn 0 again.
    expect(at(128)).toBe("La copie, décalée de 0");
  });

  it("Off: the slider's offset, whatever the step", () => {
    const setCustomDrums = vi.fn();
    const { rerender } = openPhasing({ setCustomDrums });
    fireEvent.change(screen.getByTestId("comp-slider-shift"), { target: { value: "3" } });
    rerender(<CompositionPanel {...props({ setCustomDrums, currentStep: 47 })} />);
    expect(copyLabel()).toBe("La copie, décalée de 3");
  });

  it("the wheel draws the copy of the turn in progress, the same shape as the grid", () => {
    const setCustomDrums = vi.fn();
    const { rerender, container } = openPhasing({ setCustomDrums });
    fireEvent.change(screen.getByTestId("comp-phasing-every"), { target: { value: "1" } });
    rerender(<CompositionPanel {...props({ setCustomDrums, currentStep: 20 })} />);

    const grid = within(screen.getByTestId("comp-phasing-section"));
    expect(grid.getByText("La copie, décalée de 1")).toBeTruthy();
    const poly = container.querySelector(".euclidean-polygon-stacked");
    expect(poly).not.toBeNull();
    // The copy at offset 1: the phrase's hits moved by one case.
    const n = 16;
    const R = 184;
    const C = 210;
    const expected = hitsOf(rotate(BASE_PATTERN, 1))
      .map((i) => {
        const a = (2 * Math.PI * i) / n;
        return [C + R * Math.sin(a), C - R * Math.cos(a)].map((c) => c.toFixed(1)).join(",");
      })
      .join(" ");
    expect(poly.getAttribute("points")).toBe(expected);
  });
});
