import { describe, it, expect } from "vitest";
import { resolveChordAt } from "../dispatch";
import { buildStudioTimeline, loopSteps, setChords } from "../../core/timeline";

/**
 * VMU-129 — "the chord this step of the loop is playing", the single source
 * the chord row and the bass row both read from, and the value published
 * for the instruments to follow while playing.
 *
 * T3: the source is the timeline document's `chordAt` (core/timeline.js),
 * with the pitches the chord row plays it at (dispatch.js `resolveChordAt`).
 * Rewritten from the pre-T3 `resolveMeasureChord(step, progression, brick,
 * octaveOffset)`, which took the progression modulo its length over a loop
 * fixed at 64 steps — hence its "step 64 === step 0". The document holds 8
 * measures: step 64 is measure 5, played or not depending on the window. The
 * other expectations are the same ones, on the document the Studio builds.
 * It no longer needs Tone mocks: dispatch.js is pure, useSequencer.js (which
 * imports AudioEngine) is not involved.
 *
 * Expected chords/pitches below are derived from the domain, not from the
 * code: "Pop Moderne (4 Accords)" (bricks.json) is the NNS progression
 * ["1","5","6-","4"] — I-V-vi-IV — in C major (rootValue 0, scale_major).
 * Root position triads, MIDI C4=60:
 *   I   (do majeur)  -> do4 mi4 sol4 = C4 E4 G4   = 60 64 67
 *   V   (sol majeur) -> sol4 si4 ré5 = G4 B4 D5   = 67 71 74
 *   vi  (la mineur)  -> la4 do5 mi5  = A4 C5 E5   = 69 72 76
 *   IV  (fa majeur)  -> fa4 la4 do5  = F4 A4 C5   = 65 69 72
 * One measure is 16 steps.
 */
const doc = buildStudioTimeline({ brickIndex: 0 });

describe("resolveChordAt — the chord of a step (VMU-129, T3)", () => {
  it.each([
    [0, "do majeur (I)", 0, [60, 64, 67]],
    [16, "sol majeur (V)", 1, [67, 71, 74]],
    [32, "la mineur (vi)", 2, [69, 72, 76]],
    [48, "fa majeur (IV)", 3, [65, 69, 72]],
  ])("step %i is measure %s: chord index %i, plays %j", (step, _label, expectedIndex, expectedPitches) => {
    const result = resolveChordAt(doc, step, 0);
    expect(result.index).toBe(expectedIndex);
    expect(result.absolutePitches).toEqual(expectedPitches);
  });

  it("measure 1 and measure 2 differ", () => {
    const m1 = resolveChordAt(doc, 0, 0);
    const m2 = resolveChordAt(doc, 16, 0);
    expect(m1.absolutePitches).not.toEqual(m2.absolutePitches);
  });

  it("holds the same chord for all 16 steps of a measure (no per-step drift)", () => {
    const withinMeasure1 = [0, 4, 8, 15].map((s) => resolveChordAt(doc, s, 0).index);
    expect(withinMeasure1).toEqual([0, 0, 0, 0]);
  });

  it("changes chord exactly at the measure boundary (step 15 -> 16)", () => {
    expect(resolveChordAt(doc, 15, 0)).toMatchObject({ index: 0, startStep: 0, endStep: 16 });
    expect(resolveChordAt(doc, 16, 0)).toMatchObject({ index: 1, startStep: 16, endStep: 32 });
  });

  // Replaces "wraps the loop back to measure 1 after 4 measures (step 64 ===
  // step 0)": the wrap is the window's, no longer the chord lookup's.
  it("loops over the document's window — 64 steps at 4 measures, 128 at 8", () => {
    expect(loopSteps(doc)).toBe(64);
    expect(loopSteps(buildStudioTimeline({ brickIndex: 0, lengthMeasures: 8 }))).toBe(128);
  });

  it("step 64 is measure 5: the 4-chord progression, repeated to fill 8 measures, puts its first chord there again", () => {
    const m5 = resolveChordAt(doc, 64, 0);
    expect(m5).toMatchObject({ index: 4, startStep: 64, endStep: 80 });
    expect(m5.absolutePitches).toEqual(resolveChordAt(doc, 0, 0).absolutePitches);
  });

  it("respects the Studio octave offset", () => {
    const base = resolveChordAt(doc, 0, 0);
    const up = resolveChordAt(doc, 0, 1);
    expect(up.absolutePitches).toEqual(base.absolutePitches.map((p) => p + 12));
  });

  it("follows chords of half a measure: the chord changes at step 8", () => {
    const [c, g] = doc.chords;
    const halves = setChords(doc, [{ ...c, durationSteps: 8 }, { ...g, durationSteps: 8 }]);
    expect(resolveChordAt(halves, 7, 0)).toMatchObject({ index: 0, absolutePitches: [60, 64, 67] });
    expect(resolveChordAt(halves, 8, 0)).toMatchObject({ index: 1, absolutePitches: [67, 71, 74] });
  });

  it("returns null where no chord is — nothing for the instruments to follow", () => {
    expect(resolveChordAt(setChords(doc, []), 0, 0)).toBeNull();
    expect(resolveChordAt(setChords(doc, doc.chords.slice(0, 2)), 32, 0)).toBeNull();
    expect(resolveChordAt(doc, 128, 0)).toBeNull();
  });
});
