// L1a-fix1 (Gabriel, 2026-10-05, ?prototype=a) — "Il manque les repères
// visuels dans les manches (cases 3, 5, 7, 9, 12, 15, 17, 19 et 21)".
//
// What is asserted, on the REAL vertical Fretboard (real hooks, jsdom):
//
//   1. a dot (data-fret-marker="<n>") on frets 3, 5, 7, 9, 15, 17, 19, 21 and
//      two on 12 — and nowhere else (the attribute is absent off the list);
//   2. only the frets a neck has: the guitar's 22, the bass's 20 (no 21 on a
//      bass, nothing drawn for a fret that does not exist);
//   3. each dot lives in the row of its own fret, so it moves with that row
//      (one position function, not a second calculation), and comes before
//      the cells in the row so the pastilles paint over it;
//   4. each fret row from 1 carries its pitch as the CSS variable the
//      stylesheet reads (--fbv-pitch), the open-string row does not.
//
// Amendment (coordinator): every dot is centred between the two MIDDLE
// strings (guitar D / G, bass A / D); the double dot on 12 is two dots in that
// same band, one above the other along the neck, so each carries a vertical
// offset (--fbv-inlay-dy: -1 and +1, 0 for a single dot).
//
// jsdom does no layout: that the dots sit between strings, at the middle of
// the case, and under the pastilles is the Chromium probe's job
// (scripts/s1_probe.mjs, S1-17), not this file's.
import React from "react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, renderHook, act } from "@testing-library/react";
import { useDictionaryMode } from "../../../hooks/useDictionaryMode";
import { useMusicEngine } from "../../../hooks/useMusicEngine";
import { AppProvider, useAppContext } from "../../../context/AppContext";
import { MusicEngineProvider } from "../../../context/MusicEngineContext";
import Fretboard from "../Fretboard";
import { verticalFretPitch } from "../verticalNeckGeometry";
import { BRICKS } from "../../../core/bricks";

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

function appProviderWrapper({ children }) {
  return <AppProvider>{children}</AppProvider>;
}

function Harness({ dictRoot, dictType, dictActiveNotes, children }) {
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
    showFingering: true,
    showFingerNumbers: false,
    fretboardZone: "all",
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };
  return <MusicEngineProvider value={value}>{children}</MusicEngineProvider>;
}

function renderNeck(instrument) {
  const { result } = renderHook(() => useDictionaryMode(), { wrapper: appProviderWrapper });
  act(() => {
    result.current.setDictRoot(0);
    result.current.setDictType("chord_major");
  });
  const sel = result.current;
  return render(
    <AppProvider>
      <Harness dictRoot={0} dictType="chord_major" dictActiveNotes={sel.activeNotes}>
        <Fretboard instrument={instrument} orientation="vertical" />
      </Harness>
    </AppProvider>
  ).container;
}

const EXPECTED = {
  guitar: { frets: 22, dots: { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 } },
  bass: { frets: 20, dots: { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1 } },
};

describe.each(["guitar", "bass"])("vertical %s neck: fret markers", (instrument) => {
  const { frets, dots } = EXPECTED[instrument];

  it("draws a dot per fret Gabriel named (two on 12) and nothing on any other fret", () => {
    const neck = renderNeck(instrument);
    for (let fret = 0; fret <= frets; fret++) {
      const row = neck.querySelector(`.fbv-fret-row[data-fret="${fret}"]`);
      const inRow = row.querySelectorAll("[data-fret-marker]");
      expect(inRow.length, `fret ${fret}`).toBe(dots[fret] ?? 0);
    }
  });

  it("carries every marker in the page as data-fret-marker, in the list and only there", () => {
    const neck = renderNeck(instrument);
    const all = Array.from(neck.querySelectorAll("[data-fret-marker]")).map((d) => Number(d.getAttribute("data-fret-marker")));
    const expected = Object.entries(dots).flatMap(([fret, n]) => Array(n).fill(Number(fret)));
    expect(all.sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b));
  });

  it("puts each dot in the row of its own fret, before the cells (the pastilles paint over it)", () => {
    const neck = renderNeck(instrument);
    // Not vacuous: the loop below must have something to look at.
    expect(neck.querySelectorAll("[data-fret-marker]").length).toBeGreaterThan(0);
    for (const dot of neck.querySelectorAll("[data-fret-marker]")) {
      const row = dot.closest(".fbv-fret-row");
      expect(row.getAttribute("data-fret")).toBe(dot.getAttribute("data-fret-marker"));
      const firstCell = row.querySelector(".fbv-cell");
      // DOCUMENT_POSITION_FOLLOWING (4): the cell comes after the dot.
      expect(dot.compareDocumentPosition(firstCell) & 4, `dot ${dot.getAttribute("data-fret-marker")} before the cells`).toBe(4);
    }
  });

  it("is decoration: no text, hidden from assistive technology", () => {
    const neck = renderNeck(instrument);
    expect(neck.querySelectorAll("[data-fret-marker]").length).toBeGreaterThan(0);
    for (const dot of neck.querySelectorAll("[data-fret-marker]")) {
      expect(dot.textContent).toBe("");
      expect(dot.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("tells its two dots on fret 12 apart (one above the other, either side of the case's middle)", () => {
    const neck = renderNeck(instrument);
    const offsets = Array.from(neck.querySelectorAll('[data-fret-marker="12"]')).map((d) => d.style.getPropertyValue("--fbv-inlay-dy"));
    expect(offsets).toEqual(["-1", "1"]);
    // A single dot is on the case's middle: no offset.
    const single = neck.querySelector('[data-fret-marker="3"]');
    expect(["", "0"]).toContain(single.style.getPropertyValue("--fbv-inlay-dy"));
  });

  it("keeps every dot in the band between the two middle strings: no horizontal shift variable at all", () => {
    const neck = renderNeck(instrument);
    expect(neck.querySelectorAll("[data-fret-marker]").length).toBeGreaterThan(0);
    for (const dot of neck.querySelectorAll("[data-fret-marker]")) {
      expect(dot.style.getPropertyValue("--fbv-inlay-shift")).toBe("");
    }
  });

  it("gives each fret row from 1 its pitch as --fbv-pitch, and the open-string row none", () => {
    const neck = renderNeck(instrument);
    expect(neck.querySelector('.fbv-fret-row[data-fret="0"]').style.getPropertyValue("--fbv-pitch")).toBe("");
    for (let fret = 1; fret <= frets; fret++) {
      const row = neck.querySelector(`.fbv-fret-row[data-fret="${fret}"]`);
      expect(row.style.getPropertyValue("--fbv-pitch"), `fret ${fret}`).toBe(`${verticalFretPitch(fret, frets)}px`);
    }
  });
});
