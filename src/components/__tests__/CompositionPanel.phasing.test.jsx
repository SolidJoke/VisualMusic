import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompositionPanel from "../Intelligence/CompositionPanel";
import { translations } from "../../i18n/translations";
import { generateEuclideanRhythm, rotate } from "../../core/compositionEngine";

// VMU-195-E: the phasing recipe becomes audible. The copy ("l'une décalée")
// plays on a second drum chosen in the recipe; the phrase keeps its own target.
// Nothing here relies on the panel's real setters: setCustomDrums is a vi.fn()
// and each functional update is applied in order to a local object.

const props = (setters = {}) => ({
  activeTracks: { drums: [], melody: [], progression: ["I"], rhythm: [0] },
  setSuggestedBassTrack: vi.fn(),
  setCustomRhythm: vi.fn(),
  setCustomDrums: vi.fn(),
  currentStep: -1,
  txt: translations.fr.comp,
  ...setters,
});

// The base phrase: E(5, 16), no rotation — the same pattern the panel starts on.
const stepsOf = (pattern) => pattern.flatMap((v, i) => (v === 1 ? [i] : []));
const BASE = stepsOf(generateEuclideanRhythm(16, 5, 0).pattern); // [0, 3, 6, 9, 12]
const shifted = (n) => stepsOf(rotate(generateEuclideanRhythm(16, 5, 0).pattern, n));

// Open "Pour aller plus loin" and turn the phasing recipe on.
const openPhasing = (setters = {}) => {
  const utils = render(<CompositionPanel {...props(setters)} />);
  fireEvent.click(screen.getByTestId("comp-advanced-toggle"));
  fireEvent.click(screen.getByTestId("comp-mode-phasing"));
  return utils;
};

// Apply every functional setCustomDrums update in order to a local object.
const applyDrums = (setter) => {
  let drums = null;
  for (const call of setter.mock.calls) {
    drums = call[0](drums);
  }
  return drums || {};
};

const activeStepsOf = (setter, drum) => applyDrums(setter)[drum]?.activeSteps;

describe("the phasing copy sounds on its own drum (VMU-195-E)", () => {
  it("offset 0: the phrase and the copy share the base steps on Kick and Snare", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });

    expect(activeStepsOf(setCustomDrums, "Kick")).toEqual(BASE);
    expect(activeStepsOf(setCustomDrums, "Snare")).toEqual(BASE);
  });

  it("offset 3: the copy on Snare is the base rotated by 3, Kick unchanged", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });

    fireEvent.change(screen.getByTestId("comp-slider-shift"), { target: { value: "3" } });

    expect(activeStepsOf(setCustomDrums, "Snare")).toEqual(shifted(3));
    expect(activeStepsOf(setCustomDrums, "Kick")).toEqual(BASE);
  });

  it("the copy select offers drums only, never the phrase's drum", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });

    const copySelect = screen.getByTestId("comp-phasing-copy-target");
    expect(copySelect.value).toBe("Snare");
    const values = [...copySelect.options].map((o) => o.value);
    expect(values).toEqual(["Snare", "Hat"]);
    expect(values).not.toContain("Bass");
    expect(values).not.toContain("Chords");
  });

  it("defaults to Snare, to Kick when the phrase is on Snare, and moving the phrase onto the copy's drum moves the copy", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });

    const copySelect = screen.getByTestId("comp-phasing-copy-target");
    expect(copySelect.value).toBe("Snare");

    fireEvent.change(screen.getByTestId("comp-target"), { target: { value: "Snare" } });

    expect(copySelect.value).toBe("Kick");
    expect([...copySelect.options].map((o) => o.value)).toEqual(["Kick", "Hat"]);
  });

  it("changing the copy's drum from Snare to Hat removes Snare and plays the copy on Hat", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });

    fireEvent.change(screen.getByTestId("comp-phasing-copy-target"), { target: { value: "Hat" } });

    const drums = applyDrums(setCustomDrums);
    expect(drums.Snare).toBeUndefined();
    expect(drums.Hat.activeSteps).toEqual(BASE);
    expect(drums.Kick.activeSteps).toEqual(BASE);
  });

  it("turning phasing off removes the copy's drum and keeps the phrase's", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });

    fireEvent.click(screen.getByTestId("comp-mode-phasing"));

    const drums = applyDrums(setCustomDrums);
    expect(drums.Snare).toBeUndefined();
    expect(drums.Kick.activeSteps).toEqual(BASE);
  });

  it("turning another recipe on (poly) turns phasing off and removes the copy", () => {
    const setCustomDrums = vi.fn();
    openPhasing({ setCustomDrums });

    fireEvent.click(screen.getByTestId("comp-mode-poly"));

    const drums = applyDrums(setCustomDrums);
    expect(drums.Snare).toBeUndefined();
    expect(drums.Kick).toBeTruthy();
  });

  it("the copy still goes to its drum when the phrase is on the bass", () => {
    const setCustomDrums = vi.fn();
    const setSuggestedBassTrack = vi.fn();
    openPhasing({ setCustomDrums, setSuggestedBassTrack });

    fireEvent.change(screen.getByTestId("comp-target"), { target: { value: "Bass" } });

    expect(activeStepsOf(setCustomDrums, "Snare")).toEqual(BASE);
    const bass = setSuggestedBassTrack.mock.calls[setSuggestedBassTrack.mock.calls.length - 1][0];
    expect(bass.name).toBe("Bass");
    expect(bass.activeSteps).toEqual(BASE);
    expect(bass.cycleLength).toBe(16);
  });

  it("the copy still goes to its drum when the phrase is on the chords", () => {
    const setCustomDrums = vi.fn();
    const setCustomRhythm = vi.fn();
    openPhasing({ setCustomDrums, setCustomRhythm });

    fireEvent.change(screen.getByTestId("comp-target"), { target: { value: "Chords" } });

    expect(activeStepsOf(setCustomDrums, "Snare")).toEqual(BASE);
    const rhythm = setCustomRhythm.mock.calls[setCustomRhythm.mock.calls.length - 1][0];
    expect(rhythm.activeSteps).toEqual(BASE);
    expect(rhythm.cycleLength).toBe(16);
  });
});

describe("the phasing visualizer's plain words (VMU-195-E)", () => {
  const voiceLabels = () =>
    [...screen.getByTestId("comp-phasing-section").querySelectorAll(".voice-label")].map((el) =>
      el.textContent.trim()
    );

  it("says 'La boucle' and 'La copie, décalée de 3' in FR, no VOICE text", () => {
    openPhasing();
    fireEvent.change(screen.getByTestId("comp-slider-shift"), { target: { value: "3" } });

    expect(voiceLabels()).toEqual(["La boucle", "La copie, décalée de 3"]);
    expect(screen.getByTestId("comp-phasing-section").textContent).not.toContain("VOICE");
  });

  it("says 'The loop' and 'The copy, moved by 3' in EN, no VOICE text", () => {
    openPhasing({ txt: translations.en.comp });
    fireEvent.change(screen.getByTestId("comp-slider-shift"), { target: { value: "3" } });

    expect(voiceLabels()).toEqual(["The loop", "The copy, moved by 3"]);
    expect(screen.getByTestId("comp-phasing-section").textContent).not.toContain("VOICE");
  });
});
