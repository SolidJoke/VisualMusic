// L1a-fix1 (Gabriel, 2026-10-05, ?prototype=a) — "Je ne comprends pas à quoi
// correspondent les blocs « scénarios S1 » et « états L1a » ainsi que leur
// contenu. Ils ne semblent pas concerner les notes, accords ou gammes
// sélectionnés en mode Dico ou Studio."
//
// They are right: those buttons are fixtures of the `s1:probe` measuring tool
// (src/prototype/s1Scenarios.js). They put the page into a fixed state; they
// do not follow what the user selected. So they are drawn ONLY when the URL
// asks for the bench (`?prototype=a&bench=1`), which is how the probe reaches
// them; without it the page shows no scenario, label-mode or state button.
//
// The heavy children (instruments, sequencer, legend) are stubbed: this file
// asserts what PrototypeA decides to render, not what they draw.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";

vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));
vi.mock("../../components/Panels/TheoryLegend", () => ({ default: () => <div data-testid="legend-stub" /> }));

import PrototypeA from "../PrototypeA";
import { S1_SCENARIOS, S1_LABEL_MODES, S1_EXTRA_STATES } from "../s1Scenarios";

const noop = () => {};

function props() {
  return {
    txt: {},
    notation: "eu",
    setNotation: noop,
    appMode: "dictionary",
    setAppMode: noop,
    isPlaying: false,
    togglePlayback: noop,
    playDictionaryAudio: noop,
    currentBpm: 100,
    handleBpmChange: noop,
    metronomeOn: false,
    toggleMetronome: noop,
    showFingerNumbers: false,
    setShowFingerNumbers: noop,
    dictRoot: 0,
    dictType: "chord_major",
    setDictRoot: noop,
    setDictType: noop,
    timeline: [],
    currentStep: 0,
    activeBrick: null,
    chordOctaveOffset: 0,
    musicEngineContextValue: { activeNotes: [], guitarFingering: null, bassFingering: null },
    playbackContextValue: {},
    drawerPanel: null,
  };
}

function renderAt(search) {
  window.history.replaceState({}, "", `/${search}`);
  return render(<PrototypeA {...props()} />).container;
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("PrototypeA: the measuring bench's fixtures", () => {
  it("draws no scenario, label-mode or state button without bench=1", () => {
    const page = renderAt("?prototype=a");
    expect(page.querySelector('[data-s1="scenarios"]')).toBeNull();
    expect(page.querySelector('[data-s1="states"]')).toBeNull();
    expect(page.querySelectorAll("[data-scenario]")).toHaveLength(0);
    expect(page.querySelectorAll("[data-labels]")).toHaveLength(0);
    expect(page.querySelectorAll("[data-state]")).toHaveLength(0);
    expect(page.textContent).not.toContain("Scénarios S1");
    expect(page.textContent).not.toContain("États L1a");
  });

  it("draws them all with bench=1: every scenario, label mode and L1a state the probe clicks", () => {
    const page = renderAt("?prototype=a&bench=1");
    expect(page.querySelector('[data-s1="scenarios"]')).not.toBeNull();
    expect(page.querySelector('[data-s1="states"]')).not.toBeNull();
    for (const s of S1_SCENARIOS) expect(page.querySelector(`[data-scenario="${s.id}"]`), s.id).not.toBeNull();
    for (const m of S1_LABEL_MODES) expect(page.querySelector(`[data-labels="${m.id}"]`), m.id).not.toBeNull();
    for (const x of S1_EXTRA_STATES) expect(page.querySelector(`[data-state="${x.id}"]`), x.id).not.toBeNull();
  });

  it("treats only bench=1 as the bench (not bench=0, not an empty value)", () => {
    for (const search of ["?prototype=a&bench=0", "?prototype=a&bench=", "?prototype=a&bench=true"]) {
      const page = renderAt(search);
      expect(page.querySelector('[data-s1="scenarios"]'), search).toBeNull();
      expect(page.querySelector('[data-s1="states"]'), search).toBeNull();
      cleanup();
    }
  });

  it("keeps what the user needs without the bench: transport, sequencer, the three instruments", () => {
    const page = renderAt("?prototype=a");
    expect(page.querySelector('[data-s1="transport"]')).not.toBeNull();
    expect(page.querySelector('[data-s1="sequencer"]')).not.toBeNull();
    expect(page.querySelector('[data-s1="piano"]')).not.toBeNull();
    expect(page.querySelector('[data-s1="guitar"]')).not.toBeNull();
    expect(page.querySelector('[data-s1="bass"]')).not.toBeNull();
  });
});
