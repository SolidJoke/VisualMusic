// VMU-219 — the loop's key: the one effective tonic, the document and the style
// brick it transposes, and the seven chords of the key.
//
// RED FIRST: src/core/keyChoice.js does not exist on main, so every test here
// fails until it does.
//
// Domain values (MIDI 60 = C4; pitch classes C = 0 ... B = 11): Ré = 2, Fa = 5,
// so Ré -> Fa is +3 semitones. A key change moves the chords and the bass by
// that many semitones, never the drums, and never the mode of the style.
import { describe, it, expect } from "vitest";
import { BRICKS } from "../bricks";
import { buildStudioTimeline, timelineFromSelection, studioSelection } from "../timeline";
import { stepEvents } from "../../audio/dispatch";
import { midiFileName } from "../../audio/MidiExporter";
import { effectiveRoot, keyedBrick, transposeTimeline, keyChordPills } from "../keyChoice";

const D = 2;
const F = 5;
const pc = (midi) => ((midi % 12) + 12) % 12;
const loopEvents = (doc, rootValue) => {
  const out = [];
  for (let step = 0; step < doc.lengthMeasures * 16; step++) out.push(...stepEvents(doc, step, { octaveOffset: 0, rootValue }));
  return out;
};

describe("VMU-219 (a): the effective tonic", () => {
  it("is the user's choice, else the style's own", () => {
    expect(effectiveRoot(D, null)).toBe(D);
    expect(effectiveRoot(D, undefined)).toBe(D);
    expect(effectiveRoot(D, F)).toBe(F);
    // 0 (Do) is a choice, not "no choice".
    expect(effectiveRoot(D, 0)).toBe(0);
  });

  it("keyedBrick keeps the style brick itself (same object) when the key is the style's", () => {
    const brick = BRICKS[0];
    expect(keyedBrick(brick, brick.rootValue)).toBe(brick);
  });

  it("keyedBrick changes the tonic and nothing else of the style, mode included", () => {
    const brick = BRICKS[0];
    const keyed = keyedBrick(brick, (brick.rootValue + 3) % 12);
    expect(keyed.rootValue).toBe((brick.rootValue + 3) % 12);
    expect(keyed.scaleKey).toBe(brick.scaleKey);
    expect(keyed.bpm).toBe(brick.bpm);
    expect(keyed.name).toBe(brick.name);
    expect(brick.rootValue, "the style's data is not mutated").toBe(BRICKS[0].rootValue);
  });
});

describe("VMU-219 (b): transposing the loop", () => {
  const style = BRICKS.findIndex((b) => b.rootValue === D);
  const doc = buildStudioTimeline({ brickIndex: style, theme: "A" });

  it("a shift of 0 hands back the very same document", () => {
    expect(transposeTimeline(doc, 0)).toBe(doc);
    expect(transposeTimeline(doc, 12)).toBe(doc);
  });

  it("moves the key and every chord root by n semitones, keeping types, degrees and rhythm", () => {
    const moved = transposeTimeline(doc, F - D);
    expect(moved.key).toEqual({ rootValue: F, scaleKey: doc.key.scaleKey });
    expect(moved.chords.map((c) => c.rootPc)).toEqual(doc.chords.map((c) => (c.rootPc + 3) % 12));
    expect(moved.chords.map((c) => c.type)).toEqual(doc.chords.map((c) => c.type));
    expect(moved.chords.map((c) => c.nns)).toEqual(doc.chords.map((c) => c.nns));
    expect(moved.tracks).toEqual(doc.tracks);
    expect(moved.base.chords.map((c) => c.rootPc)).toEqual(doc.base.chords.map((c) => (c.rootPc + 3) % 12));
    expect(doc.key.rootValue, "the source document is not mutated").toBe(D);
  });

  it("wraps below the tonic range: a shift of -4 is a shift of +8", () => {
    expect(transposeTimeline(doc, -4).key.rootValue).toBe((D + 8) % 12);
  });

  it("the played chords and bass move by n semitones (as pitch classes); the drums do not move", () => {
    const before = loopEvents(doc, D);
    const after = loopEvents(transposeTimeline(doc, 3), F);
    expect(after.length).toBe(before.length);
    let chordsSeen = 0;
    let bassSeen = 0;
    before.forEach((event, i) => {
      const other = after[i];
      expect(other.voice).toBe(event.voice);
      expect(other.role).toBe(event.role);
      expect(other.durationSteps).toBe(event.durationSteps);
      if (event.voice === "drums") {
        expect(other.midi).toEqual(event.midi);
        return;
      }
      expect(other.midi.map(pc).sort((a, b) => a - b)).toEqual(event.midi.map((m) => pc(m + 3)).sort((a, b) => a - b));
      if (event.voice === "chords") chordsSeen += 1;
      if (event.voice === "melody") bassSeen += 1;
    });
    expect(chordsSeen, "the style has chord hits").toBeGreaterThan(0);
    expect(bassSeen, "the style has a bass").toBeGreaterThan(0);
  });

  it("a document without a key (no style) is returned as it is", () => {
    const keyless = { ...doc, key: null, chords: [] };
    expect(transposeTimeline(keyless, 3)).toBe(keyless);
  });

  it("a shift equal to 0 plays exactly what the style plays (the goldens' guard)", () => {
    expect(loopEvents(transposeTimeline(doc, 0), D)).toEqual(loopEvents(doc, D));
  });
});

describe("VMU-219 (c): the exported file's name follows the chosen key", () => {
  const style = BRICKS.findIndex((b) => b.rootValue === D);
  const doc = buildStudioTimeline({ brickIndex: style, theme: "A" });
  const named = (key, lang) => midiFileName({ styleName: "Style", key, lang, bpm: 100, variation: "A", part: "chords" });

  it("writes Ré for the style's key and Fa after the shift, in EU names", () => {
    expect(named(doc.key, "fr")).toContain("_Ré_");
    expect(named(transposeTimeline(doc, 3).key, "fr")).toContain("_Fa_");
  });

  it("writes D then F in US names", () => {
    expect(named(doc.key, "en")).toContain("_D_");
    expect(named(transposeTimeline(doc, 3).key, "en")).toContain("_F_");
  });
});

describe("VMU-219 (d): the seven chords of the key", () => {
  it("C major: C Dm Em F G Am Bdim, I ii iii IV V vi vii°", () => {
    const pills = keyChordPills(0, "scale_major");
    expect(pills).toHaveLength(7);
    expect(pills.map((p) => p.chord.chordNameUS)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(pills.map((p) => p.roman)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(pills.map((p) => p.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("D major (the key's tonic moves, the names with it): D Em F#m G A Bm C#dim", () => {
    const pills = keyChordPills(D, "scale_major");
    expect(pills.map((p) => p.chord.chordNameUS)).toEqual(["D", "Em", "F#m", "G", "A", "Bm", "C#dim"]);
    expect(pills.map((p) => p.roman)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
  });

  it("A minor: Am Bdim C Dm Em F G, i ii° III iv v VI VII", () => {
    const pills = keyChordPills(9, "scale_minor");
    expect(pills.map((p) => p.chord.chordNameUS)).toEqual(["Am", "Bdim", "C", "Dm", "Em", "F", "G"]);
    expect(pills.map((p) => p.roman)).toEqual(["i", "ii°", "III", "iv", "v", "VI", "VII"]);
  });

  it("F minor, in the key's own notes: Fm Gdim G# A#m Cm C# D#", () => {
    const pills = keyChordPills(F, "scale_minor");
    expect(pills.map((p) => p.chord.chordNameUS)).toEqual(["Fm", "Gdim", "G#", "A#m", "Cm", "C#", "D#"]);
  });

  it("each pill carries the chord the Studio's own buttons would click (root, nns, names)", () => {
    for (const pill of keyChordPills(D, "scale_major")) {
      expect(pill.chord.rootNote).toBeDefined();
      expect(typeof pill.chord.nns).toBe("string");
      expect(pill.chord.chordNameEU).toBeTruthy();
    }
  });

  it("says which family of phrases to read: the tonic chord's quality", () => {
    expect(keyChordPills(D, "scale_major").mode).toBe("major");
    expect(keyChordPills(9, "scale_minor").mode).toBe("minor");
    expect(keyChordPills(2, "scale_dorian").mode).toBe("minor");
    expect(keyChordPills(7, "scale_mixolydian").mode).toBe("major");
  });

  it("gives seven chords for every mode a style uses", () => {
    const modes = new Set(BRICKS.map((b) => b.scaleKey));
    for (const scaleKey of modes) {
      const pills = keyChordPills(4, scaleKey);
      expect(pills, scaleKey).toHaveLength(7);
      pills.forEach((p) => expect(p.chord.rootNote, scaleKey).toBeDefined());
    }
  });
});

describe("VMU-219 (e): nothing in the style's selection changes with the key", () => {
  it("the progression a panel shows is the degrees, key-free", () => {
    const brick = BRICKS[0];
    const a = studioSelection(brick, "A", {});
    const b = studioSelection(keyedBrick(brick, (brick.rootValue + 3) % 12), "A", {});
    expect(b.progression).toEqual(a.progression);
    expect(timelineFromSelection({ brick: keyedBrick(brick, (brick.rootValue + 3) % 12), ...b }).key.scaleKey).toBe(brick.scaleKey);
  });
});
