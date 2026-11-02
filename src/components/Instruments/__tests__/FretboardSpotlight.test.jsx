// VMU-203 — DOM probe for the spotlight. Renders the REAL useMusicEngine plus
// the REAL Fretboard (same harness shape as DegreeRoleDom / FretboardLoopRing)
// and reads the classes the view paints:
//
//   - the neck's container carries `.is-running` only in the Studio while the
//     sequencer's isPlaying is true (the Dictionary is gated out);
//   - the playing note keeps its role (is-playing + role-root on the same cell);
//   - the target note keeps is-target-note (its thicker playing ring is a CSS
//     rule, pinned in FretboardSpotlightCascade.test.js);
//   - a loop note outside the shape keeps is-playing-outside;
//   - a Dictionary scale neck keeps its role-scale markers and never runs.
//
// jsdom resolves no CSS, so opacity/box-shadow are not measured here — that is
// the Chromium probe's job (scripts/display_vs_sound_probe.mjs).
import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";
import { useMusicEngine } from "../../../hooks/useMusicEngine";
import { useDictionaryMode } from "../../../hooks/useDictionaryMode";
import { AppProvider } from "../../../context/AppContext";
import { MusicEngineProvider } from "../../../context/MusicEngineContext";
import Fretboard from "../Fretboard";
import { BRICKS } from "../../../core/bricks";

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  // Full neck (the horizontal neck otherwise shows only 5 frets, and the C
  // cells must stay visible whatever the auto-window does).
  window.matchMedia = (query) => ({
    matches: query === "(min-width: 3840px)",
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
const clickedCMajor = { rootNote: { value: 0 }, nns: "1" };

function Harness({
  appMode = "studio",
  isPlaying = false,
  playingNotes = [],
  instrument = "guitar",
  dictType = null,
  dictRoot = 0,
  dictActiveNotes = [],
  clickedChord = null,
  currentAbsoluteNotes = [],
  targetNotesPreset = "majorMinor",
  showFingering = false,
}) {
  const musicState = useMusicEngine({
    appMode,
    activeBrick,
    clickedChord,
    isPlaying,
    currentPlayingChord: null,
    currentAbsoluteNotes,
    chordOctaveOffset: 0,
    displayMode: "chord",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot,
    dictType,
    dictActiveNotes,
    dictOctave: 0,
    notation: "us",
    playbackInstrument: "piano",
    targetNotesPreset,
  });

  const value = {
    ...musicState,
    appMode,
    activeBrick,
    isPlaying,
    autoPlayNote: () => {},
    currentlyPlayingNotes: playingNotes,
    contextualScaleAbsoluteValues: [],
    dictType,
    showFingering,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };

  return (
    <AppProvider>
      <MusicEngineProvider value={value}>
        <Fretboard instrument={instrument} />
      </MusicEngineProvider>
    </AppProvider>
  );
}

const containerClass = (container, instrument = "guitar") =>
  container.querySelector(`.fretboard-container.instrument-${instrument}`)?.className ?? "";

describe("VMU-203 — the neck knows when the Studio loop runs", () => {
  it("carries is-running while the sequencer plays in the Studio", () => {
    const { container } = render(<Harness isPlaying />);
    expect(containerClass(container)).toContain("is-running");
  });

  it("does not carry is-running at rest (Studio, isPlaying false)", () => {
    const { container } = render(<Harness isPlaying={false} />);
    expect(containerClass(container)).not.toContain("is-running");
  });

  it("does not carry is-running in the Dictionary even if isPlaying is true", () => {
    const { container } = render(
      <Harness appMode="dictionary" dictType="chord_major" isPlaying />
    );
    expect(containerClass(container)).not.toContain("is-running");
  });
});

describe("VMU-203 — the spotlight's DOM state", () => {
  it("a playing root keeps both is-playing and role-root on the same cell", () => {
    // The Studio default triad is C3 E3 G3 (useMusicEngine.js): C3 = 48, root.
    const { container } = render(
      <Harness isPlaying playingNotes={[{ absoluteValue: 48, instrument: "guitar" }]} />
    );

    expect(container.querySelectorAll(".note-marker.is-playing.role-root").length).toBeGreaterThan(0);
  });

  it("the target note keeps is-target-note while it plays", () => {
    // C major clicked, majorMinor preset -> the 3rd (E) is the target. E4 = 64.
    const { container } = render(
      <Harness
        isPlaying
        clickedChord={clickedCMajor}
        currentAbsoluteNotes={[60, 64, 67]}
        playingNotes={[{ absoluteValue: 64, instrument: "guitar" }]}
      />
    );

    expect(container.querySelectorAll(".note-marker.is-playing.is-target-note").length).toBeGreaterThan(0);
  });

  it("a playing target keeps is-playing.is-target-note even when the loop is not running", () => {
    // The pushed target ring is a plain .note-marker rule, not gated by
    // .is-running: the class pair must survive with the container at rest.
    const { container } = render(
      <Harness
        isPlaying={false}
        clickedChord={clickedCMajor}
        currentAbsoluteNotes={[60, 64, 67]}
        playingNotes={[{ absoluteValue: 64, instrument: "guitar" }]}
      />
    );

    expect(containerClass(container)).not.toContain("is-running");
    expect(container.querySelectorAll(".note-marker.is-playing.is-target-note").length).toBeGreaterThan(0);
  });

  it("a loop note outside the shape keeps is-playing-outside while running", () => {
    // G#2 = 44, outside the C major bass shape (same shape FretboardLoopRing
    // proves in the Dictionary; the Studio draws the same getBassFingering).
    const { container } = render(
      <Harness
        isPlaying
        instrument="bass"
        clickedChord={clickedCMajor}
        currentAbsoluteNotes={[60, 64, 67]}
        showFingering
        playingNotes={[{ absoluteValue: 44, instrument: "bass", nearShape: true }]}
      />
    );

    expect(containerClass(container, "bass")).toContain("is-running");
    expect(container.querySelectorAll(".note-marker.is-playing-outside")).toHaveLength(1);
    expect(container.querySelectorAll(".note-marker.is-playing")).toHaveLength(0);
  });
});

describe("VMU-203 — a Dictionary scale neck keeps its look and never runs", () => {
  it("keeps role-scale markers and carries no is-running", () => {
    const { result } = renderHook(() => useDictionaryMode(), { wrapper: AppProvider });
    act(() => {
      result.current.setDictRoot(0);
      result.current.setDictType("scale_major");
    });
    const activeNotes = result.current.activeNotes;

    const { container } = render(
      <Harness
        appMode="dictionary"
        dictType="scale_major"
        dictRoot={0}
        dictActiveNotes={activeNotes}
        instrument="guitar"
      />
    );

    expect(containerClass(container)).not.toContain("is-running");
    expect(container.querySelectorAll(".note-marker.role-scale").length).toBeGreaterThan(0);
  });
});
