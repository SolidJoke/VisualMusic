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
