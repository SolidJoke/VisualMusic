// C-106 (Step 3b, part 2) — below 2560 px, A′'s header is compact.
// From 1648 to 2559 px the page has one instrument column (C-104); its header
// no longer fits the fixed 251px mode tabs plus the four classic controls, so:
//   - the tabs take the width of their text (same height, look and data-fn);
//   - Guide d'utilisation, Guide & Théorie, the language and À propos (Debug in
//     the development build) move into one "Aide et réglages" menu, opened by a
//     button in the place the header actions had, before the Assistant button.
// At 2560 px and wider the header's DOM and look are unchanged: the same
// HeaderActions directly in `.proto-a__header-actions`.
//
// The whole app is rendered (AppDesktop with ?prototype=a, as
// PrototypeASingleColumn.test.jsx does). window.matchMedia is mocked per test:
// below, the 2560 query does NOT match; the last test keeps the setup file's
// default mock (it matches) and is restored after each test.
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

async function renderApp(search = "?prototype=a", { threeColumns = false, viewport = true } = {}) {
  if (viewport) mockViewport(threeColumns);
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
const countFn = (id) => document.querySelectorAll(`[data-fn="${id}"]`).length;
const helpButton = () => fn("nav.aide-reglages");
// The four controls that must be in the page only while the menu is open.
const MENU_FNS = ["aide.guide", "aide.theorie", "nav.langue", "aide.a-propos"];

/** Open the language list (CustomSelect's visible field) and return its portaled body. */
async function openLanguageList() {
  const field = fn("nav.langue").querySelector(".custom-select-header");
  await press(field);
  const body = document.querySelector('[data-testid="custom-select-dropdown"]');
  expect(body, "the portaled language list").not.toBeNull();
  return body;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  window.matchMedia = defaultMatchMedia;
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("C-106: below 2560 px, the header is compact", () => {
  it("shows one 'Aide et réglages' button and none of the four controls until it is opened", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    const button = helpButton();
    expect(button).not.toBeNull();
    expect(button.tagName).toBe("BUTTON");
    expect(button.textContent.trim()).toBe(T.helpSettings);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    for (const id of MENU_FNS) expect(countFn(id), id).toBe(0);
  });

  it("opens on a click: aria-expanded true, and the four controls once each", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(helpButton());

    expect(helpButton().getAttribute("aria-expanded")).toBe("true");
    for (const id of MENU_FNS) expect(countFn(id), id).toBe(1);
  });

  it("closes on Escape and gives the focus back to the button", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(helpButton());
    expect(countFn("aide.guide")).toBe(1);

    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });
    await settle();

    expect(countFn("aide.guide")).toBe(0);
    expect(helpButton().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(helpButton());
  });

  it("closes after an About click, and the About window is the one shown", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(helpButton());
    await press(fn("aide.a-propos"));

    expect(fn("aide.a-propos")).toBeNull();
    expect(helpButton().getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".modal-content")).not.toBeNull();
  });

  it("stays open after a language change, and its button follows the language", async () => {
    await renderApp("?prototype=a&scenario=cmaj");
    await press(helpButton());

    const body = await openLanguageList();
    const english = [...body.querySelectorAll(".select-item")].find((el) => el.textContent.includes("EN"));
    expect(english, "the English option").toBeDefined();
    // A real press on the portaled list sends pointerdown first; it must not
    // count as "outside" the menu (or the list would close it before setLang).
    await act(async () => {
      fireEvent.pointerDown(english);
      fireEvent.click(english);
    });
    await settle();

    for (const id of MENU_FNS) expect(countFn(id), id).toBe(1);
    expect(helpButton().getAttribute("aria-expanded")).toBe("true");
    expect(helpButton().textContent.trim()).toBe(translations.en.protoA.helpSettings);
    expect(helpButton().textContent.trim()).toBe("Help & settings");
  });

  it("marks the page as compact, which is what lets the tabs take their text width", async () => {
    const root = await renderApp("?prototype=a&scenario=cmaj");
    expect(root.classList.contains("proto-a--compact")).toBe(true);
    expect(root.querySelectorAll(".proto-a__tab")).toHaveLength(2);
  });
});

describe("C-106: at 2560 px and wider, the header is unchanged", () => {
  it("has no 'Aide et réglages' button and keeps the four controls in .proto-a__header-actions", async () => {
    const root = await renderApp("?prototype=a&scenario=cmaj", { viewport: false });
    expect(root.classList.contains("proto-a--compact")).toBe(false);
    expect(helpButton()).toBeNull();

    const actions = document.querySelector(".proto-a__header-actions");
    expect(actions).not.toBeNull();
    for (const id of MENU_FNS) {
      expect(countFn(id), id).toBe(1);
      expect(actions.querySelector(`[data-fn="${id}"]`), id).not.toBeNull();
    }
  });
});
