// VMU-126 - A′ and the confirmation before a change of mode wipes edits.
//
// AppDesktop hands A′ two setters for the mode: `setAppMode`, the raw one, and
// `onRequestAppMode`, the one that asks first when the user has edits. A click
// on the header's tabs is the USER asking: it goes through the request. A
// scenario or an L1a state (applyScenario, the ?scenario= / ?state= URLs, the
// probe's bench buttons) is the PAGE setting a whole state: it must go through
// the raw setter and never open a question the user did not ask for.
//
// The style menu needs no such split: A′'s selection row gets the request as
// its `setCurrentBrickIndex` prop (AppDesktop.jsx), nothing here to wire.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));
vi.mock("../../components/Panels/TheoryLegend", () => ({ default: () => <div data-testid="legend-stub" /> }));

import PrototypeA from "../PrototypeA";

const noop = () => {};

function renderPage({ url = "/?prototype=a", appMode = "studio", setAppMode = noop, onRequestAppMode } = {}) {
  window.history.replaceState({}, "", url);
  return render(
    <PrototypeA
      txt={{}}
      notation="eu"
      setNotation={noop}
      appMode={appMode}
      setAppMode={setAppMode}
      onRequestAppMode={onRequestAppMode}
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
    />,
  ).container;
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("PrototypeA - the header tabs ask, the scenarios do not", () => {
  it("a click on a mode tab goes through the request, not the raw setter", () => {
    const setAppMode = vi.fn();
    const onRequestAppMode = vi.fn();
    const page = renderPage({ setAppMode, onRequestAppMode });
    fireEvent.click(page.querySelector('button[aria-label="Mode Dictionnaire"]'));
    fireEvent.click(page.querySelector('button[aria-label="Mode Studio"]'));
    expect(onRequestAppMode.mock.calls).toEqual([["dictionary"], ["studio"]]);
    expect(setAppMode).not.toHaveBeenCalled();
  });

  it("applying a scenario goes through the raw setter and never asks", () => {
    const setAppMode = vi.fn();
    const onRequestAppMode = vi.fn();
    const page = renderPage({ url: "/?prototype=a&bench=1", setAppMode, onRequestAppMode });
    fireEvent.click(page.querySelector('[data-scenario="cmaj"]'));
    expect(setAppMode).toHaveBeenCalledWith("dictionary");
    expect(onRequestAppMode).not.toHaveBeenCalled();
  });

  it("a scenario or a state named by the URL, applied on arrival, never asks", () => {
    const setAppMode = vi.fn();
    const onRequestAppMode = vi.fn();
    renderPage({ url: "/?prototype=a&scenario=gsm7", setAppMode, onRequestAppMode });
    expect(setAppMode).toHaveBeenCalledWith("dictionary");
    cleanup();
    setAppMode.mockClear();
    renderPage({ url: "/?prototype=a&state=studio-oct2", appMode: "dictionary", setAppMode, onRequestAppMode });
    expect(setAppMode).toHaveBeenCalledWith("studio");
    expect(onRequestAppMode).not.toHaveBeenCalled();
  });

  it("without a request (the other callers, the older tests) a tab still switches the mode", () => {
    const setAppMode = vi.fn();
    const page = renderPage({ setAppMode });
    fireEvent.click(page.querySelector('button[aria-label="Mode Dictionnaire"]'));
    expect(setAppMode).toHaveBeenCalledWith("dictionary");
  });
});
