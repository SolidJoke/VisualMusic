import { describe, it, expect } from "vitest";
import {
  CHORD_DURATIONS,
  applyEditedChords,
  chordsLength,
  editedChordsError,
  editedLoopLength,
  filledChords,
  insertChordAfter,
  isRepeat,
  lengthForSteps,
  progressionFromDoc,
  removeChord,
  replaceChord,
  resizeChords,
  setChordDuration,
  totalSteps,
} from "../progressionEdit";
import { buildStudioTimeline, chordAt, chordsInWindow, loopSteps, timelineErrors, MAX_STEPS } from "../timeline";
import { generateChordsFromNNS, resolveNnsToChordType } from "../theory";

/**
 * VMU-127 lot 1 — the progression, edited chord by chord: the pure rule.
 * The wiring (what plays, what is exported) is StudioEditedProgression.test.jsx.
 */
const C_MAJOR = { rootValue: 0, scaleKey: "scale_major" };
const bar = (nns) => ({ nns, durationSteps: 16 });
const half = (nns) => ({ nns, durationSteps: 8 });
const I_V_vi_IV = [bar("1"), bar("5"), bar("6-"), bar("4")];

describe("the durations and the length", () => {
  it("an edited chord lasts one measure or half of one", () => {
    expect(CHORD_DURATIONS).toEqual([16, 8]);
  });

  it.each([
    [0, 1],
    [8, 1],
    [16, 1],
    [24, 2],
    [32, 2],
    [40, 4],
    [64, 4],
    [72, 8],
    [128, 8],
    [200, 8],
  ])("%i steps fit in %i measure(s)", (steps, measures) => {
    expect(lengthForSteps(steps)).toBe(measures);
  });

  it("the chords' length is the smallest window holding them", () => {
    expect(chordsLength([bar("1")])).toBe(1);
    expect(chordsLength([bar("1"), half("5")])).toBe(2);
    expect(chordsLength([...I_V_vi_IV, half("5")])).toBe(8);
    expect(totalSteps([...I_V_vi_IV, half("5")])).toBe(72);
  });

  it("the loop is the larger of the chords' length and the Math cycle's", () => {
    expect(editedLoopLength([bar("1"), bar("5")])).toBe(2);
    expect(editedLoopLength([bar("1"), bar("5")], 0)).toBe(2);
    expect(editedLoopLength([bar("1"), bar("5")], 48)).toBe(4);
    expect(editedLoopLength([bar("1"), bar("5")], 112)).toBe(8);
    expect(editedLoopLength(I_V_vi_IV, 16)).toBe(4);
    // A cycle past the document is held by its 8 measures, no more.
    expect(editedLoopLength([bar("1")], 210)).toBe(8);
  });
});

describe("the operations", () => {
  it("replace keeps the duration and returns a new list", () => {
    const list = [bar("1"), half("5")];
    const next = replaceChord(list, 1, "4");
    expect(next).toEqual([bar("1"), half("4")]);
    expect(list).toEqual([bar("1"), half("5")]);
  });

  it("replace with the same chord, or out of range, is refused (same list)", () => {
    expect(replaceChord(I_V_vi_IV, 0, "1")).toBe(I_V_vi_IV);
    expect(replaceChord(I_V_vi_IV, 4, "2-")).toBe(I_V_vi_IV);
    expect(replaceChord(I_V_vi_IV, -1, "2-")).toBe(I_V_vi_IV);
    expect(replaceChord(I_V_vi_IV, 1, "")).toBe(I_V_vi_IV);
  });

  it("insert after puts the chord right after, the others move later", () => {
    expect(insertChordAfter(I_V_vi_IV, 1, "3-", 8)).toEqual([bar("1"), bar("5"), half("3-"), bar("6-"), bar("4")]);
    expect(insertChordAfter(I_V_vi_IV, 3, "5")).toEqual([...I_V_vi_IV, bar("5")]);
    expect(insertChordAfter(I_V_vi_IV, -1, "2-")).toEqual([bar("2-"), ...I_V_vi_IV]);
  });

  it("insert is refused past 128 steps, with a bad duration or index", () => {
    const full = Array.from({ length: 8 }, () => bar("1"));
    expect(insertChordAfter(full, 7, "5", 8)).toBe(full);
    const almost = [...Array.from({ length: 7 }, () => bar("1")), half("4")];
    expect(insertChordAfter(almost, 7, "5", 8)).toEqual([...almost, half("5")]);
    expect(insertChordAfter(almost, 7, "5", 16)).toBe(almost);
    expect(insertChordAfter(I_V_vi_IV, 0, "5", 4)).toBe(I_V_vi_IV);
    expect(insertChordAfter(I_V_vi_IV, 9, "5")).toBe(I_V_vi_IV);
  });

  it("remove takes the chord out, never the last one", () => {
    expect(removeChord(I_V_vi_IV, 1)).toEqual([bar("1"), bar("6-"), bar("4")]);
    const one = [bar("1")];
    expect(removeChord(one, 0)).toBe(one);
    expect(removeChord(I_V_vi_IV, 4)).toBe(I_V_vi_IV);
  });

  it("change the duration, 16 <-> 8, never past 128 steps", () => {
    expect(setChordDuration(I_V_vi_IV, 2, 8)).toEqual([bar("1"), bar("5"), half("6-"), bar("4")]);
    expect(setChordDuration([half("1")], 0, 16)).toEqual([bar("1")]);
    expect(setChordDuration(I_V_vi_IV, 2, 16)).toBe(I_V_vi_IV);
    expect(setChordDuration(I_V_vi_IV, 2, 12)).toBe(I_V_vi_IV);
    const full = [...Array.from({ length: 15 }, () => half("1")), half("5")];
    expect(totalSteps(full)).toBe(128);
    expect(setChordDuration(full, 15, 16)).toBe(full);
  });

  it("resize longer copies the chords after themselves; shorter cuts the end", () => {
    expect(resizeChords(I_V_vi_IV, 8)).toEqual([...I_V_vi_IV, ...I_V_vi_IV]);
    expect(resizeChords(I_V_vi_IV, 2)).toEqual([bar("1"), bar("5")]);
    // A chord across the cut keeps the half measure before it.
    expect(resizeChords([half("1"), bar("5"), bar("4")], 2)).toEqual([half("1"), bar("5"), half("4")]);
    // 2.5 measures to 4: the copy starts again from the first chord.
    expect(resizeChords([bar("1"), bar("5"), half("4")], 4)).toEqual([bar("1"), bar("5"), half("4"), bar("1"), half("5")]);
    expect(resizeChords(I_V_vi_IV, 4)).toBe(I_V_vi_IV);
    expect(resizeChords(I_V_vi_IV, 3)).toBe(I_V_vi_IV);
  });

  it("every operation's result is a valid list (the 128-step limit holds)", () => {
    let list = I_V_vi_IV;
    for (let i = 0; i < 20; i++) list = insertChordAfter(list, list.length - 1, "2-", i % 2 ? 8 : 16);
    expect(totalSteps(list)).toBeLessThanOrEqual(MAX_STEPS);
    expect(editedChordsError(list)).toBeNull();
    expect(editedChordsError([])).not.toBeNull();
    expect(editedChordsError([{ nns: "1", durationSteps: 4 }])).not.toBeNull();
  });
});

describe("the document", () => {
  it("a list's chords are resolved in the key by the style's own rule", () => {
    const [chord] = filledChords(C_MAJOR, [bar("6-")], 1);
    const [expected] = generateChordsFromNNS(0, "scale_major", ["6-"]);
    expect(chord).toMatchObject({ rootPc: expected.rootNote.value, type: resolveNnsToChordType(expected.nns), nns: "6-", durationSteps: 16 });
  });

  it("fills the whole document: the window repeated over 8 measures", () => {
    const chords = filledChords(C_MAJOR, [bar("1"), half("5")], 2);
    expect(chords.reduce((sum, c) => sum + c.durationSteps, 0)).toBe(MAX_STEPS);
    // window = 1 (16) · 5 (8) · 1 (8, cut) — repeated 4 times.
    expect(chords.slice(0, 3).map((c) => [c.nns, c.durationSteps])).toEqual([["1", 16], ["5", 8], ["1", 8]]);
    expect(chords).toHaveLength(12);
  });

  it("a half measure at the end of the loop: played, then the loop goes back to the first chord", () => {
    const doc = applyEditedChords(buildStudioTimeline({ brickIndex: 0 }), [bar("1"), bar("5"), bar("6-"), half("4"), half("5")]);
    expect(timelineErrors(doc)).toEqual([]);
    expect(doc.lengthMeasures).toBe(4);
    const spans = chordsInWindow(doc).map(({ chord, startStep, endStep }) => [chord.nns, startStep, endStep]);
    expect(spans).toEqual([["1", 0, 16], ["5", 16, 32], ["6-", 32, 48], ["4", 48, 56], ["5", 56, 64]]);
    // The chord after the window's last one is the window's first.
    expect(doc.chords[5].nns).toBe("1");
  });

  it("the window is the larger of the chords' and the cycle's; repeats fill it", () => {
    const list = [bar("1"), bar("5"), half("4")];
    const doc = applyEditedChords(buildStudioTimeline({ brickIndex: 0 }), list);
    expect(doc.lengthMeasures).toBe(4);
    expect(loopSteps(doc)).toBe(64);
    const window = chordsInWindow(doc);
    expect(window.map(({ chord }) => chord.nns)).toEqual(["1", "5", "4", "1", "5"]);
    expect(window.map((_, i) => isRepeat(list, i))).toEqual([false, false, false, true, true]);
    expect(applyEditedChords(buildStudioTimeline({ brickIndex: 0 }), [bar("1")], 96).lengthMeasures).toBe(8);
    expect(applyEditedChords(buildStudioTimeline({ brickIndex: 0 }), [bar("1")]).lengthMeasures).toBe(1);
  });

  it("only the chords change: rows, key, origin and the style's base stay", () => {
    const before = buildStudioTimeline({ brickIndex: 0 });
    const after = applyEditedChords(before, [bar("2-")]);
    expect(after.tracks).toBe(before.tracks);
    expect(after.key).toBe(before.key);
    expect(after.origin).toBe(before.origin);
    expect(after.base).toBe(before.base);
  });

  it("the starting point of an edit is what plays: the window's chords", () => {
    const doc = buildStudioTimeline({ brickIndex: 0 });
    const copy = progressionFromDoc(doc);
    expect(copy).toEqual(chordsInWindow(doc).map(({ chord }) => ({ nns: chord.nns, durationSteps: 16 })));
    // Applying the copy changes nothing the loop plays.
    const again = applyEditedChords(doc, copy);
    for (let step = 0; step < loopSteps(doc); step++) {
      const a = chordAt(doc, step).chord;
      const b = chordAt(again, step).chord;
      expect([b.rootPc, b.type], `step ${step}`).toEqual([a.rootPc, a.type]);
    }
    expect(again.lengthMeasures).toBe(doc.lengthMeasures);
  });

  it("the copy of an 8-measure window holds 8 measures", () => {
    const doc = buildStudioTimeline({ brickIndex: 0, lengthMeasures: 8 });
    expect(totalSteps(progressionFromDoc(doc))).toBe(128);
  });

  it("no key, no chord", () => {
    expect(filledChords(null, [bar("1")], 4)).toEqual([]);
  });
});
