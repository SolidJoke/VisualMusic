// VMU-123 — the target-notes selector is rendered in Studio unconditionally
// (not gated on clickedChord): with no chord clicked, the targets already
// fall back to the mode's characteristic note, so the selector has an
// effect from the start (brief decision #3, "sans accord").
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
      targetNotesPreset="majorMinor"
      setTargetNotesPreset={vi.fn()}
      {...props}
    />
  );
}

describe("StudioPanel — target notes selector (VMU-123)", () => {
  it("is rendered even with no chord clicked (clickedChord null, inversionText empty)", () => {
    renderPanel({ clickedChord: null, inversionText: "" });
    expect(screen.getByTestId("target-notes-selector")).not.toBeNull();
  });

  it("is still rendered once a chord is clicked", () => {
    renderPanel({
      clickedChord: { rootNote: { value: 0 }, nns: "1" },
      inversionText: "root",
    });
    expect(screen.getByTestId("target-notes-selector")).not.toBeNull();
  });

  it("changing preset calls setTargetNotesPreset with the clicked preset key", () => {
    const setTargetNotesPreset = vi.fn();
    renderPanel({ targetNotesPreset: "majorMinor", setTargetNotesPreset });
    const offBtn = screen.getAllByRole("button").find((b) => b.textContent === "None");
    offBtn.click();
    expect(setTargetNotesPreset).toHaveBeenCalledWith("off");
  });
});
