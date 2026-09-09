import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AppProvider } from "../context/AppContext";
import AppDesktop from "../AppDesktop";

// Same Tone.js / AudioEngine mocking strategy as QA_Journeys.integration.test.jsx
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
 * Regression guard for the class of defect introduced by 0efc4cb
 * ("extract hooks, AppContext, useMusicEngine — 558 tests passing"):
 * AppDesktop stopped passing 5 of the options usePlaybackHandlers declares,
 * and nothing — not the compiler, not eslint, not the 837 tests — noticed.
 *
 * Two layers on purpose:
 *  1. behavioural — clicking a fretboard note must not throw;
 *  2. structural  — every option the hook declares without a default must be
 *     supplied by the call site, so the NEXT dropped key fails here too.
 */
describe("usePlaybackHandlers ← AppDesktop contract", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("cliquer une note du manche ne doit pas lever d'exception", async () => {
    render(
      <AppProvider>
        <AppDesktop />
      </AppProvider>
    );

    // Dictionary mode renders note markers on the fretboard without needing a
    // chord to be selected first.
    fireEvent.click(screen.getByText(/Dictionnaire/i));

    const marker = document.querySelector(".instrument-guitar .note-marker");
    expect(marker).not.toBeNull();

    // The click handler lives on the enclosing fret cell.
    const target = marker.closest("[class*='fret']") ?? marker;

    // React re-throws handler errors asynchronously, so a plain
    // expect(...).not.toThrow() around fireEvent reports a false pass while the
    // app is visibly broken. Listen for the uncaught error instead.
    const uncaught = [];
    const onError = (e) => uncaught.push(e.error?.message ?? e.message);
    window.addEventListener("error", onError);
    try {
      fireEvent.click(target);
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      window.removeEventListener("error", onError);
    }

    // Before the fix: ["setPlaybackInstrument is not a function"].
    // The default playbackInstrument is 'piano', so clicking a guitar note
    // always crosses the instrument-switch branch in useFretboardPlayback.
    expect(uncaught).toEqual([]);
  });

  it("AppDesktop fournit toutes les options que le hook déclare sans valeur par défaut", () => {
    // The project is ESM ("type": "module"), so __dirname does not exist —
    // vitest happens to shim it, but eslint is right to reject it.
    const here = path.dirname(fileURLToPath(import.meta.url));
    const root = path.resolve(here, "..");
    const hookSrc = fs.readFileSync(
      path.join(root, "hooks", "usePlaybackHandlers.js"),
      "utf-8"
    );
    const callerSrc = fs.readFileSync(path.join(root, "AppDesktop.jsx"), "utf-8");

    const signature = hookSrc
      .slice(hookSrc.indexOf("export function usePlaybackHandlers({"))
      .split("}) {")[0];

    const required = signature
      .split("\n")
      .slice(1)
      .map((l) => l.trim().replace(/,$/, ""))
      .filter(Boolean)
      // options carrying a default are allowed to be omitted
      .filter((l) => !l.includes("="));

    const call = callerSrc
      .slice(callerSrc.indexOf("} = usePlaybackHandlers({"))
      .split("});")[0];

    const supplied = new Set(
      call
        .split("\n")
        .slice(1)
        .map((l) => l.trim().replace(/,$/, "").split(":")[0].trim())
        .filter(Boolean)
    );

    const missing = required.filter((name) => !supplied.has(name));
    expect(missing).toEqual([]);
  });
});
