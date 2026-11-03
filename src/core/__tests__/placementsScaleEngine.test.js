// VMU-202 (slice 2) — core/placements.js, scale branch, wired to the
// scale-position engine (core/scalePositions.js). The scale list is no longer
// five cut boxes picked by the common octave (C-06); it is the engine's
// positions for the neck's start pitch: guitar Do majeur starts on Do3 (48),
// bass on Do2 (36), numbered 1..N from the nut, the span-4 position nearest
// the nut by default, the span-5 positions marked `difficultStretch`.
//
// Domain values (standard tuning, frets from the nut; Do = 0):
//   Do majeur, guitar, Do3 (48) — 7 positions 0-3 2-5 3-7 4-8 5-9 7-10 8-12.
//   Do majeur, guitar, Do4 (60) — 12 positions (11 plain + the shift 0-8).
//   Do majeur, bass, Do2 (36) — 6 positions 2-5 3-7 4-8 5-9 7-10 8-12.
//   Do majeur, bass, Do3 (48) — 6 positions (shift 9-17 + 5 plain).
//   Every position of a complete octave sounds one octave, root to root.
import { describe, it, expect } from "vitest";
import {
  listPlacements,
  octaveClearsPlacement,
  scaleStartPitchOptions,
  presetScaleStartPitch,
} from "../placements";
import { TUNINGS } from "../tunings";

const GUITAR = { id: "guitar", tuning: TUNINGS.GUITAR_STANDARD, notation: "us" };
const BASS = { id: "bass", tuning: TUNINGS.BASS_STANDARD, notation: "us" };

const summary = (p) => [p.id, p.lowFret, p.highFret, p.range.low, p.range.high, p.isDefault];

describe("listPlacements — the scale branch now lists the engine's positions", () => {
  it("Do majeur, guitar (start pitch Do3 = 48): 7 positions from the nut, the span-4 0-3 by default", () => {
    const list = listPlacements({ type: "scale_major", root: 0, family: "scale" }, GUITAR);
    expect(list.map(summary)).toEqual([
      ["pos_guitar_48_0", 0, 3, 48, 60, true],
      ["pos_guitar_48_1", 2, 5, 48, 60, false],
      ["pos_guitar_48_2", 3, 7, 48, 60, false],
      ["pos_guitar_48_3", 4, 8, 48, 60, false],
      ["pos_guitar_48_4", 5, 9, 48, 60, false],
      ["pos_guitar_48_5", 7, 10, 48, 60, false],
      ["pos_guitar_48_6", 8, 12, 48, 60, false],
    ]);
    expect(list.map((p) => p.label)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  it("each position carries scaleFrets, isScaleMode, startFret/endFret = minFret/maxFret, and difficultStretch for the span-5 ones", () => {
    const list = listPlacements({ type: "scale_major", root: 0 }, GUITAR);
    for (const p of list) {
      expect(p.fingering.scaleFrets.length).toBe(8);
      expect(p.fingering.isScaleMode).toBe(true);
      expect(p.fingering.startFret).toBe(p.lowFret);
      expect(p.fingering.endFret).toBe(p.highFret);
    }
    // Spans: 4 4 5 5 5 4 5 — indices 2, 3, 4, 6 are "grand écart".
    expect(list.map((p) => p.fingering.difficultStretch)).toEqual([false, false, true, true, true, false, true]);
  });

  it("the default is the span-4 position nearest the nut, whatever the octave once was: Do majeur guitar Do4 (60) has 12 positions, default 1", () => {
    const list = listPlacements({ type: "scale_major", root: 0, startPitch: 60 }, GUITAR);
    expect(list).toHaveLength(12);
    expect(list.find((p) => p.isDefault).index).toBe(1);
    // The single shift position is first (0-8), then the plain ones.
    expect(list[0].lowFret).toBe(0);
    expect(list[0].highFret).toBe(8);
    expect(list.every((p) => p.range.low === 60 && p.range.high === 72)).toBe(true);
  });

  it("Do majeur, bass (start pitch Do2 = 36): 6 positions, the span-4 2-5 by default", () => {
    const list = listPlacements({ type: "scale_major", root: 0 }, BASS);
    expect(list.map(summary)).toEqual([
      ["pos_bass_36_0", 2, 5, 36, 48, true],
      ["pos_bass_36_1", 3, 7, 36, 48, false],
      ["pos_bass_36_2", 4, 8, 36, 48, false],
      ["pos_bass_36_3", 5, 9, 36, 48, false],
      ["pos_bass_36_4", 7, 10, 36, 48, false],
      ["pos_bass_36_5", 8, 12, 36, 48, false],
    ]);
  });

  it("Do majeur, bass, start pitch Do3 (48): 6 positions (shift 9-17 + 5 plain), default 1", () => {
    const list = listPlacements({ type: "scale_major", root: 0, startPitch: 48 }, BASS);
    expect(list).toHaveLength(6);
    expect(list.find((p) => p.isDefault).index).toBe(1);
    expect(list[0].lowFret).toBe(9);
    expect(list[0].highFret).toBe(17);
    expect(list.every((p) => p.range.low === 48 && p.range.high === 60)).toBe(true);
  });

  it("a chosen start pitch outside the available octaves falls back to the preset, not to an empty list", () => {
    const list = listPlacements({ type: "scale_major", root: 0, startPitch: 47 }, GUITAR);
    expect(list).toHaveLength(7);
    expect(list[0].id).toBe("pos_guitar_48_0");
  });
});

describe("scaleStartPitchOptions / presetScaleStartPitch — the control's octaves", () => {
  it("guitar Do majeur offers Do3 Do4 Do5, preset Do3; bass offers Do2 Do3, preset Do2", () => {
    const g = scaleStartPitchOptions({ type: "scale_major", root: 0 }, GUITAR);
    expect(g.map((o) => o.pitch)).toEqual([48, 60, 72]);
    expect(presetScaleStartPitch(g, "guitar")).toBe(48);
    const b = scaleStartPitchOptions({ type: "scale_major", root: 0 }, BASS);
    expect(b.map((o) => o.pitch)).toEqual([36, 48]);
    expect(presetScaleStartPitch(b, "bass")).toBe(36);
  });

  it("the label is the MIDI note name (US), as the engine writes it", () => {
    expect(scaleStartPitchOptions({ type: "scale_major", root: 0 }, GUITAR)[0].label).toBe("C3");
  });

  it("an octave with no complete position is not offered", () => {
    // No octave of the major scale on the guitar can be incomplete, but the
    // bass's highest octave of the chromatic scale has no position — the list
    // only holds what the engine finds.
    const opts = scaleStartPitchOptions({ type: "scale_major", root: 11 }, BASS);
    expect(opts.every((o) => o.positionCount >= 1)).toBe(true);
  });
});

describe("the common octave no longer clears a chosen scale position", () => {
  it("a scale: the octave keeps the chosen position (the start pitch chooses it now); a note still clears, a chord never did", () => {
    expect(octaveClearsPlacement("scale_major")).toBe(false);
    expect(octaveClearsPlacement("single_note")).toBe(true);
    expect(octaveClearsPlacement("chord_major")).toBe(false);
  });
});
