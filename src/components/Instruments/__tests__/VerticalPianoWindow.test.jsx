// L1a (VMU-031, L1 study fact 0.4) — the vertical piano shows 4 octaves out of
// the 7 the horizontal keyboard shows at 4K. Until L1a it was frozen at C2..C6,
// so the Dictionary's octave +2 / +3 and the Studio's base octave +2 / +3 lit
// notes the vertical keyboard did not have at all.
//
// What is asserted, through the REAL hooks (useDictionaryMode, useStudioMode,
// useStudioPlayback, useMusicEngine) and the REAL PianoKeyboard:
//
//   1. the premise: the engine really puts the notes at octave 7 (C7 = 96);
//   2. those notes are keys of the vertical piano, lit with a role class;
//   3. the default window (nothing above C6) is still C2..C6, unchanged.
//
// jsdom does no layout: whether the keys are on screen is the Chromium probe's
// job (scripts/s1_probe.mjs, criterion S1-15), not this file's.
import React, { useEffect, useMemo } from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";
import { useDictionaryMode } from "../../../hooks/useDictionaryMode";
import { useStudioMode } from "../../../hooks/useStudioMode";
import { useStudioPlayback } from "../../../hooks/useStudioPlayback";
import { useMusicEngine } from "../../../hooks/useMusicEngine";
import { AppProvider, useAppContext } from "../../../context/AppContext";
import { MusicEngineProvider } from "../../../context/MusicEngineContext";
import PianoKeyboard from "../PianoKeyboard";
import { BRICKS } from "../../../core/bricks";
import { generateChordsFromNNS, getAbsoluteNoteValue } from "../../../core/theory";

// useStudioPlayback plays the chord it shows: no AudioContext in jsdom.
vi.mock("tone", () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  Transport: { scheduleOnce: vi.fn(), start: vi.fn() },
}));
vi.mock("../../../audio/AudioEngine", () => ({
  playDictionaryNote: vi.fn(),
}));

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  // A 3840px window, as in VerticalOrientation.test.jsx: the horizontal
  // keyboard then shows its 7 octaves, the full range the vertical window is
  // chosen from.
  window.matchMedia = (query) => ({
    matches: query === "(min-width: 3840px)" || query === "(min-width: 2560px)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

const C2 = getAbsoluteNoteValue("C2");
const C6 = getAbsoluteNoteValue("C6");
const C7 = getAbsoluteNoteValue("C7");
const E7 = getAbsoluteNoteValue("E7");
const G7 = getAbsoluteNoteValue("G7");

function appProviderWrapper({ children }) {
  return <AppProvider>{children}</AppProvider>;
}

/** The Dictionary's own notes for a selection, octave selector included. */
function dictionarySelection(dictRoot, dictType, dictOctave) {
  const { result } = renderHook(() => useDictionaryMode(), { wrapper: appProviderWrapper });
  act(() => {
    result.current.setDictRoot(dictRoot);
    result.current.setDictType(dictType);
    result.current.setDictOctave(dictOctave);
  });
  return result.current;
}

/** Turns the harmonic mode on in the surrounding AppProvider (AppContext state). */
function HarmonicModeOn() {
  const { dispatch } = useAppContext();
  useEffect(() => {
    dispatch({ type: "SET_HARMONIC_MODE", payload: true });
  }, [dispatch]);
  return null;
}

function DictionaryHarness({ dictRoot, dictType, dictOctave, dictActiveNotes, orientation }) {
  const { notation } = useAppContext();
  const activeBrick = BRICKS[0];
  const musicState = useMusicEngine({
    appMode: "dictionary",
    activeBrick,
    clickedChord: null,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes: [],
    chordOctaveOffset: 0,
    displayMode: "chord",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot,
    dictType,
    dictActiveNotes,
    dictOctave,
    notation,
    playbackInstrument: "piano",
    targetNotesPreset: "majorMinor",
  });
  const value = {
    ...musicState,
    appMode: "dictionary",
    activeBrick,
    dictType,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
  };
  return (
    <MusicEngineProvider value={value}>
      <div data-testid="engine" data-abs={musicState.activeNotes.map((n) => n.absoluteValue).join(" ")} />
      <PianoKeyboard orientation={orientation} />
    </MusicEngineProvider>
  );
}

function renderDictionary({ dictRoot, dictType, dictOctave, orientation = "vertical", harmonic = false }) {
  const sel = dictionarySelection(dictRoot, dictType, dictOctave);
  return render(
    <AppProvider>
      {harmonic && <HarmonicModeOn />}
      <DictionaryHarness
        dictRoot={dictRoot}
        dictType={dictType}
        dictOctave={dictOctave}
        dictActiveNotes={sel.activeNotes}
        orientation={orientation}
      />
    </AppProvider>
  ).container;
}

/**
 * The Studio as the app wires it: useStudioMode holds the base octave and the
 * clicked chord, useStudioPlayback's handleChordClick turns a click into the
 * pitches shown (getClosestInversionN, the base octave applied), and
 * useMusicEngine hands them to the piano. `controlsRef` gives the test the two
 * gestures a user makes: choose the base octave, click the first chord.
 */
function StudioHarness({ controlsRef }) {
  const { notation } = useAppContext();
  const studio = useStudioMode();
  const scheduler = useMemo(
    () => ({
      ensureAudioReady: () => Promise.resolve(),
      startPlaybackSession: () => 1,
      isCurrentSession: () => true,
    }),
    []
  );
  const { handleChordClick } = useStudioPlayback({
    playbackInstrument: "piano",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    activeBrick: studio.activeBrick,
    chordOctaveOffset: studio.chordOctaveOffset,
    currentAbsoluteNotes: studio.currentAbsoluteNotes,
    setCurrentAbsoluteNotes: studio.setCurrentAbsoluteNotes,
    setCurrentlyPlayingNotes: studio.setCurrentlyPlayingNotes,
    setClickedChord: studio.setClickedChord,
    scheduler,
  });
  const musicState = useMusicEngine({
    appMode: "studio",
    activeBrick: studio.activeBrick,
    clickedChord: studio.clickedChord,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes: studio.currentAbsoluteNotes,
    chordOctaveOffset: studio.chordOctaveOffset,
    displayMode: "chord",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: 0,
    dictType: "single_note",
    dictActiveNotes: [],
    dictOctave: 0,
    notation,
    playbackInstrument: "piano",
    targetNotesPreset: "majorMinor",
  });
  // The chord buttons of StudioPanel.jsx are built the same way.
  const chords = generateChordsFromNNS(studio.activeBrick.rootValue, studio.activeBrick.scaleKey, studio.activeTracks.progression);
  // After every render: the click must use the handleChordClick of the
  // latest render, the one that closed over the octave just chosen.
  useEffect(() => {
    controlsRef.current = {
      setChordOctaveOffset: studio.setChordOctaveOffset,
      clickFirstChord: () => handleChordClick(chords[0], 0),
      firstChord: chords[0],
    };
  });
  const value = {
    ...musicState,
    appMode: "studio",
    activeBrick: studio.activeBrick,
    dictType: null,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
  };
  return (
    <MusicEngineProvider value={value}>
      <div data-testid="engine" data-abs={musicState.activeNotes.map((n) => n.absoluteValue).join(" ")} />
      <PianoKeyboard orientation="vertical" />
    </MusicEngineProvider>
  );
}

const engineNotes = (container) =>
  container.querySelector('[data-testid="engine"]').getAttribute("data-abs").split(" ").filter(Boolean).map(Number);

const roleOf = (el) => Array.from(el.classList).filter((c) => c.startsWith("role-")).sort().join(" ");

function verticalKeys(container) {
  return Array.from(container.querySelectorAll(".piano-vertical .piano-key")).map((el) => ({
    el,
    abs: Number(el.getAttribute("data-abs")),
    role: roleOf(el),
    isBlack: el.classList.contains("black-key"),
    label: el.querySelector(".note-label"),
  }));
}

/** The lit vertical keys, by absolute pitch. */
const litPitches = (container) => verticalKeys(container).filter((k) => k.role).map((k) => k.abs).sort((a, b) => a - b);

describe("vertical piano window follows the active notes (L1a, VMU-031)", () => {
  it("Dictionnaire, Do majeur octave +3 : Do7, Mi7, Sol7 sont des touches du piano vertical", () => {
    const container = renderDictionary({ dictRoot: 0, dictType: "chord_major", dictOctave: 3 });
    // Premise: the engine itself puts the chord at octave 7.
    expect(engineNotes(container)).toEqual([C7, E7, G7]);
    expect(litPitches(container)).toEqual([C7, E7, G7]);
  });

  it("Studio, octave de base +3 : Do7, Mi7, Sol7 sont des touches du piano vertical", async () => {
    const controls = { current: null };
    const { container } = render(
      <AppProvider>
        <StudioHarness controlsRef={controls} />
      </AppProvider>
    );
    // BRICKS[0] (Pop Moderne) starts on degree 1 in C: a Do majeur chord.
    expect(controls.current.firstChord.rootNote.value).toBe(0);
    act(() => controls.current.setChordOctaveOffset(3));
    await act(async () => {
      await controls.current.clickFirstChord();
    });
    // Premise: handleChordClick puts the first chord at octave 7.
    expect(engineNotes(container)).toEqual([C7, E7, G7]);
    expect(litPitches(container)).toEqual([C7, E7, G7]);
  });

  it("Studio, octave de base +2 : every active note is a lit key of the vertical piano", async () => {
    const controls = { current: null };
    const { container } = render(
      <AppProvider>
        <StudioHarness controlsRef={controls} />
      </AppProvider>
    );
    act(() => controls.current.setChordOctaveOffset(2));
    await act(async () => {
      await controls.current.clickFirstChord();
    });
    const notes = engineNotes(container);
    // Premise: above C6, the top of the default window.
    expect(Math.max(...notes)).toBeGreaterThan(C6);
    expect(litPitches(container)).toEqual([...notes].sort((a, b) => a - b));
  });

  it("default window: an octave-0 selection keeps C2..C6 (29 white keys), as before L1a", () => {
    const container = renderDictionary({ dictRoot: 0, dictType: "chord_major", dictOctave: 0 });
    const keys = verticalKeys(container);
    expect(keys.filter((k) => !k.isBlack)).toHaveLength(29);
    expect(Math.min(...keys.map((k) => k.abs))).toBe(C2);
    expect(Math.max(...keys.map((k) => k.abs))).toBe(C6);
    expect(litPitches(container)).toEqual(engineNotes(container));
  });

  it("whatever the window, it is 4 octaves plus the closing C: 29 white keys, 20 black keys", () => {
    const container = renderDictionary({ dictRoot: 0, dictType: "chord_major", dictOctave: 3 });
    const keys = verticalKeys(container);
    expect(keys.filter((k) => !k.isBlack)).toHaveLength(29);
    expect(keys.filter((k) => k.isBlack)).toHaveLength(20);
    const lowest = Math.min(...keys.map((k) => k.abs));
    expect(lowest % 12).toBe(0); // starts on a C
    expect(Math.max(...keys.map((k) => k.abs))).toBe(lowest + 48); // ends on the C four octaves up
  });
});

describe("harmonic mode on the vertical piano: one line per label (L1a)", () => {
  // Sol#m7: its notes land on black keys (Sol#, Ré#, Fa#), the narrowest
  // place a label has to fit (S1-10, measured by the probe).
  const HARMONIC_LINE = /^\S+ · H\d+ [+-]?\d+¢$/;

  it("each lit key's label reads « Nom · Hn ±c¢ », on one line", () => {
    const container = renderDictionary({ dictRoot: 8, dictType: "chord_m7", dictOctave: 0, harmonic: true });
    const lit = verticalKeys(container).filter((k) => k.role);
    expect(lit.length).toBe(4);
    for (const k of lit) {
      expect(k.label.textContent).toMatch(HARMONIC_LINE);
      // Nothing inside the label stacks its parts in a column.
      const stacked = Array.from(k.label.querySelectorAll("*")).filter((e) => e.style.flexDirection === "column");
      expect(stacked).toEqual([]);
    }
  });

  it("the horizontal keyboard keeps its three-line harmonic label (unchanged by L1a)", () => {
    const container = renderDictionary({ dictRoot: 8, dictType: "chord_m7", dictOctave: 0, harmonic: true, orientation: "horizontal" });
    const stacks = Array.from(container.querySelectorAll(".piano-container .note-label > div")).filter(
      (e) => e.style.flexDirection === "column"
    );
    expect(stacks.length).toBeGreaterThan(0);
    expect(stacks[0].children).toHaveLength(3);
  });
});
