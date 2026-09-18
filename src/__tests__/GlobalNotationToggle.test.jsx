import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { AppProvider } from "../context/AppContext";
import AppDesktop from "../AppDesktop";

// Same Tone.js / AudioEngine mocking strategy as EuNotationDefault.test.jsx.
vi.mock("tone", () => ({
  start: vi.fn(),
  now: vi.fn(() => 0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  context: { lookAhead: 0.1 },
  Transport: {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  Draw: { schedule: vi.fn() },
  Destination: { volume: { value: 0, rampTo: vi.fn() } },
  Analyser: vi.fn(() => ({ dispose: vi.fn() })),
  Frequency: vi.fn(() => ({ toMidi: () => 60 })),
}));

vi.mock("../audio/AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  snareSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
  bassSynth: { triggerAttackRelease: vi.fn() },
  initPianoSampler: vi.fn(),
  initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(),
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
  setBpm: vi.fn(),
  initAudio: vi.fn(),
  setMasterVolume: vi.fn(),
  masterAnalyser: {},
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="mock-visualizer">Visualizer Mock</div>,
}));

/**
 * VMU-134 — the notation switch becomes a single, global control in
 * HeaderActions, and is removed from DictionaryPanel (decision #1-2 of the
 * brief: "un seul interrupteur", "retire du panneau Dictionnaire").
 */
describe("VMU-134 — the notation control is global, not duplicated", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("DictionaryPanel no longer renders its own US/EU toggle", () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    fireEvent.click(screen.getByText(/Dictionnaire/i));
    fireEvent.click(screen.getByText(/Studio & Harmonie/i));

    const panel = screen.getByTestId("dictionary-panel");
    expect(panel.querySelector('[data-testid="header-notation-toggle"]')).toBeNull();
    // The old DictionaryPanel control was a DualToggle; confirm none remain
    // anywhere in the tree (the header control is a plain button now, not a
    // DualToggle — see AppHeader.test.jsx for why).
    expect(document.querySelector(".dual-toggle-slider")).toBeNull();

    // Exactly one notation control exists anywhere on the page: the header's.
    const allToggles = document.querySelectorAll('[data-testid="header-notation-toggle"]');
    expect(allToggles.length).toBe(1);
  });

  it("changing notation from the header changes what the Dictionary panel displays", () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    fireEvent.click(screen.getByText(/Dictionnaire/i));
    fireEvent.click(screen.getByText(/Studio & Harmonie/i));

    // Root note defaults to pitch class 0: "Do" in the default (eu) notation
    // — see EuNotationDefault.test.jsx's "first render shows note labels in
    // EU notation".
    const rootSelect = screen.getByTestId("select-root-note").closest(".custom-select-container");
    const before = rootSelect.querySelector(".current-value").textContent;
    expect(before).toBe("Do");

    const headerToggle = screen.getByTestId("header-notation-toggle");
    fireEvent.click(headerToggle);

    const after = rootSelect.querySelector(".current-value").textContent;
    expect(after).toBe("C");
    expect(after).not.toBe(before);
  });
});
