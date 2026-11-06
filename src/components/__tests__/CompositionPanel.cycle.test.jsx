import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import {
  generateEuclideanRhythm,
  generateIsorhythm,
  forcedRealignment,
  generateBalancedRhythm,
} from "../../core/compositionEngine";

/**
 * VMU-208 — the panel exports the WHOLE pattern of the active mode with a
 * cycle length (its length), no `idx < 16` filter. The sequencer then repeats
 * it continuously across measures.
 */

const props = (setters = {}) => ({
  activeTracks: { drums: [], melody: [], progression: ["I"], rhythm: [0] },
  setSuggestedBassTrack: vi.fn(),
  setCustomRhythm: vi.fn(),
  setCustomDrums: vi.fn(),
  currentStep: -1,
  ...setters,
});

/** The drum override the panel last sent for `target`, through its updater. */
const lastDrum = (setCustomDrums, target = "Kick") =>
  setCustomDrums.mock.calls[setCustomDrums.mock.calls.length - 1][0]({})[target];

const unfold = () => fireEvent.click(screen.getByTestId("comp-advanced-toggle"));

describe("CompositionPanel — exports the whole pattern with its cycle length (VMU-208)", () => {
  it("n = 8 exports all the circle's indices with cycleLength 8", () => {
    const setCustomDrums = vi.fn();
    render(<CompositionPanel {...props({ setCustomDrums })} />);

    fireEvent.click(screen.getByTestId("comp-preset-tresillo"));

    // Tresillo is E(3,8): indices [0, 3, 6].
    expect(lastDrum(setCustomDrums)).toEqual({ activeSteps: [0, 3, 6], cycleLength: 8 });
  });

  it("n = 20 keeps indices >= 16, with cycleLength 20", () => {
    const setCustomDrums = vi.fn();
    render(<CompositionPanel {...props({ setCustomDrums })} />);

    // n 16 → 20, then k 5 → 7, through the phrase's − / +.
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByTestId("comp-n-plus"));
    for (let i = 0; i < 2; i += 1) fireEvent.click(screen.getByTestId("comp-k-plus"));

    const kick = lastDrum(setCustomDrums);
    expect(kick.cycleLength).toBe(20);
    expect(kick.activeSteps).toEqual(generateEuclideanRhythm(20, 7, 0).indices);
    expect(kick.activeSteps.some((step) => step >= 16)).toBe(true);
  });

  it("realignment mode exports the whole realigned pattern", () => {
    const setCustomDrums = vi.fn();
    render(<CompositionPanel {...props({ setCustomDrums })} />);

    unfold();
    fireEvent.click(screen.getByTestId("comp-mode-mesh"));
    fireEvent.change(screen.getByTestId("comp-slider-bound"), { target: { value: "8" } });

    const expected = forcedRealignment(generateEuclideanRhythm(16, 5, 0).pattern, 8);
    const indices = expected.flatMap((v, i) => (v === 1 ? [i] : []));
    expect(lastDrum(setCustomDrums)).toEqual({ activeSteps: indices, cycleLength: 8 });
  });

  it("polyrhythm mode exports the whole balanced pattern", () => {
    const setCustomDrums = vi.fn();
    render(<CompositionPanel {...props({ setCustomDrums })} />);

    unfold();
    fireEvent.click(screen.getByTestId("comp-mode-poly"));

    const expected = generateBalancedRhythm(16, [
      { k: 3, offset: 0, op: "+" },
      { k: 4, offset: 0, op: "+" },
    ]).pattern;
    const indices = expected.flatMap((v, i) => (v === 1 ? [i] : []));
    expect(lastDrum(setCustomDrums)).toEqual({ activeSteps: indices, cycleLength: 16 });
  });

  it("isorhythm to Bass exports the whole sequence with its pitch steps", () => {
    const setSuggestedBassTrack = vi.fn();
    render(<CompositionPanel {...props({ setSuggestedBassTrack })} />);

    unfold();
    fireEvent.click(screen.getByTestId("comp-mode-iso"));
    fireEvent.change(screen.getByTestId("comp-target"), { target: { value: "Bass" } });

    const iso = generateIsorhythm(generateEuclideanRhythm(16, 5, 0).pattern, ["C3", "E3", "G3", "B3"]);
    const activeSteps = [];
    const pitchSteps = {};
    iso.sequence.forEach((note, idx) => {
      if (note) {
        activeSteps.push(idx);
        pitchSteps[idx] = note;
      }
    });

    const sent = setSuggestedBassTrack.mock.calls[setSuggestedBassTrack.mock.calls.length - 1][0];
    expect(sent).toEqual({ name: "Bass", activeSteps, pitchSteps, cycleLength: iso.sequence.length });
    // The sequence is longer than one measure: it must keep steps >= 16.
    expect(iso.sequence.length).toBeGreaterThan(16);
    expect(activeSteps.some((step) => step >= 16)).toBe(true);
  });
});

describe("CompositionPanel — the cycle-cut message (VMU-214)", () => {
  it("is absent while the cycle fits the loop's 128 steps", () => {
    render(<CompositionPanel {...props()} />);

    unfold();
    fireEvent.click(screen.getByTestId("comp-mode-iso"));

    // 4 notes over 5 hits = 64 steps, inside the window.
    expect(screen.queryByTestId("comp-cycle-cut")).toBeNull();
  });

  it("shows the cycle and the loop sizes when the cycle is longer than 128 steps", () => {
    render(<CompositionPanel {...props()} />);

    unfold();
    fireEvent.click(screen.getByTestId("comp-mode-iso"));
    // 9 notes over 5 hits = 144 steps, past the window.
    fireEvent.change(screen.getByTestId("comp-iso-pitches"), {
      target: { value: "C3, E3, G3, B3, D4, F4, A4, C4, E4" },
    });

    const message = screen.getByTestId("comp-cycle-cut");
    expect(message.textContent).toContain("144");
    expect(message.textContent).toContain("128");
  });
});
