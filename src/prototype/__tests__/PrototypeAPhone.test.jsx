// C-109 (phone, lot 1) — below 768 px A′ wears .proto-a--phone: ONE
// instrument on the stage and the centre column inside the bottom sheet
// (PhoneDrawer.jsx).
//
// src/layout.js reads the viewport once, when it loads. vi.hoisted() runs
// before this file's imports, so both the phone query and ?prototype=a are
// already in place when AppDesktop (and layout.js with it) is evaluated.
// Only the instrument drawings and the sequencer are stubbed (jsdom does no
// layout), and the audio engine is mocked as in the other integration tests.
import { vi, describe, it, expect, afterEach } from "vitest";

vi.hoisted(() => {
  window.history.replaceState({}, "", "/?prototype=a");
  window.matchMedia = (query) => ({
    matches: query === "(max-width: 767px)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
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
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { translations } from "../../i18n/translations";
import { A_PRIME_ACCESS } from "../aPrimeAccess";

const T = translations.fr.protoA;
const LAZY_LOAD_TIMEOUT = 10_000;
vi.setConfig({ testTimeout: LAZY_LOAD_TIMEOUT + 5_000 });

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

async function renderPhone() {
  render(
    <AppProvider>
      <Suspense fallback={<div data-testid="loading" />}>
        <AppDesktop />
      </Suspense>
    </AppProvider>
  );
  await waitFor(() => expect(document.querySelector('[data-prototype="a"]')).not.toBeNull(), {
    timeout: LAZY_LOAD_TIMEOUT,
  });
  await settle();
  return document.querySelector('[data-prototype="a"]');
}

const fn = (id) => document.querySelector(`[data-fn="${id}"]`);
const drawer = () => document.querySelector(".phone-drawer");

afterEach(() => cleanup());

describe("C-109: A′ on the phone", () => {
  it("wears proto-a proto-a--compact proto-a--phone and shows ONE instrument column on the stage", async () => {
    const root = await renderPhone();
    expect(root.classList.contains("proto-a")).toBe(true);
    expect(root.classList.contains("proto-a--compact")).toBe(true);
    expect(root.classList.contains("proto-a--phone")).toBe(true);

    expect(document.querySelectorAll(".proto-a__instrument")).toHaveLength(1);
    expect(document.querySelector(".proto-a__grid")).toBeNull();
    const stage = document.querySelector('[data-s1="stage"]');
    expect(stage).not.toBeNull();
    expect(stage.querySelectorAll(".proto-a__instrument")).toHaveLength(1);
  });

  it("has the two short mode tabs and the existing 'Aide et réglages' button", async () => {
    await renderPhone();
    const tabs = [...document.querySelectorAll(".proto-a__tab")];
    expect(tabs.map((b) => b.textContent.trim())).toEqual([T.tabStudioShort, T.tabDictionaryShort]);
    // The full labels stay the accessible names.
    expect(tabs[0].getAttribute("aria-label")).toBe(T.tabStudioAria);
    expect(tabs[1].getAttribute("aria-label")).toBe(T.tabDictionaryAria);
    expect(fn("nav.aide-reglages")).not.toBeNull();
    expect(fn("nav.aide-reglages").textContent.trim()).toBe(T.helpSettings);
  });

  it("places the centre column inside the bottom sheet, folded, with its content", async () => {
    await renderPhone();
    expect(drawer()).not.toBeNull();
    expect(drawer().getAttribute("data-drawer-height")).toBe("folded");
    expect(drawer().getAttribute("aria-label")).toBe(T.drawer);

    const centre = drawer().querySelector(".proto-a__center");
    expect(centre).not.toBeNull();
    expect(centre.getAttribute("data-s1")).toBe("center");
    // The transport is still the first thing in it (what folded shows).
    expect(centre.firstElementChild.getAttribute("data-s1")).toBe("transport");
  });

  it("keeps every applicable A_PRIME_ACCESS entry in the DOM, exactly once", async () => {
    await renderPhone();
    // Default state: Studio, piano chosen, the help menu closed, no drawer.
    const expected = A_PRIME_ACCESS.filter(
      (f) =>
        !f.devOnly &&
        (!f.needs || f.needs === "studio") &&
        (!f.compactNeeds || f.compactNeeds === "instrument:piano")
    );
    expect(expected.length).toBeGreaterThan(20);
    for (const f of expected) {
      expect(document.querySelectorAll(`[data-fn="${f.fn}"]`).length, f.fn).toBe(1);
    }
    expect(document.querySelectorAll('[data-fn="nav.tiroir-poignee"]')).toHaveLength(1);
  });

  it("a press on the stage folds a raised sheet", async () => {
    await renderPhone();
    const stage = document.querySelector('[data-s1="stage"]');

    fireEvent.click(fn("nav.tiroir-poignee"));
    expect(drawer().getAttribute("data-drawer-height")).toBe("half");

    fireEvent.click(stage);
    expect(drawer().getAttribute("data-drawer-height")).toBe("folded");
    // Its content, and its data-fn, never left the DOM.
    expect(drawer().querySelector(".proto-a__center")).not.toBeNull();
    expect(document.querySelectorAll('[data-fn="jouer.lecture"]')).toHaveLength(1);
  });
});
