// VMU-186 — the Studio's "Octave des accords" (A′, ?prototype=a).
//
// Gabriel's decision of 2026-10-12 (option B): in the Studio the piano head's
// ‹ Octave › arrow pair is REPLACED by a clear setting, "Octave des accords",
// in the selection row (next to the style, near the tempo and the loop), whose
// tooltip says what the value also does: it shifts the loop's chords and the
// MIDI export. The piano head keeps its name, with no arrows. In the Dictionary
// nothing changes: the piano head keeps its ‹ Octave › and its range.
//
// The whole app is rendered (AppDesktop with ?prototype=a), as in
// PrototypeAColumnHeads.test.jsx: the real hooks, the real PrototypeA. Only the
// instrument drawings and the sequencer are stubbed; the sequencer stub shows
// the base octave it is handed (the loop's and the MIDI export's octave), and
// the piano's notes are read from the page's data-s1-notes.
//
// Domain values: MIDI 60 = Do4, so the base octave 0 reads "Do4", +1 "Do5",
// -1 "Do3"; the bounds are -3 and +3 (the Studio window's "Octave de base").
//
// RED FIRST (VMU-186): every test but the Dictionary one fails on main (the
// setting does not exist there); the Dictionary one is a guard against change.
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

const LAZY_LOAD_TIMEOUT = 10_000;
vi.setConfig({ testTimeout: LAZY_LOAD_TIMEOUT + 5_000 });

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

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
}

async function press(el) {
  expect(el, "the control to press").not.toBeNull();
  await act(async () => {
    fireEvent.click(el);
  });
  await settle();
}

const FN_PREV = "jouer.octave-piano-prec";
const FN_NEXT = "jouer.octave-piano-suiv";
const inHead = (id) => document.querySelectorAll(`[data-s1="piano"] .proto-a__inst-head [data-fn="${id}"]`);
const inRow = (id) => document.querySelectorAll(`[data-s1="selection"] [data-fn="${id}"]`);
const inPage = (id) => document.querySelectorAll(`[data-fn="${id}"]`);
const field = () => document.querySelector('[data-testid="selection-chord-octave"]');
const fieldLabel = () => {
  const el = field() && field().querySelector(".proto-a__head-label");
  return el ? el.textContent.trim() : null;
};
const loopOctave = () => document.querySelector('[data-testid="sequencer-stub"]').getAttribute("data-octave");
const pianoNotes = () =>
  (document.querySelector('[data-s1="piano"]').getAttribute("data-s1-notes") || "").split(" ").filter(Boolean).map(Number);

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("VMU-186 (a): in the Studio the arrows leave the piano head for the selection row", () => {
  it("the piano head has no octave arrow and keeps its two rows; the pair is in the row, once each, and once in the page", async () => {
    await renderApp("?prototype=a");
    expect(inHead(FN_PREV).length, "prev on the piano head").toBe(0);
    expect(inHead(FN_NEXT).length, "next on the piano head").toBe(0);
    // The head keeps its name and its two rows (100px: the CSS holds the height, jsdom does no layout).
    expect(document.querySelector('[data-fn="jouer.instrument-tuile-piano"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-s1="piano"] .proto-a__inst-head > *').length).toBe(2);
    expect(inRow(FN_PREV).length, "prev in the row").toBe(1);
    expect(inRow(FN_NEXT).length, "next in the row").toBe(1);
    expect(inPage(FN_PREV).length, "prev in the page").toBe(1);
    expect(inPage(FN_NEXT).length, "next in the page").toBe(1);
    expect(field().closest('[data-s1="selection"]')).not.toBeNull();
  });
});

describe("VMU-186 (b): the setting is the Studio's base octave, named by its C", () => {
  it("› moves the loop's / MIDI export's octave from 0 to 1 and the label from Do4 to Do5; ‹ twice reads -1 / Do3", async () => {
    await renderApp("?prototype=a");
    expect(loopOctave()).toBe("0");
    expect(fieldLabel()).toBe("Do4");
    await press(document.querySelector(`[data-s1="selection"] [data-fn="${FN_NEXT}"]`));
    expect(loopOctave()).toBe("1");
    expect(fieldLabel()).toBe("Do5");
    await press(document.querySelector(`[data-s1="selection"] [data-fn="${FN_PREV}"]`));
    await press(document.querySelector(`[data-s1="selection"] [data-fn="${FN_PREV}"]`));
    expect(loopOctave()).toBe("-1");
    expect(fieldLabel()).toBe("Do3");
  });

  it("stops at -3 and +3: ‹ is disabled at -3 (Do1), › at +3 (Do7)", async () => {
    await renderApp("?prototype=a");
    const prev = () => document.querySelector(`[data-s1="selection"] [data-fn="${FN_PREV}"]`);
    const next = () => document.querySelector(`[data-s1="selection"] [data-fn="${FN_NEXT}"]`);
    for (let i = 0; i < 3; i++) await press(prev());
    expect(loopOctave()).toBe("-3");
    expect(fieldLabel()).toBe("Do1");
    expect(prev().disabled).toBe(true);
    expect(next().disabled).toBe(false);
    for (let i = 0; i < 6; i++) await press(next());
    expect(loopOctave()).toBe("3");
    expect(fieldLabel()).toBe("Do7");
    expect(next().disabled).toBe(true);
  });
});

describe("VMU-186 (c): the Dictionary does not change", () => {
  it("the arrows stay on the piano head (with the range), none in the selection row, no new field", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(inHead(FN_PREV).length).toBe(1);
    expect(inHead(FN_NEXT).length).toBe(1);
    expect(inRow(FN_PREV).length).toBe(0);
    expect(inRow(FN_NEXT).length).toBe(0);
    expect(field()).toBeNull();
    expect(document.querySelector('[data-s1="piano"] .proto-a__head-label').textContent.trim()).toBe("Do4 – Sol4");
  });
});

describe("VMU-186 (d): the effects are said in plain words", () => {
  it("FR: the group is named 'Octave des accords' and its tooltip / accessible name is the brief's sentence (loop and MIDI)", async () => {
    await renderApp("?prototype=a");
    const help = "Octave des accords : la hauteur de base des accords que tu joues. Elle décale aussi les accords de la boucle et l'export MIDI.";
    expect(translations.fr.protoA.chordOctaveHelp).toBe(help);
    expect(field().getAttribute("title")).toBe(help);
    expect(field().getAttribute("aria-label")).toBe(help);
    expect(field().getAttribute("title")).toContain("boucle");
    expect(field().getAttribute("title")).toContain("MIDI");
    expect(field().textContent).toContain("Octave des accords");
  });
});

describe("VMU-186 (e): changing the octave still clears the clicked chord's notes (unchanged behaviour)", () => {
  it("with a chord clicked at +2, ‹ in the row moves the base to +1 and empties the piano, as the arrow of the head did", async () => {
    await renderApp("?prototype=a&bench=1");
    await press(document.querySelector('[data-state="studio-oct2"]'));
    expect(loopOctave()).toBe("2");
    expect(pianoNotes().length).toBeGreaterThan(0);
    expect(fieldLabel()).toBe("Do6");
    await press(document.querySelector(`[data-s1="selection"] [data-fn="${FN_PREV}"]`));
    expect(loopOctave()).toBe("1");
    expect(fieldLabel()).toBe("Do5");
    expect(pianoNotes()).toEqual([]);
  });
});

describe("VMU-186 (f): the words come from translations.js, in four languages", () => {
  const KEYS = ["chordOctaveGroup", "chordOctaveHelp"];

  it("has the two keys in FR, EN, PT and ZH, none empty; FR and EN say the loop and the MIDI export", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const T = translations[lang].protoA;
      for (const k of KEYS) expect(typeof T[k] === "string" && T[k].trim().length > 0, `${lang} ${k}`).toBe(true);
    }
    expect(translations.fr.protoA.chordOctaveGroup).toBe("Octave des accords");
    expect(translations.en.protoA.chordOctaveGroup).toBe("Chord octave");
    expect(translations.en.protoA.chordOctaveHelp).toMatch(/loop/i);
    expect(translations.en.protoA.chordOctaveHelp).toContain("MIDI");
  });

  it("names the setting in English once the page is in English", async () => {
    await renderApp("?prototype=a");
    fireEvent.change(document.querySelector('[data-fn="nav.langue"] select'), { target: { value: "en" } });
    await settle();
    const en = translations.en.protoA;
    expect(field().getAttribute("title")).toBe(en.chordOctaveHelp);
    expect(field().getAttribute("aria-label")).toBe(en.chordOctaveHelp);
    expect(field().textContent).toContain(en.chordOctaveGroup);
    expect(document.querySelector(`[data-s1="selection"] [data-fn="${FN_NEXT}"]`).getAttribute("aria-label")).toBe(en.octaveUp);
  });
});
