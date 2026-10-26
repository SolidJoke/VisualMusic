// L1b-1c — the position panel of A′'s necks (?prototype=a): the label of the
// head's second row is a button that opens a small panel over the top of the
// neck ("Fondamentale sur" Mi / La / Ré with the fret, the two resets, the
// alerts, the barre legend, the instrument's range), with a warning sign next
// to the label when an alert is active. Same state, same setters as the classic
// page's PositionSelector (Gabriel, 2026-10-10: "pas de place dans la tête ; un
// petit panneau sur le libellé de position, sans hauteur ajoutée").
//
// The whole app is rendered (AppDesktop with ?prototype=a): the REAL hooks and
// the REAL PrototypeA; only the instrument drawings and the sequencer are
// stubbed (jsdom does no layout) and the audio engine is mocked, as in
// PrototypeAColumnHeads.test.jsx. What a neck draws is read from the page's own
// S1 attribute data-s1-positions ("string:fret"), computed by PrototypeA from
// the fingering the engine hands the neck.
//
// Domain values (standard tuning, Do = C, frets from the nut): Do majeur on the
// guitar is the open shape (frets 0-3); "Fondamentale sur" La gives the A shape
// (3-5), Mi the E shape (8-10), Ré the D shape (10-13). On the bass the root on
// the A string is 3-5, on the E string 8-10, on the D string 10-12. The guitar's
// Do majeur grip sounds C3 E3 G3 C4 E4 (Do3 - Mi4), the bass's C2 G2 C3
// (Do2 - Do3).
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
vi.mock("../../components/Panels/SequencerPanel", () => ({
  default: (props) => <div data-testid="sequencer-stub" data-octave={String(props.chordOctaveOffset)} />,
}));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { translations } from "../../i18n/translations";
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
const rootButton = (id, idx) => fn(`jouer.position-fondamentale-corde-${id}-${idx}`);
const headLabel = (id) => {
  const el = document.querySelector(`[data-s1="${id}"] .proto-a__head-label`);
  return el ? el.textContent.trim() : null;
};

/** What a neck draws, from PrototypeA's data-s1-positions: its lowest and highest fret. */
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

describe("L1b-1c (a): the Dictionary — the label of a neck's position is the button of the panel", () => {
  it("the guitar and the bass have it, closed; the piano has none", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    for (const id of ["guitar", "bass"]) {
      expect(toggle(id), id).not.toBeNull();
      expect(toggle(id).tagName).toBe("BUTTON");
      expect(toggle(id).getAttribute("aria-expanded"), id).toBe("false");
      expect(toggle(id).closest(`[data-s1="${id}"] .proto-a__inst-head`), id).not.toBeNull();
      expect(document.querySelector(`[data-s1="${id}"] [data-fn^="jouer.position-fondamentale-corde-"]`), id).toBeNull();
    }
    expect(fn("jouer.position-panneau-piano")).toBeNull();
    expect(document.querySelector(`[data-s1="piano"] .proto-a__head-label`).tagName).toBe("SPAN");
  });

  it("the head keeps its two rows and the label its words, open or closed", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(headLabel("guitar")).toBe("Open (auto)");
    await press(toggle("guitar"));
    expect(toggle("guitar").getAttribute("aria-expanded")).toBe("true");
    expect(headLabel("guitar")).toBe("Open (auto)");
    expect(document.querySelectorAll('[data-s1="guitar"] .proto-a__inst-head > *').length).toBe(2);
  });

  it("opened on the guitar: Do reads Mi (fr.8), La (fr.3), Ré (fr.10), under 'Fondamentale sur'", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("guitar"));
    const T = translations.fr.protoA;
    expect(document.querySelector('[data-s1="guitar"]').textContent).toContain(T.positionRootOn);
    expect(rootButton("guitar", 5).textContent).toBe("Mi (fr.8)");
    expect(rootButton("guitar", 4).textContent).toBe("La (fr.3)");
    expect(rootButton("guitar", 3).textContent).toBe("Ré (fr.10)");
    expect(document.querySelector('[data-s1="bass"] [data-fn^="jouer.position-fondamentale-corde-"]')).toBeNull();
  });

  it("guitar, La: the neck draws the A shape (3-5) instead of the open one (0-3); the bass does not move; pressing La again frees it", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(neckFrets("guitar")).toBe("0-3");
    await press(toggle("guitar"));
    await press(rootButton("guitar", 4));
    expect(neckFrets("guitar")).toBe("3-5");
    expect(headLabel("guitar")).toContain("La-forme");
    expect(neckFrets("bass")).toBe("3-5");
    expect(rootButton("guitar", 4).getAttribute("aria-pressed")).toBe("true");
    await press(rootButton("guitar", 4));
    expect(neckFrets("guitar")).toBe("0-3");
  });

  it("guitar: Mi is the E string (8-10), Ré the D string (10-13) — the strings the classic page offers", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("guitar"));
    await press(rootButton("guitar", 5));
    expect(neckFrets("guitar")).toBe("8-10");
    await press(rootButton("guitar", 3));
    expect(neckFrets("guitar")).toBe("10-13");
  });

  it("bass: its panel drives the bass alone — Mi 8-10, Ré 10-12 — the guitar keeps 0-3", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("bass"));
    expect(rootButton("bass", 3).textContent).toBe("Mi (fr.8)");
    await press(rootButton("bass", 3));
    expect(neckFrets("bass")).toBe("8-10");
    expect(neckFrets("guitar")).toBe("0-3");
    await press(rootButton("bass", 1));
    expect(neckFrets("bass")).toBe("10-12");
    expect(neckFrets("guitar")).toBe("0-3");
  });

  it("'Réinitialiser Position' appears once a position is chosen with the arrows, and puts the neck back to auto", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("guitar"));
    expect(fn("jouer.position-reinit-guitar")).toBeNull();
    await press(fn("jouer.position-guitar-suiv"));
    await press(fn("jouer.position-guitar-suiv"));
    expect(headLabel("guitar")).toBe("La-forme (fr. 3)");
    expect(toggle("guitar").getAttribute("aria-expanded")).toBe("true");
    expect(fn("jouer.position-reinit-guitar")).not.toBeNull();
    await press(fn("jouer.position-reinit-guitar"));
    expect(headLabel("guitar")).toBe("Open (auto)");
    expect(fn("jouer.position-reinit-guitar")).toBeNull();
  });

  it("a scale: no 'Fondamentale sur', but the panel still opens (barre legend, range)", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    await press(toggle("guitar"));
    expect(document.querySelector('[data-s1="guitar"] [data-fn^="jouer.position-fondamentale-corde-"]')).toBeNull();
    expect(document.querySelector('[data-s1="guitar"]').textContent).toContain(translations.fr.protoA.positionBarre);
  });

  it("the barre legend is the guitar's; the range is each instrument's own (guitar Do3 - Mi4, bass Do2 - Do3)", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("guitar"));
    await press(toggle("bass"));
    const T = translations.fr.protoA;
    expect(document.querySelector('[data-s1="guitar"]').textContent).toContain(T.positionBarre);
    expect(document.querySelector('[data-s1="bass"]').textContent).not.toContain(T.positionBarre);
    expect(fn("jouer.instrument-plage-guitar").textContent).toContain("Do3 – Mi4");
    expect(fn("jouer.instrument-plage-bass").textContent).toContain("Do2 – Do3");
  });

  it("Escape closes the panel and gives the focus back to its button", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("guitar"));
    rootButton("guitar", 4).focus();
    await act(async () => {
      fireEvent.keyDown(document.activeElement, { key: "Escape" });
    });
    expect(toggle("guitar").getAttribute("aria-expanded")).toBe("false");
    expect(rootButton("guitar", 4)).toBeNull();
    expect(document.activeElement).toBe(toggle("guitar"));
  });

  it("a press outside closes it", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("bass"));
    expect(rootButton("bass", 3)).not.toBeNull();
    await act(async () => {
      fireEvent.pointerDown(document.body);
    });
    expect(rootButton("bass", 3)).toBeNull();
  });
});

describe("L1b-1c (b): the Studio — the panel exists once a chord is clicked, the label stays read-only otherwise", () => {
  it("no chord yet: the label is plain text, no panel button", async () => {
    await renderApp("?prototype=a");
    expect(toggle("guitar")).toBeNull();
    expect(toggle("bass")).toBeNull();
    expect(document.querySelectorAll('[data-s1="guitar"] .proto-a__inst-head > *').length).toBe(2);
  });

  it("a chord clicked: 'Fondamentale sur' is there and moves the shape the neck shows", async () => {
    await renderApp("?prototype=a&bench=1");
    await press(document.querySelector('[data-state="studio-oct2"]'));
    expect(toggle("guitar")).not.toBeNull();
    const before = document.querySelector('[data-s1="guitar"]').getAttribute("data-s1-positions");
    await press(toggle("guitar"));
    const strings = [5, 4, 3].filter((idx) => rootButton("guitar", idx));
    expect(strings).toEqual([5, 4, 3]);
    const seen = new Set([before]);
    for (const idx of strings) {
      await press(rootButton("guitar", idx));
      seen.add(document.querySelector('[data-s1="guitar"]').getAttribute("data-s1-positions"));
    }
    expect(seen.size).toBeGreaterThan(1);
    // The arrows stay out of the Studio (L1b-1b decision 3).
    expect(fn("jouer.position-guitar-suiv")).toBeNull();
  });

  it("the chord octave at +3 puts the guitar out of range: the warning sign is on the label with the panel closed, with the alert's text", async () => {
    await renderApp("?prototype=a&bench=1");
    await press(document.querySelector('[data-state="studio-oct2"]'));
    expect(toggle("guitar").querySelector('[role="img"]')).toBeNull();
    await press(fn("jouer.octave-piano-suiv"));
    const mark = toggle("guitar").querySelector('[role="img"]');
    expect(mark, "the warning sign at octave +3").not.toBeNull();
    expect(mark.getAttribute("aria-label")).toBe(translations.fr.warningOutOfRange);
    expect(toggle("guitar").getAttribute("aria-expanded")).toBe("false");
    await press(toggle("guitar"));
    expect(fn("jouer.position-alertes-guitar").textContent).toContain(translations.fr.warningOutOfRange);
  });
});

describe("L1b-1c (c): the registry and the words", () => {
  const PANEL_FNS = [
    "jouer.position-panneau-guitar",
    "jouer.position-panneau-bass",
    "jouer.position-fondamentale-corde-guitar-5",
    "jouer.position-fondamentale-corde-guitar-4",
    "jouer.position-fondamentale-corde-guitar-3",
    "jouer.position-fondamentale-corde-bass-3",
    "jouer.position-fondamentale-corde-bass-2",
    "jouer.position-fondamentale-corde-bass-1",
    "jouer.position-reinit-guitar",
    "jouer.position-reinit-bass",
    "jouer.position-reinit-focus-guitar",
    "jouer.position-reinit-focus-bass",
    "jouer.position-alertes-guitar",
    "jouer.instrument-plage-guitar",
    "jouer.instrument-plage-bass",
  ];

  it("lists the panel's controls in src/prototype/aPrimeAccess.js, the toggles as Dictionary-only, the rest only once the panel is open", () => {
    const byFn = new Map(A_PRIME_ACCESS.map((f) => [f.fn, f]));
    for (const id of PANEL_FNS) expect(byFn.has(id), id).toBe(true);
    expect(byFn.get("jouer.position-panneau-guitar").needs).toBe("dictionary");
    expect(byFn.get("jouer.position-panneau-bass").needs).toBe("dictionary");
    for (const id of PANEL_FNS.filter((x) => !x.includes("panneau"))) expect(byFn.get(id).needs, id).toBe("panel");
  });

  it("the data-fn the Dictionary's open panels show are each there exactly once", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(toggle("guitar"));
    await press(toggle("bass"));
    const seen = [...document.querySelectorAll('[data-fn^="jouer.position-"], [data-fn^="jouer.instrument-plage-"]')].map((e) => e.getAttribute("data-fn"));
    expect(seen.length).toBe(new Set(seen).size);
    for (const id of PANEL_FNS.filter((x) => x.includes("panneau") || x.includes("corde") || x.includes("plage"))) expect(seen, id).toContain(id);
  });

  it("the panel's words exist in FR, EN, PT and ZH (the same keys, none empty)", () => {
    const KEYS = ["positionPanel", "positionRootOn", "positionResetPosition", "positionResetFocus", "positionBarre", "positionRange", "positionAlerts"];
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const T = translations[lang].protoA;
      for (const k of KEYS) expect(typeof T[k] === "string" && T[k].trim().length > 0, `${lang} ${k}`).toBe(true);
    }
  });

  it("names its panel in English once the page is in English", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    fireEvent.change(document.querySelector('[data-fn="nav.langue"] select'), { target: { value: "en" } });
    await settle();
    await press(toggle("guitar"));
    const en = translations.en.protoA;
    expect(document.querySelector('[data-s1="guitar"]').textContent).toContain(en.positionRootOn);
    expect(toggle("guitar").getAttribute("title")).toBe(en.positionPanel);
  });
});
