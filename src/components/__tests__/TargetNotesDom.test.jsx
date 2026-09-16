// VMU-123 — DOM probe. Renders the REAL useMusicEngine hook plus the REAL
// PianoKeyboard and Fretboard (guitar, bass) components — no mocked
// music-engine values — so the CSS selectors this test asserts on are
// measured, not invented (per the brief's "Definition de termine").
//
// Scenario: "Studio at rest, click on the C-major chord, default preset" —
// the exact scenario the brief asks the report to describe with selectors.
// `currentAbsoluteNotes: [60, 64, 67]` is not a guess: it is what
// useStudioPlayback.handleChordClick actually computes for a first click
// with playbackInstrument "piano" (getClosestInversionN([], 0, [0,4,7], 0)),
// the app's default playback instrument (AppContext.jsx initialState).
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useMusicEngine } from "../../hooks/useMusicEngine";
import { AppProvider } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import Fretboard from "../Instruments/Fretboard";
import { BRICKS } from "../../core/bricks";

afterEach(cleanup);

// BRICKS[0]: do majeur, scale_major, standard guitar/bass tuning (same
// brick StudioPanel.test.jsx already relies on).
const activeBrick = BRICKS[0];
const clickedCMajor = { rootNote: { value: 0 }, nns: "1" };

function Harness({ preset }) {
  const musicState = useMusicEngine({
    appMode: "studio",
    activeBrick,
    clickedChord: clickedCMajor,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes: [60, 64, 67], // C4 E4 G4 — see file header
    chordOctaveOffset: 0,
    displayMode: "chord",
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: 0,
    dictType: null,
    dictActiveNotes: [],
    dictOctave: 0,
    notation: "us",
    playbackInstrument: "piano",
    targetNotesPreset: preset,
  });

  const value = {
    ...musicState,
    appMode: "studio",
    activeBrick,
    autoPlayNote: () => {},
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
    dictType: null,
    showFingering: true,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };

  return (
    <AppProvider>
      <MusicEngineProvider value={value}>
        <PianoKeyboard />
        <Fretboard instrument="guitar" />
        <Fretboard instrument="bass" />
      </MusicEngineProvider>
    </AppProvider>
  );
}

/** Piano keys carrying the target CSS class, as { noteLabel, noteValue }. */
function pianoTargetKeys(container) {
  return Array.from(container.querySelectorAll(".piano-key.role-target")).map((el) => ({
    title: el.getAttribute("title"),
  }));
}

/** Fretboard note-markers carrying the target CSS class, per instrument container. */
function fretboardTargetMarkers(container, instrument) {
  const root = container.querySelector(`.fretboard-container.instrument-${instrument}`);
  return Array.from(root.querySelectorAll(".note-marker.is-target-note"));
}

describe("VMU-123 DOM probe — Studio at rest, C major clicked, default preset (majorMinor)", () => {
  it("marks exactly the C4/C5 (root, C) piano keys that are NOT the target, and the E keys (the 3rd) as role-target", () => {
    const { container } = render(<Harness preset="majorMinor" />);
    const targetKeys = pianoTargetKeys(container);
    // Every role-target piano key must be an E (the 3rd of C major, the
    // only note majorMinor marks) — never C (root) or G (5th).
    expect(targetKeys.length).toBeGreaterThan(0);
    for (const k of targetKeys) {
      expect(k.title).toMatch(/^E \//);
    }
  });

  it("the guitar fretboard shows at least one is-target-note marker", () => {
    // Label text is NOT asserted here: in Studio with showFingering on, the
    // guitar's active cells come from its OWN fingering/voicing mask
    // (resolveVoicingMask), not from the theoretical [60,64,67] register —
    // pre-existing, unrelated to VMU-123. Measured: a fretted cell whose
    // absoluteValue matches the theory set shows the degree ("3"); one that
    // doesn't (same pitch class, different octave on the neck) falls back
    // to the note name ("Mi", EU default) — both correctly carry
    // is-target-note, which is what this ticket is responsible for.
    const { container } = render(<Harness preset="majorMinor" />);
    const guitarTargets = fretboardTargetMarkers(container, "guitar");
    expect(guitarTargets.length).toBeGreaterThan(0);
    for (const marker of guitarTargets) {
      expect(["3", "Mi"]).toContain(marker.textContent);
    }
  });

  it("the bass fretboard NEVER shows a target marker, even though the bass neck contains the same E notes (brief decision #4)", () => {
    const { container } = render(<Harness preset="majorMinor" />);
    const bassTargets = fretboardTargetMarkers(container, "bass");
    expect(bassTargets).toHaveLength(0);
    // Sanity: the bass DOES render the chord's notes (it is not simply
    // empty) — it just never marks any of them as a target.
    const bassRoot = container.querySelector(".fretboard-container.instrument-bass");
    const bassActiveMarkers = bassRoot.querySelectorAll(".note-marker");
    expect(bassActiveMarkers.length).toBeGreaterThan(0);
  });
});

describe("VMU-123 DOM probe — same scenario, preset skeleton", () => {
  it("marks the C (root) and G (5th) piano keys as role-target, never E", () => {
    const { container } = render(<Harness preset="skeleton" />);
    const targetKeys = pianoTargetKeys(container);
    expect(targetKeys.length).toBeGreaterThan(0);
    for (const k of targetKeys) {
      expect(k.title).toMatch(/^(C|G) \//);
    }
    // Both the root and the 5th must appear at least once.
    expect(targetKeys.some((k) => k.title.startsWith("C /"))).toBe(true);
    expect(targetKeys.some((k) => k.title.startsWith("G /"))).toBe(true);
  });

  it("the bass fretboard still shows nothing, under skeleton too", () => {
    const { container } = render(<Harness preset="skeleton" />);
    expect(fretboardTargetMarkers(container, "bass")).toHaveLength(0);
  });
});

describe("VMU-123 DOM probe — preset off", () => {
  it("no instrument shows any role-target / is-target-note anywhere", () => {
    const { container } = render(<Harness preset="off" />);
    expect(pianoTargetKeys(container)).toHaveLength(0);
    expect(fretboardTargetMarkers(container, "guitar")).toHaveLength(0);
    expect(fretboardTargetMarkers(container, "bass")).toHaveLength(0);
  });
});

describe("VMU-123 DOM probe — changing preset changes the marked piano keys (TDD point 3)", () => {
  it("re-rendering from majorMinor to skeleton moves the marked key from E to C/G", () => {
    const { container, rerender } = render(<Harness preset="majorMinor" />);
    const before = pianoTargetKeys(container).map((k) => k.title);
    expect(before.every((t) => t.startsWith("E /"))).toBe(true);

    rerender(<Harness preset="skeleton" />);
    const after = pianoTargetKeys(container).map((k) => k.title);
    expect(after.every((t) => t.startsWith("C /") || t.startsWith("G /"))).toBe(true);
    expect(after).not.toEqual(before);
  });
});
