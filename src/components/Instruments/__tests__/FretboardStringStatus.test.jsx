// VMU-154 — guitar's unplayed-string row (`.string-status-symbol`, rendered
// by Fretboard.jsx's renderStatusRow) came out entirely blank for open
// chords in Dictionary mode: no "X" on a muted string, no "O" on an open
// one. Root cause (read from the real data, not guessed — see the ticket
// brief and the coordinator's report):
//
//   1. fingeringLogic.js's shapeToFingeringObj() represents a muted guitar
//      string as `{ muted: true }`. useMusicEngine.js's toV2() — which
//      builds the `{ fret, status, finger }` shape both the renderer and
//      fretboardUtils.resolveStringStatus() read — only recognises an
//      unplayed string as `!stringData` (absent, the bass convention) or
//      `stringData.X` (a property literally named "X"). `{ muted: true }`
//      matches neither, so toV2 falls into its "played" branch and computes
//      `fret: NaN` (no numeric key on `{ muted: true }`) — which then
//      matches none of the renderer's status/fret combinations, so the cell
//      renders blank instead of "X".
//   2. A guitar open string produces the raw shape `{ 0: 'O' }`, which toV2
//      *does* recognise (`stringData[0] === 'O'`) and turns into
//      `status: 'open'` — but Fretboard.jsx's renderer never checked for
//      `status === 'open'`, only `status === 'played' && fret === 0`. Bass's
//      open strings happen to go through that exact 'played'+fret-0 path
//      (bass never marks opens specially), which is why bass was unaffected
//      and is the non-regression case below.
//
// This test renders the REAL useMusicEngine hook plus the REAL Fretboard
// component in Dictionary mode (same pattern as DegreeRoleDom.test.jsx) and
// reads the rendered `.string-status-symbol` row — the same probe the
// coordinator runs in Chromium (selector + class named in the ticket
// report).
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useMusicEngine } from "../../../hooks/useMusicEngine";
import { AppProvider } from "../../../context/AppContext";
import { MusicEngineProvider } from "../../../context/MusicEngineContext";
import Fretboard from "../Fretboard";
import { BRICKS } from "../../../core/bricks";

afterEach(cleanup);

const activeBrick = BRICKS[0];

function Harness({ dictRoot, dictType, instrument }) {
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
    currentlyPlayingNotes: [],
    contextualScaleAbsoluteValues: [],
    dictType,
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
        <Fretboard instrument={instrument} />
      </MusicEngineProvider>
    </AppProvider>
  );
}

/**
 * Reads the string-status row for one instrument: one entry per string, in
 * DOM order, which is stringIndex order (0 = highest string, per
 * Fretboard.jsx's own comment on renderStatusRow / the fingering shapes'
 * indexing).
 */
function statusSymbols(container, instrument) {
  const root = container.querySelector(`.fretboard-container.instrument-${instrument}`);
  return Array.from(root.querySelectorAll(".string-status-symbol")).map((el) => ({
    text: el.textContent,
    classes: Array.from(el.classList).filter((c) => c !== "string-status-symbol"),
  }));
}

describe("VMU-154 — guitar string-status row (X / O) in Dictionary mode", () => {
  it("Do majeur, open position (x-3-2-0-1-0): X on the low E, O on the open G and high E", () => {
    const { container } = render(<Harness instrument="guitar" dictRoot={0} dictType="chord_major" />);
    const symbols = statusSymbols(container, "guitar");

    // index: 0=high E, 1=B, 2=G, 3=D, 4=A, 5=low E
    expect(symbols).toEqual([
      { text: "O", classes: ["is-open"] },   // high E, open
      { text: "", classes: [] },              // B, fret 1
      { text: "O", classes: ["is-open"] },   // G, open
      { text: "", classes: [] },              // D, fret 2
      { text: "", classes: [] },              // A, fret 3
      { text: "X", classes: ["is-muted"] },  // low E, muted
    ]);
  });

  it("La mineur, open position (x-0-2-2-1-0): X on the low E, O on the open A and high E", () => {
    const { container } = render(<Harness instrument="guitar" dictRoot={9} dictType="chord_minor" />);
    const symbols = statusSymbols(container, "guitar");

    expect(symbols).toEqual([
      { text: "O", classes: ["is-open"] },   // high E, open
      { text: "", classes: [] },              // B, fret 1
      { text: "", classes: [] },              // G, fret 2
      { text: "", classes: [] },              // D, fret 2
      { text: "O", classes: ["is-open"] },   // A, open
      { text: "X", classes: ["is-muted"] },  // low E, muted
    ]);
  });

  it("Ré majeur, open position (x-x-0-2-3-2): X on the low E and A, O on the open D", () => {
    const { container } = render(<Harness instrument="guitar" dictRoot={2} dictType="chord_major" />);
    const symbols = statusSymbols(container, "guitar");

    expect(symbols).toEqual([
      { text: "", classes: [] },              // high E, fret 2
      { text: "", classes: [] },              // B, fret 3
      { text: "", classes: [] },              // G, fret 2
      { text: "O", classes: ["is-open"] },   // D, open
      { text: "X", classes: ["is-muted"] },  // A, muted
      { text: "X", classes: ["is-muted"] },  // low E, muted
    ]);
  });
});

describe("VMU-154 — bass string-status row: non-regression", () => {
  it("Do majeur on bass: the string(s) outside the voicing still show X (is-muted), unchanged", () => {
    const { container } = render(<Harness instrument="bass" dictRoot={0} dictType="chord_major" />);
    const symbols = statusSymbols(container, "bass");

    expect(symbols).toHaveLength(4);
    // Bass voicings only ever fill root/fifth/octave — at least one of the 4
    // strings is always left out and must keep reading "X" (is-muted),
    // exactly as before this fix (decision #3 of the brief: no bass change).
    expect(symbols.some((s) => s.text === "X" && s.classes.includes("is-muted"))).toBe(true);
  });
});
