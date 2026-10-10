// INST-A1 — criterion S1-15 of scripts/s1_probe.mjs checks that every pitch the
// page says the piano holds (`data-s1-notes` on the piano column) is a lit key.
// It read `activeNotes`, the realization of the CHOSEN instrument: with the
// guitar chosen, the probe compared the keyboard with the guitar's grip. Since
// A1 the keyboard shows the piano's own realization, so the attribute must
// carry that one, whichever instrument is chosen.
//
// The engine is the real one (useDictionaryMode -> useMusicEngine), the guitar
// chosen; the page's heavy children are stubbed, as in PrototypeABench.test.jsx:
// this file asserts what PrototypeA writes, not what the instruments draw.
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";

vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));
vi.mock("../../components/Panels/TheoryLegend", () => ({ default: () => <div data-testid="legend-stub" /> }));

import PrototypeA from "../PrototypeA";
import { useDictionaryMode } from "../../hooks/useDictionaryMode";
import { useMusicEngine } from "../../hooks/useMusicEngine";
import { AppProvider } from "../../context/AppContext";
import { BRICKS } from "../../core/bricks";
import { midiToNoteName } from "../../core/theory";

afterEach(cleanup);

const noop = () => {};
const activeBrick = BRICKS[0];

/** The real engine for a Dictionary selection, with `chosen` as the played instrument. */
function engineFor(root, type, chosen) {
  const { result } = renderHook(
    () => {
      const dict = useDictionaryMode();
      const engine = useMusicEngine({
        appMode: "dictionary",
        activeBrick,
        clickedChord: null,
        currentAbsoluteNotes: [],
        chordOctaveOffset: 0,
        displayMode: "chord",
        selectedRootStringGuitar: null,
        selectedRootStringBass: null,
        selectedVoicingIndexGuitar: null,
        selectedVoicingIndexBass: null,
        dictRoot: dict.dictRoot,
        dictType: dict.dictType,
        dictActiveNotes: dict.activeNotes,
        dictOctave: dict.dictOctave,
        notation: "eu",
        playbackInstrument: chosen,
      });
      return { dict, engine };
    },
    { wrapper: ({ children }) => <AppProvider>{children}</AppProvider> }
  );
  act(() => {
    result.current.dict.setDictRoot(root);
    result.current.dict.setDictType(type);
  });
  return result.current.engine;
}

function props(musicEngineContextValue) {
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
    activeBrick,
    chordOctaveOffset: 0,
    musicEngineContextValue,
    playbackContextValue: {},
    drawerPanel: null,
  };
}

const s1Notes = (page) =>
  (page.querySelector('[data-s1="piano"]').getAttribute("data-s1-notes") || "").split(" ").filter(Boolean).map(Number);

describe("PrototypeA: S1-15 reads the piano's own notes (INST-A1)", () => {
  it("Do majeur, guitar chosen: data-s1-notes is C4 E4 G4, the piano's realization, not the guitar's grip", () => {
    const engine = engineFor(0, "chord_major", "guitar");
    // Premise: the chosen instrument's notes are not the piano's here, or the
    // test could not tell the two readings apart.
    expect(engine.activeNotes.map((n) => n.absoluteValue)).not.toEqual(
      engine.realizationsByInstrument.piano.map((n) => n.absoluteValue)
    );

    const page = render(<PrototypeA {...props(engine)} />).container;

    expect(s1Notes(page).map(midiToNoteName)).toEqual(["C4", "E4", "G4"]);
  });

  it.each(["piano", "guitar", "bass"])("the attribute is the same whichever instrument is chosen (%s)", (chosen) => {
    const reference = render(<PrototypeA {...props(engineFor(8, "chord_m7", "piano"))} />).container;
    const expected = s1Notes(reference);
    cleanup();
    const page = render(<PrototypeA {...props(engineFor(8, "chord_m7", chosen))} />).container;
    expect(expected.length).toBeGreaterThan(0);
    expect(s1Notes(page)).toEqual(expected);
  });
});
