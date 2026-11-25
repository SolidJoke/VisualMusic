// VMU-223 — the groove is placed ONCE (stepEvents), played and exported from that one answer.
import { describe, it, expect } from "vitest";
import { Midi } from "@tonejs/midi";
import { BRICKS } from "../../core/bricks";
import { buildStudioTimeline, loopSteps } from "../../core/timeline";
import { stepEvents } from "../dispatch";
import { playStepEvents } from "../playStep";
import { exportTimelineDrums, exportTimelineBass, exportTimelineChords } from "../MidiExporter";
import { grooveOf, offsetSeconds } from "../../core/groove";

const BPM = 120;
const PPQ = 480;
/** One 16th-note step is 120 ticks at 120 bpm and 480 ticks per quarter note. */
const TICKS_PER_STEP = PPQ / 4;

// Groovy Funk: kick, snare, hat, chord and bass all strike on odd steps, so the swing has something to move.
const FUNK = BRICKS.findIndex((brick) => brick.name.en === "Groovy Funk");
const baseDoc = () => buildStudioTimeline({ brickIndex: FUNK, theme: "A" });
const withGroove = (doc, swing, humanize, seed = 4242) => {
  const groove = grooveOf(swing, humanize, seed);
  return groove ? { ...doc, groove } : doc;
};
const allEvents = (doc) => {
  const out = [];
  for (let step = 0; step < loopSteps(doc); step++) stepEvents(doc, step).forEach((event) => out.push({ step, event }));
  return out;
};
const notesOf = (bytes) => new Midi(bytes).tracks.flatMap((t) => t.notes);

describe("stepEvents with a groove", () => {
  it("a document with no groove, or a neutral one, gives the very same events (no extra field)", () => {
    const doc = baseDoc();
    const neutral = withGroove(doc, 50, 0);
    expect(neutral).toBe(doc);
    allEvents(doc).forEach(({ event }) => {
      expect(Object.keys(event)).not.toContain("offsetSteps");
      expect(Object.keys(event)).not.toContain("jitterMs");
    });
  });

  it("at 66 % the odd steps carry 0.32 and the even steps 0; the force is unchanged without humanisation", () => {
    const plain = allEvents(baseDoc());
    const swung = allEvents(withGroove(baseDoc(), 66, 0));
    expect(swung.length).toBe(plain.length);
    swung.forEach(({ step, event }, i) => {
      expect(event.offsetSteps).toBeCloseTo(step % 2 === 1 ? 0.32 : 0, 12);
      expect(event.jitterMs).toBe(0);
      expect(event.velocity).toBe(plain[i].event.velocity);
    });
    expect(swung.some(({ step }) => step % 2 === 1)).toBe(true);
  });

  it("a chord is one event: its notes share its one draw", () => {
    const swung = allEvents(withGroove(baseDoc(), 50, 100)).filter(({ event }) => event.voice === "chords");
    expect(swung.length).toBeGreaterThan(0);
    swung.forEach(({ event }) => {
      expect(event.midi.length).toBeGreaterThan(1);
      expect(typeof event.jitterMs).toBe("number");
    });
  });
});

describe("the export carries the same placement", () => {
  it("at 66 %, the odd steps' notes sit 0.32 step (38.4 ticks) later, the even ones on the grid", () => {
    const doc = withGroove(baseDoc(), 66, 0);
    const expected = allEvents(doc)
      .filter(({ event }) => event.voice === "drums")
      .map(({ step }) => Math.round(step * TICKS_PER_STEP + (step % 2 === 1 ? 0.32 * TICKS_PER_STEP : 0)))
      .sort((a, b) => a - b);
    const ticks = notesOf(exportTimelineDrums(doc, BPM)).map((n) => n.ticks).sort((a, b) => a - b);
    expect(ticks.length).toBe(expected.length);
    ticks.forEach((t, i) => expect(Math.abs(t - expected[i])).toBeLessThanOrEqual(1));
    // Positive proof the test would see a missing offset: the straight file differs on the odd steps.
    const straight = notesOf(exportTimelineDrums(baseDoc(), BPM)).map((n) => n.ticks).sort((a, b) => a - b);
    expect(straight).not.toEqual(ticks);
  });

  it("at 50 % and 0 % the files are byte for byte the straight ones", () => {
    const doc = baseDoc();
    const same = withGroove(doc, 50, 0);
    expect(Array.from(exportTimelineDrums(same, BPM))).toEqual(Array.from(exportTimelineDrums(doc, BPM)));
    expect(Array.from(exportTimelineBass(same, BPM))).toEqual(Array.from(exportTimelineBass(doc, BPM)));
    expect(Array.from(exportTimelineChords(same, BPM))).toEqual(Array.from(exportTimelineChords(doc, BPM)));
  });

  it("with swing alone the forces in the file are the straight file's", () => {
    const f = (doc) => notesOf(exportTimelineDrums(doc, BPM)).map((n) => n.velocity).sort();
    expect(f(withGroove(baseDoc(), 66, 0))).toEqual(f(baseDoc()));
  });
});

describe("what is played is what is exported (drums, bass), over a whole loop", () => {
  /** Plays every step on fake synths; returns the {time, velocity} of every drum trigger. */
  function playedDrums(doc) {
    const hits = [];
    const synths = {
      kickSynth: { triggerAttackRelease: (n, d, t, v) => hits.push({ kind: "drum", time: t, velocity: v }) },
      snareSynth: { triggerAttackRelease: (d, t, v) => hits.push({ kind: "drum", time: t, velocity: v }) },
      hatSynth: { triggerAttackRelease: (d, t, v) => hits.push({ kind: "drum", time: t, velocity: v }) },
      bassSynth: { triggerAttackRelease: (n, d, t, v) => hits.push({ kind: "bass", time: t, velocity: v }) },
      playDictionaryNote: () => {},
    };
    for (let step = 0; step < loopSteps(doc); step++) {
      const events = stepEvents(doc, step);
      const stepTime = (step * 15) / BPM; // the step's Tone time at 120 bpm
      playStepEvents(synths, events, stepTime, { offsetSeconds: (event) => offsetSeconds(event, BPM) });
    }
    return hits.filter((h) => h.kind);
  }

  const sameHit = (p, f) => Math.abs(p.time - f.time) <= 0.0011 && Math.abs(p.velocity - f.velocity) <= 1 / 127 + 1e-9;
  /** Every played hit finds, and uses up, one written hit at the same moment (a tick: 1.04 ms) and force (128 levels). */
  const matchAll = (played, file) => {
    const left = [...file];
    played.forEach((p) => {
      const at = left.findIndex((f) => sameHit(p, f));
      expect(at, `no written hit for ${JSON.stringify(p)}`).toBeGreaterThanOrEqual(0);
      left.splice(at, 1);
    });
    return left;
  };

  it.each([
    ["swing 66 %", 66, 0],
    ["humanisation 100 %", 50, 100],
    ["both", 66, 100],
  ])("%s: every drum hit's time (ms) and force match the file's", (_name, swing, humanize) => {
    expect(FUNK).toBeGreaterThanOrEqual(0);
    const doc = withGroove(baseDoc(), swing, humanize);
    const played = playedDrums(doc).filter((h) => h.kind === "drum");
    const file = notesOf(exportTimelineDrums(doc, BPM)).map((n) => ({ time: n.time, velocity: n.velocity }));
    expect(played.length).toBeGreaterThan(0);
    expect(file.length).toBe(played.length);
    expect(matchAll(played, file)).toEqual([]);
  });

  it("the bass line too (the rows the export keeps)", () => {
    const doc = withGroove(baseDoc(), 66, 100);
    const played = playedDrums(doc).filter((h) => h.kind === "bass");
    const file = notesOf(exportTimelineBass(doc, BPM)).map((n) => ({ time: n.time, velocity: n.velocity }));
    expect(file.length).toBeGreaterThan(0);
    // Playback plays every melodic row on the bass synth, the export keeps the bass rows (EXPORT-3):
    // every written note must be one that is played, at the same moment and force.
    file.forEach((f) => expect(played.some((p) => sameHit(p, f))).toBe(true));
  });

  it("humanisation is the same at every pass: two exports of one document are identical", () => {
    const doc = withGroove(baseDoc(), 66, 100);
    expect(Array.from(exportTimelineDrums(doc, BPM))).toEqual(Array.from(exportTimelineDrums(doc, BPM)));
  });

  it("another seed gives another file", () => {
    const a = Array.from(exportTimelineDrums(withGroove(baseDoc(), 50, 100, 1), BPM));
    const b = Array.from(exportTimelineDrums(withGroove(baseDoc(), 50, 100, 2), BPM));
    expect(a).not.toEqual(b);
  });
});

describe("chords", () => {
  it("every note of a chord is written at one moment and one force; the force moves by the played factor on the export's 0.8", () => {
    const doc = withGroove(baseDoc(), 66, 100);
    const hits = allEvents(doc).filter(({ event }) => event.voice === "chords");
    const notes = notesOf(exportTimelineChords(doc, BPM));
    expect(notes.length).toBe(hits.reduce((n, { event }) => n + event.midi.length, 0));
    const byTick = new Map();
    notes.forEach((n) => {
      const key = n.ticks;
      byTick.set(key, [...(byTick.get(key) ?? []), n]);
    });
    byTick.forEach((group) => {
      expect(new Set(group.map((n) => n.velocity)).size).toBe(1);
    });
    hits.forEach(({ event }) => {
      expect(event.velocity).toBeLessThanOrEqual(1);
      expect(event.velocityScale).toBeGreaterThan(0.84);
      expect(event.velocityScale).toBeLessThan(1.16);
    });
    const written = notes.map((n) => n.velocity);
    written.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0.8 * 0.85 - 1 / 127);
      expect(v).toBeLessThanOrEqual(0.8 * 1.15 + 1 / 127);
    });
  });

  it("playback plays a humanised chord at its force, and an untouched one with the call it always made", () => {
    const calls = [];
    const synths = {
      kickSynth: { triggerAttackRelease() {} },
      snareSynth: { triggerAttackRelease() {} },
      hatSynth: { triggerAttackRelease() {} },
      bassSynth: { triggerAttackRelease() {} },
      playDictionaryNote: (...args) => calls.push(args),
    };
    const chordStep = allEvents(baseDoc()).find(({ event }) => event.voice === "chords").step;
    playStepEvents(synths, stepEvents(baseDoc(), chordStep), 1);
    expect(calls[0].length).toBe(4);
    const doc = withGroove(baseDoc(), 50, 100);
    playStepEvents(synths, stepEvents(doc, chordStep), 1);
    expect(calls[1].length).toBe(5);
    expect(calls[1][4]).toBeGreaterThan(0.84);
    expect(calls[1][4]).toBeLessThanOrEqual(1);
  });
});
