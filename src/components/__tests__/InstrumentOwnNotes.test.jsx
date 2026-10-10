// INST-A1 — every instrument shows ITS OWN notes in the Dictionary, whichever
// instrument is chosen (Gabriel, 2026-10-05: "Chaque instrument doit afficher
// et jouer les notes qui lui sont propres").
//
// Before A1 the keyboard read `activeNotes`, the realization of the CHOSEN
// instrument (useMusicEngine.js: `realizations[playbackInstrument]`), and the
// necks read the same array for their labels, their roles and the horizontal
// neck's automatic window (useFretboard.js: `fretboardActiveNotes ||
// activeNotes`). Choosing the guitar therefore lit the guitar's grip on the
// piano, and moved the bass neck to the guitar's frets.
//
// What is asserted, through the REAL hooks in the order AppDesktop chains them
// (useDictionaryMode -> useMusicEngine -> useDictionaryPlayback) and the REAL
// PianoKeyboard and Fretboard, each in both orientations:
//
//   1. INVARIANCE — for X in {piano, guitar, bass} (x2 orientations), family in
//      {note, chord Do majeur, chord Sol#m7, scale Do majeur}, chosen in
//      {piano, guitar, bass}: what X lights (which key or cell, its classes, its
//      label, the window of a horizontal neck, the scrubber dots) is exactly
//      what X lights when X itself is the chosen instrument.
//   2. The brief's example as a domain value: Do majeur, guitar chosen, the
//      vertical piano lights C4 E4 G4 (middle C is C4 = MIDI 60).
//   3. The "now playing" animation of the piano: a note the guitar or the bass
//      plays (an item tagged with its instrument, as useDictionaryPlayback
//      publishes it) does not make a piano key flash; the piano's own play does.
//
// jsdom does no layout and its matchMedia only matches "(min-width: 2560px)"
// (setupTests.js): the horizontal piano shows 4 octaves (C2..B5) and a
// horizontal neck shows 5 frets plus the open string, so the neck's automatic
// window is exercised. Geometry is the Playwright probe's job
// (scripts/instruments_probe.mjs).
import React, { useEffect, useState } from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

// The playback hook schedules the animation through Tone's draw clock. Here the
// callbacks are queued, not run: the test decides which step it looks at.
const drawQueue = [];
vi.mock("tone", () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: (cb) => drawQueue.push(cb) })),
  Transport: { scheduleOnce: vi.fn(), start: vi.fn() },
}));
vi.mock("../../audio/AudioEngine", () => ({
  playDictionaryNote: vi.fn(),
}));

import { useDictionaryMode } from "../../hooks/useDictionaryMode";
import { useMusicEngine } from "../../hooks/useMusicEngine";
import { useDictionaryPlayback } from "../../hooks/useDictionaryPlayback";
import { AppProvider, useAppContext } from "../../context/AppContext";
import { MusicEngineProvider } from "../../context/MusicEngineContext";
import PianoKeyboard from "../Instruments/PianoKeyboard";
import Fretboard from "../Instruments/Fretboard";
import { BRICKS } from "../../core/bricks";
import { midiToNoteName } from "../../core/theory";

beforeEach(() => {
  drawQueue.length = 0;
});
afterEach(cleanup);

const activeBrick = BRICKS[0];
const INSTRUMENTS = ["piano", "guitar", "bass"];

const FAMILIES = [
  { label: "note : Do", root: 0, type: "single_note" },
  { label: "accord : Do majeur", root: 0, type: "chord_major" },
  { label: "accord : Sol#m7", root: 8, type: "chord_m7" },
  { label: "gamme : Do majeur", root: 0, type: "scale_major" },
];

/**
 * AppDesktop's Dictionary wiring, reduced to what the instruments read: the
 * selection, the chosen instrument (the big play button's), the "now playing"
 * notes, the engine and the playback hook. `controlsRef` hands the test the
 * playback functions of the latest render.
 */
function Session({ root, type, chosen, controlsRef }) {
  const { notation } = useAppContext();
  const dict = useDictionaryMode();
  const [playbackInstrument, setPlaybackInstrument] = useState(chosen);
  const [currentlyPlayingNotes, setCurrentlyPlayingNotes] = useState([]);

  useEffect(() => {
    dict.setDictRoot(root);
    dict.setDictType(type);
    // Once, on mount: what DictionaryPanel's selectors do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const engine = useMusicEngine({
    appMode: "dictionary",
    activeBrick,
    clickedChord: null,
    isPlaying: false,
    currentPlayingChord: null,
    currentAbsoluteNotes: [],
    chordOctaveOffset: 0,
    displayMode: "chord",
    selectedRootStringGuitar: dict.selectedRootStringGuitar,
    selectedRootStringBass: dict.selectedRootStringBass,
    selectedVoicingIndexGuitar: dict.selectedVoicingIndexGuitar,
    selectedVoicingIndexBass: dict.selectedVoicingIndexBass,
    dictRoot: dict.dictRoot,
    dictType: dict.dictType,
    dictActiveNotes: dict.activeNotes,
    dictOctave: dict.dictOctave,
    notation,
    playbackInstrument,
    targetNotesPreset: "majorMinor",
  });

  const playback = useDictionaryPlayback({
    dictRoot: dict.dictRoot,
    dictType: dict.dictType,
    dictOctave: dict.dictOctave,
    playbackInstrument,
    setPlaybackInstrument,
    guitarFingering: engine.guitarFingering,
    bassFingering: engine.bassFingering,
    activeBrick,
    realizationsByInstrument: engine.realizationsByInstrument,
    currentBpm: 120,
    lastClickedContext: null,
    setCurrentlyPlayingNotes,
    scheduler: {
      ensureAudioReady: () => Promise.resolve(),
      startPlaybackSession: () => 1,
      isCurrentSession: () => true,
    },
  });

  useEffect(() => {
    if (controlsRef) controlsRef.current = { ...playback, engine, playbackInstrument };
  });

  const value = {
    ...engine,
    appMode: "dictionary",
    activeBrick,
    dictType: dict.dictType,
    autoPlayNote: () => {},
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues: [],
    // The real app's defaults (AppContext.jsx).
    showFingering: true,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
    playbackInstrument,
  };

  return (
    <MusicEngineProvider value={value}>
      <div data-view="piano-h"><PianoKeyboard /></div>
      <div data-view="piano-v"><PianoKeyboard orientation="vertical" /></div>
      <div data-view="guitar-h"><Fretboard instrument="guitar" /></div>
      <div data-view="guitar-v"><Fretboard instrument="guitar" orientation="vertical" /></div>
      <div data-view="bass-h"><Fretboard instrument="bass" /></div>
      <div data-view="bass-v"><Fretboard instrument="bass" orientation="vertical" /></div>
    </MusicEngineProvider>
  );
}

function mount({ root, type, chosen, controlsRef }) {
  return render(
    <AppProvider>
      <Session root={root} type={type} chosen={chosen} controlsRef={controlsRef} />
    </AppProvider>
  ).container;
}

const classes = (el) => Array.from(el.classList).sort().join(" ");
const isLit = (el) => Array.from(el.classList).some((c) => c.startsWith("role-"));
const text = (el) => (el?.textContent ?? "").trim();
const lefts = (els) => Array.from(els).map((el) => el.style.left);

// --- What each view lights, as plain strings (equal views give equal lists) ---

/** Horizontal piano: keys in DOM order, so the index identifies the key. */
function pianoH(view) {
  const keys = Array.from(view.querySelectorAll(".piano-container .piano-key"));
  const lit = keys
    .map((el, i) => ({ el, i }))
    .filter(({ el }) => isLit(el))
    .map(({ el, i }) => `#${i} ${el.getAttribute("title")} | ${classes(el)} | ${text(el.querySelector(".note-label"))}`);
  return { lit, scrubber: lefts(view.querySelectorAll(".piano-scrubber-note")) };
}

/** Vertical piano: every key carries its pitch (data-abs). */
function pianoV(view) {
  const wrapper = view.querySelector(".piano-wrapper--vertical");
  const lit = Array.from(view.querySelectorAll(".piano-vertical .piano-key"))
    .filter(isLit)
    .map((el) => `${midiToNoteName(Number(el.getAttribute("data-abs")))} | ${classes(el)} | ${text(el.querySelector(".note-label"))}`)
    .sort();
  return { lit, window: wrapper?.getAttribute("data-window-start") ?? null };
}

/** Horizontal neck: the visible window, then string x cell (0 = open string). */
function neckH(view) {
  const lit = [];
  Array.from(view.querySelectorAll(".string-row")).forEach((row, s) => {
    Array.from(row.querySelectorAll(":scope > .fret")).forEach((cell, c) => {
      const marker = cell.querySelector(".note-marker");
      if (marker) lit.push(`s${s} c${c} | ${classes(marker)} | ${text(marker)}`);
    });
  });
  return {
    window: text(view.querySelector(".fret-range-label")),
    lit,
    scrubber: lefts(view.querySelectorAll(".scrubber-note")),
  };
}

/** Vertical neck: every cell carries its string and its fret. */
function neckV(view) {
  const lit = [];
  view.querySelectorAll(".fbv-fret-row").forEach((row) => {
    const fret = row.getAttribute("data-fret");
    row.querySelectorAll(".fbv-cell[data-string-index]").forEach((cell) => {
      const marker = cell.querySelector(".note-marker");
      if (marker) lit.push(`s${cell.getAttribute("data-string-index")} f${fret} | ${classes(marker)} | ${text(marker)}`);
    });
  });
  return { lit };
}

const VIEWS = [
  { id: "piano-h", owner: "piano", read: pianoH },
  { id: "piano-v", owner: "piano", read: pianoV },
  { id: "guitar-h", owner: "guitar", read: neckH },
  { id: "guitar-v", owner: "guitar", read: neckV },
  { id: "bass-h", owner: "bass", read: neckH },
  { id: "bass-v", owner: "bass", read: neckV },
];

/** Every view of one (family, chosen) state, read then unmounted. */
const snapshots = new Map();
function snapshotOf(family, chosen) {
  const key = `${family.type}/${family.root}/${chosen}`;
  if (!snapshots.has(key)) {
    const container = mount({ root: family.root, type: family.type, chosen });
    const views = {};
    for (const v of VIEWS) views[v.id] = v.read(container.querySelector(`[data-view="${v.id}"]`));
    snapshots.set(key, views);
    cleanup();
  }
  return snapshots.get(key);
}

/**
 * Views that light nothing for a selection, whatever is chosen, and why. The
 * invariance is still checked there (it holds trivially); only the "lights
 * something" guard is lifted, with its reason, rather than for every view.
 */
const NOTHING_TO_SEE = {
  // Do4 sits at fret 17 of the bass's G string, outside the 5 frets a
  // horizontal neck shows below 3840px; a single note's realization carries no
  // fret, so the neck's automatic window does not move to it (measured on
  // main, 57890e9: empty with every instrument chosen). The vertical bass
  // shows the whole neck and does light it.
  "single_note:bass-h": true,
};

describe("INST-A1 — what an instrument lights does not depend on the instrument chosen", () => {
  describe.each(FAMILIES)("$label", (family) => {
    it.each(VIEWS)("$id: the same with piano, guitar or bass chosen as with its own instrument chosen", (view) => {
      const own = snapshotOf(family, view.owner)[view.id];
      // Not vacuous: the instrument lights something for this selection.
      if (!NOTHING_TO_SEE[`${family.type}:${view.id}`]) {
        expect(own.lit.length, `${view.id} lights nothing with ${view.owner} chosen`).toBeGreaterThan(0);
      }
      for (const chosen of INSTRUMENTS) {
        expect(snapshotOf(family, chosen)[view.id], `${view.id} with ${chosen} chosen`).toEqual(own);
      }
    });
  });

  it("Do majeur, guitar chosen: the vertical piano lights C4 E4 G4, not the guitar's grip", () => {
    const container = mount({ root: 0, type: "chord_major", chosen: "guitar" });
    const lit = Array.from(container.querySelectorAll('[data-view="piano-v"] .piano-key'))
      .filter(isLit)
      .map((el) => Number(el.getAttribute("data-abs")))
      .sort((a, b) => a - b)
      .map(midiToNoteName);
    expect(lit).toEqual(["C4", "E4", "G4"]);
  });
});

describe("INST-A1 — the piano's 'now playing' animation follows the piano only", () => {
  /** Keys of the vertical piano currently flashing, by pitch name. */
  const pianoPlaying = (container) =>
    Array.from(container.querySelectorAll('[data-view="piano-v"] .piano-key.is-playing'))
      .map((el) => Number(el.getAttribute("data-abs")))
      .sort((a, b) => a - b)
      .map(midiToNoteName);
  /** Markers of a vertical neck currently flashing. */
  const neckPlaying = (container, id) =>
    container.querySelectorAll(`[data-view="${id}-v"] .note-marker.is-playing`).length;

  async function play(controls, id) {
    await act(async () => {
      await controls.current.playInstrument(id);
    });
  }

  it.each([
    ["guitar", "guitare"],
    ["bass", "basse"],
  ])("Do majeur, the %s plays: no piano key flashes, its own neck does", async (id) => {
    const controls = { current: null };
    const container = mount({ root: 0, type: "chord_major", chosen: "piano", controlsRef: controls });
    await play(controls, id);
    expect(neckPlaying(container, id), `the ${id} neck shows what it plays`).toBeGreaterThan(0);
    expect(pianoPlaying(container)).toEqual([]);
  });

  it("Do majeur, the piano plays: C4 E4 G4 flash on the piano", async () => {
    const controls = { current: null };
    const container = mount({ root: 0, type: "chord_major", chosen: "guitar", controlsRef: controls });
    await play(controls, "piano");
    expect(pianoPlaying(container)).toEqual(["C4", "E4", "G4"]);
  });

  it("gamme de Do majeur, first step: the guitar's note does not flash on the piano, the piano's does", async () => {
    const controls = { current: null };
    const container = mount({ root: 0, type: "scale_major", chosen: "piano", controlsRef: controls });

    await play(controls, "guitar");
    // The first scheduled draw callback lights the first step of the scale.
    expect(drawQueue.length).toBeGreaterThan(0);
    act(() => drawQueue[0]());
    expect(neckPlaying(container, "guitar"), "the guitar neck shows its first note").toBeGreaterThan(0);
    expect(pianoPlaying(container)).toEqual([]);

    drawQueue.length = 0;
    await play(controls, "piano");
    act(() => drawQueue[0]());
    expect(pianoPlaying(container)).toEqual(["C4"]);
  });
});
