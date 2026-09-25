/**
 * DAWHelper.test.jsx — Tests for DAWHelper component rendering
 *
 * VMU-131 — the chord-per-measure row reads the single source for "which
 * chord plays here". T3: that source is the timeline document's `chordAt`
 * (core/timeline.js), shown with its `describeChord`; DAWHelper receives the
 * document (`timeline`) instead of `progression` + `brick`, and no longer
 * imports useSequencer.js — so the Tone and AudioEngine mocks this file
 * needed for that import are gone.
 */
import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { render, cleanup } from "@testing-library/react";

import DAWHelper from "../DAWHelper.jsx";
import { toRoman } from "../../../core/theory";
import { BRICKS } from "../../../core/bricks";
import {
  buildStudioTimeline,
  chordAt,
  describeChord,
  loopSteps,
  measurePattern,
  setChords,
  studioSelection,
  DRUM_ROLES,
  MELODIC_ROLES,
} from "../../../core/timeline";

afterEach(cleanup);

// BRICKS[0]: "Modern Pop (4 Chords)" — rootValue 0 (C), scale_major,
// nnsProgression ["1","5","6-","4"] — I-V-vi-IV in C major. Same fixture
// audio/__tests__/SequencerMeasureChord.test.js and
// components/Panels/__tests__/StudioPanel.test.jsx use: do majeur, sol
// majeur, la mineur, fa majeur, in that order. `timeline` is the document
// the Studio builds for it (4 measures).
const timeline = buildStudioTimeline({ brickIndex: 0 });

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

/**
 * VMU-131 — chord-per-measure row. Predicted reds (brief §TDD): before this
 * ticket DAWHelper received `progression` and never used it — nothing was
 * displayed.
 *
 * DOM probe (brief's "Definition of done" — how the coordinator verifies
 * without Gabriel): container `[data-testid="daw-helper-chords"]`; chord
 * names at `.daw-helper__chord-name`, degrees at `.daw-helper__chord-degree`.
 * For the default style (BRICKS[0], "Modern Pop (4 Chords)", EU notation):
 * names ["Do","Sol","Lam","Fa"], degrees ["I","V","vi","IV"].
 *
 * T3: rewritten for the `timeline` prop, which replaced `progression` +
 * `brick`. The names and degrees expected are the same. The single-source
 * test compared the row with resolveMeasureChord for "every step 0..63", the
 * pre-T3 loop; it now compares it with the document's chordAt for every step
 * of the window, at 4 and at 8 measures.
 */
describe("DAWHelper — chord-per-measure row (VMU-131, T3)", () => {
  function namesAndDegrees(container) {
    const row = container.querySelector('[data-testid="daw-helper-chords"]');
    return {
      row,
      names: row ? Array.from(row.querySelectorAll(".daw-helper__chord-name")).map((el) => el.textContent) : [],
      degrees: row ? Array.from(row.querySelectorAll(".daw-helper__chord-degree")).map((el) => el.textContent) : [],
    };
  }

  it("DOM probe — displays each measure's chord name in order, EU notation by default", () => {
    const { container } = render(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
        timeline={timeline} notation="eu" />
    );
    const { names } = namesAndDegrees(container);
    expect(names).toEqual(["Do", "Sol", "Lam", "Fa"]);
  });

  it("displays each measure's chord name in order, US notation", () => {
    const { container } = render(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
        timeline={timeline} notation="us" />
    );
    const { names } = namesAndDegrees(container);
    expect(names).toEqual(["C", "G", "Am", "F"]);
  });

  it("displays each chord's degree — the same NNS-derived Roman numeral the app shows elsewhere (StudioPanel's toRoman)", () => {
    const { container } = render(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
        timeline={timeline} notation="eu" />
    );
    const { degrees } = namesAndDegrees(container);
    expect(degrees).toEqual(["I", "V", "vi", "IV"]);
  });

  it("renders no chord row when the document has no chord — rest of the DAW helper unchanged", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[{ name: "Kick", activeSteps: [0, 4, 8, 12] }]} melodyTracks={[]} bpm={120} genreName="X" lang="en"
        timeline={setChords(timeline, [])} notation="eu" />
    );
    expect(html).not.toContain("daw-helper__chords");
    // The rest of the helper (drum tracks) still renders.
    expect(html).toContain("Kick");
  });

  it("renders no chord row when no timeline prop is passed (default null)", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="X" lang="en" />
    );
    expect(html).not.toContain("daw-helper__chords");
  });

  it.each([4, 8])(
    "single source — matches the document's chordAt for every step of a %i-measure window; fails if the two ever diverge",
    (lengthMeasures) => {
      const doc = buildStudioTimeline({ brickIndex: 0, lengthMeasures });
      const { container } = render(
        <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
          timeline={doc} notation="eu" />
      );
      const { names, degrees } = namesAndDegrees(container);
      expect(names).toHaveLength(lengthMeasures);

      for (let step = 0; step < loopSteps(doc); step++) {
        const { index, chord } = chordAt(doc, step);
        const expected = describeChord(doc.key, chord);
        expect(names[index]).toBe(expected.chordNameEU);
        expect(degrees[index]).toBe(toRoman(expected.nns));
      }
    },
  );

  it("shows the chords the loop plays: a 3-chord progression over 4 measures is ii V I ii", () => {
    const doc = buildStudioTimeline({ brickIndex: 0, overrides: { customProgression: ["2-", "5", "1"] } });
    const { container } = render(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
        timeline={doc} notation="us" />
    );
    const { names, degrees } = namesAndDegrees(container);
    expect(names).toEqual(["Dm", "G", "C", "Dm"]);
    expect(degrees).toEqual(["ii", "V", "I", "ii"]);
  });
});

/**
 * T3 — the sequencer panel hands the DAW helper one measure of each row of
 * the document (measurePattern); the style's own one-measure patterns are
 * what it received before. For every style and theme the text is the same.
 */
describe("DAWHelper — T3: the rows' text is the style's, for every style and theme", () => {
  const cases = BRICKS.flatMap((brick, index) => ["A", "B"].map((theme) => [index, theme, brick.name.en]));

  it.each(cases)("%i:%s %s", (index, theme) => {
    const doc = buildStudioTimeline({ brickIndex: index, theme });
    const selection = studioSelection(BRICKS[index], theme);
    const fromDocument = renderToString(
      <DAWHelper
        drumTracks={doc.tracks.filter((t) => DRUM_ROLES.includes(t.role)).map((t) => measurePattern(t, 0))}
        melodyTracks={doc.tracks.filter((t) => MELODIC_ROLES.includes(t.role)).map((t) => measurePattern(t, 0))}
        bpm={120} genreName="X" lang="fr" notation="eu" />
    );
    const fromStyle = renderToString(
      <DAWHelper drumTracks={selection.drums} melodyTracks={selection.melody} bpm={120} genreName="X" lang="fr" notation="eu" />
    );
    expect(fromDocument).toBe(fromStyle);
  });
});
