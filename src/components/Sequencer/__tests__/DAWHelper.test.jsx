/**
 * DAWHelper.test.jsx — Tests for DAWHelper component rendering
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import DAWHelper from "../DAWHelper.jsx";

describe("DAWHelper", () => {
  const drumTracks = [
    { name: "Kick", activeSteps: [0, 4, 8, 12] },
    { name: "Snare", activeSteps: [4, 12] },
  ];
  const melodyTracks = [
    {
      name: "Bass",
      activeSteps: [0, 3, 7],
      pitchSteps: { 0: "R", 3: "5", 7: "b3" },
    },
  ];

  it("renders without crashing", () => {
    const html = renderToString(
      <DAWHelper
        drumTracks={drumTracks}
        melodyTracks={melodyTracks}
        bpm={120}
        genreName="Test Genre"
        lang="en"
      />,
    );
    expect(html).toContain("daw-helper");
  });

  it("displays drum track names and step numbers (1-based)", () => {
    const html = renderToString(
      <DAWHelper drumTracks={drumTracks} melodyTracks={[]} bpm={120} genreName="Rock" lang="en" />,
    );
    expect(html).toContain("Kick");
    expect(html).toContain("Snare");
    // Steps should be 1-based (step 0 → "1")
    expect(html).toContain("1, 5, 9, 13");
    expect(html).toContain("5, 13");
  });

  it("identifies four-on-the-floor pattern", () => {
    const html = renderToString(
      <DAWHelper drumTracks={drumTracks} melodyTracks={[]} bpm={120} genreName="House" lang="en" />,
    );
    expect(html).toContain("four-on-the-floor");
  });

  it("identifies backbeat pattern", () => {
    const html = renderToString(
      <DAWHelper drumTracks={drumTracks} melodyTracks={[]} bpm={120} genreName="Rock" lang="en" />,
    );
    expect(html).toContain("backbeat");
  });

  it("displays pitch intervals for melody tracks", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[]} melodyTracks={melodyTracks} bpm={140} genreName="Psy" lang="en" />,
    );
    expect(html).toContain("Pitches");
    expect(html).toContain("1:R");
    expect(html).toContain("4:5");
    expect(html).toContain("8:b3");
  });

  it("displays ghost notes indicator", () => {
    const ghostDrums = [
      { name: "Hat", activeSteps: [0, 2], lowVelocitySteps: [2] },
    ];
    const html = renderToString(
      <DAWHelper drumTracks={ghostDrums} melodyTracks={[]} bpm={90} genreName="Jazz" lang="en" />,
    );
    expect(html).toContain("Ghost notes");
    expect(html).toContain("3"); // step 2 → 1-based = 3
  });

  it("displays BPM and genre name in meta", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={174} genreName="Drum &amp; Bass" lang="en" />,
    );
    // React SSR inserts <!-- --> between JSX expressions
    expect(html).toContain("174");
    expect(html).toContain("BPM");
  });

  it("supports French language", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Test" lang="fr" />,
    );
    expect(html).toContain("Aide DAW");
    expect(html).toContain("doubles-croches");
  });

  it("renders with empty tracks", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="None" lang="en" />,
    );
    expect(html).toContain("daw-helper");
    expect(html).toContain("120");
    expect(html).toContain("BPM");
  });
});
