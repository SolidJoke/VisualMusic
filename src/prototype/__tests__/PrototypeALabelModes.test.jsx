// L1a-fix1, correction after the coordinator's QA (2026-10-06) — the label
// modes are a real function, not a bench fixture.
//
// "Noms Do Ré Mi" / "Noms C D E" / "Doigts" change what the notes show on the
// keyboard and the necks; Gabriel uses that setting. The first version of the
// fix hid them with the scenario buttons behind ?bench=1, so without it nothing
// changed the labels any more. They now live in the header, on the right, as
// ONE control with three segments titled "Sur les notes", whatever the URL says.
// Only the S1 scenarios and the L1a states stay behind ?bench=1.
//
// What is asserted (what PrototypeA renders and wires; heavy children stubbed):
//   - without bench=1: the three buttons are there, in the header, in one
//     group named "Sur les notes", each carrying its data-fn
//     (nav.noms-notes-eu, nav.noms-notes-us, nav.etiquettes-doigts) and
//     the data-labels the probe waits on;
//   - each does what it did: "eu" -> notation eu, no finger numbers; "us" ->
//     notation us, no finger numbers; "fingers" -> notation eu + finger numbers;
//   - the active one is pressed (and has is-active), from the notation and
//     showFingerNumbers props;
//   - with or without bench=1, the S1 scenarios and L1a states appear ONLY
//     with bench=1, and the label buttons are never inside the fixtures block.
//
// Their size (>= 48px high), their place and the header keeping its 72px are
// measured in Chromium by the probe (scripts/s1_probe.mjs, S1-19), not here.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));
vi.mock("../../components/Panels/TheoryLegend", () => ({ default: () => <div data-testid="legend-stub" /> }));

import PrototypeA from "../PrototypeA";

const noop = () => {};

const FN = {
  eu: "nav.noms-notes-eu",
  us: "nav.noms-notes-us",
  fingers: "nav.etiquettes-doigts",
};

function renderAt(search, { notation = "eu", showFingerNumbers = false, setNotation = noop, setShowFingerNumbers = noop } = {}) {
  window.history.replaceState({}, "", `/${search}`);
  return render(
    <PrototypeA
      txt={{}}
      notation={notation}
      setNotation={setNotation}
      appMode="dictionary"
      setAppMode={noop}
      isPlaying={false}
      togglePlayback={noop}
      playDictionaryAudio={noop}
      currentBpm={100}
      handleBpmChange={noop}
      metronomeOn={false}
      toggleMetronome={noop}
      showFingerNumbers={showFingerNumbers}
      setShowFingerNumbers={setShowFingerNumbers}
      dictRoot={0}
      dictType="chord_major"
      setDictRoot={noop}
      setDictType={noop}
      timeline={[]}
      currentStep={0}
      activeBrick={null}
      chordOctaveOffset={0}
      musicEngineContextValue={{ activeNotes: [], guitarFingering: null, bassFingering: null }}
      playbackContextValue={{}}
      drawerPanel={null}
    />
  ).container;
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe.each([
  ["without bench=1", "?prototype=a"],
  ["with bench=1", "?prototype=a&bench=1"],
])("PrototypeA label modes, %s", (_label, search) => {
  it("offers the three label modes in the header, in one group named 'Sur les notes'", () => {
    const page = renderAt(search);
    const header = page.querySelector("header.proto-a__header");
    const group = header.querySelector('[role="group"][aria-label="Sur les notes"]');
    expect(group).not.toBeNull();
    expect(group.textContent).toContain("Noms Do Ré Mi");
    expect(group.querySelectorAll("button")).toHaveLength(3);
    for (const [id, fn] of Object.entries(FN)) {
      const btn = group.querySelector(`button[data-labels="${id}"]`);
      expect(btn, id).not.toBeNull();
      expect(btn.getAttribute("data-fn"), id).toBe(fn);
    }
    expect(group.querySelector('[data-labels="eu"]').textContent).toBe("Noms Do Ré Mi");
    expect(group.querySelector('[data-labels="us"]').textContent).toBe("Noms C D E");
    expect(group.querySelector('[data-labels="fingers"]').textContent).toBe("Doigts");
  });

  it("has each button once, and none inside the bench's fixtures block", () => {
    const page = renderAt(search);
    for (const id of Object.keys(FN)) expect(page.querySelectorAll(`[data-labels="${id}"]`), id).toHaveLength(1);
    expect(page.querySelectorAll('[data-fn="nav.noms-notes-eu"], [data-fn="nav.noms-notes-us"], [data-fn="nav.etiquettes-doigts"]')).toHaveLength(3);
    expect(page.querySelector('[data-s1="scenarios"] [data-labels]')).toBeNull();
    expect(page.querySelector('[data-s1="states"] [data-labels]')).toBeNull();
    expect(page.querySelector('[data-s1="center"] [data-labels]')).toBeNull();
  });

  it("changes the label mode as before: eu / us / fingers", () => {
    const setNotation = vi.fn();
    const setShowFingerNumbers = vi.fn();
    const page = renderAt(search, { setNotation, setShowFingerNumbers });
    // The page applies the URL's own label mode on arrival only when it asks for one: none here.
    setNotation.mockClear();
    setShowFingerNumbers.mockClear();

    fireEvent.click(page.querySelector('[data-labels="us"]'));
    expect(setNotation).toHaveBeenLastCalledWith("us");
    expect(setShowFingerNumbers).toHaveBeenLastCalledWith(false);

    fireEvent.click(page.querySelector('[data-labels="fingers"]'));
    expect(setNotation).toHaveBeenLastCalledWith("eu");
    expect(setShowFingerNumbers).toHaveBeenLastCalledWith(true);

    fireEvent.click(page.querySelector('[data-labels="eu"]'));
    expect(setNotation).toHaveBeenLastCalledWith("eu");
    expect(setShowFingerNumbers).toHaveBeenLastCalledWith(false);
  });

  it("marks the current label mode as pressed", () => {
    const eu = renderAt(search, { notation: "eu", showFingerNumbers: false });
    expect(eu.querySelector('[data-labels="eu"]').getAttribute("aria-pressed")).toBe("true");
    expect(eu.querySelector('[data-labels="eu"]').classList.contains("is-active")).toBe(true);
    expect(eu.querySelector('[data-labels="us"]').getAttribute("aria-pressed")).toBe("false");
    expect(eu.querySelector('[data-labels="fingers"]').getAttribute("aria-pressed")).toBe("false");
    cleanup();
    const us = renderAt(search, { notation: "us", showFingerNumbers: false });
    expect(us.querySelector('[data-labels="us"]').getAttribute("aria-pressed")).toBe("true");
    cleanup();
    const fingers = renderAt(search, { notation: "eu", showFingerNumbers: true });
    expect(fingers.querySelector('[data-labels="fingers"]').getAttribute("aria-pressed")).toBe("true");
    expect(fingers.querySelector('[data-labels="eu"]').getAttribute("aria-pressed")).toBe("false");
  });
});

describe("PrototypeA fixtures, whatever the label modes do", () => {
  it("shows the scenarios and the L1a states only with bench=1", () => {
    const without = renderAt("?prototype=a");
    expect(without.querySelectorAll("[data-scenario]")).toHaveLength(0);
    expect(without.querySelectorAll("[data-state]")).toHaveLength(0);
    cleanup();
    const withBench = renderAt("?prototype=a&bench=1");
    expect(withBench.querySelectorAll("[data-scenario]").length).toBeGreaterThan(0);
    expect(withBench.querySelectorAll("[data-state]").length).toBeGreaterThan(0);
  });

  it("does not carry the label modes' caption in the centre column any more", () => {
    const page = renderAt("?prototype=a&bench=1");
    expect(page.querySelector('[data-s1="center"]').textContent).not.toContain("Sur les notes");
  });
});
