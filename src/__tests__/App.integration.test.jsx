import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import AppDesktop from "../AppDesktop";
import { AppProvider } from "../context/AppContext";

// Mocking Tone.js
vi.mock("tone", () => ({
  start: vi.fn(),
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
  Analyser: vi.fn(() => ({
    dispose: vi.fn(),
  })),
}));

// Mocking AudioEngine
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
  startAudioEngine: vi.fn(),
  setMasterVolume: vi.fn(),
  masterAnalyser: {},
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="mock-visualizer">Visualizer Mock</div>,
}));

describe("App Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the app title", () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );
    // Title is rendered from translations. Assuming 'VisualMusic' for now.
    // We check if any title exists.
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toBeDefined();
  });

  it("switches from Studio mode to Dictionary mode", async () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );
    
    // Default mode is Studio. Check for Studio specific element.
    // Assuming StudioPanel has a test id 'studio-panel'
    expect(screen.getByTestId("studio-panel")).toBeDefined();

    // Click on Dictionary mode button
    const dictBtn = screen.getByTestId("btn-mode-dictionary");
    fireEvent.click(dictBtn);

    // Check for Dictionary specific element
    expect(screen.getByTestId("dictionary-panel")).toBeDefined();
    expect(screen.queryByTestId("studio-panel")).toBeNull();
  });

  it("selects a chord in Dictionary mode and updates the view", async () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );
    
    // Switch to Dictionary
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));

    // Select a note (e.g., C which is value 0)
    const selectRoot = screen.getByTestId("select-root-note");
    fireEvent.change(selectRoot, { target: { value: "0" } });

    // Check if InstrumentView is visible
    expect(screen.getByTestId("instrument-view")).toBeDefined();
  });
});
