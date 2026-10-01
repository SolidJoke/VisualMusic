import { describe, it, expect } from "vitest";
import { BRICKS } from "../bricks";
import extendedTheoryData from "../extendedTheoryData.json";
import { chordsFromProgression } from "../timeline";
import { getScaleNotes } from "../theory";
import { realizeChordFromType } from "../noteEngine";

/**
 * VMU-161 — in the Studio, a Quick Start adapts to the style the way a
 * musician would play it.
 *
 * The five Quick Starts (extendedTheoryData.json: `axiomRules.progressions`)
 * write their chords as roman numerals for the major scale ("ii7", "V7",
 * "IMaj7"). The app reads the *roots* in the style's mode and the *type* off
 * the numeral, so on a modal style the two disagree: on E phrygian, "ii7 V7
 * IMaj7" plays F m7, B 7, E maj7, whose notes (Ab, Eb, F#...) are not in the
 * scale. Measured at 185318d with the app's own path (`chordsFromProgression`),
 * 27 styles x 5 Quick Starts = 135 couples: 111 couples have a chord note
 * outside the style's scale, 385 of 1728 chord notes.
 *
 * What a musician does when told "play a 2-5-1 in this piece": takes the
 * chords of the scale — stacked thirds on the scale's own notes — so nothing
 * leaves the scale. The one common variation is the cadence: the chord of the
 * V made a dominant (major, with the seventh) to pull back to the I. So the
 * Studio offers two readings of a Quick Start, and the property below holds
 * each to its own claim, over every style and every Quick Start:
 *
 *   "style chords" (default)  no chord note outside the style's scale;
 *   "classic cadence"         the same, except the notes of the V chord.
 *
 * The module under test, `core/quickStart.js`, exports
 * `quickStartProgression(quickStart, key, { classicCadence })`: the NNS
 * degrees the Studio hands to `customProgression`. The test goes through the
 * app's own `chordsFromProgression`, not through the module's internals.
 *
 * Predicted red (before the module exists, so the Quick Start's own degrees
 * are what plays: the app today): "style chords" 111 couples / 385 notes of
 * 1728 (the coordinator's measure, to be reproduced by this run); "classic
 * cadence" fails on the couples whose wrong notes are not only the V's. The
 * controls and the data-shape checks are green before and after.
 */

// The module does not exist yet at the red commit; a glob over its path
// resolves to nothing then (an import would fail on resolution instead of on
// the property). Replaced by a plain import in the commit that adds it.
const modules = import.meta.glob("../quickStart.js", { eager: true });
const adapt = Object.values(modules)[0]?.quickStartProgression ?? ((quickStart) => quickStart.degrees);

const QUICK_STARTS = extendedTheoryData.axiomRules.progressions;

/** Chord notes (pitch classes) of `chord` that are not in the scale of `key`. */
function notesOutside(chord, key) {
  const scalePcs = new Set(getScaleNotes(key.rootValue, key.scaleKey).map((note) => note.value));
  return realizeChordFromType(chord.rootPc, chord.type, 4)
    .map((pitch) => pitch % 12)
    .filter((pc) => !scalePcs.has(pc));
}

/** The chords the app resolves for a progression, one per degree (the timeline repeats them). */
function resolved(key, progression) {
  return chordsFromProgression(key, progression).slice(0, progression.length);
}

/** Every chord note outside the scale; `skip(i)` marks positions not held to it. */
function outsideNotes(key, progression, skip = () => false) {
  return resolved(key, progression).flatMap((chord, i) => (skip(i) ? [] : notesOutside(chord, key)));
}

/** All 135 couples: what is outside the scale, and out of how many chord notes. */
function measure(classicCadence) {
  const couples = [];
  let totalNotes = 0;
  let outsideCount = 0;
  BRICKS.forEach((brick, styleIndex) => {
    const key = { rootValue: brick.rootValue, scaleKey: brick.scaleKey };
    QUICK_STARTS.forEach((quickStart) => {
      const progression = adapt(quickStart, key, { classicCadence });
      // The V is the chord a fifth above the tonic: the Quick Start's own
      // rootIntervals say which position (7), whatever the way it is written.
      const isV = (i) => classicCadence && quickStart.rootIntervals[i] === 7;
      const outside = outsideNotes(key, progression, isV);
      totalNotes += resolved(key, progression).reduce(
        (n, chord) => n + realizeChordFromType(chord.rootPc, chord.type, 4).length,
        0,
      );
      outsideCount += outside.length;
      if (outside.length > 0) couples.push(`${styleIndex} ${brick.name?.en ?? brick.name} x ${quickStart.id}`);
    });
  });
  return { couples, outsideCount, totalNotes };
}

describe("VMU-161 — data shape (green before and after: the property below cannot pass on nothing)", () => {
  it("27 styles, each with a key, 5 Quick Starts, so 135 couples", () => {
    expect(BRICKS).toHaveLength(27);
    BRICKS.forEach((brick) => {
      expect(brick.scaleKey, `scaleKey of style ${brick.name?.en}`).toBeTruthy();
      expect(Number.isInteger(brick.rootValue), `rootValue of style ${brick.name?.en}`).toBe(true);
      expect(getScaleNotes(brick.rootValue, brick.scaleKey).length, `scale notes of ${brick.scaleKey}`).toBe(7);
    });
    expect(QUICK_STARTS).toHaveLength(5);
    expect(BRICKS.length * QUICK_STARTS.length).toBe(135);
  });
});

describe("VMU-161 — the detector (green before and after)", () => {
  it("negative control: the Quick Start's own II-V-I on E phrygian leaves the scale (F m7, B 7, E maj7)", () => {
    const key = { rootValue: 4, scaleKey: "scale_phrygian" };
    const progression = QUICK_STARTS.find((q) => q.id === "jazz_251_maj").degrees;
    const chords = resolved(key, progression);
    expect(chords.map((c) => c.rootPc)).toEqual([5, 11, 4]);
    expect(chords.map((c) => notesOutside(c, key).length)).toEqual([2, 2, 2]);
  });

  it("positive control: the major Quick Starts on the major styles stay in the scale", () => {
    const major = BRICKS.filter((b) => b.scaleKey === "scale_major");
    expect(major.length).toBe(6);
    major.forEach((brick) => {
      const key = { rootValue: brick.rootValue, scaleKey: brick.scaleKey };
      ["jazz_251_maj", "pop_1564", "jazz_turnaround", "rnb_436"].forEach((id) => {
        const degrees = QUICK_STARTS.find((q) => q.id === id).degrees;
        expect(outsideNotes(key, degrees), `${id} on ${brick.name?.en}`).toEqual([]);
      });
    });
  });
});

describe("VMU-161 — a Quick Start adapts to the style (predicted red: 111 couples / 385 of 1728 notes)", () => {
  it("style chords: no chord note outside the scale, on the 135 couples", () => {
    const { couples, outsideCount, totalNotes } = measure(false);
    expect({ couples: couples.length, outsideNotes: outsideCount, ofNotes: totalNotes }).toEqual({
      couples: 0,
      outsideNotes: 0,
      ofNotes: totalNotes,
    });
  });

  it("classic cadence: only the V chord may leave the scale, on the 135 couples", () => {
    const { couples, outsideCount } = measure(true);
    expect({ couples: couples.length, outsideNotes: outsideCount }).toEqual({ couples: 0, outsideNotes: 0 });
  });
});
