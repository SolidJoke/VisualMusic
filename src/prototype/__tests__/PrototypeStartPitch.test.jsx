// VMU-202 (slice 3) — the start octave left the position panel for the
// position rail: one "Do3 ▾" button (98 x 44) at the head of each neck's rail,
// opening the list of reachable octaves. It keeps the slice-2 registry name
// (jouer.position-depart-<id>), now with needs "dictionary:scale": it exists
// only for a scale, beside the neck, and choosing an octave redraws the neck
// at that octave and puts it back on its default position.
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
const rail = (id) => document.querySelector(`[data-s1="${id}"] .proto-a__position-rail`);
const startOf = (id) => fn(`jouer.position-depart-${id}`);
const optionsOf = (id) => [...document.querySelectorAll(`[data-s1="${id}"] [data-start-pitch]`)];
const tabsOf = (id) => [...document.querySelectorAll(`[data-s1="${id}"] [data-rail-tab]`)];
const activeTabOf = (id) => document.querySelector(`[data-s1="${id}"] [data-rail-tab][aria-pressed="true"]`);

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("VMU-202 — the start octave on the position rail", () => {
  it("a scale: one button per neck, opening the list of reachable octaves", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(rail("guitar")).not.toBeNull();
    const g = startOf("guitar");
    expect(g).not.toBeNull();
    expect(g.tagName).toBe("BUTTON");
    expect(g.textContent).toContain("Do3"); // the octave in use

    await press(g);
    expect(optionsOf("guitar").map((o) => o.textContent)).toEqual(["Do3", "Do4", "Do5"]);
    expect(optionsOf("guitar").map((o) => o.getAttribute("data-start-pitch"))).toEqual(["48", "60", "72"]);

    const b = startOf("bass");
    expect(b.textContent).toContain("Do2");
    await press(b);
    expect(optionsOf("bass").map((o) => o.textContent)).toEqual(["Do2", "Do3"]);
  });

  it("no start button without a scale (a chord, or the Studio)", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(startOf("guitar")).toBeNull();
    expect(startOf("bass")).toBeNull();

    cleanup();
    await renderApp("?prototype=a"); // the Studio
    expect(startOf("guitar")).toBeNull();
    expect(startOf("bass")).toBeNull();
  });

  it("choosing an octave redraws the neck at that octave and resets its position", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(tabsOf("guitar")).toHaveLength(7);
    await press(document.querySelector('[data-s1="guitar"] [data-rail-tab="4"]'));
    expect(activeTabOf("guitar").getAttribute("data-rail-tab")).toBe("4");

    await press(startOf("guitar"));
    await press(document.querySelector('[data-s1="guitar"] [data-start-pitch="60"]')); // Do4

    // Do4 has 12 positions, and the neck is back on its default (index 1, tab 2).
    expect(tabsOf("guitar")).toHaveLength(12);
    expect(activeTabOf("guitar").getAttribute("data-rail-tab")).toBe("2");
    expect(startOf("guitar").textContent).toContain("Do4");
  });

  it("the two controls are registered in aPrimeAccess for the scale only", () => {
    const byFn = new Map(A_PRIME_ACCESS.map((f) => [f.fn, f]));
    for (const id of ["guitar", "bass"]) {
      const entry = byFn.get(`jouer.position-depart-${id}`);
      expect(entry, id).toBeDefined();
      expect(entry.where).toBe("instruments");
      expect(entry.needs).toBe("dictionary:scale");
    }
  });
});
