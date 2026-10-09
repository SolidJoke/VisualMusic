/**
 * INST-A2 — the play button on an instrument tile calls `playInstrument(id)`.
 *
 * It used to go through hooks/useSelectThenPlay.js: select the instrument, then
 * play it after the render that commits the selection, because
 * `playDictionaryAudio` was bound to the previous instrument. `playInstrument`
 * takes the instrument as an argument and plays at once, so the tile has
 * nothing left to wait for: one call, in the click handler, with the id of the
 * tile.
 *
 * What does NOT change, and is pinned here so the swap cannot move it: the
 * tile's own select button only selects; on a phone there is a single play
 * button, the one of the selected instrument.
 *
 * InstrumentBar is the real component here. Everything else InstrumentView
 * renders is stubbed, as in InstrumentView.test.jsx.
 */
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import InstrumentView from "../Panels/InstrumentView";
import { AppProvider } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import { PlaybackProvider } from "../../context/PlaybackContext";

const media = vi.hoisted(() => ({ phone: false }));

vi.mock("../Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="audio-visualizer" />,
}));
vi.mock("../Panels/SequencerPanel", () => ({ default: () => <div /> }));
vi.mock("../Panels/TheoryLegend", () => ({ default: () => <div /> }));
vi.mock("../Layout/PositionSelector", () => ({ default: () => <div /> }));
vi.mock("../Instruments/Fretboard", () => ({ default: () => <div /> }));
vi.mock("../Instruments/PianoKeyboard", () => ({ default: () => <div /> }));
vi.mock("../../hooks/useMediaQuery", () => ({
  useMediaQuery: () => media.phone,
  useLandscapeMode: () => false,
}));

beforeEach(() => {
  media.phone = false;
});
afterEach(cleanup);

function renderView({ playbackInstrument = "piano" } = {}) {
  const playInstrument = vi.fn();
  const playDictionaryAudio = vi.fn();
  const setPlaybackInstrument = vi.fn();
  const value = {
    masterAnalyser: null,
    appMode: "dictionary",
    activeBrick: {},
    availableGuitarFingerings: [],
    availableBassFingerings: [],
    showFingering: true,
    clickedChord: null,
    collapsedSections: {},
    toggleSection: () => {},
    realizationsByInstrument: {
      piano: [{ absoluteValue: 60 }, { absoluteValue: 67 }],
      guitar: [{ absoluteValue: 48 }, { absoluteValue: 64 }],
      bass: [{ absoluteValue: 36 }, { absoluteValue: 48 }],
    },
    playbackInstrument,
    setPlaybackInstrument,
    playDictionaryAudio,
    playInstrument,
  };
  const utils = render(
    <AppProvider>
      <MusicEngineProvider value={value}>
        <PlaybackProvider value={{ currentStep: 0, currentBpm: 120 }}>
          <InstrumentView />
        </PlaybackProvider>
      </MusicEngineProvider>
    </AppProvider>
  );
  return { ...utils, playInstrument, playDictionaryAudio, setPlaybackInstrument };
}

describe("InstrumentView — the play button of a tile calls playInstrument(id)", () => {
  it.each([
    ["Piano", "piano"],
    ["Guitare", "guitar"],
    ["Basse", "bass"],
  ])("Jouer — %s: one call with %s, in the click, no other play", (label, id) => {
    const { getByRole, playInstrument, playDictionaryAudio, setPlaybackInstrument } =
      renderView({ playbackInstrument: "piano" });

    fireEvent.click(getByRole("button", { name: `Jouer — ${label}` }));

    // Synchronous: no await, no re-render between the click and the call.
    expect(playInstrument).toHaveBeenCalledTimes(1);
    expect(playInstrument).toHaveBeenCalledWith(id);
    // The selection is part of playInstrument; the tile does not repeat it, and
    // does not go through the big play.
    expect(playDictionaryAudio).not.toHaveBeenCalled();
    expect(setPlaybackInstrument).not.toHaveBeenCalled();
  });

  it("the select button of a tile only selects: no sound", () => {
    const { container, playInstrument, playDictionaryAudio, setPlaybackInstrument } = renderView();

    fireEvent.click(container.querySelector('[data-instrument="guitar"]'));

    expect(setPlaybackInstrument).toHaveBeenCalledWith("guitar");
    expect(playInstrument).not.toHaveBeenCalled();
    expect(playDictionaryAudio).not.toHaveBeenCalled();
  });

  it("on a phone, the single play button plays the selected instrument", () => {
    media.phone = true;
    const { getByTestId, getAllByRole, playInstrument, playDictionaryAudio } = renderView({
      playbackInstrument: "bass",
    });
    expect(getAllByRole("button", { name: /^Jouer — / })).toHaveLength(1);

    fireEvent.click(getByTestId("instrument-bar-play-selected"));

    expect(playInstrument).toHaveBeenCalledTimes(1);
    expect(playInstrument).toHaveBeenCalledWith("bass");
    expect(playDictionaryAudio).not.toHaveBeenCalled();
  });
});
