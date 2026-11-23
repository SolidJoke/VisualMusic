// VMU-221 — a chance per cell and a density per track, wired into the Studio.
//
// RED FIRST: useStudioMode has no chance, density nor seed on main.
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { Midi } from "@tonejs/midi";
import { useStudioMode } from "../useStudioMode";
import { loopSteps, DRUM_ROLES, STEPS_PER_MEASURE } from "../../core/timeline";
import { stepEvents } from "../../audio/dispatch";
import { exportTimelineDrums, exportTimelineChords } from "../../audio/MidiExporter";

beforeEach(() => window.localStorage.clear());

const BPM = 100;
const setup = () => renderHook(() => useStudioMode());
const role = (doc, r) => doc.tracks.find((t) => t.role === r);
const hits = (t) => t.steps.flatMap((cell, i) => (cell ? [i] : []));
const stepSec = 60 / BPM / 4;
const bytes = (doc) =>
  JSON.stringify([
    Array.from(new Uint8Array(exportTimelineDrums(doc, BPM))),
    Array.from(new Uint8Array(exportTimelineChords(doc, BPM))),
  ]);

/** The drum hits of the loop's window, three ways: drawn, played, exported. */
function threeWays(doc) {
  const window = loopSteps(doc);
  const drawn = [];
  doc.tracks.filter((t) => DRUM_ROLES.includes(t.role)).forEach((t) => hits(t).filter((s) => s < window).forEach((s) => drawn.push(`${t.role}@${s}`)));
  const played = [];
  for (let s = 0; s < window; s++) stepEvents(doc, s).filter((e) => e.voice === "drums").forEach((e) => played.push(`${e.role}@${s}`));
  const midi = new Midi(exportTimelineDrums(doc, BPM));
  const exportedTimes = midi.tracks[0].notes.map((n) => Math.round(n.time / stepSec)).sort((a, b) => a - b);
  return { drawn: drawn.sort(), played: played.sort(), exportedTimes, window };
}

describe("VMU-221: nothing set", () => {
  it("starts neutral and shows no removed hit", () => {
    const { result } = setup();
    expect(result.current.chanceDropped).toEqual({});
    expect(result.current.hasEdits).toBe(false);
    expect(Number.isInteger(result.current.chance.seed)).toBe(true);
  });

  it("a new seed with nothing set changes nothing (the very same document)", () => {
    const { result } = setup();
    const before = result.current.timeline;
    act(() => result.current.newChanceVersion());
    expect(result.current.timeline).toBe(before);
  });
});

describe("VMU-221: a version, three ways", () => {
  it("what is drawn is what plays and what is exported, with a density and chances set", () => {
    const { result } = setup();
    const snare = role(result.current.timeline, "snare");
    const hat = role(result.current.timeline, "hat");
    const snareHits = hits(snare).slice(0, 4);
    act(() => {
      snareHits.forEach((s) => result.current.cycleCellChance(snare.id, s));
      result.current.setTrackDensity(hat.id, 60);
    });
    const doc = result.current.timeline;
    const { drawn, played, exportedTimes, window } = threeWays(doc);
    expect(window).toBe(4 * STEPS_PER_MEASURE);
    expect(played).toEqual(drawn);
    expect(exportedTimes).toEqual(drawn.map((x) => Number(x.split("@")[1])).sort((a, b) => a - b));
    // and the density really removed some hats (the test is not vacuous)
    expect(Object.keys(result.current.chanceDropped).length).toBeGreaterThan(0);
  });

  it("the removed hits are exactly the source hits that are no longer in the document", () => {
    const { result } = setup();
    const hatBefore = role(result.current.timeline, "hat");
    act(() => result.current.setTrackDensity(hatBefore.id, 60));
    const hatAfter = role(result.current.timeline, "hat");
    const gone = hits(hatBefore).filter((s) => hatAfter.steps[s] === null);
    expect(gone.length).toBeGreaterThan(0);
    expect(result.current.chanceDropped[hatBefore.id]).toEqual(gone);
  });

  it("the version is fixed: reading the document again gives the same hits (no draw per pass)", () => {
    const { result, rerender } = setup();
    const hat = role(result.current.timeline, "hat");
    act(() => result.current.setTrackDensity(hat.id, 50));
    const first = bytes(result.current.timeline);
    rerender();
    rerender();
    expect(bytes(result.current.timeline)).toBe(first);
  });

  it("the key moves the chords but not the removed hits", () => {
    const { result } = setup();
    const hat = role(result.current.timeline, "hat");
    act(() => result.current.setTrackDensity(hat.id, 50));
    const before = hits(role(result.current.timeline, "hat"));
    act(() => result.current.setKeyRoot((result.current.keyRoot + 3) % 12));
    expect(hits(role(result.current.timeline, "hat"))).toEqual(before);
  });
});

describe("VMU-221: another version", () => {
  it("is one single undo step, and Ctrl+Z gives back the export of before, byte for byte", () => {
    const { result } = setup();
    const hat = role(result.current.timeline, "hat");
    act(() => result.current.setTrackDensity(hat.id, 50));
    const beforeBytes = bytes(result.current.timeline);
    const beforeSeed = result.current.chance.seed;
    act(() => result.current.newChanceVersion());
    expect(result.current.chance.seed).not.toBe(beforeSeed);
    expect(bytes(result.current.timeline)).not.toBe(beforeBytes);
    act(() => result.current.undo());
    expect(result.current.chance.seed).toBe(beforeSeed);
    expect(bytes(result.current.timeline)).toBe(beforeBytes);
    act(() => result.current.redo());
    expect(result.current.chance.seed).not.toBe(beforeSeed);
  });

  it("a cell's chance and a density are history steps too, back to the neutral document", () => {
    const { result } = setup();
    const start = bytes(result.current.timeline);
    const snare = role(result.current.timeline, "snare");
    act(() => result.current.cycleCellChance(snare.id, hits(snare)[0]));
    act(() => result.current.setTrackDensity(snare.id, 40));
    expect(result.current.hasEdits).toBe(true);
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(bytes(result.current.timeline)).toBe(start);
    expect(result.current.hasEdits).toBe(false);
  });
});

describe("VMU-221: hearing the original", () => {
  it("ignores the chances, the densities and the seed", () => {
    const { result } = setup();
    const startBytes = bytes(result.current.timeline);
    const hat = role(result.current.timeline, "hat");
    act(() => result.current.setTrackDensity(hat.id, 20));
    expect(bytes(result.current.timeline)).not.toBe(startBytes);
    act(() => result.current.setListenOriginal(true));
    expect(result.current.isHearingOriginal).toBe(true);
    expect(bytes(result.current.timeline)).toBe(startBytes);
    expect(result.current.chanceDropped).toEqual({});
    act(() => result.current.setListenOriginal(false));
    expect(bytes(result.current.timeline)).not.toBe(startBytes);
  });
});

describe("VMU-221: a style change", () => {
  it("drops the chances and densities (they belong to the style's tracks), keeps the seed", () => {
    const { result } = setup();
    const hat = role(result.current.timeline, "hat");
    act(() => result.current.setTrackDensity(hat.id, 50));
    const seed = result.current.chance.seed;
    act(() => result.current.setCurrentBrickIndex(result.current.currentBrickIndex === 0 ? 1 : 0));
    expect(result.current.hasEdits).toBe(false);
    expect(result.current.chanceDropped).toEqual({});
    expect(result.current.chance.seed).toBe(seed);
  });
});
