// S1 prototype (VMU-135 / VMU-155) — orientation="vertical" on PianoKeyboard
// and Fretboard. Renders the REAL useDictionaryMode + useMusicEngine hooks and
// the REAL components, once horizontal and once vertical, from the same
// state, for the four scenarios of the S1 spec (Do majeur, Sol♯m7, gamme de
// Do majeur, La pentatonique mineure). What is asserted:
//
//   1. the vertical render lights the SAME pitches with the SAME role classes
//      and the SAME labels as the horizontal one (brief: "mêmes hauteurs,
//      mêmes rôles");
//   2. in the expected vertical order: piano high notes at the top (DOM/top
//      order descending in pitch), neck nut at the top (fret rows 0, 1, 2...
//      top to bottom) and low strings on the left (open-string pitch
//      ascending left to right).
//
// jsdom does no layout: every size is the Chromium probe's job
// (scripts/s1_probe.mjs), not this file's. matchMedia is forced to a 3840px
// window so the horizontal components show their full 4K extent (7 octaves,
// every fret), which is what the vertical ones are compared against.
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

const SCENARIOS = [
  { name: "Do majeur (accord)", dictRoot: 0, dictType: "chord_major" },
  { name: "Sol♯m7 (accord)", dictRoot: 8, dictType: "chord_m7" },
  { name: "gamme de Do majeur", dictRoot: 0, dictType: "scale_major" },
  { name: "La pentatonique mineure", dictRoot: 9, dictType: "scale_pentatonic_minor" },
];

const activeBrick = BRICKS[0];

function appProviderWrapper({ children }) {
  return <AppProvider>{children}</AppProvider>;
}

function dictionarySelection(dictRoot, dictType) {
  const { result } = renderHook(() => useDictionaryMode(), { wrapper: appProviderWrapper });
  act(() => {
    result.current.setDictRoot(dictRoot);
    result.current.setDictType(dictType);
  });
  return result.current;
}

function HarnessInner({ dictRoot, dictType, dictActiveNotes, orientation, children }) {
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
    dictRoot,
    dictType,
    dictActiveNotes,
    dictOctave: 0,
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
    // Real app defaults (AppContext.jsx): showFingering on, finger numbers off.
    showFingering: true,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };
  return <MusicEngineProvider value={value}>{children(orientation)}</MusicEngineProvider>;
}

function renderBoth(scenario, renderInstrument) {
  const sel = dictionarySelection(scenario.dictRoot, scenario.dictType);
  const mount = (orientation) =>
    render(
      <AppProvider>
        <HarnessInner
          dictRoot={scenario.dictRoot}
          dictType={scenario.dictType}
          dictActiveNotes={sel.activeNotes}
          orientation={orientation}
        >
          {renderInstrument}
        </HarnessInner>
      </AppProvider>
    ).container;
  return { horizontal: mount("horizontal"), vertical: mount("vertical") };
}

const roleOf = (el) => Array.from(el.classList).filter((c) => c.startsWith("role-")).sort().join(" ");

const C2 = getAbsoluteNoteValue("C2");
const C6 = getAbsoluteNoteValue("C6");

/** Horizontal piano: `.piano-key` in document order is ascending pitch from C2. */
function horizontalPianoActive(container) {
  return Array.from(container.querySelectorAll(".piano-key"))
    .map((el, k) => ({ abs: C2 + k, role: roleOf(el), label: el.querySelector(".note-label")?.textContent ?? "" }))
    .filter((k) => k.role && k.abs <= C6);
}

function verticalPianoKeys(container) {
  return Array.from(container.querySelectorAll(".piano-vertical .piano-key")).map((el) => ({
    el,
    abs: Number(el.getAttribute("data-abs")),
    role: roleOf(el),
    label: el.querySelector(".note-label")?.textContent ?? "",
    isBlack: el.classList.contains("black-key"),
    top: el.style.top,
  }));
}

/** Horizontal neck: row index = stringIndex; frets 0..numFrets in order (4K, offset 0). */
function horizontalNeckActive(container) {
  const out = [];
  container.querySelectorAll(".string-row").forEach((row, stringIndex) => {
    row.querySelectorAll(":scope > .fret").forEach((cell, fret) => {
      const m = cell.querySelector(".note-marker");
      if (m) out.push({ key: `${stringIndex}:${fret}`, role: roleOf(m), label: m.textContent });
    });
  });
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

function verticalNeckActive(container) {
  const out = [];
  container.querySelectorAll(".fbv-fret-row").forEach((row) => {
    const fret = Number(row.getAttribute("data-fret"));
    row.querySelectorAll(".fbv-cell").forEach((cell) => {
      const m = cell.querySelector(".note-marker");
      if (m) out.push({ key: `${cell.getAttribute("data-string-index")}:${fret}`, role: roleOf(m), label: m.textContent });
    });
  });
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

describe("PianoKeyboard orientation=\"vertical\"", () => {
  it.each(SCENARIOS)("$name: same active pitches, roles and labels as the horizontal keyboard", (scenario) => {
    const { horizontal, vertical } = renderBoth(scenario, (orientation) => <PianoKeyboard orientation={orientation} />);
    const h = horizontalPianoActive(horizontal);
    const v = verticalPianoKeys(vertical)
      .filter((k) => k.role)
      .map(({ abs, role, label }) => ({ abs, role, label }))
      .sort((a, b) => a.abs - b.abs);
    expect(h.length).toBeGreaterThan(0);
    expect(v).toEqual(h);
  });

  it("covers C2..C6 (29 white keys), high notes at the top, black keys straddling their neighbours", () => {
    const { vertical } = renderBoth(SCENARIOS[0], (o) => <PianoKeyboard orientation={o} />);
    expect(vertical.querySelector('[data-orientation="vertical"]')).not.toBeNull();
    const keys = verticalPianoKeys(vertical);
    const whites = keys.filter((k) => !k.isBlack);
    expect(whites).toHaveLength(29);
    expect(keys.filter((k) => k.isBlack)).toHaveLength(20);
    expect(Math.max(...keys.map((k) => k.abs))).toBe(C6);
    expect(Math.min(...keys.map((k) => k.abs))).toBe(C2);
    // White keys: DOM order is top to bottom (top = key pitch * index), pitch strictly descending.
    whites.forEach((k, idx) => {
      expect(k.top).toBe(`calc(var(--piano-v-key, 62px) * ${idx})`);
      if (idx > 0) expect(k.abs).toBeLessThan(whites[idx - 1].abs);
    });
    // Each black key sits on the top edge of the white key one semitone below it.
    const indexOf = new Map(whites.map((k, idx) => [k.abs, idx]));
    for (const b of keys.filter((k) => k.isBlack)) {
      expect(b.top).toBe(`calc(var(--piano-v-key, 62px) * ${indexOf.get(b.abs - 1)} - var(--piano-v-black, 36px) / 2)`);
    }
  });

  it("the horizontal render carries no vertical marker (default orientation)", () => {
    const { horizontal } = renderBoth(SCENARIOS[0], () => <PianoKeyboard />);
    expect(horizontal.querySelector('[data-orientation="vertical"]')).toBeNull();
    expect(horizontal.querySelector(".piano-container")).not.toBeNull();
  });
});

describe.each(["guitar", "bass"])("Fretboard %s orientation=\"vertical\"", (instrument) => {
  it.each(SCENARIOS)("$name: same active (string, fret) cells, roles and labels as the horizontal neck", (scenario) => {
    const { horizontal, vertical } = renderBoth(scenario, (orientation) => (
      <Fretboard instrument={instrument} orientation={orientation} />
    ));
    const h = horizontalNeckActive(horizontal);
    const v = verticalNeckActive(vertical);
    expect(h.length).toBeGreaterThan(0);
    expect(v).toEqual(h);
  });

  it("nut at the top (fret rows 0..numFrets downwards), low strings on the left", () => {
    const { vertical } = renderBoth(SCENARIOS[0], (o) => <Fretboard instrument={instrument} orientation={o} />);
    const frets = Array.from(vertical.querySelectorAll(".fbv-fret-row")).map((r) => Number(r.getAttribute("data-fret")));
    const numFrets = instrument === "bass" ? 20 : 22; // useFretboard.js getNumFrets
    expect(frets).toEqual(Array.from({ length: numFrets + 1 }, (_, f) => f));
    expect(vertical.querySelector(".fbv-fret-row").classList.contains("fbv-row--open")).toBe(true);

    // Open-string pitches (fret 0 row), left to right: strictly ascending.
    const openRow = vertical.querySelector('.fbv-fret-row[data-fret="0"]');
    const openPitches = Array.from(openRow.querySelectorAll(".fbv-cell")).map((c) => Number(c.getAttribute("data-abs")));
    expect(openPitches).toHaveLength(instrument === "bass" ? 4 : 6);
    openPitches.slice(1).forEach((p, i) => expect(p).toBeGreaterThan(openPitches[i]));

    // Fret n on a string is n semitones above its open pitch (geometry, not text, is turned).
    const row5 = vertical.querySelector('.fbv-fret-row[data-fret="5"]');
    Array.from(row5.querySelectorAll(".fbv-cell")).forEach((c, i) => {
      expect(Number(c.getAttribute("data-abs"))).toBe(openPitches[i] + 5);
    });
  });

  it("the horizontal render carries no vertical marker (default orientation)", () => {
    const { horizontal } = renderBoth(SCENARIOS[0], () => <Fretboard instrument={instrument} />);
    expect(horizontal.querySelector('[data-orientation="vertical"]')).toBeNull();
    expect(horizontal.querySelector(".string-row")).not.toBeNull();
  });
});
