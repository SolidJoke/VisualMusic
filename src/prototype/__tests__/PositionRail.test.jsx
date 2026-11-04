// VMU-202 (slice 3) — the position rail beside A′'s vertical necks, only when
// a scale is shown. Design E1, variant B "onglets et fils": one numbered tab
// per position, one thread in its lane, the start octave as a "Do3 ▾" button,
// and a ribbon of the octave's note names that lights with ▶.
//
// Two layers:
//   - integration (the whole A′ page): the rail appears only for a scale, its
//     tabs are numbered 1..N at their first fret, a click on a tab or a thread
//     chooses the position (the neck's 8 cells move), and the ribbon shows the
//     octave's names in the active notation;
//   - unit (PositionRail alone): the one-row-down rule for two positions
//     starting at the same fret, the grand-écart ⚠, the shift's cut thread and
//     arrow, the chosen thread's 8px Assistant line, and the ribbon lighting.
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
import PositionRail from "../PositionRail";
import { translations } from "../../i18n/translations";

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
const tabsIn = (instrument) => [...document.querySelectorAll(`[data-s1="${instrument}"] [data-rail-tab]`)];
const threadsIn = (instrument) => [...document.querySelectorAll(`[data-s1="${instrument}"] [data-rail-thread]`)];
const ribbonIn = (instrument) => [...document.querySelectorAll(`[data-s1="${instrument}"] .proto-a__ribbon-note`)];

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

describe("VMU-202 — the position rail (integration)", () => {
  it("a scale: a rail on each neck, 7 tabs on the guitar and 6 on the bass", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(document.querySelector('[data-s1="guitar"] .proto-a__position-rail')).not.toBeNull();
    expect(document.querySelector('[data-s1="bass"] .proto-a__position-rail')).not.toBeNull();
    expect(tabsIn("guitar")).toHaveLength(7);
    expect(tabsIn("bass")).toHaveLength(6);
    // One thread per position in this scenario (neither neck has a shift at
    // its preset start pitch), so the threads count matches the tabs.
    expect(threadsIn("guitar")).toHaveLength(7);
    expect(threadsIn("bass")).toHaveLength(6);
  });

  it("no rail for a chord, a note, or the Studio", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(document.querySelector(".proto-a__position-rail")).toBeNull();
    expect(document.querySelector("[data-rail-tab]")).toBeNull();
    expect(document.querySelector(".proto-a__ribbon")).toBeNull();

    cleanup();
    await renderApp("?prototype=a"); // the Studio
    expect(document.querySelector(".proto-a__position-rail")).toBeNull();
    expect(document.querySelector("[data-rail-tab]")).toBeNull();
  });

  it("the neck carries the rail-margin class only when a rail is drawn", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(document.querySelector('[data-s1="guitar"] .proto-a__neck').classList.contains("proto-a__neck--rail")).toBe(true);
    expect(document.querySelector('[data-s1="bass"] .proto-a__neck').classList.contains("proto-a__neck--rail")).toBe(true);

    cleanup();
    await renderApp("?prototype=a&scenario=cmaj");
    expect(document.querySelector('[data-s1="guitar"] .proto-a__neck').classList.contains("proto-a__neck--rail")).toBe(false);
    expect(document.querySelector('[data-s1="bass"] .proto-a__neck').classList.contains("proto-a__neck--rail")).toBe(false);
  });

  it("the tabs are numbered 1..N from the nut, at the row of their first fret", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(tabsIn("guitar").map((t) => t.getAttribute("data-rail-tab"))).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    // Do majeur, guitar, Do3: first frets 0 2 3 4 5 7 8.
    expect(tabsIn("guitar").map((t) => t.getAttribute("data-rail-fret"))).toEqual(["0", "2", "3", "4", "5", "7", "8"]);
  });

  it("the span-5 (grand écart) tabs carry ⚠, the others do not", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    const guitar = tabsIn("guitar");
    const warnOf = (label) => guitar.find((t) => t.getAttribute("data-rail-tab") === label).querySelector(".proto-a__rail-warn");
    // Spans 4 4 5 5 5 4 5 → labels 3, 4, 5, 7 are "grand écart".
    for (const label of ["3", "4", "5", "7"]) {
      expect(warnOf(label), `tab ${label} should warn`).not.toBeNull();
      expect(warnOf(label).textContent).toBe("⚠");
    }
    for (const label of ["1", "2", "6"]) {
      expect(warnOf(label), `tab ${label} should not warn`).toBeNull();
    }
  });

  it("the chosen position's thread is 8px with the Assistant line, the others 4px", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    const chosen = document.querySelector('[data-s1="guitar"] [data-rail-thread="1"]');
    expect(chosen.classList.contains("is-active")).toBe(true);
    expect(chosen.style.getPropertyValue("--rail-thread-w")).toBe("8px");
    const other = document.querySelector('[data-s1="guitar"] [data-rail-thread="2"]');
    expect(other.classList.contains("is-active")).toBe(false);
    expect(other.style.getPropertyValue("--rail-thread-w")).toBe("4px");
  });

  it("clicking a tab chooses that position: the neck's 8 cells move", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(neckFrets("guitar")).toBe("0-3"); // the default span-4 nearest the nut
    const positions = document.querySelector('[data-s1="guitar"]').getAttribute("data-s1-positions").split(" ").filter(Boolean);
    expect(positions).toHaveLength(8);
    await press(document.querySelector('[data-s1="guitar"] [data-rail-tab="4"]'));
    expect(neckFrets("guitar")).toBe("4-8");
    expect(document.querySelector('[data-s1="guitar"] [data-rail-tab="4"]').getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[data-s1="guitar"]').getAttribute("data-s1-positions").split(" ").filter(Boolean)).toHaveLength(8);
  });

  it("clicking a thread chooses the position too (the thread is the secondary target)", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(neckFrets("guitar")).toBe("0-3");
    await press(document.querySelector('[data-s1="guitar"] [data-rail-thread="5"]'));
    expect(neckFrets("guitar")).toBe("5-9");
    expect(document.querySelector('[data-s1="guitar"] [data-rail-tab="5"]').getAttribute("aria-pressed")).toBe("true");
  });

  it("the ribbon shows the octave's 8 notes in the active notation (eu then us)", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    expect(ribbonIn("guitar").map((n) => n.getAttribute("data-ribbon-note"))).toEqual(["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si", "Do"]);
    await press(fn("nav.noms-notes-us"));
    expect(ribbonIn("guitar").map((n) => n.getAttribute("data-ribbon-note"))).toEqual(["C", "D", "E", "F", "G", "A", "B", "C"]);
  });

  it("the ribbon follows the board's strings — 6 on the guitar, 4 on the bass — with 8 cells capped at 46px", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    // PrototypeA.css turns --proto-strings into the ribbon's width
    // (--fbv-string x strings), so the ribbon spans exactly the board: 6 string
    // columns on the guitar, 4 on the bass. Each of its 8 cells shares that
    // width equally, never wider than --proto-cell-max (46px).
    const ribbon = (instrument) => document.querySelector(`[data-s1="${instrument}"] .proto-a__ribbon`);
    expect(ribbon("guitar").style.getPropertyValue("--proto-strings")).toBe("6");
    expect(ribbon("bass").style.getPropertyValue("--proto-strings")).toBe("4");
    expect(ribbon("guitar").style.getPropertyValue("--proto-cell-max")).toBe("46px");
    expect(ribbon("bass").style.getPropertyValue("--proto-cell-max")).toBe("46px");
    expect(ribbonIn("guitar")).toHaveLength(8);
    expect(ribbonIn("bass")).toHaveLength(8);
  });
});

describe("VMU-202 — the position rail (unit: PositionRail alone)", () => {
  const T = translations.fr.protoA;

  const rail = (overrides = {}) => ({
    id: "guitar",
    placements: [
      { index: 0, id: "p0", label: "1", rail: { minFret: 0, maxFret: 3, span: 4, warning: null, shift: null, lane: 0 } },
      { index: 1, id: "p1", label: "2", rail: { minFret: 0, maxFret: 4, span: 5, warning: "grandEcart", shift: null, lane: 1 } },
      { index: 2, id: "p2", label: "3", rail: { minFret: 2, maxFret: 9, span: 5, warning: null, shift: { afterStep: 3, onString: 0, from: { lo: 2, hi: 5 }, to: { lo: 6, hi: 9 }, distance: 4 }, lane: 0 } },
    ],
    startPitches: [{ pitch: 48 }, { pitch: 60 }, { pitch: 72 }],
    startPitch: 48,
    chosenIndex: 0,
    notation: "eu",
    dictType: "scale_major",
    currentlyPlayingNotes: [],
    onSelectPosition: vi.fn(),
    onSelectStartPitch: vi.fn(),
    T,
    ...overrides,
  });

  const renderRail = (props) => render(<PositionRail {...rail(props)} />);

  it("two positions starting at the same fret drop the second tab one row down", () => {
    renderRail();
    const tabs = [...document.querySelectorAll("[data-rail-tab]")];
    const first = tabs.find((t) => t.getAttribute("data-rail-tab") === "1");
    const second = tabs.find((t) => t.getAttribute("data-rail-tab") === "2");
    expect(first.getAttribute("data-rail-fret")).toBe("0");
    expect(second.getAttribute("data-rail-fret")).toBe("0");
    expect(first.getAttribute("style")).not.toBe(second.getAttribute("style"));
    // One row down: the first tab is anchored to the open-string row (fret 0,
    // the fixed 2 * --fbv-head line), the second to fret 1's row (HEAD_OFFSET).
    expect(first.getAttribute("style")).not.toContain("calc(2 * var(--fbv-head, 36px) + var(--fbv-fret, 70px)");
    expect(second.getAttribute("style")).toContain("calc(2 * var(--fbv-head, 36px) + var(--fbv-fret, 70px)");
  });

  it("a shift position draws its thread in two segments with an arrow between them", () => {
    renderRail();
    const segments = [...document.querySelectorAll('[data-rail-thread="3"]')];
    expect(segments).toHaveLength(2);
    expect(segments.map((s) => s.getAttribute("data-rail-segment"))).toEqual(["1", "2"]);
    expect(document.querySelector(".proto-a__rail-shift")).not.toBeNull();
  });

  it("the ribbon lights the note ▶ is playing and none other", () => {
    renderRail({ currentlyPlayingNotes: [{ absoluteValue: 50 }] }); // Ré
    const notes = [...document.querySelectorAll(".proto-a__ribbon-note")];
    expect(notes).toHaveLength(8);
    expect(notes.map((n) => n.getAttribute("data-ribbon-playing"))).toEqual(["false", "true", "false", "false", "false", "false", "false", "false"]);
    expect(notes[1].classList.contains("is-playing")).toBe(true);
    expect(notes[1].getAttribute("data-ribbon-note")).toBe("Ré");
  });

  it("the ribbon reads the notation handed to it", () => {
    renderRail({ notation: "us" });
    expect([...document.querySelectorAll(".proto-a__ribbon-note")].map((n) => n.getAttribute("data-ribbon-note"))).toEqual(["C", "D", "E", "F", "G", "A", "B", "C"]);
  });

  it("clicking a tab or a thread calls onSelectPosition with that position's index", () => {
    const onSelectPosition = vi.fn();
    renderRail({ onSelectPosition });
    fireEvent.click([...document.querySelectorAll('[data-rail-tab="2"]')][0]);
    expect(onSelectPosition).toHaveBeenLastCalledWith(1);
    fireEvent.click(document.querySelector('[data-rail-thread="1"]'));
    expect(onSelectPosition).toHaveBeenLastCalledWith(0);
  });
});
