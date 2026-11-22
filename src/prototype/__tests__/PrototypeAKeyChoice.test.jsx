// VMU-219 — the loop's key and the seven chords of the key (A′, ?prototype=a).
//
// A ‹ Ré › control sits next to the style in the selection row; it transposes
// the loop and keeps the style's mode. Under the row, seven pills: the chords of
// the key with their Roman numeral; a touch plays the chord and shows it on the
// instrument, without changing the loop.
//
// The whole app is rendered (AppDesktop with ?prototype=a), as in
// PrototypeAChordOctave.test.jsx. The sequencer stub shows the key and the
// chord roots of the document it is handed (what the loop plays, what the
// export is named from); the piano's notes are read from data-s1-notes.
//
// Domain values: pitch classes, C = 0; the first style (BRICKS[0]) is Do
// major, 1 5 6- 4. Do -> Ré is +2, Do -> Si is -1 (a wrap).
//
// RED FIRST (VMU-219): the control, the pills and their words do not exist on main.
import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

const playMock = vi.hoisted(() => vi.fn());

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
  playDictionaryNote: playMock,
  setBpm: vi.fn(),
  initAudio: vi.fn(),
  setMasterVolume: vi.fn(),
  masterAnalyser: { getValue: () => new Float32Array(8) },
}));

vi.mock("../../components/Visualizer/AudioVisualizer", () => ({ default: () => <div data-testid="mock-visualizer" /> }));
vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({
  default: (props) => (
    <div
      data-testid="sequencer-stub"
      data-key={String(props.timeline?.key?.rootValue)}
      data-chord-roots={(props.timeline?.chords || []).slice(0, 4).map((c) => c.rootPc).join(",")}
    />
  ),
}));

import React, { Suspense } from "react";
import { render, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { BRICKS } from "../../core/bricks";
import { savePersisted } from "../../utils/persistedState";
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

const FN_PREV = "composer.tonalite-prec";
const FN_NEXT = "composer.tonalite-suiv";
const FN_PILLS = "composer.accords-tonalite";
const inRow = (id) => document.querySelectorAll(`[data-s1="selection"] [data-fn="${id}"]`);
const field = () => document.querySelector('[data-testid="selection-key"]');
const fieldLabel = () => {
  const el = field() && field().querySelector(".proto-a__head-label");
  return el ? el.textContent.trim() : null;
};
const loopKey = () => document.querySelector('[data-testid="sequencer-stub"]').getAttribute("data-key");
const loopRoots = () => document.querySelector('[data-testid="sequencer-stub"]').getAttribute("data-chord-roots");
const pills = () => [...document.querySelectorAll('[data-testid="key-chords"] button')];
const pillNames = () => pills().map((p) => p.querySelector(".proto-a__keychord-name").textContent.trim());
const pillRomans = () => pills().map((p) => p.querySelector(".proto-a__keychord-roman").textContent.trim());
const caption = () => document.querySelector('[data-testid="key-chord-phrase"]');
const pianoNotes = () =>
  (document.querySelector('[data-s1="piano"]').getAttribute("data-s1-notes") || "").split(" ").filter(Boolean).map(Number);
const pcs = (notes) => [...new Set(notes.map((n) => n % 12))].sort((a, b) => a - b);
const next = () => document.querySelector(`[data-s1="selection"] [data-fn="${FN_NEXT}"]`);
const prev = () => document.querySelector(`[data-s1="selection"] [data-fn="${FN_PREV}"]`);

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("VMU-219 (a): the key control sits next to the style, in the selection row", () => {
  it("shows the style's own tonic first, once, with its arrows registered once each", async () => {
    await renderApp("?prototype=a");
    expect(field(), "the key field").not.toBeNull();
    expect(field().closest('[data-s1="selection"]')).not.toBeNull();
    expect(fieldLabel()).toBe("Do");
    expect(inRow(FN_PREV).length).toBe(1);
    expect(inRow(FN_NEXT).length).toBe(1);
    expect(document.querySelectorAll(`[data-fn="${FN_PREV}"]`).length).toBe(1);
    // next to the style: the same flex row, the style field first
    const row = field().parentElement;
    expect([...row.children].indexOf(row.querySelector(".proto-a__field--style"))).toBeLessThan([...row.children].indexOf(field()));
  });

  it("is absent from the Dictionary", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    expect(field()).toBeNull();
    expect(document.querySelector('[data-testid="key-chords"]')).toBeNull();
  });
});

describe("VMU-219 (b): the key transposes the loop, one source for what is shown and what plays", () => {
  it("› moves the loop's key and chords by a semitone and the label with it; ‹ wraps below Do to Si", async () => {
    await renderApp("?prototype=a");
    expect(loopKey()).toBe("0");
    expect(loopRoots()).toBe("0,7,9,5");
    await press(next());
    await press(next());
    expect(fieldLabel()).toBe("Ré");
    expect(loopKey()).toBe("2");
    expect(loopRoots()).toBe("2,9,11,7");
    await press(prev());
    await press(prev());
    await press(prev());
    expect(fieldLabel()).toBe("Si");
    expect(loopKey()).toBe("11");
    expect(loopRoots()).toBe("11,6,8,4");
  });

  it("names the key in the page's notation: letters in US, solfege in EU", async () => {
    await renderApp("?prototype=a");
    await press(next());
    await press(next());
    expect(fieldLabel()).toBe("Ré");
    await press(document.querySelector('[data-fn="nav.noms-notes-us"]'));
    expect(fieldLabel()).toBe("D");
  });

  it("keeps the chosen key when the style changes", async () => {
    await renderApp("?prototype=a");
    await press(next());
    await press(next());
    await press(document.querySelector('[data-fn="composer.style"] .custom-select-header'));
    const items = [...document.querySelectorAll(".custom-select-body .select-item")];
    expect(items.length).toBeGreaterThan(1);
    await press(items[1]);
    expect(fieldLabel()).toBe("Ré");
    expect(loopKey()).toBe("2");
  });

  it("follows the style's own tonic when the key was never chosen", async () => {
    const other = BRICKS.findIndex((b) => b.rootValue !== 0);
    savePersisted({ brickId: BRICKS[other].name.en });
    await renderApp("?prototype=a");
    expect(fieldLabel()).toBe(["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"][BRICKS[other].rootValue]);
    expect(loopKey()).toBe(String(BRICKS[other].rootValue));
  });
});

describe("VMU-219 (c): the seven chords of the key", () => {
  it("shows seven pills with the chord's name and Roman numeral — Do major: C Dm Em F G Am Bdim (EU names)", async () => {
    await renderApp("?prototype=a");
    expect(pills()).toHaveLength(7);
    expect(pillNames()).toEqual(["Do", "Rém", "Mim", "Fa", "Sol", "Lam", "Sidim"]);
    expect(pillRomans()).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(document.querySelector('[data-testid="key-chords"]').getAttribute("data-fn")).toBe(FN_PILLS);
    expect(document.querySelectorAll(`[data-fn="${FN_PILLS}"]`).length).toBe(1);
  });

  it("follows the key: in Fa (+5) the chords are F Gm Am Bb C Dm Edim", async () => {
    await renderApp("?prototype=a");
    for (let i = 0; i < 5; i++) await press(next());
    expect(fieldLabel()).toBe("Fa");
    expect(pillNames()).toEqual(["Fa", "Solm", "Lam", "La#", "Do", "Rém", "Midim"]);
    expect(pillRomans()).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
  });

  it("a touch plays the chord and shows it on the piano — and leaves the loop as it is", async () => {
    await renderApp("?prototype=a");
    for (let i = 0; i < 2; i++) await press(next());
    const loopBefore = { key: loopKey(), roots: loopRoots() };
    await press(pills()[4]); // V of Ré: A major, A C# E
    expect(playMock).toHaveBeenCalled();
    expect(pcs(pianoNotes())).toEqual([1, 4, 9]);
    expect(loopKey()).toBe(loopBefore.key);
    expect(loopRoots()).toBe(loopBefore.roots);
  });

  it("every pill is a button carrying the class whose CSS holds the 44 px finger floor", async () => {
    await renderApp("?prototype=a");
    pills().forEach((p) => {
      expect(p.tagName).toBe("BUTTON");
      expect(p.classList.contains("proto-a__keychord")).toBe(true);
    });
  });

  it("changing the key clears a clicked chord: the piano shows the NEW key's tonic triad, not the old chord", async () => {
    await renderApp("?prototype=a");
    await press(pills()[0]);
    expect(pcs(pianoNotes())).toEqual([0, 4, 7]); // C major, the clicked I
    await press(next());
    expect(pcs(pianoNotes())).toEqual([1, 5, 8]); // C# major: the default triad of the new key
  });
});

describe("VMU-219 (d): a beginner's sentence for each chord, in four languages", () => {
  it("has seven phrases for a major and for a minor tonic in FR, EN, PT, ZH, none empty, none repeated", () => {
    for (const lang of ["fr", "en", "pt", "zh"]) {
      const T = translations[lang].protoA;
      for (const mode of ["major", "minor"]) {
        const list = T.keyChordPhrases?.[mode];
        expect(Array.isArray(list) && list.length === 7, `${lang} ${mode}`).toBe(true);
        list.forEach((s) => expect(typeof s === "string" && s.trim().length > 0, `${lang} ${mode}`).toBe(true));
        expect(new Set(list).size, `${lang} ${mode} distinct`).toBe(7);
      }
      for (const k of ["keyGroupLabel", "keyHelp", "keyDown", "keyUp", "keyChordsAria", "keyChordsLabel", "keyChordHint"]) {
        expect(typeof T[k] === "string" && T[k].trim().length > 0, `${lang} ${k}`).toBe(true);
      }
    }
    expect(translations.fr.protoA.keyChordPhrases.major[0]).toBe("la maison, on s'y repose");
    expect(translations.fr.protoA.keyChordPhrases.major[4]).toBe("la tension qui veut rentrer");
  });

  it("the touched pill's sentence is shown (and is the pill's tooltip): 'I : la maison, on s'y repose'", async () => {
    await renderApp("?prototype=a");
    await press(pills()[0]);
    expect(caption().textContent.trim()).toBe("I : la maison, on s'y repose");
    expect(pills()[0].getAttribute("title")).toBe("I : la maison, on s'y repose");
    await press(pills()[4]);
    expect(caption().textContent.trim()).toBe("V : la tension qui veut rentrer");
  });

  it("a minor style reads the minor sentences", async () => {
    const minor = BRICKS.findIndex((b) => b.scaleKey === "scale_minor");
    expect(minor).toBeGreaterThan(0);
    savePersisted({ brickId: BRICKS[minor].name.en });
    await renderApp("?prototype=a");
    await press(pills()[0]);
    expect(caption().textContent.trim()).toBe(`${pillRomans()[0]} : ${translations.fr.protoA.keyChordPhrases.minor[0]}`);
    expect(pillRomans()[0]).toBe("i");
  });

  it("speaks English once the page is in English", async () => {
    await renderApp("?prototype=a");
    fireEvent.change(document.querySelector('[data-fn="nav.langue"] select'), { target: { value: "en" } });
    await settle();
    const en = translations.en.protoA;
    expect(field().textContent).toContain(en.keyGroupLabel);
    expect(field().getAttribute("title")).toBe(en.keyHelp);
    await press(pills()[0]);
    expect(caption().textContent.trim()).toBe(`I : ${en.keyChordPhrases.major[0]}`);
  });
});
