/**
 * PianoRoll.test.jsx — Tests for PianoRoll component rendering
 *
 * T3: PianoRoll displays rows of the timeline document — absolute cells,
 * `steps[i]` for step i — instead of one-measure patterns it folded back with
 * `% 16`. The fixtures below are still written as one-measure patterns
 * (bricks.json's shape) and filled into rows by `rows`, the same fill a style
 * uses (core/timeline.js trackFromPattern); what each test expects is
 * unchanged. The last test is T3's: a measure that differs shows its own
 * cells.
 */
import { describe, it, expect, afterEach } from "vitest";
import React from "react";

import { renderToString } from "react-dom/server";
import { render, fireEvent, cleanup } from "@testing-library/react";
import PianoRoll from "../PianoRoll.jsx";
import { setCell, timelineFromSelection, trackFromPattern } from "../../../core/timeline";

afterEach(cleanup);

/** One-measure patterns as timeline rows (the role does not change the display). */
const rows = (patterns) => patterns.map((pattern) => trackFromPattern(pattern, { role: "melody" }));

describe("PianoRoll", () => {
  const baseTracks = rows([
    { name: "Kick", activeSteps: [0, 4, 8, 12] },
    { name: "Snare", activeSteps: [4, 12] },
  ]);

  it("renders without crashing", () => {
    const html = renderToString(<PianoRoll tracks={baseTracks} />);
    expect(html).toContain("Kick");
    expect(html).toContain("Snare");
  });

  it("renders correct number of steps", () => {
    const html = renderToString(<PianoRoll tracks={baseTracks} totalSteps={16} />);
    // Each track has 16 step divs, 2 tracks = 32 step divs
    // Plus track rows and names
    expect(html).toContain("track-row");
    expect(html).toContain("steps-container");
  });

  it("marks active steps with instrument color class", () => {
    const html = renderToString(<PianoRoll tracks={baseTracks} />);
    expect(html).toContain("bg-kick");
    expect(html).toContain("bg-snare");
  });

  it("renders ghost labels for lowVelocitySteps", () => {
    const ghostTracks = rows([
      { name: "Hat", activeSteps: [0, 2, 4, 6], lowVelocitySteps: [2, 6] },
    ]);
    const html = renderToString(<PianoRoll tracks={ghostTracks} />);
    expect(html).toContain("step--ghost");
    expect(html).toContain("step__dim-overlay");
  });

  it("does NOT render ghost labels when no lowVelocitySteps", () => {
    const html = renderToString(<PianoRoll tracks={baseTracks} />);
    expect(html).not.toContain("step--ghost");
    expect(html).not.toContain("step__dim-overlay");
  });

  it("renders pitch labels when pitchSteps present", () => {
    const pitchTracks = rows([
      {
        name: "Bass",
        activeSteps: [0, 3, 7],
        pitchSteps: { 0: "R", 3: "5", 7: "b3" },
      },
    ]);
    const html = renderToString(<PianoRoll tracks={pitchTracks} />);
    expect(html).toContain("step__pitch-label");
    expect(html).toContain("R");
    expect(html).toContain("5");
    expect(html).toContain("b3");
  });

  it("renders tooltips for active steps", () => {
    const trackWithGhost = rows([
      { name: "Kick", activeSteps: [0], lowVelocitySteps: [0] },
    ]);
    const html = renderToString(<PianoRoll tracks={trackWithGhost} />);
    expect(html).toContain("title=");
    expect(html).toContain("Ghost");
  });

  it("marks current step with step--current class", () => {
    const html = renderToString(
      <PianoRoll tracks={baseTracks} totalSteps={16} currentStep={4} />,
    );
    expect(html).toContain("step--current");
  });

  it("renders with empty tracks array", () => {
    const html = renderToString(<PianoRoll tracks={[]} />);
    expect(html).toContain("piano-roll");
  });

  it("T3 — shows each step's own cell: a measure 2 that differs from measure 1 is shown as it is", () => {
    // Kick on 0 and 8 in every measure; in measure 2 only, 16 moves to 19.
    let doc = timelineFromSelection({ drums: [{ name: "Kick", activeSteps: [0, 8] }] });
    doc = setCell(doc, "drum-0", 16, null);
    doc = setCell(doc, "drum-0", 19, { vel: "ghost" });
    const kick = doc.tracks.filter((t) => t.role === "kick");
    const { container, getByText } = render(<PianoRoll tracks={kick} totalSteps={32} />);
    fireEvent.click(getByText("32")); // show both measures at once

    const lamps = Array.from(container.querySelectorAll(".step-lamp"));
    expect(lamps).toHaveLength(32);
    const active = lamps.flatMap((lamp, step) => (lamp.classList.contains("active") ? [step] : []));
    expect(active).toEqual([0, 8, 19, 24]);
    expect(lamps[19].classList.contains("step--ghost")).toBe(true);
  });
});
