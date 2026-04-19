/**
 * PianoRoll.test.jsx — Tests for PianoRoll component rendering
 */
import { describe, it, expect } from "vitest";
import React from "react";

import { renderToString } from "react-dom/server";
import PianoRoll from "../PianoRoll.jsx";

describe("PianoRoll", () => {
  const baseTracks = [
    { name: "Kick", activeSteps: [0, 4, 8, 12] },
    { name: "Snare", activeSteps: [4, 12] },
  ];

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
    const ghostTracks = [
      { name: "Hat", activeSteps: [0, 2, 4, 6], lowVelocitySteps: [2, 6] },
    ];
    const html = renderToString(<PianoRoll tracks={ghostTracks} />);
    expect(html).toContain("step--ghost");
    expect(html).toContain("👻");
  });

  it("does NOT render ghost labels when no lowVelocitySteps", () => {
    const html = renderToString(<PianoRoll tracks={baseTracks} />);
    expect(html).not.toContain("step--ghost");
    expect(html).not.toContain("👻");
  });

  it("renders pitch labels when pitchSteps present", () => {
    const pitchTracks = [
      {
        name: "Bass",
        activeSteps: [0, 3, 7],
        pitchSteps: { 0: "R", 3: "5", 7: "b3" },
      },
    ];
    const html = renderToString(<PianoRoll tracks={pitchTracks} />);
    expect(html).toContain("step__pitch-label");
    expect(html).toContain("R");
    expect(html).toContain("5");
    expect(html).toContain("b3");
  });

  it("renders tooltips for active steps", () => {
    const trackWithGhost = [
      { name: "Kick", activeSteps: [0], lowVelocitySteps: [0] },
    ];
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
});
