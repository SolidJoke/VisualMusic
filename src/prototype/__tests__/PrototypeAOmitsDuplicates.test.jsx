// VMU-216 — A′ (?prototype=a) omits the nine duplicated controls: each is
// reachable directly elsewhere (SelectionRow, the piano head, the transport),
// so the drawer's and the Audio window's copies are gone. This file renders the
// whole app (AppDesktop with ?prototype=a) and checks the OMISSION end-to-end:
// the drawer (Studio, then Dictionary Chords / Scales) and Instruments & Audio
// show none of the nine, while everything that must stay (the target-notes
// selector, the recommended scales, the substitutions, the position selectors,
// the harmonic-mode toggle, the six faders, Shell Voicings, the finger-number
// labels, the Assistant button and the drawer's Fermer) is still there.
//
// The classic page's copies are asserted in ClassicPageDuplicates.test.jsx
// (rendering the panels without the omitDirect prop, since one file cannot
// render both pages: src/layout.js reads the URL once at module load).
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
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { AppProvider } from "../../context/AppContext";
import AppDesktop from "../../AppDesktop";
import { translations } from "../../i18n/translations";

const FR = translations.fr;

// A′ is a React.lazy chunk: one explicit, large wait for the dynamic import.
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
  return document.querySelector('[data-prototype="a"]');
}

const fn = (id) => document.querySelector(`[data-fn="${id}"]`);

/** The nine duplicated controls A′ omits (data-testid on each panel). */
const OMITTED = [
  "studio-style",
  "studio-octave",
  "select-root-note",
  "select-family",
  "select-octave",
  "select-chord-type",
  "select-scale-type",
  "select-instrument",
  "select-master-volume",
];

/** The omitted testids actually mounted inside `scope` — expected empty. */
const foundIn = (scope) => OMITTED.filter((id) => scope.querySelector(`[data-testid="${id}"]`));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/?prototype=a");
});

describe("VMU-216 (a): the A′ drawer shows none of the nine duplicated controls", () => {
  it("Studio drawer: the two Studio duplicates are gone, the drawer's own content stays", async () => {
    await renderApp("?prototype=a&drawer=open");
    const drawer = document.querySelector('[data-s1="drawer"]');
    expect(drawer, "the Assistant drawer").not.toBeNull();
    expect(foundIn(drawer), "no duplicated control in the Studio drawer").toEqual([]);
    // What must stay: the panel, its target-notes selector, and the drawer's
    // header controls (the Assistant button opens it, Fermer closes it).
    expect(drawer.querySelector('[data-testid="studio-panel"]')).not.toBeNull();
    expect(drawer.querySelector('[data-testid="target-notes-selector"]')).not.toBeNull();
    expect(drawer.querySelector('[data-fn="nav.fermer-fenetres"]')).not.toBeNull();
    expect(fn("nav.studio-harmonie")).not.toBeNull();
  });

  it("Dictionary Chords drawer: root, family, octave and chord-type are gone, the chord's help stays", async () => {
    await renderApp("?prototype=a&scenario=cmaj&drawer=open");
    const drawer = document.querySelector('[data-s1="drawer"]');
    expect(drawer, "the Assistant drawer").not.toBeNull();
    expect(foundIn(drawer), "no duplicated control in the Chords drawer").toEqual([]);
    expect(drawer.querySelector('[data-testid="dictionary-panel"]')).not.toBeNull();
    expect(drawer.querySelector('[data-testid="target-notes-selector"]')).not.toBeNull();
    expect(drawer.querySelector(".dict-panel__recommended"), "Gammes recommandées").not.toBeNull();
    expect(drawer.querySelector(".dict-panel__substitutions"), "Substitutions").not.toBeNull();
    expect(drawer.querySelector(".dict-panel__positions"), "the drawer's position selectors").not.toBeNull();
    expect(drawer.textContent).toContain(FR.harmonicModeToggle);
  });

  it("Dictionary Scales drawer: root, family, octave and scale-type are gone, the scale's help stays", async () => {
    await renderApp("?prototype=a&scenario=cmajscale&drawer=open");
    const drawer = document.querySelector('[data-s1="drawer"]');
    expect(drawer, "the Assistant drawer").not.toBeNull();
    expect(foundIn(drawer), "no duplicated control in the Scales drawer").toEqual([]);
    expect(drawer.querySelector('[data-testid="dictionary-panel"]')).not.toBeNull();
    expect(drawer.querySelector('[data-testid="target-notes-selector"]')).not.toBeNull();
    expect(drawer.querySelector(".dict-panel__positions"), "the drawer's position selectors").not.toBeNull();
    expect(drawer.textContent).toContain(FR.harmonicModeToggle);
  });
});

describe("VMU-216 (b): Instruments & Audio shows none of the nine, and keeps the mixer", () => {
  it("opens with the six faders and Shell Voicings, without the master volume or the played instrument", async () => {
    await renderApp();
    fireEvent.click(fn("son.ouvrir"));
    const modal = document.querySelector(".modal-container");
    expect(modal, "Instruments & Audio").not.toBeNull();
    expect(foundIn(modal), "no duplicated control in Instruments & Audio").toEqual([]);
    expect(modal.querySelectorAll('input[type="range"][orient="vertical"]')).toHaveLength(6);
    expect(modal.textContent).toContain("Shell Voicings");
    expect(modal.textContent).toContain("Étiquettes"); // Numéros de doigts stays
  });
});
