import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { AppProvider, useAppContext } from "../context/AppContext";
import { MusicEngineProvider } from "../context/MusicEngineContext";
import AppDesktop from "../AppDesktop";
import PianoKeyboard from "../components/Instruments/PianoKeyboard";

// Same Tone.js / AudioEngine mocking strategy as PlaybackHandlersContract.test.jsx.
vi.mock("tone", () => {
  // VMU-056: metronome.js reads Tone.getTransport() (never the deprecated
  // Transport snapshot — see that module's own comment for why). Same object
  // both ways, as in the real module, so a test asserting on either sees the
  // same calls.
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

import * as AudioEngine from "../audio/AudioEngine";

/**
 * VMU-100 — European notation (do, ré, mi) becomes the default.
 *
 * Before the switch, two things had to be true first (§1 of the ticket):
 *
 *  - Clicking a fretboard fret or a piano key must still send a
 *    Tone-readable, US-spelled name to the synth, regardless of the
 *    notation the UI displays. Both Fretboard.jsx and PianoKeyboard.jsx
 *    build the name sent to the synth from `noteInfo.us` — never from the
 *    notation the user selected — specifically to avoid resurrecting the
 *    "Do4" bug documented on theory.js's midiToNoteName/midiToDisplayName.
 *    These two tests pin that construction at the DOM level, the actual
 *    risk surface (a component quietly switching to `noteInfo[notation]`
 *    would break them), not just at the hook level.
 *
 *  - Once the default flips, the very first thing the user sees must
 *    already read in EU notation.
 *
 * A Tone-readable US name matches this alphabet; none of the EU spellings
 * ("Do", "Ré", "Mi", "Fa", "Sol", "La", "Si", possibly suffixed "#") do.
 */
const audible = (name) => expect(name).toMatch(/^[A-G]#?-?\d+$/);

describe("VMU-100 — clicks stay audible once EU notation is selected", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("fretboard click stays audible in EU notation", async () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    // Dictionary mode renders note markers on the fretboard without a chord
    // selected first (same setup as PlaybackHandlersContract.test.jsx).
    fireEvent.click(screen.getByText(/Dictionnaire/i));

    // Reach the notation control. VMU-134 moved it out of the Dictionary
    // panel into the header (HeaderActions) — global now, not tied to the
    // "Studio & Harmonie" modal, though opening it here is still harmless
    // and keeps the fretboard note markers this test needs visible. Only
    // two options exist, so one click is enough to land on EU when starting
    // from US, and does nothing harmful if EU is already the (default)
    // state, handled below by clicking again if needed rather than assuming
    // which side we started from.
    fireEvent.click(screen.getByText(/Studio & Harmonie/i));
    const toggle = screen.getByTestId("header-notation-toggle");
    if (!/EU \(Do, Ré\)/i.test(toggle.textContent)) fireEvent.click(toggle);
    expect(toggle.textContent).toMatch(/EU \(Do, Ré\)/i);

    const marker = document.querySelector(".instrument-guitar .note-marker");
    expect(marker).not.toBeNull();
    const target = marker.closest("[class*='fret']") ?? marker;

    fireEvent.click(target);
    await new Promise((r) => setTimeout(r, 0));

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalled();
    const [, notesArg] = AudioEngine.playDictionaryNote.mock.calls[0];
    const names = Array.isArray(notesArg) ? notesArg : [notesArg];
    expect(names.length).toBeGreaterThan(0);
    names.forEach(audible);
  });

  it("piano key click stays audible in EU notation", async () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    fireEvent.click(screen.getByText(/Dictionnaire/i));
    fireEvent.click(screen.getByText(/Studio & Harmonie/i));
    const toggle = screen.getByTestId("header-notation-toggle");
    if (!/EU \(Do, Ré\)/i.test(toggle.textContent)) fireEvent.click(toggle);
    expect(toggle.textContent).toMatch(/EU \(Do, Ré\)/i);

    const key = document.querySelector(".piano-key.white-key");
    expect(key).not.toBeNull();

    fireEvent.click(key);
    await new Promise((r) => setTimeout(r, 0));

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalled();
    const [, notesArg] = AudioEngine.playDictionaryNote.mock.calls[0];
    const names = Array.isArray(notesArg) ? notesArg : [notesArg];
    expect(names.length).toBeGreaterThan(0);
    names.forEach(audible);
  });
});

describe("VMU-100 — the default itself", () => {
  afterEach(() => cleanup());

  it("app starts in EU notation by default", () => {
    const Consumer = () => {
      const { state } = useAppContext();
      return <span data-testid="notation">{state.notation}</span>;
    };

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(screen.getByTestId("notation").textContent).toBe("eu");
  });

  it("first render shows note labels in EU notation", () => {
    // PianoKeyboard always renders a visible label per key (not only active
    // ones — see renderKeyLabel), so this needs no click and no chord
    // selection: the very first white key (pitch class 0) must already read
    // "Do" when the app opens, with no notation toggle touched.
    const { container } = render(
      <AppProvider>
        <MusicEngineProvider value={{}}>
          <PianoKeyboard />
        </MusicEngineProvider>
      </AppProvider>
    );

    const firstLabel = container.querySelector(".piano-key.white-key .note-label");
    expect(firstLabel).not.toBeNull();
    expect(firstLabel.textContent).toContain("Do");
    expect(firstLabel.textContent).not.toBe("C");
  });
});
