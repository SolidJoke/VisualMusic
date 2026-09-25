import { describe, it, expect } from "vitest";
import { Midi } from "@tonejs/midi";

/**
 * T3 — the timeline document: tracks that vary from one measure to the next,
 * up to 8 measures (src/core/timeline.js).
 *
 * Before T3 every track was one 16-step pattern repeated, and the loop was 4
 * measures of one chord each: past 4 chords nothing was heard or exported,
 * and no measure could differ from another. These tests describe the model
 * that replaces it, through the three things that read it: `stepEvents`
 * (what playback plays, dispatch.js), the MIDI export, and the document's own
 * operations.
 *
 * Predicted reds (written and run before the document was implemented, with
 * only its interface in place so that each test runs on its own): every test
 * fails on its first call, `buildStudioTimeline`, which the interface
 * declares and does not implement. Past that they would fail on the missing
 * `exportTimeline*` functions and on `stepEvents`, which still reads the
 * pre-T3 state (`{ brick, drums, melody, progression, rhythm }`) and finds
 * none of it in a document.
 *
 * Expected pitches are derived from the domain, not read off the code: the
 * default style ("Modern Pop (4 Chords)", bricks.json index 0) is C major,
 * I-V-vi-IV, root-position triads at C4 = MIDI 60. Times come from the
 * definition of BPM: at 120 BPM a 16th note lasts 60 / 120 / 4 = 0.125 s.
 */

const BPM = 120;
const STEP_SECONDS = 60 / BPM / 4;

// C major, root position, C4 = 60.
const C_MAJOR = [60, 64, 67]; // I
const F_MAJOR = [65, 69, 72]; // IV
const G_MAJOR = [67, 71, 74]; // V
const A_MINOR = [69, 72, 76]; // vi
const D_MINOR = [62, 65, 69]; // ii

const GM_KICK = 36;
const GM_HAT = 42;

async function load() {
  const [timeline, dispatch, exporter] = await Promise.all([
    import("../timeline"),
    import("../../audio/dispatch"),
    import("../../audio/MidiExporter"),
  ]);
  return { ...timeline, ...dispatch, ...exporter };
}

/** Steps of the document's window on which some event matches `predicate`, as playback plays them. */
function stepsWhere(m, doc, predicate) {
  const steps = [];
  for (let step = 0; step < m.loopSteps(doc); step++) {
    if (m.stepEvents(doc, step, { rootValue: 0 }).some(predicate)) steps.push(step);
  }
  return steps;
}

/** Onset steps of the exported notes that match `predicate`, from their time at BPM. */
function exportedSteps(bytes, predicate = () => true) {
  const notes = new Midi(bytes).tracks[0].notes.filter(predicate);
  return [...new Set(notes.map((n) => Math.round(n.time / STEP_SECONDS)))].sort((a, b) => a - b);
}

/** MIDI notes the export starts at `step`, sorted. */
function exportedNotesAt(bytes, step) {
  return new Midi(bytes).tracks[0].notes
    .filter((n) => Math.round(n.time / STEP_SECONDS) === step)
    .map((n) => n.midi)
    .sort((a, b) => a - b);
}

function trackOf(doc, role) {
  const track = doc.tracks.find((t) => t.role === role);
  expect(track, `a ${role} track`).toBeDefined();
  return track;
}

const isKick = (e) => e.voice === "drums" && e.instrument === "kick";
const isHat = (e) => e.voice === "drums" && e.instrument === "hat";
const isChord = (e) => e.voice === "chords";

describe("T3 — timeline document (predicted reds)", () => {
  it("une rangée dont la mesure 2 diffère de la mesure 1 se joue et s'exporte ainsi", async () => {
    const m = await load();
    // Default style: the kick plays steps 0 and 8 of every measure.
    let doc = m.buildStudioTimeline({ brickIndex: 0 });
    const kick = trackOf(doc, "kick");

    // Measure 2 only: the kick moves from its downbeat (step 16) to step 19.
    doc = m.setCell(doc, kick.id, 16, null);
    doc = m.setCell(doc, kick.id, 19, { vel: "normal" });

    const played = [0, 8, 19, 24, 32, 40, 48, 56];
    expect(stepsWhere(m, doc, isKick)).toEqual(played);
    expect(exportedSteps(m.exportTimelineDrums(doc, BPM), (n) => n.midi === GM_KICK)).toEqual(played);

    // Only measure 2 was edited, and the document says so.
    expect(trackOf(doc, "kick").provenance).toEqual(["style", "edit", "style", "style", "style", "style", "style", "style"]);
  });

  it("une figure de période 3 pas, écrite sur 4 mesures, ne se replie pas sur elle-même à chaque mesure", async () => {
    const m = await load();
    let doc = m.buildStudioTimeline({ brickIndex: 0 });
    const hat = trackOf(doc, "hat");
    for (let step = 0; step < 64; step++) {
      doc = m.setCell(doc, hat.id, step, step % 3 === 0 ? { vel: "normal" } : null);
    }

    // 0, 3, 6, ... 63: 22 hits, 16 is not one of them (16 = 3 x 5 + 1) and
    // 18 is. A figure folded back onto one 16-step measure would do the
    // opposite: its own 0 again at 16, its 2 (never a hit) at 18.
    const everyThird = Array.from({ length: 22 }, (_, i) => i * 3);
    expect(stepsWhere(m, doc, isHat)).toEqual(everyThird);
    expect(exportedSteps(m.exportTimelineDrums(doc, BPM), (n) => n.midi === GM_HAT)).toEqual(everyThird);
  });

  it("longueur 8 : l'accord 5 d'une progression de 8 est à la mesure 5, et il est exporté", async () => {
    const m = await load();
    // I IV V I vi ii V I — the fifth chord, A minor, is the only vi.
    const eight = ["1", "4", "5", "1", "6-", "2-", "5", "1"];
    const doc = m.buildStudioTimeline({ brickIndex: 0, overrides: { customProgression: eight }, lengthMeasures: 8 });

    expect(m.loopSteps(doc)).toBe(128);
    expect(m.chordAt(doc, 64)).toMatchObject({ index: 4, startStep: 64, endStep: 80 });
    expect(m.chordAt(doc, 64).chord).toMatchObject({ rootPc: 9, type: "chord_minor" });

    // Played at measure 5 (step 64 = 4 x 16), on each beat of the default rhythm.
    const chordAtMeasure5 = m.stepEvents(doc, 64, {}).find(isChord);
    expect(chordAtMeasure5.midi).toEqual(A_MINOR);

    // Exported there, at 8 s — and the file holds all eight measures.
    const file = m.exportTimelineChords(doc, BPM, { octaveOffset: 0 });
    expect(exportedNotesAt(file, 64)).toEqual(A_MINOR);
    expect(exportedNotesAt(file, 80)).toEqual(D_MINOR);
    expect(exportedSteps(file)).toHaveLength(8 * 4);
  });

  it("passer de 8 à 4 mesures puis revenir à 8 ne perd aucune case", async () => {
    const m = await load();
    let doc = m.buildStudioTimeline({ brickIndex: 0, lengthMeasures: 8 });
    // Edits in measures 5 to 8, which a 4-measure window does not play.
    doc = m.setCell(doc, trackOf(doc, "kick").id, 70, { vel: "normal" });
    doc = m.setCell(doc, trackOf(doc, "hat").id, 118, { vel: "ghost" });
    doc = m.setCell(doc, trackOf(doc, "bass").id, 126, null);

    const four = m.setLength(doc, 4);
    expect(four.lengthMeasures).toBe(4);
    expect(m.loopSteps(four)).toBe(64);
    expect(four.tracks).toEqual(doc.tracks);
    expect(four.chords).toEqual(doc.chords);
    // The window: nothing past measure 4 is exported at length 4.
    expect(Math.max(...exportedSteps(m.exportTimelineDrums(four, BPM)))).toBeLessThan(64);

    const back = m.setLength(four, 8);
    expect(back).toEqual(doc);
    expect(m.stepEvents(back, 70, {}).some(isKick)).toBe(true);
  });

  it("un style à 4 accords sur 8 mesures joue ses accords deux fois", async () => {
    const m = await load();
    const doc = m.buildStudioTimeline({ brickIndex: 0, lengthMeasures: 8 });
    const measureStarts = Array.from({ length: 8 }, (_, measure) => measure * 16);

    const played = measureStarts.map((step) => m.stepEvents(doc, step, {}).find(isChord)?.midi);
    expect(played).toEqual([C_MAJOR, G_MAJOR, A_MINOR, F_MAJOR, C_MAJOR, G_MAJOR, A_MINOR, F_MAJOR]);

    const file = m.exportTimelineChords(doc, BPM, { octaveOffset: 0 });
    expect(measureStarts.map((step) => exportedNotesAt(file, step))).toEqual(played);
  });

  // Decision 4 of the T3 brief: a measure without a chord silences the chord
  // track and the bass; the drums keep playing.
  it("une mesure sans accord : ni accord ni basse, la batterie continue", async () => {
    const m = await load();
    const full = m.buildStudioTimeline({ brickIndex: 0 });
    const doc = m.setChords(full, full.chords.slice(0, 2)); // chords for measures 1 and 2 only

    expect(m.chordAt(doc, 31)).not.toBeNull();
    expect(m.chordAt(doc, 32)).toBeNull();

    const isBass = (e) => e.voice === "melody" && e.track === "Bass";
    // The style's bass plays steps 0, 8, 14 of each measure.
    expect(stepsWhere(m, doc, isBass)).toEqual([0, 8, 14, 16, 24, 30]);
    expect(stepsWhere(m, doc, isChord).every((step) => step < 32)).toBe(true);
    expect(stepsWhere(m, doc, isKick)).toEqual([0, 8, 16, 24, 32, 40, 48, 56]);

    expect(Math.max(...exportedSteps(m.exportTimelineChords(doc, BPM, { octaveOffset: 0 })))).toBeLessThan(32);
    expect(exportedSteps(m.exportTimelineBass(doc, BPM))).toEqual([0, 8, 14, 16, 24, 30]);
  });
});

/**
 * The document itself — what the tests above take for granted. Expected
 * values come from bricks.json's data and the T3 brief's decisions, not
 * from the implementation.
 */
describe("T3 — timeline document: the model", () => {
  it("schema v1: every style and theme fills a valid document, at 4 and at 8 measures", async () => {
    const { buildStudioTimeline, timelineErrors } = await import("../timeline");
    const { BRICKS } = await import("../bricks");
    BRICKS.forEach((_, brickIndex) => {
      ["A", "B"].forEach((theme) => {
        [4, 8].forEach((lengthMeasures) => {
          const doc = buildStudioTimeline({ brickIndex, theme, lengthMeasures });
          expect(timelineErrors(doc), `${brickIndex}:${theme} at ${lengthMeasures}`).toEqual([]);
        });
      });
    });
  });

  it("the default style's document: key, window, rows, provenance, origin, base", async () => {
    const m = await load();
    const doc = m.buildStudioTimeline({ brickIndex: 0 });
    expect(doc.schemaVersion).toBe(1);
    expect(doc.key).toEqual({ rootValue: 0, scaleKey: "scale_major" });
    expect(doc.lengthMeasures).toBe(4);
    expect(doc.origin).toEqual({ brickIndex: 0, variation: "A" });
    // bricks.json: Kick, Snare, Hat, then the chord row, then Bass.
    expect(doc.tracks.map((t) => [t.id, t.name, t.role])).toEqual([
      ["drum-0", "Kick", "kick"],
      ["drum-1", "Snare", "snare"],
      ["drum-2", "Hat", "hat"],
      ["chords", "Chords", "chordHits"],
      ["melody-0", "Bass", "bass"],
    ]);
    doc.tracks.forEach((t) => {
      expect(t.steps).toHaveLength(128);
      expect(t.provenance).toEqual(Array(8).fill("style"));
    });
    // The kick of Modern Pop is steps 0 and 8 — in all 8 measures.
    const kickSteps = trackOf(doc, "kick").steps.flatMap((cell, step) => (cell ? [step] : []));
    expect(kickSteps).toEqual(Array.from({ length: 8 }, (_, m8) => [m8 * 16, m8 * 16 + 8]).flat());
    // No override: the base is the document's own chords and rows.
    expect(doc.base).toEqual({ chords: doc.chords, tracks: doc.tracks });
  });

  it("roles are computed once, at the fill, by trackMapping.js's rules: Rim is the snare group, Crash a hat, Bass the bass", async () => {
    const m = await load();
    const reggae = m.buildStudioTimeline({ brickIndex: 8 }); // Kick, Rim, Hat / Bass
    expect(reggae.tracks.map((t) => [t.name, t.role])).toEqual([
      ["Kick", "kick"],
      ["Rim", "snare"],
      ["Hat", "hat"],
      ["Chords", "chordHits"],
      ["Bass", "bass"],
    ]);
    const grooveMetal = m.buildStudioTimeline({ brickIndex: 16 }); // has a Crash
    expect(grooveMetal.tracks.find((t) => t.name === "Crash").role).toBe("hat");
    // A melodic track that is not a bass line is a melody.
    const lead = m.timelineFromSelection({ melody: [{ name: "Lead", activeSteps: [0] }] });
    expect(lead.tracks.find((t) => t.name === "Lead").role).toBe("melody");
  });

  it("the chord row plays each rhythm the way the pre-T3 loop did, with the same durations", async () => {
    const { chordHitCells } = await import("../timeline");
    const hits = (rhythm) =>
      chordHitCells(rhythm)
        .slice(0, 16)
        .flatMap((cell, step) => (cell ? [[step, cell.len]] : []));
    // One value <= 3: steps of one beat, on every beat; one hit rings a quarter note.
    expect(hits([0])).toEqual([[0, 4], [4, 4], [8, 4], [12, 4]]);
    expect(hits([2])).toEqual([[2, 4], [6, 4], [10, 4], [14, 4]]); // reggae skank
    // Several hits: a 16th each.
    expect(hits([0, 2])).toEqual([0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 1]));
    // A value above 3: steps of one measure.
    expect(hits([0, 6, 10])).toEqual([[0, 1], [6, 1], [10, 1]]);
    expect(hits([])).toEqual([]);
    // And the same in every measure.
    const row = chordHitCells([0, 6, 10]);
    expect(row.slice(112, 128)).toEqual(row.slice(0, 16));
  });

  it("a style's progression, repeated to 8 measures, stored absolute; its own notation kept for display only", async () => {
    const m = await load();
    const doc = m.buildStudioTimeline({ brickIndex: 0 });
    // 1 5 6- 4 in C major, twice: C G Am F C G Am F, one measure each.
    expect(doc.chords.map((c) => [c.rootPc, c.type, c.durationSteps, c.nns])).toEqual(
      [[0, "chord_major"], [7, "chord_major"], [9, "chord_minor"], [5, "chord_major"]]
        .concat([[0, "chord_major"], [7, "chord_major"], [9, "chord_minor"], [5, "chord_major"]])
        .map(([pc, type], i) => [pc, type, 16, ["1", "5", "6-", "4"][i % 4]]),
    );
  });

  it("the Studio's overrides replace their rows ('math'), the base stays the style's", async () => {
    const m = await load();
    const doc = m.buildStudioTimeline({
      brickIndex: 0,
      overrides: {
        customDrums: { Kick: [0, 4, 8, 12], Clap: [4, 12] },
        customRhythm: [0, 2],
        customProgression: ["6-", "4", "1", "5"],
        suggestedBassTrack: { name: "Bass", activeSteps: [0, 7], pitchSteps: { 0: "R", 7: "5" } },
      },
    });
    const byName = Object.fromEntries(doc.tracks.map((t) => [t.name, t]));
    expect(byName.Kick.provenance).toEqual(Array(8).fill("math"));
    expect(byName.Snare.provenance).toEqual(Array(8).fill("style"));
    expect(byName.Chords.provenance).toEqual(Array(8).fill("math"));
    expect(byName.Bass.provenance).toEqual(Array(8).fill("math"));
    // A custom drum the style does not have is appended, after the style's drums.
    expect(byName.Clap).toMatchObject({ id: "drum-3", role: "snare", provenance: Array(8).fill("math") });
    expect(doc.tracks.map((t) => t.name)).toEqual(["Kick", "Snare", "Hat", "Clap", "Chords", "Bass"]);
    expect(byName.Bass.steps[7]).toEqual({ vel: "normal", pitch: "5" });
    expect(doc.chords[0]).toMatchObject({ rootPc: 9, type: "chord_minor", nns: "6-" });

    // The base: Modern Pop as it fills itself — kick on 0 and 8, its own progression.
    const baseKick = doc.base.tracks.find((t) => t.name === "Kick");
    expect(baseKick.steps.slice(0, 16).flatMap((cell, step) => (cell ? [step] : []))).toEqual([0, 8]);
    expect(doc.base.chords.map((c) => c.nns).slice(0, 4)).toEqual(["1", "5", "6-", "4"]);
    expect(doc.base.tracks.map((t) => t.name)).toEqual(["Kick", "Snare", "Hat", "Chords", "Bass"]);
  });

  it("chordAt: chords end to end from step 0, half a measure allowed, none before 0 or past the last", async () => {
    const m = await load();
    const doc = m.setChords(m.buildStudioTimeline({ brickIndex: 0 }), [
      { rootPc: 0, type: "chord_major", durationSteps: 8 },
      { rootPc: 7, type: "chord_major", durationSteps: 8 },
      { rootPc: 9, type: "chord_minor", durationSteps: 32 },
    ]);
    expect(m.chordAt(doc, 7)).toMatchObject({ index: 0, startStep: 0, endStep: 8 });
    expect(m.chordAt(doc, 8)).toMatchObject({ index: 1, startStep: 8, endStep: 16 });
    expect(m.chordAt(doc, 47)).toMatchObject({ index: 2, startStep: 16, endStep: 48 });
    expect(m.chordAt(doc, 48)).toBeNull();
    expect(m.chordAt(doc, -1)).toBeNull();
    expect(m.chordAt(doc, 2.5)).toBeNull();
    expect(m.chordsInWindow(doc).map((span) => span.index)).toEqual([0, 1, 2]);
  });

  it("refuses what schema v1 does not allow", async () => {
    const m = await load();
    const doc = m.buildStudioTimeline({ brickIndex: 0 });
    const kick = trackOf(doc, "kick").id;
    expect(() => m.setLength(doc, 3)).toThrow(RangeError);
    expect(() => m.setCell(doc, kick, 128, null)).toThrow(RangeError);
    expect(() => m.setCell(doc, "nope", 0, null)).toThrow(RangeError);
    expect(() => m.setCell(doc, kick, 0, { vel: "loud" })).toThrow(TypeError);
    expect(() => m.setChords(doc, [{ rootPc: 0, type: "chord_major", durationSteps: 12 }])).toThrow(TypeError);
    expect(() => m.setChords(doc, [{ rootPc: 12, type: "chord_major", durationSteps: 16 }])).toThrow(TypeError);
    expect(() => m.setChords(doc, Array(9).fill({ rootPc: 0, type: "chord_major", durationSteps: 16 }))).toThrow(RangeError);
    // Nothing above touched the document.
    expect(m.timelineErrors(doc)).toEqual([]);
    expect(doc).toEqual(m.buildStudioTimeline({ brickIndex: 0 }));
  });

  it("describeChord: a style's chord as the style wrote it; any other chord's degree computed from the key", async () => {
    const m = await load();
    const { generateChordsFromNNS } = await import("../theory");
    const cMajor = { rootValue: 0, scaleKey: "scale_major" };
    // As written: exactly what generateChordsFromNNS gives for that label.
    const vi = { rootPc: 9, type: "chord_minor", durationSteps: 16, nns: "6-" };
    expect(m.describeChord(cMajor, vi)).toEqual(generateChordsFromNNS(0, "scale_major", ["6-"])[0]);
    // No label: A minor in C major is the 6th degree, minor.
    expect(m.describeChord(cMajor, { rootPc: 9, type: "chord_minor", durationSteps: 16 })).toMatchObject({
      nns: "6-",
      chordNameUS: "Am",
      chordNameEU: "Lam",
      rootNote: { value: 9 },
    });
    // No label, not in the scale: A# (B flat) major is the flat 7th.
    expect(m.describeChord(cMajor, { rootPc: 10, type: "chord_major", durationSteps: 16 })).toMatchObject({
      nns: "b7",
      chordNameUS: "A#",
    });
    // A label that is no longer this chord (the root was edited) is not shown.
    expect(m.describeChord(cMajor, { ...vi, rootPc: 2 })).toMatchObject({ nns: "2-", chordNameUS: "Dm" });
  });

  it("measurePattern gives back a style's one-measure pattern, for every style and theme", async () => {
    const m = await load();
    const { BRICKS } = await import("../bricks");
    BRICKS.forEach((brick, brickIndex) => {
      ["A", "B"].forEach((theme) => {
        const doc = m.buildStudioTimeline({ brickIndex, theme });
        const selection = m.studioSelection(brick, theme);
        const patterns = [...selection.drums, ...selection.melody];
        const rows = doc.tracks.filter((t) => t.role !== "chordHits");
        expect(rows.map((t) => m.measurePattern(t, 0)), `${brickIndex}:${theme}`).toEqual(patterns);
      });
    });
  });
});
