// VMU-127 (lot 1) — the progression edited chord by chord, wired: what the
// hook's `timeline` plays is what the MIDI export writes, at these steps, with
// these notes; a key change carries the edit; an undo gives the loop of before
// byte for byte; "hear the original" plays the style while an edit exists.
// The pure rule is core/__tests__/progressionEdit.test.js.
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { Midi } from "@tonejs/midi";
import { useStudioMode } from "../useStudioMode";
import { BRICKS } from "../../core/bricks";
import { buildStudioTimeline, chordsInWindow, loopSteps } from "../../core/timeline";
import { generateChordsFromNNS, resolveChordSemitones, resolveNnsToChordType } from "../../core/theory";
import { exportTimelineChords, exportTimelineDrums, exportTimelineBass } from "../../audio/MidiExporter";
import { insertChordAfter, replaceChord, resizeChords, setChordDuration } from "../../core/progressionEdit";

const BPM = 100;
const STYLE = BRICKS[0];
const D = STYLE.rootValue;
const F = D === 5 ? 2 : 5;

const bytes = (doc) =>
  JSON.stringify([
    Array.from(new Uint8Array(exportTimelineDrums(doc, BPM))),
    Array.from(new Uint8Array(exportTimelineChords(doc, BPM))),
    Array.from(new Uint8Array(exportTimelineBass(doc, BPM))),
  ]);

/** The chord notes of the exported chord file, grouped by the step they start on. */
function exportedChordsByStep(doc) {
  const midi = new Midi(exportTimelineChords(doc, BPM));
  const ticksPerStep = midi.header.ppq / 4;
  /** @type {Map<number, number[]>} */
  const byStep = new Map();
  let endTicks = 0;
  for (const note of midi.tracks[0].notes) {
    const step = Math.round(note.ticks / ticksPerStep);
    byStep.set(step, [...(byStep.get(step) || []), note.midi].sort((a, b) => a - b));
    endTicks = Math.max(endTicks, note.ticks + note.durationTicks);
  }
  return { byStep, endStep: endTicks / ticksPerStep };
}

/** The notes a degree plays in root position, computed here from theory.js — not read from the app's document. */
function expectedNotes(rootValue, nns) {
  const [chord] = generateChordsFromNNS(rootValue, STYLE.scaleKey, [nns]);
  const { semitones } = resolveChordSemitones(resolveNnsToChordType(chord.nns));
  return semitones.map((s) => 60 + chord.rootNote.value + s).sort((a, b) => a - b);
}

/** The degree that covers `step` in a list laid end to end and repeated — counted here by hand. */
function degreeAt(list, step) {
  const total = list.reduce((sum, c) => sum + c.durationSteps, 0);
  let at = step % total;
  for (const chord of list) {
    if (at < chord.durationSteps) return chord.nns;
    at -= chord.durationSteps;
  }
  return null;
}

/** The steps the chord row strikes inside the window (the style's rhythm; the edit never changes it). */
function hitSteps(doc) {
  const row = doc.tracks.find((t) => t.role === "chordHits");
  return row.steps.map((cell, step) => (cell ? step : null)).filter((s) => s !== null && s < loopSteps(doc));
}

beforeEach(() => window.localStorage.clear());

const setup = () => renderHook(() => useStudioMode());

/** Three chords, one of them half a measure: 1 (16) · 4 (16) · 5 (8). */
function editThreeChords(result) {
  act(() => result.current.editChords((l) => resizeChords(l, 2)));
  act(() => result.current.editChords((l) => replaceChord(l, 0, "1")));
  act(() => result.current.editChords((l) => replaceChord(l, 1, "4")));
  act(() => result.current.editChords((l) => insertChordAfter(l, 1, "5", 8)));
}

describe("VMU-127: an edited progression is what plays and what is exported", () => {
  it("3 chords, one of half a measure: these notes, at these steps, over the right length", () => {
    const { result } = setup();
    editThreeChords(result);
    const list = [
      { nns: "1", durationSteps: 16 },
      { nns: "4", durationSteps: 16 },
      { nns: "5", durationSteps: 8 },
    ];
    expect(result.current.editedChords).toEqual(list);

    const doc = result.current.timeline;
    // 40 steps of chords: the window is the smallest length holding them, 4 measures.
    expect(doc.lengthMeasures).toBe(4);
    const { byStep, endStep } = exportedChordsByStep(doc);
    const hits = hitSteps(doc);
    expect(hits.length).toBeGreaterThan(0);
    expect([...byStep.keys()].sort((a, b) => a - b)).toEqual(hits);
    for (const step of hits) {
      expect(byStep.get(step), `step ${step}`).toEqual(expectedNotes(D, degreeAt(list, step)));
    }
    // The half measure is really struck: a hit in 32..39 plays the 5, and the
    // next hit after it (40..55) the list's first chord again.
    const inHalf = hits.filter((s) => s >= 32 && s < 40);
    const afterHalf = hits.filter((s) => s >= 40 && s < 56);
    expect(inHalf.length, `hits ${hits.join(",")}`).toBeGreaterThan(0);
    expect(afterHalf.length, `hits ${hits.join(",")}`).toBeGreaterThan(0);
    for (const s of inHalf) expect(byStep.get(s)).toEqual(expectedNotes(D, "5"));
    for (const s of afterHalf) expect(byStep.get(s)).toEqual(expectedNotes(D, "1"));
    expect(expectedNotes(D, "5")).not.toEqual(expectedNotes(D, "1"));
    // The file spans the 4-measure window: nothing starts at or after step 64,
    // and its last note ends inside the last measure or at its end.
    expect(Math.max(...byStep.keys())).toBeLessThan(64);
    expect(endStep).toBeGreaterThan(48);
    expect(endStep).toBeLessThanOrEqual(64);
  });

  it("what plays during the loop is the edited chord, step by step (the document the loop and the export share)", () => {
    const { result } = setup();
    editThreeChords(result);
    const spans = chordsInWindow(result.current.timeline).map(({ chord, startStep, endStep }) => [chord.nns, startStep, endStep]);
    expect(spans).toEqual([
      ["1", 0, 16],
      ["4", 16, 32],
      ["5", 32, 40],
      ["1", 40, 56],
      ["4", 56, 64],
    ]);
  });

  it("8 measures: the chords are copied after themselves, and the file holds 8 measures", () => {
    const { result } = setup();
    editThreeChords(result);
    act(() => result.current.editChords((l) => resizeChords(l, 8)));
    const doc = result.current.timeline;
    expect(doc.lengthMeasures).toBe(8);
    const { byStep } = exportedChordsByStep(doc);
    expect(Math.max(...byStep.keys())).toBeGreaterThanOrEqual(112);
    expect(Math.max(...byStep.keys())).toBeLessThan(128);
  });

  it("nothing moves until the progression is edited: a gesture that changes nothing is no edit", () => {
    const { result } = setup();
    const before = bytes(result.current.timeline);
    expect(bytes(buildStudioTimeline({ brickIndex: 0 }))).toBe(before);
    // Replacing a chord by itself, a refused duration: no edit, no history step.
    act(() => result.current.editChords((l) => replaceChord(l, 0, l[0].nns)));
    act(() => result.current.editChords((l) => setChordDuration(l, 0, 12)));
    expect(result.current.customChords).toBe(null);
    expect(result.current.hasEdits).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(bytes(result.current.timeline)).toBe(before);
  });

  it("the first gesture copies what plays: only the touched chord changes", () => {
    const { result } = setup();
    const before = chordsInWindow(result.current.timeline).map(({ chord }) => chord.nns);
    act(() => result.current.editChords((l) => replaceChord(l, 1, "2-")));
    const after = chordsInWindow(result.current.timeline).map(({ chord }) => chord.nns);
    expect(after).toEqual(before.map((nns, i) => (i === 1 ? "2-" : nns)));
    expect(result.current.timeline.lengthMeasures).toBe(4);
  });
});

describe("VMU-127: the edit and the key", () => {
  it("a key change after an edit moves the edited chords with it: same degrees, notes shifted", () => {
    const { result } = setup();
    editThreeChords(result);
    const inD = exportedChordsByStep(result.current.timeline).byStep;
    act(() => result.current.setKeyRoot(F));
    expect(result.current.editedChords).toHaveLength(3);
    const doc = result.current.timeline;
    expect(doc.key.rootValue).toBe(F);
    const shift = (((F - D) % 12) + 12) % 12;
    const inF = exportedChordsByStep(doc).byStep;
    expect([...inF.keys()]).toEqual([...inD.keys()]);
    for (const [step, notes] of inF) {
      expect(notes.map((n) => ((n % 12) + 12) % 12).sort(), `step ${step}`).toEqual(
        inD.get(step).map((n) => (((n + shift) % 12) + 12) % 12).sort(),
      );
      expect(notes, `step ${step}`).toEqual(expectedNotes(F, degreeAt(result.current.editedChords, step)).map((n) => n));
    }
  });
});

describe("VMU-127: undo, and hearing the original", () => {
  it("undoing an edit gives the loop of before, byte for byte at the export", () => {
    const { result } = setup();
    const start = bytes(result.current.timeline);
    act(() => result.current.editChords((l) => replaceChord(l, 1, "2-")));
    const one = bytes(result.current.timeline);
    expect(one).not.toBe(start);
    act(() => result.current.editChords((l) => insertChordAfter(l, 1, "5", 8)));
    expect(bytes(result.current.timeline)).not.toBe(one);
    act(() => result.current.undo());
    expect(bytes(result.current.timeline)).toBe(one);
    act(() => result.current.undo());
    expect(bytes(result.current.timeline)).toBe(start);
    expect(result.current.customChords).toBe(null);
    act(() => result.current.redo());
    expect(bytes(result.current.timeline)).toBe(one);
  });

  it("'hear the original' plays the style while an edit exists, then the edit again", () => {
    const { result } = setup();
    const style = bytes(result.current.timeline);
    editThreeChords(result);
    const edited = bytes(result.current.timeline);
    expect(result.current.hasEdits).toBe(true);
    act(() => result.current.setListenOriginal(true));
    expect(result.current.isHearingOriginal).toBe(true);
    expect(bytes(result.current.timeline)).toBe(style);
    expect(result.current.timeline.lengthMeasures).toBe(4);
    act(() => result.current.setListenOriginal(false));
    expect(bytes(result.current.timeline)).toBe(edited);
    // Holding is no step of the history: one undo still undoes the last edit.
    expect(result.current.editedChords).toHaveLength(3);
  });
});

describe("VMU-127: the variation, the Quick Start, the style, the Math cycle", () => {
  it("the edit is the variation's that plays: B keeps its own progression", () => {
    const { result } = setup();
    act(() => result.current.setCurrentTheme("B"));
    const bStyle = bytes(result.current.timeline);
    act(() => result.current.setCurrentTheme("A"));
    act(() => result.current.editChords((l) => replaceChord(l, 0, "2-")));
    expect(result.current.customChords.A).toBeDefined();
    act(() => result.current.setCurrentTheme("B"));
    expect(result.current.editedChords).toBe(null);
    expect(bytes(result.current.timeline)).toBe(bStyle);
    act(() => result.current.editChords((l) => replaceChord(l, 0, "4")));
    expect(result.current.customChords.A[0].nns).toBe("2-");
    expect(result.current.customChords.B[0].nns).toBe("4");
  });

  it("a Quick Start replaces the progression and drops the edits; it is the next edit's start", () => {
    const { result } = setup();
    act(() => result.current.editChords((l) => replaceChord(l, 0, "2-")));
    act(() => result.current.setCustomProgression(["1", "5", "6-", "4"]));
    expect(result.current.customChords).toBe(null);
    act(() => result.current.editChords((l) => replaceChord(l, 3, "2-")));
    expect(result.current.editedChords.map((c) => c.nns)).toEqual(["1", "5", "6-", "2-"]);
  });

  it("a style change drops the edits, in the same history step", () => {
    const { result } = setup();
    act(() => result.current.editChords((l) => replaceChord(l, 0, "2-")));
    const other = BRICKS.findIndex((b) => b.rootValue !== D);
    act(() => result.current.setCurrentBrickIndex(other));
    expect(result.current.customChords).toBe(null);
    act(() => result.current.undo());
    expect(result.current.editedChords[0].nns).toBe("2-");
  });

  it("the loop is the larger of the chords' length and the Math cycle's", () => {
    const { result } = setup();
    act(() => result.current.editChords((l) => resizeChords(l, 1)));
    expect(result.current.timeline.lengthMeasures).toBe(1);
    act(() => result.current.setCustomRhythm({ activeSteps: [0, 3], cycleLength: 112 }));
    expect(result.current.timeline.lengthMeasures).toBe(8);
    // The one-measure chord list is repeated over the 8 measures.
    expect(chordsInWindow(result.current.timeline)).toHaveLength(8);
  });
});
