import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import React from "react";
import * as AudioEngine from "../audio/AudioEngine";
import { AppProvider } from "../context/AppContext";
import AppDesktop from "../AppDesktop";

// Same Tone.js / AudioEngine mocking strategy as PlaybackHandlersContract.test.jsx.
vi.mock("tone", () => {
  const transport = {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
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
  initAudio: vi.fn(),
  setMasterVolume: vi.fn(),
  masterAnalyser: {},
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="mock-visualizer">Visualizer Mock</div>,
}));

/**
 * INST-A2 — what Gabriel sees and hears on the classic page, end to end.
 *
 * The tile buttons of the Dictionary's instrument bar ("PIANO / GUITARE /
 * BASSE") play their own instrument and make it the instrument of the big play
 * button. This test goes through the whole app — AppDesktop, the music-engine
 * context, InstrumentView, InstrumentBar, the playback hooks — with only Tone
 * and the audio engine replaced, and asserts what reaches the synth. It holds
 * before and after the swap from `useSelectThenPlay` to `playInstrument`: the
 * visible behavior of the tiles does not change, and this is what says so.
 *
 * Expected pitches are domain values: open C chord on a guitar x32010 sounds
 * C3 E3 G3 C4 E4; the piano plays C4 E4 G4; the bass plays C2 G2 C3 from its
 * A string (the synth then sounds only the lowest, which this mock cannot hear).
 */
describe("tiles of the instrument bar — ▶ plays that instrument, the big ▶ follows", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  async function press(element) {
    await act(async () => {
      fireEvent.click(element);
    });
    await settle();
  }

  /** The note names of the last chord sent to the synth, with its instrument. */
  const lastPlay = () => {
    const calls = AudioEngine.playDictionaryNote.mock.calls;
    const [instrument, notes] = calls[calls.length - 1];
    return { instrument, notes };
  };

  async function openDictionaryOnCMajorChord() {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );
    // The family selector lives in the "Studio & Harmonie" popup.
    fireEvent.click(screen.getByText(/Studio & Harmonie/i));
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    fireEvent.click(screen.getByRole("button", { name: /accords/i }));
    await settle();
  }

  const tileSelect = (id) => document.querySelector(`.instrument-bar [data-instrument="${id}"]`);
  const bigPlay = () => document.querySelector(".btn-playback-premium");

  it("the guitar tile's ▶ sounds the guitar's own grip at once and selects the guitar", async () => {
    await openDictionaryOnCMajorChord();
    expect(tileSelect("piano").getAttribute("aria-pressed")).toBe("true");

    await press(screen.getByRole("button", { name: "Jouer — Guitare" }));

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledTimes(1);
    expect(lastPlay()).toEqual({ instrument: "guitar", notes: ["C3", "E3", "G3", "C4", "E4"] });
    expect(tileSelect("guitar").getAttribute("aria-pressed")).toBe("true");
    expect(tileSelect("piano").getAttribute("aria-pressed")).toBe("false");
  });

  it("each tile's ▶ sounds its own instrument, whichever one was selected before", async () => {
    await openDictionaryOnCMajorChord();

    await press(screen.getByRole("button", { name: "Jouer — Basse" }));
    expect(lastPlay()).toEqual({ instrument: "bass", notes: ["C2", "G2", "C3"] });

    await press(screen.getByRole("button", { name: "Jouer — Piano" }));
    expect(lastPlay()).toEqual({ instrument: "piano", notes: ["C4", "E4", "G4"] });

    await press(screen.getByRole("button", { name: "Jouer — Guitare" }));
    expect(lastPlay()).toEqual({ instrument: "guitar", notes: ["C3", "E3", "G3", "C4", "E4"] });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledTimes(3);
  });

  it("the big ▶ then plays the instrument touched last", async () => {
    await openDictionaryOnCMajorChord();

    await press(screen.getByRole("button", { name: "Jouer — Basse" }));
    AudioEngine.playDictionaryNote.mockClear();

    await press(bigPlay());

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledTimes(1);
    expect(lastPlay()).toEqual({ instrument: "bass", notes: ["C2", "G2", "C3"] });
  });

  it("a tile's select button only selects: nothing sounds until a ▶ is pressed", async () => {
    await openDictionaryOnCMajorChord();

    await press(tileSelect("guitar"));

    expect(AudioEngine.playDictionaryNote).not.toHaveBeenCalled();
    expect(tileSelect("guitar").getAttribute("aria-pressed")).toBe("true");

    await press(bigPlay());
    expect(lastPlay()).toEqual({ instrument: "guitar", notes: ["C3", "E3", "G3", "C4", "E4"] });
  });
});
