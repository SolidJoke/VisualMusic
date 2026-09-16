import { describe, it, expect, vi } from "vitest";

// resolveMeasureChord is a pure function, but useSequencer.js imports
// AudioEngine.js at module scope, which constructs real Tone.js audio nodes
// on import (no AudioContext in jsdom) — mocked here the same way
// SequencerLogic.test.js does, purely so the import doesn't throw.
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

vi.mock("../AudioEngine", () => ({
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

import { resolveMeasureChord } from "../useSequencer";

/**
 * VMU-129 — "the chord this measure of the loop is playing", the single
 * source the chord track and the bass track now both read from (previously
 * each recomputed chordIndex/currentNns/chords on its own — the exact
 * duplication this function removes), and the value published for the
 * instruments to follow while playing.
 *
 * Expected chords/pitches below are derived from the domain, not from the
 * code: "Pop Moderne (4 Accords)" (bricks.json) is the NNS progression
 * ["1","5","6-","4"] — I-V-vi-IV — in C major (rootValue 0, scale_major).
 * Root position triads, MIDI C4=60:
 *   I   (do majeur)  -> do4 mi4 sol4 = C4 E4 G4   = 60 64 67
 *   V   (sol majeur) -> sol4 si4 ré5 = G4 B4 D5   = 67 71 74
 *   vi  (la mineur)  -> la4 do5 mi5  = A4 C5 E5   = 69 72 76
 *   IV  (fa majeur)  -> fa4 la4 do5  = F4 A4 C5   = 65 69 72
 * One measure is 16 steps; the loop is 4 measures (64 steps).
 */
const brick = { rootValue: 0, scaleKey: "scale_major" };
const progression = ["1", "5", "6-", "4"];

describe("resolveMeasureChord (VMU-129)", () => {
  it.each([
    [0, "do majeur (I)", 0, [60, 64, 67]],
    [16, "sol majeur (V)", 1, [67, 71, 74]],
    [32, "la mineur (vi)", 2, [69, 72, 76]],
    [48, "fa majeur (IV)", 3, [65, 69, 72]],
  ])("step %i is measure %s: chordIndex %i, plays %j", (step, _label, expectedIndex, expectedPitches) => {
    const result = resolveMeasureChord(step, progression, brick, 0);
    expect(result.chordIndex).toBe(expectedIndex);
    expect(result.absolutePitches).toEqual(expectedPitches);
  });

  it("measure 1 and measure 2 differ", () => {
    const m1 = resolveMeasureChord(0, progression, brick, 0);
    const m2 = resolveMeasureChord(16, progression, brick, 0);
    expect(m1.absolutePitches).not.toEqual(m2.absolutePitches);
  });

  it("holds the same chord for all 16 steps of a measure (no per-step drift)", () => {
    const withinMeasure1 = [0, 4, 8, 15].map(
      (s) => resolveMeasureChord(s, progression, brick, 0).chordIndex
    );
    expect(withinMeasure1).toEqual([0, 0, 0, 0]);
  });

  it("changes chord exactly at the measure boundary (step 15 -> 16)", () => {
    expect(resolveMeasureChord(15, progression, brick, 0).chordIndex).toBe(0);
    expect(resolveMeasureChord(16, progression, brick, 0).chordIndex).toBe(1);
  });

  it("wraps the loop back to measure 1 after 4 measures (step 64 === step 0)", () => {
    const m1 = resolveMeasureChord(0, progression, brick, 0);
    const wrapped = resolveMeasureChord(64, progression, brick, 0);
    expect(wrapped.absolutePitches).toEqual(m1.absolutePitches);
  });

  it("respects the Studio octave offset", () => {
    const base = resolveMeasureChord(0, progression, brick, 0);
    const up = resolveMeasureChord(0, progression, brick, 1);
    expect(up.absolutePitches).toEqual(base.absolutePitches.map((p) => p + 12));
  });

  it("returns null without a progression or a brick — nothing for the instruments to follow", () => {
    expect(resolveMeasureChord(0, [], brick, 0)).toBeNull();
    expect(resolveMeasureChord(0, null, brick, 0)).toBeNull();
    expect(resolveMeasureChord(0, progression, null, 0)).toBeNull();
  });
});
