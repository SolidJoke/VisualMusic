// VMU-202 (slice 2) — the minimal start-pitch control in A′'s position panel:
// a select of the octaves the engine offers for a scale on that neck, labelled
// with the app's note names, registered in the parity registry the way the
// panel's other controls are. It appears only for a scale, only on a neck, only
// once the panel is open; choosing an octave redraws the neck at that octave.
import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

vi.hoisted(() => {
  window.history.replaceState({}, "", "/?prototype=a");
});

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

vi.mock("../../audio/AudioEngine", () => ({
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
  masterAnalyser: { getValue: () => new Float32Array(8) },
}));

vi.mock("../../components/Visualizer/AudioVisualizer", () => ({ default: () => <div data-testid="mock-visualizer" /> }));
vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({
  default: (props) => <div data-testid="sequencer-stub" data-octave={String(props.chordOctaveOffset)} />,
}));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { A_PRIME_ACCESS } from "../aPrimeAccess";

const LAZY_LOAD_TIMEOUT = 10_000;
vi.setConfig({ testTimeout: LAZY_LOAD_TIMEOUT + 5_000 });

async function renderApp(search = "?prototype=a") {
  window.history.replaceState({}, "", `/${search}`);
  render(
    <AppProvider>
      <Suspense fallback={<div data-testid="loading" />}>
        <AppDesktop />
      </Suspense>
    </AppProvider>
  );
  await waitFor(() => expect(document.querySelector('[data-prototype="a"]')).not.toBeNull(), { timeout: LAZY_LOAD_TIMEOUT });
  await settle();
  return document.querySelector('[data-prototype="a"]');
}

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

async function press(el) {
  expect(el, "the control to press").not.toBeNull();
  await act(async () => {
    fireEvent.click(el);
  });
  await settle();
}

const fn = (id) => document.querySelector(`[data-fn="${id}"]`);
const toggle = (id) => fn(`jouer.position-panneau-${id}`);

/** The neck's lowest and highest fret, from PrototypeA's data-s1-positions. */
function neckFrets(id) {
  const raw = document.querySelector(`[data-s1="${id}"]`).getAttribute("data-s1-positions") || "";
  const frets = raw.split(" ").filter(Boolean).map((p) => Number(p.split(":")[1]));
  return frets.length ? `${Math.min(...frets)}-${Math.max(...frets)}` : "";
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("VMU-202 — the start-pitch control of the position panel", () => {
  it("a scale: the guitar panel offers Do3 · Do4 · Do5 and the bass Do2 · Do3", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    await press(toggle("guitar"));
    const g = fn("jouer.position-depart-guitar");
    expect(g).not.toBeNull();
    expect(g.tagName).toBe("SELECT");
    expect([...g.options].map((o) => o.textContent)).toEqual(["Do3", "Do4", "Do5"]);
    await press(toggle("bass"));
    const b = fn("jouer.position-depart-bass");
    expect([...b.options].map((o) => o.textContent)).toEqual(["Do2", "Do3"]);
  });

  it("a chord: no start-pitch control (it is a scale's choice)", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("guitar"));
    expect(fn("jouer.position-depart-guitar")).toBeNull();
    expect(fn("jouer.position-depart-bass")).toBeNull();
  });

  it("choosing another octave redraws the neck at that octave", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    await press(toggle("guitar"));
    const before = neckFrets("guitar");
    expect(before).toBe("0-3"); // the preset Do3, span-4 nearest the nut
    await act(async () => {
      fireEvent.change(fn("jouer.position-depart-guitar"), { target: { value: "60" } });
    });
    await settle();
    expect(neckFrets("guitar")).not.toBe(before);
    // A new start pitch resets the position to its default (null), as a new
    // root or type does, so no position is chosen and the reset is not offered.
    expect(fn("jouer.position-reinit-guitar")).toBeNull();
  });

  it("the two controls are registered in aPrimeAccess as panel-only", () => {
    const byFn = new Map(A_PRIME_ACCESS.map((f) => [f.fn, f]));
    for (const id of ["guitar", "bass"]) {
      const entry = byFn.get(`jouer.position-depart-${id}`);
      expect(entry, id).toBeDefined();
      expect(entry.needs).toBe("panel");
    }
  });
});
