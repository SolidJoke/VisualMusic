// VMU-126 - ask before a change of style or of mode wipes the user's edits.
//
// Changing the Studio's style, or the mode, clears what the user built on top
// of the style: the progression (a Quick Start), the rhythm, the drums, the
// suggested bass line (AppDesktop.jsx, the effect on [currentBrickIndex,
// appMode, activeBrick]). It did so without a word. Now, when at least one of
// those exists, a request to change opens a confirmation first; "Garder mes
// modifications" (the safe choice, the default) leaves everything as it was.
//
// The page rendered here is the classic one (setupTests.js keeps it by default):
// the sidebar's mode buttons and the "Studio & Harmonie" window's style menu
// go through the same two requests A′ gets (its header tabs and its selection
// row). That A′ really hands them over is held by PrototypeAConfirmWiring and
// measured in Chromium by s1:probe (S1-24).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import React from "react";
import AppDesktop from "../AppDesktop";
import { AppProvider } from "../context/AppContext";
import { BRICKS } from "../core/bricks";

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

const KEEP = /Garder mes modifications/;
const CHANGE_STYLE = { name: "Changer de style" };
const CHANGE_MODE = { name: "Changer de mode" };

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

function renderApp() {
  render(
    <AppProvider>
      <AppDesktop />
    </AppProvider>,
  );
}

/** The "Studio & Harmonie" window, where the style menu and the Quick Starts are. */
function openStudio() {
  fireEvent.click(screen.getByText(/Studio & Harmonie/i));
  return screen.getByTestId("studio-panel");
}

/** Creates an edit: loads a Quick Start progression. Returns its button. */
function makeAnEdit() {
  const quickStart = screen.getByRole("button", { name: "II-V-I" });
  expect(quickStart.className).not.toMatch(/\bactive\b/);
  fireEvent.click(quickStart);
  expect(screen.getByRole("button", { name: "II-V-I" }).className).toMatch(/\bactive\b/);
}

const quickStartLoaded = () => /\bactive\b/.test(screen.getByRole("button", { name: "II-V-I" }).className);

/** The style menu's hidden native select (CustomSelect keeps one for accessibility). */
const styleSelect = (panel) => panel.querySelector("select");
const styleIndex = (panel) => Number(styleSelect(panel).value);

function chooseStyle(panel, index) {
  fireEvent.change(styleSelect(panel), { target: { value: String(index) } });
}

const dialog = () => screen.queryByRole("alertdialog");

describe("VMU-126 - no edit, no question", () => {
  it("changes the style at once", () => {
    renderApp();
    const panel = openStudio();
    chooseStyle(panel, 3);
    expect(dialog()).toBeNull();
    expect(styleIndex(panel)).toBe(3);
  });

  it("changes the mode at once", () => {
    renderApp();
    openStudio();
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    expect(dialog()).toBeNull();
    expect(screen.getByTestId("dictionary-panel")).toBeTruthy();
  });
});

describe("VMU-126 - an edit exists, a change of style asks first", () => {
  it("opens the confirmation instead of changing the style", () => {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    chooseStyle(panel, 3);
    const box = dialog();
    expect(box).not.toBeNull();
    expect(within(box).getByText("Changer de style ?")).toBeTruthy();
    expect(within(box).getByText(/Tu as modifié la progression, le rythme ou la batterie\. Changer de style efface ces modifications\./)).toBeTruthy();
    expect(styleIndex(panel)).toBe(0);
    expect(quickStartLoaded()).toBe(true);
  });

  it("is a labelled, modal alertdialog", () => {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    chooseStyle(panel, 3);
    const box = dialog();
    expect(box.getAttribute("aria-modal")).toBe("true");
    const title = document.getElementById(box.getAttribute("aria-labelledby"));
    const body = document.getElementById(box.getAttribute("aria-describedby"));
    expect(title.textContent).toBe("Changer de style ?");
    expect(body.textContent).toMatch(/efface ces modifications/);
  });

  it("'Garder mes modifications' keeps the style AND the edit", () => {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    chooseStyle(panel, 3);
    fireEvent.click(within(dialog()).getByRole("button", { name: KEEP }));
    expect(dialog()).toBeNull();
    expect(styleIndex(panel)).toBe(0);
    expect(quickStartLoaded()).toBe(true);
  });

  it("'Changer de style' applies the style and clears the edit", () => {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    chooseStyle(panel, 3);
    fireEvent.click(within(dialog()).getByRole("button", CHANGE_STYLE));
    expect(dialog()).toBeNull();
    expect(styleIndex(panel)).toBe(3);
    expect(quickStartLoaded()).toBe(false);
  });

  it("choosing the style already in use asks nothing and changes nothing", () => {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    // Through the open list, on the item that is already selected.
    fireEvent.click(panel.querySelector(".custom-select-header"));
    fireEvent.click(document.querySelector(".custom-select-body .select-item.selected"));
    expect(dialog()).toBeNull();
    expect(styleIndex(panel)).toBe(0);
    expect(quickStartLoaded()).toBe(true);
  });
});

describe("VMU-126 - an edit exists, a change of mode asks first", () => {
  it("opens the confirmation instead of changing the mode", () => {
    renderApp();
    openStudio();
    makeAnEdit();
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    const box = dialog();
    expect(box).not.toBeNull();
    expect(within(box).getByText("Changer de mode ?")).toBeTruthy();
    expect(within(box).getByText(/Changer de mode efface ces modifications\./)).toBeTruthy();
    expect(screen.getByTestId("studio-panel")).toBeTruthy();
    expect(screen.queryByTestId("dictionary-panel")).toBeNull();
  });

  it("'Garder mes modifications' stays in the mode with the edit", () => {
    renderApp();
    openStudio();
    makeAnEdit();
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    fireEvent.click(within(dialog()).getByRole("button", { name: KEEP }));
    expect(dialog()).toBeNull();
    expect(screen.getByTestId("studio-panel")).toBeTruthy();
    expect(screen.queryByTestId("dictionary-panel")).toBeNull();
    expect(quickStartLoaded()).toBe(true);
  });

  it("'Changer de mode' switches and the edit is gone on coming back", () => {
    renderApp();
    openStudio();
    makeAnEdit();
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    fireEvent.click(within(dialog()).getByRole("button", CHANGE_MODE));
    expect(dialog()).toBeNull();
    expect(screen.getByTestId("dictionary-panel")).toBeTruthy();
    // Back in the Studio, nothing to lose: no question, and no edit left.
    fireEvent.click(screen.getByTestId("btn-mode-studio"));
    expect(dialog()).toBeNull();
    expect(screen.getByTestId("studio-panel")).toBeTruthy();
    expect(quickStartLoaded()).toBe(false);
  });

  it("asking for the mode already in use asks nothing", () => {
    renderApp();
    openStudio();
    makeAnEdit();
    fireEvent.click(screen.getByTestId("btn-mode-studio"));
    expect(dialog()).toBeNull();
    expect(quickStartLoaded()).toBe(true);
  });
});

describe("VMU-126 - how the box behaves", () => {
  function openTheBox() {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    chooseStyle(panel, 3);
    return panel;
  }

  it("puts the focus on the safe choice", () => {
    openTheBox();
    expect(document.activeElement).toBe(within(dialog()).getByRole("button", { name: KEEP }));
  });

  it("Escape keeps", () => {
    const panel = openTheBox();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(dialog()).toBeNull();
    expect(styleIndex(panel)).toBe(0);
    expect(quickStartLoaded()).toBe(true);
  });

  it("a click outside the box keeps", () => {
    const panel = openTheBox();
    fireEvent.click(screen.getByTestId("confirm-dialog-overlay"));
    expect(dialog()).toBeNull();
    expect(styleIndex(panel)).toBe(0);
    expect(quickStartLoaded()).toBe(true);
  });

  it("a click inside the box does not close it", () => {
    openTheBox();
    fireEvent.click(dialog());
    expect(dialog()).not.toBeNull();
  });

  it("Escape does not also close the window under it", () => {
    openTheBox();
    fireEvent.keyDown(document.activeElement, { key: "Escape" });
    expect(screen.getByTestId("studio-panel")).toBeTruthy();
  });

  it("gives the focus back to the control it came from", () => {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    const quickStart = screen.getByRole("button", { name: "II-V-I" });
    quickStart.focus();
    chooseStyle(panel, 3);
    expect(document.activeElement).not.toBe(quickStart);
    fireEvent.click(within(dialog()).getByRole("button", { name: KEEP }));
    expect(document.activeElement).toBe(quickStart);
  });

  it("keeps Tab inside the box", () => {
    openTheBox();
    const keep = within(dialog()).getByRole("button", { name: KEEP });
    const change = within(dialog()).getByRole("button", CHANGE_STYLE);
    change.focus();
    fireEvent.keyDown(change, { key: "Tab" });
    expect(document.activeElement).toBe(keep);
    fireEvent.keyDown(keep, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(change);
  });

  it("the global shortcuts wait while it is open, and work again after", () => {
    renderApp();
    openStudio();
    makeAnEdit();
    fireEvent.click(screen.getByTestId("btn-mode-dictionary"));
    expect(within(dialog()).getByText("Changer de mode ?")).toBeTruthy();
    // 'd' asks for the Dictionary again: the box stays as it is, nothing applies.
    fireEvent.keyDown(document.activeElement, { key: "d" });
    expect(screen.queryByTestId("dictionary-panel")).toBeNull();
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    fireEvent.click(within(dialog()).getByRole("button", { name: KEEP }));
    // After: the shortcut is alive again (and, the edit still there, it asks).
    fireEvent.keyDown(document.body, { key: "d" });
    expect(within(dialog()).getByText("Changer de mode ?")).toBeTruthy();
  });
});

describe("VMU-126 - what counts as an edit", () => {
  it("a style no edit touched stays free to change after an edit was cleared", () => {
    renderApp();
    const panel = openStudio();
    makeAnEdit();
    fireEvent.click(screen.getByRole("button", { name: /Reset/ }));
    expect(quickStartLoaded()).toBe(false);
    chooseStyle(panel, 3);
    expect(dialog()).toBeNull();
    expect(styleIndex(panel)).toBe(3);
  });

  it("the data this file relies on is there (a style 3 different from style 0)", () => {
    expect(BRICKS.length).toBeGreaterThan(3);
  });
});
