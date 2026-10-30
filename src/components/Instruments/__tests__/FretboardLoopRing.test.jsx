// VMU-200 — the loop's ring is a RENDERED class, not just metadata.
//
// core/__tests__/loopNoteShapeNeck.test.js already pins computeFretMetadata's
// answer (isPlayingOutside on exactly one cell). That test kept passing when
// `is-playing-outside` was renamed in Fretboard.jsx — the class the view paints
// was never checked. This file closes that gap: it renders the REAL Fretboard
// (same harness shape as FretboardStringStatus.test.jsx) with the C major bass
// shape drawn and one loop bass note playing, and reads the marker's classes.
//
//   - a note OUTSIDE the shape (G#2, 44) -> one .is-playing-outside, no fill;
//   - a note INSIDE the shape (C2, 36)   -> one .is-playing, no ring.
//
// The horizontal neck shows five frets at a time and the outside note lands on
// fret 6, so matchMedia is pinned to the 4K branch — the same device
// VerticalOrientation.test.jsx uses to compare full necks. jsdom does no layout:
// the geometry of the ring itself is the Chromium probe's job
// (scripts/display_vs_sound_probe.mjs --shots=...), not this file's.
import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useMusicEngine } from "../../../hooks/useMusicEngine";
import { AppProvider } from "../../../context/AppContext";
import { MusicEngineProvider } from "../../../context/MusicEngineContext";
import Fretboard from "../Fretboard";
import { BRICKS } from "../../../core/bricks";
import { getAbsoluteNoteValue } from "../../../core/theory";

const originalMatchMedia = window.matchMedia;

beforeEach(() => {
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

function Harness({ playingNotes }) {
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
    dictType: "chord_major",
    dictActiveNotes: [],
    dictOctave: 0,
    notation: "us",
    playbackInstrument: "piano",
    targetNotesPreset: "majorMinor",
  });

  const value = {
    ...musicState,
    appMode: "dictionary",
    activeBrick,
    autoPlayNote: () => {},
    currentlyPlayingNotes: playingNotes,
    contextualScaleAbsoluteValues: [],
    dictType: "chord_major",
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
        <Fretboard instrument="bass" />
      </MusicEngineProvider>
    </AppProvider>
  );
}

const loopNote = (absoluteValue) => [{ absoluteValue, instrument: "bass", nearShape: true }];

describe("VMU-200 — the loop ring is rendered on the bass neck", () => {
  it("G#2 outside the C major shape: exactly one ring, no filled marker", () => {
    // The task's value, checked against the theory module rather than trusted.
    expect(getAbsoluteNoteValue("G#2")).toBe(44);

    const { container } = render(<Harness playingNotes={loopNote(44)} />);

    expect(container.querySelectorAll(".note-marker.is-playing-outside")).toHaveLength(1);
    expect(container.querySelectorAll(".note-marker.is-playing")).toHaveLength(0);
  });

  it("C2 inside the shape: exactly one filled marker, no ring", () => {
    expect(getAbsoluteNoteValue("C2")).toBe(36);

    const { container } = render(<Harness playingNotes={loopNote(getAbsoluteNoteValue("C2"))} />);

    expect(container.querySelectorAll(".note-marker.is-playing")).toHaveLength(1);
    expect(container.querySelectorAll(".note-marker.is-playing-outside")).toHaveLength(0);
  });
});
