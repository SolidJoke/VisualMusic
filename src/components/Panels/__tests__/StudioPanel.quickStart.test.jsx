/**
 * VMU-161 — the Studio's Quick Start buttons and the "classic cadence" option.
 *
 * A Quick Start loads the chords of the style's scale (core/quickStart.js);
 * the option, off by default, makes the chord on the 5 a dominant, and
 * re-reads the Quick Start that is already loaded. jsdom does no layout, so
 * this holds the wiring, not the look.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import StudioPanel from "../StudioPanel";
import { BRICKS } from "../../../core/bricks";
import { translations } from "../../../i18n/translations";

let mockLang = "en";
vi.mock("../../../context/AppContext", () => ({
  useAppContext: () => ({
    lang: mockLang,
    txt: translations[mockLang],
    notation: "us",
    state: { uiTheme: "modern" },
  }),
}));

afterEach(() => {
  cleanup();
  mockLang = "en";
});

// E phrygian: II-V-I is Fmaj7, Bm7b5, Em7 — "2Maj7 5m7b5 1-7" — and with the cadence B7: "57".
const phrygianIndex = BRICKS.findIndex((b) => b.rootValue === 4 && b.scaleKey === "scale_phrygian");
const brick = BRICKS[phrygianIndex];
const II_V_I = ["2Maj7", "5m7b5", "1-7"];
const II_V_I_CADENCE = ["2Maj7", "57", "1-7"];

function renderPanel(props = {}) {
  const setCustomProgression = vi.fn();
  render(
    <StudioPanel
      currentBrickIndex={phrygianIndex}
      setCurrentBrickIndex={vi.fn()}
      activeBrick={brick}
      currentTheme="A"
      setCurrentTheme={vi.fn()}
      chordOctaveOffset={0}
      setChordOctaveOffset={vi.fn()}
      setCurrentAbsoluteNotes={vi.fn()}
      activeProgression={brick.nnsProgression}
      clickedChord={null}
      setClickedChord={vi.fn()}
      handleChordClick={vi.fn()}
      inversionText=""
      suggestedBassTrack={null}
      setSuggestedBassTrack={vi.fn()}
      setCustomProgression={setCustomProgression}
      customRhythm={null}
      setCustomRhythm={vi.fn()}
      {...props}
    />,
  );
  return setCustomProgression;
}

describe("VMU-161 — Quick Start buttons", () => {
  it("the data this test relies on is there (a phrygian style on E)", () => {
    expect(phrygianIndex).toBeGreaterThanOrEqual(0);
  });

  it("offers four patterns, the II-V-I once and without 'major' or 'minor'", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "II-V-I" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Majeur|Mineur/ })).toBeNull();
    ["Pop Standard I-V-vi-IV", "Turnaround Jazz I-vi-ii-V", "R&B / Neo-Soul IV-iii-vi"].forEach((name) =>
      expect(screen.getByRole("button", { name })).toBeTruthy(),
    );
  });

  it("loads the chords of the style's scale by default", () => {
    const setCustomProgression = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "II-V-I" }));
    expect(setCustomProgression).toHaveBeenCalledWith(II_V_I);
  });

  it("loads the dominant on the 5 once the classic cadence is chosen", () => {
    const setCustomProgression = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Classic cadence/ }));
    expect(setCustomProgression).not.toHaveBeenCalled(); // nothing loaded yet: nothing to re-read
    fireEvent.click(screen.getByRole("button", { name: "II-V-I" }));
    expect(setCustomProgression).toHaveBeenCalledWith(II_V_I_CADENCE);
  });

  it("re-reads the Quick Start that is loaded when the option changes, and only the 5 changes", () => {
    const setCustomProgression = renderPanel({ activeProgression: II_V_I });
    fireEvent.click(screen.getByRole("button", { name: /Classic cadence/ }));
    expect(setCustomProgression).toHaveBeenCalledTimes(1);
    expect(setCustomProgression).toHaveBeenCalledWith(II_V_I_CADENCE);
    expect(II_V_I.filter((degree, i) => degree !== II_V_I_CADENCE[i])).toEqual(["5m7b5"]);
  });

  it("does not touch the progression when the option changes with no Quick Start loaded", () => {
    const setCustomProgression = renderPanel({ activeProgression: brick.nnsProgression });
    fireEvent.click(screen.getByRole("button", { name: /Classic cadence/ }));
    expect(setCustomProgression).not.toHaveBeenCalled();
  });

  it("marks the loaded Quick Start and the chosen option as pressed", () => {
    renderPanel({ activeProgression: II_V_I });
    expect(screen.getByRole("button", { name: "II-V-I" }).className).toContain("active");
    expect(screen.getByRole("button", { name: "Style chords" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Classic cadence/ }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("VMU-161 — the labels exist in the four languages", () => {
  it.each(["fr", "en", "pt", "zh"])("%s", (lang) => {
    const { quickStart } = translations[lang];
    expect(quickStart.names.jazz_251_maj).toBeTruthy();
    expect(quickStart.styleChords).toBeTruthy();
    expect(quickStart.classicCadence).toBeTruthy();
    expect(quickStart.tooltip.length).toBeGreaterThan(40);
  });

  it("the buttons read the chosen language", () => {
    mockLang = "fr";
    renderPanel();
    expect(screen.getByRole("button", { name: "Accords du style" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Cadence classique/ })).toBeTruthy();
  });
});
