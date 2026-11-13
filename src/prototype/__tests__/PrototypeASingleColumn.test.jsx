// C-104 (Step 3b, part 1) — A′ from 1600 to 2559 px: ONE instrument column.
// From 1600 the page is A′ (src/layout.js, A_PRIME_MIN_WIDTH) but the three
// instrument columns only exist from 2560 (DESKTOP_QUERY, read live by
// PrototypeA.jsx). Below 2560 the page shows the CHOSEN instrument's column,
// its head's row 1 a segmented control of the three names — each segment keeps
// the registry name of the head toggle it replaces, is pressed for the chosen
// instrument and chooses it (engine.setPlaybackInstrument). ▶ stays, in the
// Dictionary, for the chosen instrument only.
//
// The whole app is rendered (AppDesktop with ?prototype=a, as
// PrototypeAColumnHeads.test.jsx does): the REAL hooks, the REAL PrototypeA and
// its heads. Only the instrument drawings and the sequencer are stubbed (jsdom
// does no layout), and the audio engine is mocked as in the other integration
// tests.
//
// window.matchMedia is mocked per test: the 2560 query does NOT match in the
// single-column tests, and the setup file's default mock (it matches) is
// restored after each one — the last test uses it for the three columns.
import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

vi.hoisted(() => {
  // AppDesktop reads ?prototype=a once, when its module is evaluated.
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
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { translations } from "../../i18n/translations";

const T = translations.fr.protoA;
const LAZY_LOAD_TIMEOUT = 10_000;
vi.setConfig({ testTimeout: LAZY_LOAD_TIMEOUT + 5_000 });

const DESKTOP_QUERY = "(min-width: 2560px)";
// The setup file's default matchMedia (it matches the 2560 query): restored
// after every test so the three-column case sees it.
const defaultMatchMedia = window.matchMedia;

/** matchMedia for a window that is (or is not) 2560px wide. */
function mockViewport(threeColumns) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === DESKTOP_QUERY ? threeColumns : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

async function renderApp(search = "?prototype=a", { threeColumns = false } = {}) {
  mockViewport(threeColumns);
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
const columns = () => [...document.querySelectorAll(".proto-a__instrument")];
const segment = (id) => fn(`jouer.instrument-tuile-${id}`);

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  window.matchMedia = defaultMatchMedia;
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("C-104: from 1600 to 2559 px, ONE instrument column", () => {
  it("renders one column, the piano by default, and three segment buttons pressed for it", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    const inst = columns();
    expect(inst).toHaveLength(1);
    expect(inst[0].getAttribute("data-s1")).toBe("piano");

    for (const [id, name] of [["piano", T.piano], ["guitar", T.guitar], ["bass", T.bass]]) {
      const seg = segment(id);
      expect(seg, id).not.toBeNull();
      expect(seg.tagName).toBe("BUTTON");
      expect(seg.textContent.trim()).toBe(name);
      expect(seg.getAttribute("aria-pressed")).toBe(id === "piano" ? "true" : "false");
    }
    // The three segments live in the column's head, row 1.
    expect(inst[0].querySelectorAll(".proto-a__inst-head .proto-a__segment")).toHaveLength(3);
  });

  it("switches the column to the chosen instrument when its segment is pressed", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(segment("guitar"));

    const inst = columns();
    expect(inst).toHaveLength(1);
    expect(inst[0].getAttribute("data-s1")).toBe("guitar");
    expect(segment("guitar").getAttribute("aria-pressed")).toBe("true");
    expect(segment("piano").getAttribute("aria-pressed")).toBe("false");
    expect(segment("bass").getAttribute("aria-pressed")).toBe("false");
    // The section is the guitar's now, and its head too (same data-fn, same content).
    expect(inst[0].getAttribute("data-fn")).toBe("jouer.guitare");
    expect(inst[0].querySelector(".proto-a__inst-head").getAttribute("data-head")).toBe("guitar");
  });

  it("keeps ▶ in the Dictionary, for the chosen instrument only", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(fn("jouer.instrument-play-piano")).not.toBeNull();
    expect(fn("jouer.instrument-play-guitar")).toBeNull();
    expect(fn("jouer.instrument-play-bass")).toBeNull();

    await press(segment("guitar"));
    expect(fn("jouer.instrument-play-guitar")).not.toBeNull();
    expect(fn("jouer.instrument-play-piano")).toBeNull();
    expect(fn("jouer.instrument-play-bass")).toBeNull();
  });
});

describe("C-104: at 2560 px and wider, A′ keeps its three columns", () => {
  it("renders three sections with single-name heads and no segments", async () => {
    await renderApp("?prototype=a&scenario=cmaj", { threeColumns: true });
    const inst = columns();
    expect(inst.map((s) => s.getAttribute("data-s1"))).toEqual(["piano", "guitar", "bass"]);
    expect(document.querySelectorAll(".proto-a__inst-head .proto-a__head-name")).toHaveLength(3);
    expect(document.querySelectorAll(".proto-a__inst-head .proto-a__segment")).toHaveLength(0);
    for (const id of ["piano", "guitar", "bass"]) {
      expect(fn(`jouer.instrument-tuile-${id}`), id).not.toBeNull();
    }
  });
});
