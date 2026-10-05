/**
 * VMU-169 / VMU-170 — what the Studio panel writes under "magic progression":
 * the chord's full name, and the quality (Maj. / Min. / Dim.) printed below it.
 *
 * VMU-169: a Quick Start's chords were shown by root and "m" / "dim" only: with
 * the II-V-I on E phrygian, which sounds Fmaj7, Bm7b5, Em7, the panel said
 * "Fa", "Sim", "Mim" (US "F", "Bm", "Em"). The seventh was gone from the screen,
 * and Bm7b5 read as a minor chord.
 *
 * VMU-170: the quality line was read by hand off the symbol (`nns.includes('m')`
 * ...), a second reading of the chord symbols beside theory.js's. It must give
 * what the chord's type gives.
 *
 * The test is driven the way a user does it: a stateful parent holds the
 * progression, the buttons load it, and what is read is the panel's DOM text.
 * jsdom does no layout, so a name that is too long for its box is a matter for
 * the layout probe, not for this file.
 */
import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import StudioPanel from "../StudioPanel";
import { BRICKS } from "../../../core/bricks";
import { translations } from "../../../i18n/translations";

let mockNotation = "us";
vi.mock("../../../context/AppContext", () => ({
  useAppContext: () => ({
    lang: "en",
    txt: translations.en,
    notation: mockNotation,
    state: { uiTheme: "modern" },
  }),
}));

afterEach(() => {
  cleanup();
  mockNotation = "us";
});

const styleIndex = (rootValue, scaleKey) => BRICKS.findIndex((b) => b.rootValue === rootValue && b.scaleKey === scaleKey);

function Harness({ index, initial }) {
  const brick = BRICKS[index];
  const [progression, setProgression] = useState(initial ?? brick.nnsProgression);
  return (
    <StudioPanel
      currentBrickIndex={index}
      setCurrentBrickIndex={() => {}}
      activeBrick={brick}
      currentTheme="A"
      setCurrentTheme={() => {}}
      chordOctaveOffset={0}
      setChordOctaveOffset={() => {}}
      setCurrentAbsoluteNotes={() => {}}
      activeProgression={progression}
      clickedChord={null}
      setClickedChord={() => {}}
      handleChordClick={() => {}}
      inversionText=""
      suggestedBassTrack={null}
      setSuggestedBassTrack={() => {}}
      setCustomProgression={setProgression}
      customRhythm={null}
      setCustomRhythm={() => {}}
      targetNotesPreset={null}
      setTargetNotesPreset={() => {}}
    />
  );
}

/** What the panel shows under "magic progression": one { name, quality } per chord. */
function shown() {
  const container = document.querySelector(".magic-progression-container");
  return [...container.children].map((cell) => ({
    name: cell.querySelector("button").textContent.trim(),
    quality: cell.children[cell.children.length - 1].textContent.trim(),
  }));
}

const { chordQualMaj: MAJ, chordQualMin: MIN, chordQualDim: DIM } = translations.en;

describe("VMU-169 — the panel names a Quick Start's chords in full, in the chosen notation", () => {
  it("the data this test relies on is there", () => {
    expect([styleIndex(4, "scale_phrygian"), styleIndex(4, "scale_dorian"), styleIndex(7, "scale_mixolydian")].every((i) => i >= 0)).toBe(true);
    expect([MAJ, MIN, DIM]).toEqual(["Maj.", "Min.", "Dim."]);
  });

  it.each([
    ["us", "E phrygian", 4, "scale_phrygian", ["Fmaj7", "Bm7b5", "Em7"], ["Fmaj7", "B7", "Em7"]],
    ["eu", "E phrygian", 4, "scale_phrygian", ["Famaj7", "Sim7b5", "Mim7"], ["Famaj7", "Si7", "Mim7"]],
    ["us", "E dorian", 4, "scale_dorian", ["F#m7", "Bm7", "Em7"], ["F#m7", "B7", "Em7"]],
    ["eu", "E dorian", 4, "scale_dorian", ["Fa#m7", "Sim7", "Mim7"], ["Fa#m7", "Si7", "Mim7"]],
    ["us", "G mixolydian", 7, "scale_mixolydian", ["Am7", "Dm7", "G7"], ["Am7", "D7", "G7"]],
    ["eu", "G mixolydian", 7, "scale_mixolydian", ["Lam7", "Rém7", "Sol7"], ["Lam7", "Ré7", "Sol7"]],
  ])("%s, %s: II-V-I, then with the classic cadence", (notation, _style, rootValue, scaleKey, styleChords, cadenceChords) => {
    mockNotation = notation;
    render(<Harness index={styleIndex(rootValue, scaleKey)} />);

    fireEvent.click(screen.getByRole("button", { name: "II-V-I" }));
    expect(shown().map((c) => c.name)).toEqual(styleChords);

    fireEvent.click(screen.getByRole("button", { name: /Classic cadence/ }));
    expect(shown().map((c) => c.name)).toEqual(cadenceChords);
  });

  it("a Quick Start of triads keeps its triad names (Pop I-V-vi-IV on E phrygian: Em, Bdim, C, Am)", () => {
    render(<Harness index={styleIndex(4, "scale_phrygian")} />);
    fireEvent.click(screen.getByRole("button", { name: "Pop Standard I-V-vi-IV" }));
    expect(shown().map((c) => c.name)).toEqual(["Em", "Bdim", "C", "Am"]);
  });

  it("the style's own progression, written in triads, is named as before", () => {
    render(<Harness index={styleIndex(4, "scale_phrygian")} initial={["1-", "b2", "5", "1°"]} />);
    expect(shown().map((c) => c.name)).toEqual(["Em", "F", "B", "Edim"]);
  });
});

describe("VMU-170 — the quality under a chord is the chord's, read by the one rule", () => {
  it("II-V-I on E phrygian: Maj., Min., Min. — and with the cadence the V is Maj.", () => {
    render(<Harness index={styleIndex(4, "scale_phrygian")} />);
    fireEvent.click(screen.getByRole("button", { name: "II-V-I" }));
    expect(shown().map((c) => c.quality)).toEqual([MAJ, MIN, MIN]);
    fireEvent.click(screen.getByRole("button", { name: /Classic cadence/ }));
    expect(shown().map((c) => c.quality)).toEqual([MAJ, MAJ, MIN]);
  });

  it("a major seventh written in lower case ('1maj7') is major, not minor", () => {
    // The hand read looked for an "m" anywhere in the symbol and found the one in "maj7".
    render(<Harness index={styleIndex(0, "scale_major")} initial={["1maj7", "4maj7", "5maj7"]} />);
    expect(shown().map((c) => c.name)).toEqual(["Cmaj7", "Fmaj7", "Gmaj7"]);
    expect(shown().map((c) => c.quality)).toEqual([MAJ, MAJ, MAJ]);
  });

  it("one quality per chord type: major families Maj., minor families Min., diminished Dim.", () => {
    const written = ["1", "1-", "1°", "1+", "17", "1maj7", "1Maj7", "1-7", "1m7b5", "1dim7", "19", "1m9", "1add9", "1sus2", "1sus4"];
    render(<Harness index={styleIndex(0, "scale_major")} initial={written} />);
    expect(shown().map((c) => c.quality)).toEqual([MAJ, MIN, DIM, MAJ, MAJ, MAJ, MAJ, MIN, MIN, DIM, MAJ, MIN, MAJ, MAJ, MAJ]);
  });

  it("a roman-numeral symbol is read as it is everywhere else (lower case is minor)", () => {
    render(<Harness index={styleIndex(0, "scale_major")} initial={["I", "ii", "iii7", "IVMaj7", "V7", "vi", "vii°"]} />);
    expect(shown().map((c) => c.quality)).toEqual([MAJ, MIN, MIN, MAJ, MAJ, MIN, DIM]);
  });
});
