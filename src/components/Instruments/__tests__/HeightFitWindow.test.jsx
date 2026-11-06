// C-103 (Step 3a) — the page hands a chosen window to the vertical instruments
// and they obey it at the component level:
//
//   - PianoKeyboard orientation="vertical" windowOctaves={2} shows exactly the
//     2 octaves plus the closing C: 15 white keys and 10 black keys (and the
//     default — no windowOctaves — keeps the full 4 octaves / 29 white keys);
//   - Fretboard orientation="vertical" fretWindow={{ firstFret, lastFret }}
//     draws only the open-string row (fret 0) and the window's frets.
//
// jsdom does no layout: the sizes are the Chromium probe's job
// (scripts/s1_probe.mjs), not this file's. matchMedia is forced to a 3840px
// window so the horizontal 7-octave keyboard (the vertical window's range) is
// the full one.
import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";
import { useDictionaryMode } from "../../../hooks/useDictionaryMode";
import { useMusicEngine } from "../../../hooks/useMusicEngine";
import { AppProvider, useAppContext } from "../../../context/AppContext";
import { MusicEngineProvider } from "../../../context/MusicEngineContext";
import PianoKeyboard from "../PianoKeyboard";
import Fretboard from "../Fretboard";
import { BRICKS } from "../../../core/bricks";
import { getAbsoluteNoteValue } from "../../../core/theory";

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
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

const activeBrick = BRICKS[0];
const C2 = getAbsoluteNoteValue("C2");

function appProviderWrapper({ children }) {
  return <AppProvider>{children}</AppProvider>;
}

/** Same harness as VerticalOrientation.test.jsx: real useMusicEngine value. */
function HarnessInner({ children }) {
  const { notation } = useAppContext();
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
    dictRoot: 0,
    dictType: "single_note",
    dictActiveNotes: [],
    dictOctave: 0,
    notation,
    playbackInstrument: "piano",
    targetNotesPreset: "majorMinor",
  });
  const value = {
    ...musicState,
    appMode: "dictionary",
    activeBrick,
    dictType: null,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
    showFingering: true,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };
  return <MusicEngineProvider value={value}>{children}</MusicEngineProvider>;
}

function renderWithEngine(children) {
  const { result } = renderHook(() => useDictionaryMode(), { wrapper: appProviderWrapper });
  act(() => {
    result.current.setDictRoot(0);
    result.current.setDictType("single_note");
  });
  return render(
    <AppProvider>
      <HarnessInner>{children}</HarnessInner>
    </AppProvider>
  ).container;
}

const verticalKeys = (container) =>
  Array.from(container.querySelectorAll(".piano-vertical .piano-key")).map((el) => ({
    abs: Number(el.getAttribute("data-abs")),
    isBlack: el.classList.contains("black-key"),
  }));

describe("PianoKeyboard orientation=\"vertical\" windowOctaves (C-103 Step 3a)", () => {
  it("windowOctaves={2}: 2 octaves plus the closing C — 15 white keys, 10 black keys", () => {
    const container = renderWithEngine(<PianoKeyboard orientation="vertical" windowOctaves={2} />);
    expect(container.querySelector('[data-orientation="vertical"]').getAttribute("data-window-octaves")).toBe("2");
    const keys = verticalKeys(container);
    expect(keys.filter((k) => !k.isBlack)).toHaveLength(15);
    expect(keys.filter((k) => k.isBlack)).toHaveLength(10);
    expect(Math.min(...keys.map((k) => k.abs))).toBe(C2);
    expect(Math.max(...keys.map((k) => k.abs))).toBe(C2 + 24); // the closing C4
    // The white-key count is passed through for the layout grid.
    expect(container.querySelector(".piano-vertical").style.getPropertyValue("--piano-v-count")).toBe("15");
  });

  it("no windowOctaves keeps the full 4-octave keyboard (29 white keys)", () => {
    const container = renderWithEngine(<PianoKeyboard orientation="vertical" />);
    expect(container.querySelector('[data-orientation="vertical"]').getAttribute("data-window-octaves")).toBe("4");
    const keys = verticalKeys(container);
    expect(keys.filter((k) => !k.isBlack)).toHaveLength(29);
    expect(keys.filter((k) => k.isBlack)).toHaveLength(20);
  });
});

describe("Fretboard orientation=\"vertical\" fretWindow (C-103 Step 3a)", () => {
  it("draws the open-string row and only the window's frets", () => {
    const container = renderWithEngine(
      <Fretboard instrument="guitar" orientation="vertical" fretWindow={{ firstFret: 5, lastFret: 8 }} />
    );
    const neck = container.querySelector('[data-orientation="vertical"]');
    expect(neck.getAttribute("data-fret-window")).toBe("5-8");
    const frets = Array.from(neck.querySelectorAll(".fbv-fret-row")).map((r) => Number(r.getAttribute("data-fret")));
    expect(frets).toEqual([0, 5, 6, 7, 8]);
    expect(neck.querySelector('.fbv-fret-row[data-fret="0"]').classList.contains("fbv-row--open")).toBe(true);
  });

  it("no fretWindow keeps the full neck 0..22", () => {
    const container = renderWithEngine(<Fretboard instrument="guitar" orientation="vertical" />);
    const neck = container.querySelector('[data-orientation="vertical"]');
    expect(neck.getAttribute("data-fret-window")).toBe("1-22");
    const frets = Array.from(neck.querySelectorAll(".fbv-fret-row")).map((r) => Number(r.getAttribute("data-fret")));
    expect(frets).toEqual(Array.from({ length: 23 }, (_, f) => f));
  });
});
