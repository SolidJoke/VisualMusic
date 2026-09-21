import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { AppProvider } from "../context/AppContext";
import AppDesktop from "../AppDesktop";

/**
 * MetronomeControls.test.jsx — TDD red #3 of the VMU-056 brief:
 * "le bouton existe dans la barre latérale, bascule son état, et le badge de
 * BPM garde son comportement d'édition (bornes 60-200 incluses)."
 *
 * Same Tone.js / AudioEngine mocking strategy as BpmControls.test.jsx, plus
 * `Synth` (metronome.js builds its own click synth on first use) and a
 * `getTransport()` that returns the same object as the deprecated `Transport`
 * — see metronome.js's own comment for why the module reads getTransport().
 */
vi.mock("tone", () => {
  const transport = {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(() => "metronome-repeat-id"),
    clear: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    state: "stopped",
  };
  return {
    start: vi.fn(),
    now: vi.fn(() => 0),
    getDraw: vi.fn(() => ({ schedule: vi.fn() })),
    context: { lookAhead: 0.1 },
    Transport: transport,
    getTransport: () => transport,
    Draw: { schedule: vi.fn() },
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
    Analyser: vi.fn(() => ({ dispose: vi.fn() })),
    Frequency: vi.fn(() => ({ toMidi: () => 60 })),
    Synth: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
    })),
  };
});

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
  initAudio: vi.fn(() => Promise.resolve()),
  setMasterVolume: vi.fn(),
  masterAnalyser: {},
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="mock-visualizer">Visualizer Mock</div>,
}));

describe("métronome — bouton de la sidebar (VMU-056)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("existe dans la sidebar, démarre éteint (pas de persistance — VMU-050)", () => {
    const { container } = render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    const btn = container.querySelector('[data-testid="btn-metronome-toggle"]');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.className).not.toMatch(/active/);
  });

  it("un clic bascule l'état visuellement et via aria-pressed, un second clic revient à l'état initial", async () => {
    const { container } = render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );
    const btn = container.querySelector('[data-testid="btn-metronome-toggle"]');

    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 0));
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.className).toMatch(/active/);

    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 0));
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.className).not.toMatch(/active/);
  });

  it("le badge de BPM garde son comportement d'édition après le changement d'interface (bornes 60 et 200 incluses)", async () => {
    const { container } = render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    const badge = container.querySelector(".bpm-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain("120");

    // Lower bound, inclusive: 60 must be accepted.
    fireEvent.click(badge);
    let input = badge.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: "60" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 0));
    expect(badge.textContent).toContain("60");

    // Upper bound, inclusive: 200 must be accepted.
    fireEvent.click(badge);
    input = badge.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: "200" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 0));
    expect(badge.textContent).toContain("200");

    // Out of range: 201 is rejected, the badge reverts to the last valid value.
    fireEvent.click(badge);
    input = badge.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: "201" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 0));
    expect(badge.textContent).toContain("200");
  });

  it("le bouton métronome et le badge de BPM sont indépendants : basculer le métronome ne change pas le BPM affiché", async () => {
    const { container } = render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );
    const badge = container.querySelector(".bpm-badge");
    const btn = container.querySelector('[data-testid="btn-metronome-toggle"]');

    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 0));

    expect(badge.textContent).toContain("120");
  });

  it("StrictMode : un seul clic ne planifie qu'une fois sur le transport (garde-fou du double montage)", async () => {
    const Tone = await import("tone");
    const { container } = render(
      <React.StrictMode>
        <AppProvider>
          <AppDesktop />
        </AppProvider>
      </React.StrictMode>
    );

    const btn = container.querySelector('[data-testid="btn-metronome-toggle"]');
    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 0));

    const transport = Tone.getTransport();
    expect(transport.scheduleRepeat).toHaveBeenCalledTimes(1);
  });
});
