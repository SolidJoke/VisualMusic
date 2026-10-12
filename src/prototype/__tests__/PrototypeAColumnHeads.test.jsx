// L1b-1b — the column heads of A′ (?prototype=a): each instrument's name (it
// chooses the instrument that sounds), its own ▶ (Dictionary only), and under
// it the instrument's own setting: ‹ Octave › on the piano, ‹ Position › on the
// guitar and the bass (Gabriel, 2026-10-05: "il n'y a plus de bouton pour
// lancer la lecture pour le piano, la guitare ou la basse spécifiquement").
//
// The whole app is rendered (AppDesktop with ?prototype=a): the REAL hooks
// (useDictionaryMode -> useMusicEngine -> usePlaybackHandlers), the REAL
// PrototypeA and its heads. Only the instrument drawings and the sequencer are
// stubbed (jsdom does no layout), and the audio engine is mocked as in the other
// integration tests, so what reaches the synth is what is asserted. What each
// neck draws is read from the page's own S1 attributes (data-s1-positions,
// "string:fret", computed by PrototypeA from the fingering the engine hands the
// neck) and what the piano holds from data-s1-notes (its realization, MIDI).
//
// Domain values (standard tuning, Do = C, MIDI 60 = Do4, frets from the nut):
// Do majeur on the guitar is the open shape (frets 0-3), the A shape barred at
// fret 3 (3-5), the E shape at fret 8 (8-10), the D shape at fret 10 (10-13);
// on the bass the root on the A string (3-5), on the E string (8-10), on the D
// string (10-12) — INST-B1's list, nut -> body. The piano plays C4 E4 G4
// (60 64 67). The Do major scale's default box at the octave 0 starts at fret 4
// on the guitar (C-06: 0, 2, 2, 4, 7, 7, 8 for the octaves -3..+3).
//
// RED FIRST (L1b-1b): every test of this file except the characterization of
// the classic page, which lives in its own file (ClassicPageOctave.test.jsx:
// the classic page cannot be rendered from a file that loads ?prototype=a).
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
// The sequencer stub shows the base octave it is handed: SequencerPanel exports
// the MIDI file with it (exportTimelineChords(..., { octaveOffset })).
vi.mock("../../components/Panels/SequencerPanel", () => ({
  default: (props) => <div data-testid="sequencer-stub" data-octave={String(props.chordOctaveOffset)} />,
}));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import * as AudioEngine from "../../audio/AudioEngine";
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

/** Visible as far as jsdom can tell (no layout here): in the document, no ancestor hidden. */
function isVisible(el) {
  if (!el || !el.isConnected) return false;
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    if (node.hidden) return false;
    const cs = window.getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
  }
  return true;
}

/** The setting label of a column's head (the text between ‹ and ›). */
const headLabel = (id) => {
  const el = document.querySelector(`[data-s1="${id}"] .proto-a__head-label`);
  return el ? el.textContent.trim() : null;
};

/** The Studio's "Octave des accords" (VMU-186): its value, in the selection row, not on the piano head. */
const chordOctaveLabel = () => {
  const el = document.querySelector('[data-testid="selection-chord-octave"] .proto-a__head-label');
  return el ? el.textContent.trim() : null;
};

/** What a neck draws, from PrototypeA's data-s1-positions: its lowest and highest fret. */
function neckFrets(id) {
  const raw = document.querySelector(`[data-s1="${id}"]`).getAttribute("data-s1-positions") || "";
  const frets = raw.split(" ").filter(Boolean).map((p) => Number(p.split(":")[1]));
  return frets.length ? `${Math.min(...frets)}-${Math.max(...frets)}` : "";
}

/** The piano's realization, MIDI. */
const pianoNotes = () =>
  (document.querySelector('[data-s1="piano"]').getAttribute("data-s1-notes") || "").split(" ").filter(Boolean).map(Number);

/** The 12 controls of the heads in the Dictionary, one data-fn each. */
const HEAD_FNS = [
  "jouer.instrument-tuile-piano",
  "jouer.instrument-tuile-guitar",
  "jouer.instrument-tuile-bass",
  "jouer.instrument-play-piano",
  "jouer.instrument-play-guitar",
  "jouer.instrument-play-bass",
  "jouer.octave-piano-prec",
  "jouer.octave-piano-suiv",
  "jouer.position-guitar-prec",
  "jouer.position-guitar-suiv",
  "jouer.position-bass-prec",
  "jouer.position-bass-suiv",
];

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("L1b-1b (a): the heads carry 12 controls in the Dictionary, one data-fn each, in the shared list", () => {
  it("has each of the 12 head controls once, visible, a button, in the column it names", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    for (const id of HEAD_FNS) {
      const els = document.querySelectorAll(`[data-fn="${id}"]`);
      expect(els.length, id).toBe(1);
      expect(els[0].tagName, id).toBe("BUTTON");
      expect(isVisible(els[0]), id).toBe(true);
      const column = id.includes("piano") ? "piano" : id.includes("guitar") ? "guitar" : "bass";
      expect(els[0].closest(`[data-s1="${column}"] .proto-a__inst-head`), `${id} in the ${column} head`).not.toBeNull();
    }
  });

  it("lists the 12 in src/prototype/aPrimeAccess.js (the list S1-20 walks), the ▶ and the position arrows as Dictionary-only", () => {
    const byFn = new Map(A_PRIME_ACCESS.map((f) => [f.fn, f]));
    for (const id of HEAD_FNS) {
      expect(byFn.has(id), id).toBe(true);
      expect(byFn.get(id).where, id).toBe("instruments");
    }
    for (const id of HEAD_FNS.filter((x) => x.includes("-play-") || x.includes("position-"))) {
      expect(byFn.get(id).needs, id).toBe("dictionary");
    }
    for (const id of HEAD_FNS.filter((x) => x.includes("-tuile-") || x.includes("octave-"))) {
      expect(byFn.get(id).needs, id).toBeUndefined();
    }
  });

  it("drops the captions from the heads: 'aigus ↑' and the neck's caption are the columns' title and accessible name", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    const T = translations.fr.protoA;
    for (const [id, caption] of [["piano", T.pianoCaption], ["guitar", T.neckCaption], ["bass", T.neckCaption]]) {
      const column = document.querySelector(`[data-s1="${id}"]`);
      expect(column.querySelector(".proto-a__inst-head").textContent, id).not.toContain(caption);
      expect(column.getAttribute("title"), id).toBe(caption);
      expect(column.getAttribute("aria-label"), id).toContain(caption);
    }
  });
});

describe("L1b-1b (b): ▶ plays its own instrument, the name only chooses it", () => {
  const lastPlay = () => {
    const calls = AudioEngine.playDictionaryNote.mock.calls;
    const [instrument, notes] = calls[calls.length - 1];
    return { instrument, notes };
  };

  it("the guitar's ▶ sounds the guitar's own grip (playInstrument('guitar')) and makes it the chosen instrument", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(fn("jouer.instrument-tuile-piano").getAttribute("aria-pressed")).toBe("true");
    await press(fn("jouer.instrument-play-guitar"));
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledTimes(1);
    expect(lastPlay()).toEqual({ instrument: "guitar", notes: ["C3", "E3", "G3", "C4", "E4"] });
    expect(fn("jouer.instrument-tuile-guitar").getAttribute("aria-pressed")).toBe("true");
    expect(fn("jouer.instrument-tuile-piano").getAttribute("aria-pressed")).toBe("false");
  });

  it("each ▶ sounds its own instrument, whichever was chosen before", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(fn("jouer.instrument-play-bass"));
    expect(lastPlay()).toEqual({ instrument: "bass", notes: ["C2", "G2", "C3"] });
    await press(fn("jouer.instrument-play-piano"));
    expect(lastPlay()).toEqual({ instrument: "piano", notes: ["C4", "E4", "G4"] });
  });

  it("the guitar's name only chooses it (nothing sounds); the transport's ▶ then plays the guitar", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(fn("jouer.instrument-tuile-guitar"));
    expect(AudioEngine.playDictionaryNote).not.toHaveBeenCalled();
    expect(fn("jouer.instrument-tuile-guitar").getAttribute("aria-pressed")).toBe("true");
    await press(fn("jouer.lecture"));
    expect(lastPlay()).toEqual({ instrument: "guitar", notes: ["C3", "E3", "G3", "C4", "E4"] });
  });
});

describe("L1b-1b (c): ‹ Position › steps through INST-B1's list, nut -> body, then back to auto", () => {
  it("Do majeur, guitar: open -> A shape -> E shape -> D shape -> auto; the bass does not move", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    const seen = [`${headLabel("guitar")} ${neckFrets("guitar")}`];
    for (let i = 0; i < 5; i++) {
      await press(fn("jouer.position-guitar-suiv"));
      seen.push(`${headLabel("guitar")} ${neckFrets("guitar")}`);
      expect(headLabel("bass")).toBe("Corde La (auto)");
      expect(neckFrets("bass")).toBe("3-5");
    }
    expect(seen).toEqual([
      "Open (auto) 0-3",
      "Open 0-3",
      "La-forme (fr. 3) 3-5",
      "Mi-forme (fr. 8) 8-10",
      "Ré-forme (fr. 10) 10-13",
      "Open (auto) 0-3",
    ]);
  });

  it("‹ goes the other way: from auto to the last shape (D, 10-13)", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(fn("jouer.position-guitar-prec"));
    expect(`${headLabel("guitar")} ${neckFrets("guitar")}`).toBe("Ré-forme (fr. 10) 10-13");
  });

  it("Do majeur, bass: its own list (A, E, D strings), the guitar does not move", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    const seen = [`${headLabel("bass")} ${neckFrets("bass")}`];
    for (let i = 0; i < 4; i++) {
      await press(fn("jouer.position-bass-suiv"));
      seen.push(`${headLabel("bass")} ${neckFrets("bass")}`);
      expect(`${headLabel("guitar")} ${neckFrets("guitar")}`).toBe("Open (auto) 0-3");
    }
    expect(seen).toEqual(["Corde La (auto) 3-5", "Corde La 3-5", "Corde Mi 8-10", "Corde Ré 10-12", "Corde La (auto) 3-5"]);
  });
});

describe("L1b-1b (d): ‹ Octave › in the Dictionary sets the piano alone", () => {
  it("octave +1: the piano reads 'Do5 – Sol5' (its notes +12), the guitar and the bass are UNCHANGED", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(headLabel("piano")).toBe("Do4 – Sol4");
    expect(pianoNotes()).toEqual([60, 64, 67]);
    await press(fn("jouer.octave-piano-suiv"));
    expect(headLabel("piano")).toBe("Do5 – Sol5");
    expect(pianoNotes()).toEqual([72, 76, 79]);
    expect(`${headLabel("guitar")} ${neckFrets("guitar")}`).toBe("Open (auto) 0-3");
    expect(`${headLabel("bass")} ${neckFrets("bass")}`).toBe("Corde La (auto) 3-5");
  });

  it("keeps a chosen guitar shape across an octave change", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(fn("jouer.position-guitar-suiv"));
    await press(fn("jouer.position-guitar-suiv"));
    expect(`${headLabel("guitar")} ${neckFrets("guitar")}`).toBe("La-forme (fr. 3) 3-5");
    await press(fn("jouer.octave-piano-prec"));
    expect(`${headLabel("guitar")} ${neckFrets("guitar")}`).toBe("La-forme (fr. 3) 3-5");
  });

  it("a scale: the octave neither moves the default box (C-06 cut in A′: the box of the octave 0) nor clears a chosen one", async () => {
    await renderApp("?prototype=a&scenario=cmajscale");
    const box = neckFrets("guitar");
    expect(box.startsWith("4-")).toBe(true);
    await press(fn("jouer.octave-piano-suiv"));
    expect(neckFrets("guitar")).toBe(box);
    await press(fn("jouer.position-guitar-suiv"));
    const chosen = `${headLabel("guitar")} ${neckFrets("guitar")}`;
    expect(chosen.startsWith("1 sur 5 0-")).toBe(true);
    await press(fn("jouer.octave-piano-suiv"));
    expect(`${headLabel("guitar")} ${neckFrets("guitar")}`).toBe(chosen);
  });

  it("stops at -3 and +3: the arrow is disabled at its bound", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    for (let i = 0; i < 3; i++) await press(fn("jouer.octave-piano-suiv"));
    expect(headLabel("piano")).toBe("Do7 – Sol7");
    expect(fn("jouer.octave-piano-suiv").disabled).toBe(true);
    expect(fn("jouer.octave-piano-prec").disabled).toBe(false);
    for (let i = 0; i < 6; i++) await press(fn("jouer.octave-piano-prec"));
    expect(headLabel("piano")).toBe("Do1 – Sol1");
    expect(fn("jouer.octave-piano-prec").disabled).toBe(true);
  });

  it("the drawer's own octave segment is the same setting: +1 there leaves the necks too", async () => {
    await renderApp("?prototype=a&scenario=cmaj&drawer=open");
    const plusOne = [...document.querySelectorAll(".proto-a__drawer-body .btn-segment")].find((b) => b.textContent.trim() === "+1");
    await press(plusOne);
    // Necks first: on main this is what fails (the guitar's default turns to
    // the A shape, 3-5), not only the missing head.
    expect(pianoNotes()).toEqual([72, 76, 79]);
    expect(neckFrets("guitar")).toBe("0-3");
    expect(neckFrets("bass")).toBe("3-5");
    expect(headLabel("piano")).toBe("Do5 – Sol5");
  });
});

describe("L1b-1b (f): the Studio — no ▶ in the heads, the shape shown without arrows, the piano's base octave", () => {
  it("has the three names and the piano's arrows, no ▶ and no position arrow", async () => {
    await renderApp("?prototype=a");
    for (const id of ["piano", "guitar", "bass"]) {
      expect(fn(`jouer.instrument-tuile-${id}`), id).not.toBeNull();
      expect(fn(`jouer.instrument-play-${id}`), id).toBeNull();
    }
    expect(fn("jouer.octave-piano-prec")).not.toBeNull();
    expect(fn("jouer.octave-piano-suiv")).not.toBeNull();
    for (const id of ["guitar", "bass"]) {
      expect(fn(`jouer.position-${id}-prec`), id).toBeNull();
      expect(fn(`jouer.position-${id}-suiv`), id).toBeNull();
      // The setting row is there even with no chord clicked: the head keeps its height.
      expect(document.querySelectorAll(`[data-s1="${id}"] .proto-a__inst-head > *`).length, id).toBe(2);
    }
  });

  it("with a chord clicked, the necks name the shape they show, read-only", async () => {
    await renderApp("?prototype=a&bench=1");
    await press(document.querySelector('[data-state="studio-oct2"]'));
    await settle();
    expect(headLabel("guitar")).toMatch(/\(auto\)$/);
    expect(headLabel("bass")).toMatch(/\(auto\)$/);
    expect(document.querySelectorAll('[data-s1="guitar"] .proto-a__inst-head button').length).toBe(1);
  });

  it("the piano's ‹ Octave › is the Studio's base octave: it moves the loop's and the MIDI export's octave, the label names it", async () => {
    await renderApp("?prototype=a");
    const seq = () => document.querySelector('[data-testid="sequencer-stub"]').getAttribute("data-octave");
    expect(seq()).toBe("0");
    expect(chordOctaveLabel()).toBe("Do4");
    await press(fn("jouer.octave-piano-suiv"));
    expect(seq()).toBe("1");
    expect(chordOctaveLabel()).toBe("Do5");
    await press(fn("jouer.octave-piano-prec"));
    await press(fn("jouer.octave-piano-prec"));
    expect(seq()).toBe("-1");
    expect(chordOctaveLabel()).toBe("Do3");
  });

  it("with a chord clicked, the arrow clears its notes like the Studio window's octave does (the next chord is voiced at the new octave)", async () => {
    await renderApp("?prototype=a&bench=1");
    await press(document.querySelector('[data-state="studio-oct2"]'));
    await settle();
    const seq = () => document.querySelector('[data-testid="sequencer-stub"]').getAttribute("data-octave");
    expect(seq()).toBe("2");
    expect(pianoNotes().length).toBeGreaterThan(0);
    expect(chordOctaveLabel()).toBe("Do6");
    await press(fn("jouer.octave-piano-prec"));
    expect(seq()).toBe("1");
    expect(chordOctaveLabel()).toBe("Do5");
    expect(pianoNotes()).toEqual([]);
  });

  it("the name chooses the instrument in the Studio too (the one a clicked chord sounds on)", async () => {
    await renderApp("?prototype=a");
    await press(fn("jouer.instrument-tuile-bass"));
    expect(fn("jouer.instrument-tuile-bass").getAttribute("aria-pressed")).toBe("true");
    expect(AudioEngine.playDictionaryNote).not.toHaveBeenCalled();
  });
});

describe("L1b-1b (g): the heads' words come from translations.js, in four languages", () => {
  const NEW_KEYS = ["play", "chooseInstrument", "octaveGroup", "octaveDown", "octaveUp", "positionGroup", "positionPrev", "positionNext"];

  it("has the heads' keys in FR, EN, PT and ZH, the same in the four, none empty", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const T = translations[lang].protoA;
      for (const k of NEW_KEYS) {
        expect(typeof T[k] === "string" && T[k].trim().length > 0, `${lang} ${k}`).toBe(true);
      }
    }
  });

  it("names its controls in English once the page is in English", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    fireEvent.change(document.querySelector('[data-fn="nav.langue"] select'), { target: { value: "en" } });
    await settle();
    const en = translations.en.protoA;
    expect(fn("jouer.instrument-play-guitar").getAttribute("aria-label")).toBe(`${en.play} — ${en.guitar}`);
    expect(fn("jouer.octave-piano-suiv").getAttribute("aria-label")).toBe(en.octaveUp);
    expect(fn("jouer.position-bass-prec").getAttribute("aria-label")).toBe(en.positionPrev);
    expect(fn("jouer.instrument-tuile-guitar").textContent.trim()).toBe(en.guitar);
  });
});
