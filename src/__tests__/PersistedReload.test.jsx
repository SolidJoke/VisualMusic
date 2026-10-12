// VMU-050 (first slice) - the app reopens on the last selection.
//
// "Reopening" is unmounting the application and mounting it again over the
// same localStorage (jsdom keeps it between the two renders; setupTests.js
// empties it before each TEST, so each test starts as a fresh browser).
//
// What is kept: mode, language, notation, played instrument, the Studio's style
// (by its name) and base octave, the Dictionary's root, type and octave. What
// is NOT kept, on purpose (slice 2): tempo, volume, metronome, and the edits
// (progression, rhythm, drums, bass line) - asserted below, so the day it
// changes it changes on purpose.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import AppDesktop from "../AppDesktop";
import { AppProvider } from "../context/AppContext";
import { BRICKS } from "../core/bricks";
import { STORAGE_KEY } from "../utils/persistedState";

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
    Transport: transport,
    getTransport: () => transport,
    Draw: { schedule: vi.fn() },
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
    Analyser: vi.fn(() => ({ dispose: vi.fn() })),
  };
});

vi.mock("../audio/AudioEngine", () => ({
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
  masterAnalyser: {},
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="mock-visualizer">Visualizer Mock</div>,
}));

// Spies are restored one by one: vi.restoreAllMocks() would also wipe the
// matchMedia mock setupTests.js installs once for the whole file.
let spies = [];
const track = (spy) => {
  spies.push(spy);
  return spy;
};
let errorSpy;
let warnSpy;
beforeEach(() => {
  vi.clearAllMocks();
  errorSpy = track(vi.spyOn(console, "error").mockImplementation(() => {}));
  warnSpy = track(vi.spyOn(console, "warn").mockImplementation(() => {}));
});
afterEach(() => {
  cleanup();
  spies.forEach((s) => s.mockRestore());
  spies = [];
});

function mount() {
  return render(
    <AppProvider>
      <AppDesktop />
    </AppProvider>,
  );
}

/** Closes the application and opens it again, as a reload does. */
function reload(view) {
  view.unmount();
  return mount();
}

const plant = (value) => window.localStorage.setItem(STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));
// The classic page shows the Studio / Dictionary panel in the "Studio & Harmonie" window.
const openWindow = () => fireEvent.click(screen.getByText(/Studio & Harmonie/i));
const openStudio = () => {
  openWindow();
  return screen.getByTestId("studio-panel");
};
const styleSelect = (panel) => panel.querySelector("select");
const octaveSelect = (panel) =>
  [...panel.querySelectorAll("select")].find((s) => [...s.options].some((o) => o.textContent === "C4"));
const rootSelect = () => document.querySelector('[data-testid="select-root-note"]');
const notationToggle = () => screen.getByTestId("header-notation-toggle");
const langSelect = () => document.querySelector(".header-lang-select select");

describe("VMU-050 - a fresh browser opens on the defaults", () => {
  it("studio, French, EU notation, the first style, root C", () => {
    mount();
    expect(screen.getByTestId("btn-mode-studio").className).toMatch(/\bactive\b/);
    expect(notationToggle().textContent).toBe("EU (Do, Ré)");
    expect(langSelect().value).toBe("fr");
    expect(styleSelect(openStudio()).value).toBe("0");
  });
});

describe("VMU-050 - the Dictionary reopens as it was left", () => {
  it("mode, language, notation, root, family and octave", () => {
    const view = mount();
    openWindow();
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    fireEvent.change(rootSelect(), { target: { value: "7" } });
    fireEvent.click(screen.getAllByRole("button", { name: /Accords/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "+2" }));
    fireEvent.click(notationToggle());
    fireEvent.change(langSelect(), { target: { value: "en" } });
    expect(notationToggle().textContent).toBe("US (A, B, C)");
    expect(rootSelect().value).toBe("7");

    reload(view);
    openWindow();

    expect(screen.getByTestId("dictionary-panel")).toBeTruthy();
    expect(rootSelect().value).toBe("7");
    expect(notationToggle().textContent).toBe("US (A, B, C)");
    expect(langSelect().value).toBe("en");
    // The chord family (a chord type, not the single note) and the octave +2.
    expect(screen.getByRole("button", { name: "+2" }).className).toMatch(/btn-segment--active/);
    const activeFamily = document.querySelector(".btn-segment-group .btn-segment--active");
    expect(activeFamily.textContent).toMatch(/Chord/i);
  });
});

describe("VMU-050 - the Studio reopens as it was left", () => {
  it("style (by name) and base octave", () => {
    const view = mount();
    const panel = openStudio();
    fireEvent.change(styleSelect(panel), { target: { value: "5" } });
    fireEvent.change(octaveSelect(panel), { target: { value: "2" } });
    expect(styleSelect(panel).value).toBe("5");

    reload(view);

    const again = openStudio();
    expect(styleSelect(again).value).toBe("5");
    expect(octaveSelect(again).value).toBe("2");
  });

  it("finds a style by its name in the stored object", () => {
    plant({ v: 1, brickId: BRICKS[7].name.en });
    mount();
    expect(styleSelect(openStudio()).value).toBe("7");
  });

  it("does not read a stored number as a style (an index would drift with the list)", () => {
    plant({ v: 1, brickId: 7, currentBrickIndex: 7 });
    mount();
    expect(styleSelect(openStudio()).value).toBe("0");
  });

  it("ignores a style that no longer exists and keeps the rest", () => {
    plant({ v: 1, brickId: "A Style Removed Last Year", lang: "en" });
    mount();
    expect(styleSelect(openStudio()).value).toBe("0");
    expect(langSelect().value).toBe("en");
  });

  it("keeps the style's own tempo law: the badge shows the style's tempo, not a stored one", () => {
    plant({ v: 1, brickId: BRICKS[7].name.en, bpm: 55, tempo: 55, currentBpm: 55 });
    mount();
    expect(screen.queryByText(/^55$/)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).not.toHaveProperty("bpm");
  });
});

describe("VMU-050 - what is kept, what is not", () => {
  it("writes only the kept fields, and no edit", () => {
    const view = mount();
    openStudio();
    fireEvent.click(screen.getByRole("button", { name: "II-V-I" }));
    reload(view);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(Object.keys(stored).sort()).toEqual(
      [
        "appMode",
        "brickId",
        "chordOctaveOffset",
        "dictOctave",
        "dictRoot",
        "dictType",
        "lang",
        "notation",
        "playbackInstrument",
        "v",
      ].sort(),
    );
    // The edit is not brought back (slice 2).
    openStudio();
    expect(screen.getByRole("button", { name: "II-V-I" }).className).not.toMatch(/\bactive\b/);
  });
});

describe("VMU-050 - a damaged memory never stops the app", () => {
  it("corrupted JSON opens on the defaults, with no error in the console", () => {
    plant("{broken");
    mount();
    expect(screen.getByTestId("btn-mode-studio").className).toMatch(/\bactive\b/);
    expect(langSelect().value).toBe("fr");
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("an unknown version opens on the defaults", () => {
    plant({ v: 99, appMode: "dictionary", lang: "en" });
    mount();
    expect(screen.getByTestId("btn-mode-studio").className).toMatch(/\bactive\b/);
    expect(langSelect().value).toBe("fr");
  });

  it("an out-of-range octave is ignored and the other fields still apply", () => {
    plant({ v: 1, appMode: "dictionary", lang: "en", dictOctave: 17, dictRoot: 5 });
    mount();
    openWindow();
    expect(screen.getByTestId("dictionary-panel")).toBeTruthy();
    expect(langSelect().value).toBe("en");
    expect(rootSelect().value).toBe("5");
    expect(screen.getByRole("button", { name: "0" }).className).toMatch(/btn-segment--active/);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("a storage that throws on every read leaves the app on the defaults", () => {
    track(vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    }));
    mount();
    expect(screen.getByTestId("btn-mode-studio").className).toMatch(/\bactive\b/);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("a storage that refuses every write still lets the app work", () => {
    track(vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    }));
    mount();
    openWindow();
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    expect(screen.getByTestId("dictionary-panel")).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
