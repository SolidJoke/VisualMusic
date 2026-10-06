// L1a-fix1 amendment (coordinator, after the UX critique) — the left rail of
// ?prototype=a goes away (96px + a 16px gap the instruments need), and its two
// mode buttons move to the header, right after the "VisualMusic" title, as two
// tabs side by side ("Studio", "Dictionnaire", 48px high).
//
// What is asserted (what PrototypeA renders; the heavy children are stubbed):
//   - no rail: no .proto-a__rail, no <nav> outside the header;
//   - two buttons in the header, after the title, whose accessible names are
//     "Mode Studio" and "Mode Dictionnaire" (the visible text is the short
//     "Studio" / "Dictionnaire"), the active mode being aria-pressed;
//   - each carries its parity-registry name: data-fn "nav.mode-studio" and
//     "nav.mode-dictionnaire" (coordinator, 2026-10-06);
//   - they switch the mode through the same setter the rail used.
//
// Their size (>= 48px high) and their place are measured in Chromium by the
// probe (scripts/s1_probe.mjs, S1-18), not here: jsdom does no layout.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));
vi.mock("../../components/Panels/TheoryLegend", () => ({ default: () => <div data-testid="legend-stub" /> }));

import PrototypeA from "../PrototypeA";

const noop = () => {};

function renderPage(appMode, setAppMode = noop) {
  window.history.replaceState({}, "", "/?prototype=a");
  return render(
    <PrototypeA
      txt={{}}
      notation="eu"
      setNotation={noop}
      appMode={appMode}
      setAppMode={setAppMode}
      isPlaying={false}
      togglePlayback={noop}
      playDictionaryAudio={noop}
      currentBpm={100}
      handleBpmChange={noop}
      metronomeOn={false}
      toggleMetronome={noop}
      showFingerNumbers={false}
      setShowFingerNumbers={noop}
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

describe("PrototypeA: the mode tabs in the header", () => {
  it("has no left rail any more", () => {
    const page = renderPage("dictionary");
    expect(page.querySelector(".proto-a__rail")).toBeNull();
    expect(page.querySelector("nav")).not.toBeNull(); // the tabs' own <nav>...
    expect(page.querySelector(".proto-a__grid nav")).toBeNull(); // ...is not in the grid
  });

  it("puts 'Mode Studio' and 'Mode Dictionnaire' in the header, after the title", () => {
    const page = renderPage("dictionary");
    const header = page.querySelector("header.proto-a__header");
    const title = header.querySelector(".proto-a__title");
    const studio = header.querySelector('button[aria-label="Mode Studio"]');
    const dict = header.querySelector('button[aria-label="Mode Dictionnaire"]');
    expect(studio).not.toBeNull();
    expect(dict).not.toBeNull();
    expect(studio.textContent).toBe("Studio");
    expect(dict.textContent).toBe("Dictionnaire");
    // DOCUMENT_POSITION_FOLLOWING (4): title, then Studio, then Dictionnaire.
    expect(title.compareDocumentPosition(studio) & 4).toBe(4);
    expect(studio.compareDocumentPosition(dict) & 4).toBe(4);
  });

  it("puts nothing between the title and the tabs", () => {
    const page = renderPage("dictionary");
    const header = page.querySelector("header.proto-a__header");
    const kids = Array.from(header.children);
    const titleAt = kids.findIndex((el) => el.classList.contains("proto-a__title"));
    expect(kids[titleAt + 1].matches("nav")).toBe(true);
    expect(kids[titleAt + 1].querySelectorAll("button")).toHaveLength(2);
  });

  it("names each tab for the parity registry: data-fn nav.mode-studio / nav.mode-dictionnaire", () => {
    const page = renderPage("dictionary");
    const header = page.querySelector("header.proto-a__header");
    expect(header.querySelector('[aria-label="Mode Studio"]').getAttribute("data-fn")).toBe("nav.mode-studio");
    expect(header.querySelector('[aria-label="Mode Dictionnaire"]').getAttribute("data-fn")).toBe("nav.mode-dictionnaire");
    // One each: a data-fn names a function, so it is never on two buttons.
    expect(page.querySelectorAll('[data-fn="nav.mode-studio"]')).toHaveLength(1);
    expect(page.querySelectorAll('[data-fn="nav.mode-dictionnaire"]')).toHaveLength(1);
  });

  it("marks the active mode as pressed", () => {
    const dictPage = renderPage("dictionary");
    expect(dictPage.querySelector('[aria-label="Mode Dictionnaire"]').getAttribute("aria-pressed")).toBe("true");
    expect(dictPage.querySelector('[aria-label="Mode Studio"]').getAttribute("aria-pressed")).toBe("false");
    cleanup();
    const studioPage = renderPage("studio");
    expect(studioPage.querySelector('[aria-label="Mode Studio"]').getAttribute("aria-pressed")).toBe("true");
    expect(studioPage.querySelector('[aria-label="Mode Dictionnaire"]').getAttribute("aria-pressed")).toBe("false");
  });

  it("switches the mode through setAppMode", () => {
    const setAppMode = vi.fn();
    const page = renderPage("dictionary", setAppMode);
    fireEvent.click(page.querySelector('[aria-label="Mode Studio"]'));
    expect(setAppMode).toHaveBeenLastCalledWith("studio");
    fireEvent.click(page.querySelector('[aria-label="Mode Dictionnaire"]'));
    expect(setAppMode).toHaveBeenLastCalledWith("dictionary");
  });
});
