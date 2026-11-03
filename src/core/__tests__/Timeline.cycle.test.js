import { describe, it, expect } from "vitest";
import { buildStudioTimeline, loopSteps, chordHitCells } from "../timeline";

/**
 * VMU-208 — Math & Rythmes: a pattern override may carry a cycle length, so
 * the circle continues from one measure to the next instead of folding back
 * onto one 16-step measure. With `cycleLength`, the cell at document step `s`
 * is index `s % cycleLength`; without it, the one-measure behaviour is
 * unchanged.
 */

/** Steps (over the document's window) on which `role`'s track has a cell. */
function hitSteps(doc, role) {
  const track = doc.tracks.find((t) => t.role === role);
  expect(track, `a ${role} track`).toBeDefined();
  const hits = [];
  for (let step = 0; step < loopSteps(doc); step++) {
    if (track.steps[step]) hits.push(step);
  }
  return hits;
}

/** Steps 0..63 where `step % cycleLength` is one of `indices`. */
function cycleHits(indices, cycleLength) {
  const hits = [];
  for (let step = 0; step < 64; step++) {
    if (indices.includes(step % cycleLength)) hits.push(step);
  }
  return hits;
}

const kickSteps = (doc) => doc.tracks.find((t) => t.role === "kick").steps;

describe("VMU-208 — a cycle-length override continues across measures", () => {
  it("a drum override with cycleLength 8 hits every cycle, not once per measure", () => {
    const doc = buildStudioTimeline({
      brickIndex: 0,
      overrides: { customDrums: { Kick: { activeSteps: [0, 3], cycleLength: 8 } } },
    });
    // 0, 3, 8, 11, 16, 19, ... — two cycles per measure.
    expect(hitSteps(doc, "kick")).toEqual(cycleHits([0, 3], 8));
  });

  it("a drum override with cycleLength 12 drifts across the bar line", () => {
    const doc = buildStudioTimeline({
      brickIndex: 0,
      overrides: { customDrums: { Kick: { activeSteps: [0, 3], cycleLength: 12 } } },
    });
    expect(hitSteps(doc, "kick")).toEqual(cycleHits([0, 3], 12));
    // 16 is not a multiple of 12: the pattern is at case 4 there, not case 0.
    expect(hitSteps(doc, "kick")).not.toContain(16);
  });

  it("a drum override with cycleLength 24 hits an index 20 at steps 20 and 44", () => {
    const doc = buildStudioTimeline({
      brickIndex: 0,
      overrides: { customDrums: { Kick: { activeSteps: [20], cycleLength: 24 } } },
    });
    expect(hitSteps(doc, "kick")).toEqual([20, 44]);
  });

  it("cycleLength 16 gives exactly the cells of the array form", () => {
    const cycled = buildStudioTimeline({
      brickIndex: 0,
      overrides: { customDrums: { Kick: { activeSteps: [0, 3], cycleLength: 16 } } },
    });
    const array = buildStudioTimeline({
      brickIndex: 0,
      overrides: { customDrums: { Kick: [0, 3] } },
    });
    expect(kickSteps(cycled)).toEqual(kickSteps(array));
  });

  it("an array override still gives today's one-measure cells", () => {
    const doc = buildStudioTimeline({
      brickIndex: 0,
      overrides: { customDrums: { Kick: [0, 4, 8, 12] } },
    });
    const steps = kickSteps(doc);
    const firstMeasure = steps.slice(0, 16).flatMap((cell, s) => (cell ? [s] : []));
    expect(firstMeasure).toEqual([0, 4, 8, 12]);
    // The same measure, copied into all 8.
    for (let measure = 1; measure < 8; measure++) {
      expect(steps.slice(measure * 16, measure * 16 + 16)).toEqual(steps.slice(0, 16));
    }
  });

  it("the bass pitchSteps follow the cycle index", () => {
    const doc = buildStudioTimeline({
      brickIndex: 0,
      overrides: {
        suggestedBassTrack: { name: "Bass", activeSteps: [3], pitchSteps: { 3: "5" }, cycleLength: 12 },
      },
    });
    const bass = doc.tracks.find((t) => t.role === "bass");
    for (let step = 0; step < loopSteps(doc); step++) {
      const cell = bass.steps[step];
      if (step % 12 === 3) expect(cell, `step ${step}`).toEqual({ vel: "normal", pitch: "5" });
      else expect(cell, `step ${step}`).toBeNull();
    }
  });

  it("the chord row takes the object form with a cycle length", () => {
    const doc = buildStudioTimeline({
      brickIndex: 0,
      overrides: { customRhythm: { activeSteps: [0, 6], cycleLength: 8 } },
    });
    const chords = doc.tracks.find((t) => t.role === "chordHits");
    expect(hitSteps(doc, "chordHits")).toEqual(cycleHits([0, 6], 8));
    // Several hits: each rings one step, as the array form's several-hit rule does.
    expect(chords.steps[0]).toEqual({ vel: "normal", len: 1 });
    expect(chords.steps[6]).toEqual({ vel: "normal", len: 1 });
  });

  it("legacy chord rhythms are unchanged", () => {
    const hits = (rhythm) =>
      chordHitCells(rhythm)
        .slice(0, 16)
        .flatMap((cell, step) => (cell ? [[step, cell.len]] : []));
    expect(hits([0, 6, 10])).toEqual([[0, 1], [6, 1], [10, 1]]);
    expect(hits([0, 2])).toEqual([0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 1]));
  });
});
