/**
 * DAWHelper.test.jsx — Tests for DAWHelper component rendering
 *
 * VMU-131 — DAWHelper now imports resolveMeasureChord from useSequencer.js
 * (the single source for "which chord plays this measure", VMU-129) to
 * display the chord-per-measure row. useSequencer.js imports AudioEngine.js
 * at module scope, which constructs real Tone.js audio nodes on import (no
 * AudioContext in jsdom) — mocked below the same way
 * audio/__tests__/SequencerMeasureChord.test.js does, purely so importing
 * DAWHelper.jsx (and therefore this whole file) doesn't throw. This is a
 * cost of reusing resolveMeasureChord directly from a component instead of
 * extracting it to core/ (brief's decision #1's other option) — chosen to
 * avoid touching NoHandPitchCalc.test.js's line-keyed exception for
 * useSequencer.js:64, which a core/ extraction would move and invalidate.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { render, cleanup } from "@testing-library/react";

vi.mock("tone", () => ({
  Analyser: vi.fn(() => ({ dispose: vi.fn() })),
  Destination: { volume: { value: 0 } },
  Transport: {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    clear: vi.fn(),
  },
  start: vi.fn(),
  Draw: { schedule: vi.fn() },
}));

vi.mock("../../../audio/AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  snareSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
  bassSynth: { triggerAttackRelease: vi.fn(), triggerRelease: vi.fn() },
  initPianoSampler: vi.fn(),
  initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(),
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
  getPianoSynth: vi.fn(() => ({ releaseAll: vi.fn() })),
  getGuitarSynth: vi.fn(() => ({ releaseAll: vi.fn() })),
}));

import DAWHelper from "../DAWHelper.jsx";
import { resolveMeasureChord } from "../../../audio/useSequencer";
import { toRoman } from "../../../core/theory";
import { BRICKS } from "../../../core/bricks";

afterEach(cleanup);

// BRICKS[0]: "Modern Pop (4 Chords)" — rootValue 0 (C), scale_major,
// nnsProgression ["1","5","6-","4"] — I-V-vi-IV in C major. Same fixture
// audio/__tests__/SequencerMeasureChord.test.js and
// components/Panels/__tests__/StudioPanel.test.jsx use: do majeur, sol
// majeur, la mineur, fa majeur, in that order.
const brick = BRICKS[0];
const progression = brick.nnsProgression;

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
 */
describe("DAWHelper — chord-per-measure row (VMU-131)", () => {
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
        progression={progression} brick={brick} notation="eu" />
    );
    const { names } = namesAndDegrees(container);
    expect(names).toEqual(["Do", "Sol", "Lam", "Fa"]);
  });

  it("displays each measure's chord name in order, US notation", () => {
    const { container } = render(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
        progression={progression} brick={brick} notation="us" />
    );
    const { names } = namesAndDegrees(container);
    expect(names).toEqual(["C", "G", "Am", "F"]);
  });

  it("displays each chord's degree — the same NNS-derived Roman numeral the app shows elsewhere (StudioPanel's toRoman)", () => {
    const { container } = render(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
        progression={progression} brick={brick} notation="eu" />
    );
    const { degrees } = namesAndDegrees(container);
    expect(degrees).toEqual(["I", "V", "vi", "IV"]);
  });

  it("renders no chord row when progression is empty — rest of the DAW helper unchanged", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[{ name: "Kick", activeSteps: [0, 4, 8, 12] }]} melodyTracks={[]} bpm={120} genreName="X" lang="en"
        progression={[]} brick={brick} notation="eu" />
    );
    expect(html).not.toContain("daw-helper__chords");
    // The rest of the helper (drum tracks) still renders.
    expect(html).toContain("Kick");
  });

  it("renders no chord row when no progression prop is passed (default [])", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="X" lang="en" />
    );
    expect(html).not.toContain("daw-helper__chords");
  });

  it("renders no chord row when brick is missing, even with a non-empty progression", () => {
    const html = renderToString(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="X" lang="en"
        progression={progression} notation="eu" />
    );
    expect(html).not.toContain("daw-helper__chords");
  });

  it("single source (brief decision #1) — matches resolveMeasureChord for every step 0..63; fails if the two ever diverge", () => {
    const { container } = render(
      <DAWHelper drumTracks={[]} melodyTracks={[]} bpm={120} genreName="Pop" lang="en"
        progression={progression} brick={brick} notation="eu" />
    );
    const { names, degrees } = namesAndDegrees(container);

    for (let step = 0; step < 64; step++) {
      const measureIndex = Math.floor(step / 16) % progression.length;
      const expected = resolveMeasureChord(step, progression, brick, 0);
      expect(names[measureIndex]).toBe(expected.chord.chordNameEU);
      expect(degrees[measureIndex]).toBe(toRoman(expected.chord.nns));
    }
  });
});
