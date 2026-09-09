import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, within } from "@testing-library/react";
import React from "react";
import { AppProvider } from "../context/AppContext";
import AppDesktop from "../AppDesktop";

// Same Tone.js / AudioEngine mocking strategy as the other integration tests.
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
 * The BPM control had two callers and one signature, and they disagreed.
 *
 * useSequencer.handleBpmChange took a change event and read `e.target.value`.
 * SequencerPanel — the control shown on the phone and tablet layouts — passed
 * the number instead, so every touch on that slider threw "Cannot read
 * properties of undefined (reading 'value')" and the value snapped back to 120.
 * Sidebar, on desktop, wrapped its number in a fake `{target:{value}}` object to
 * satisfy a signature it never needed, which is why the defect only ever showed
 * on the layouts Gabriel uses on his phone.
 *
 * Both call sites are covered here, because a contract with two callers is only
 * as good as the caller nobody tested.
 */
describe("contrôle du BPM", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  /** Collect errors React re-throws asynchronously, which fireEvent will not surface. */
  function captureUncaught() {
    const uncaught = [];
    const onError = (e) => uncaught.push(e.error?.message ?? e.message);
    const onRejection = (e) => uncaught.push(`rejection: ${e.reason?.message ?? e.reason}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return {
      uncaught,
      stop: () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("unhandledrejection", onRejection);
      },
    };
  }

  it("le slider du séquenceur (mobile/tablette) change le tempo sans planter", async () => {
    const { container } = render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    const controls = container.querySelector(".sequencer-mobile-controls");
    expect(controls).not.toBeNull();

    const slider = controls.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
    expect(slider.value).toBe("120");

    const watcher = captureUncaught();
    try {
      fireEvent.change(slider, { target: { value: "150" } });
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      watcher.stop();
    }

    // Before the fix: ["Cannot read properties of undefined (reading 'value')"],
    // and the slider stayed at 120.
    expect(watcher.uncaught).toEqual([]);
    expect(within(controls).getByText("150")).toBeDefined();
  });

  it("l'édition du BPM dans la sidebar (desktop) change le tempo", async () => {
    const { container } = render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    const badge = container.querySelector(".bpm-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain("120");

    fireEvent.click(badge);
    const input = badge.querySelector('input[type="number"]');
    expect(input).not.toBeNull();

    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 0));

    expect(badge.textContent).toContain("90");
  });
});
