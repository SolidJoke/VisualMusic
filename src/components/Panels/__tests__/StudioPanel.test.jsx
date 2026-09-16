/**
 * VMU-119 — the "Chord / NNS / Roman" display-mode toggle is removed. The
 * magic-progression chord button always shows the chord's name in the
 * selected US/EU notation; the roman-numeral degree label above each chord
 * (toRoman) is untouched by this removal and must keep rendering.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

afterEach(cleanup);

// BRICKS[0]: "Modern Pop (4 Chords)" — rootValue 0 (C), scale_major,
// nnsProgression ["1","5","6-","4"]. Chord "1" is the C-major tonic:
// chordNameUS "C", chordNameEU "Do", toRoman("1") "I".
const brick = BRICKS.at(0);

function renderPanel(props = {}) {
  return render(
    <StudioPanel
      currentBrickIndex={0}
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
      setCustomProgression={vi.fn()}
      customRhythm={null}
      setCustomRhythm={vi.fn()}
      {...props}
    />
  );
}

describe("StudioPanel magic-progression chord buttons (VMU-119)", () => {
  it("shows the chord name in US notation when US notation is selected", () => {
    mockNotation = "us";
    renderPanel();
    expect(screen.getByText("C")).not.toBeNull();
  });

  it("shows the chord name in EU notation when EU notation is selected", () => {
    mockNotation = "eu";
    renderPanel();
    expect(screen.getByText("Do")).not.toBeNull();
  });

  it("still shows the roman-numeral degree label above the chord button", () => {
    mockNotation = "us";
    renderPanel();
    // toRoman("1") === "I" — the degree label sitting above the chord
    // button (kept: only the Chord/NNS/Roman toggle button is removed).
    expect(screen.getByText("I")).not.toBeNull();
  });
});
