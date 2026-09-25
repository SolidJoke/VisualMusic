import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRICKS, THEMES, studioState, SPECIAL_CASES, JAZZ_251_MAJ } from "./goldenCases";
import { buildStudioTimeline, setCell, studioSelection, timelineFromSelection } from "../../core/timeline";

/**
 * T1 — the contract of `stepEvents` (src/audio/dispatch.js), the one place
 * that decides what plays on a step, and the two static facts the tranche
 * closes on:
 *
 * - VMU-137: MidiExporter.js no longer recomputes a measure's chord. It used
 *   to import generateChordsFromNNS + resolveNnsToChordType +
 *   resolveChordSemitones and redo what playback's resolveMeasureChord
 *   already did — two copies of one rule, the shape of VMU-125 and VMU-128.
 * - dispatch.js is pure: no Tone anywhere in what it imports, so the export,
 *   the harness and any future caller can run it without an audio context.
 *
 * The goldens (ExportGolden.test.js, PlaybackGolden.test.jsx) prove the move
 * changed nothing; this file pins what the new function promises.
 *
 * T3: `stepEvents` reads a timeline document (core/timeline.js) —
 * `stepEvents(doc, step, { octaveOffset, rootValue })` — instead of the
 * pre-T3 state `{ brick, drums, melody, progression, rhythm, octaveOffset,
 * rootValue }`. The tests below that were written against that state now
 * hand it the document the Studio fills from it (`timelineFromSelection`,
 * through `played` below); what they expect is unchanged.
 */

/** What plays on `step` for a pre-T3 state: its document, with its Studio settings. */
function played(state, step) {
  return stepEvents(timelineFromSelection(state), step, { octaveOffset: state.octaveOffset, rootValue: state.rootValue });
}

let stepEvents;

const AUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(AUDIO, "..");

/** Source without comments, so a doc comment naming a function is not an import of it. */
function codeOf(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Module specifiers a file imports (static and dynamic). */
function importsOf(file) {
  const code = codeOf(file);
  const specs = [];
  for (const m of code.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specs.push(m[1]);
  for (const m of code.matchAll(/\bimport\s*\(?\s*["']([^"']+)["']/g)) specs.push(m[1]);
  return specs;
}

/** Every file reachable from `entry` through relative imports, with every bare specifier they import. */
function importClosure(entry) {
  const seen = new Set();
  const bare = new Set();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(file)) {
      if (!spec.startsWith(".")) {
        bare.add(spec);
        continue;
      }
      const base = path.resolve(path.dirname(file), spec);
      const resolved = [base, `${base}.js`, `${base}.jsx`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      if (resolved && /\.jsx?$/.test(resolved)) stack.push(resolved);
    }
  }
  return { files: [...seen], bare: [...bare] };
}

describe("VMU-137 — the exporter reads the dispatch instead of recomputing the chord", () => {
  it("MidiExporter.js uses none of the three chord-recomputation functions", () => {
    const code = codeOf(path.join(AUDIO, "MidiExporter.js"));
    ["generateChordsFromNNS", "resolveNnsToChordType", "resolveChordSemitones"].forEach((name) => {
      expect(code, name).not.toMatch(new RegExp(`\\b${name}\\b`));
    });
  });

  // The one behaviour T1 changes, on purpose: before, exportBass threw
  // ("Cannot read properties of undefined (reading 'match')") on an empty
  // progression. Unreachable from the UI; an empty file is the honest output.
  it("exportBass with an empty progression writes an empty bass track instead of throwing", async () => {
    const { exportBass } = await import("../MidiExporter");
    const { Midi } = await import("@tonejs/midi");
    const state = studioState(0, "A");
    const file = new Midi(exportBass(state.melody, state.brick, [], 120));
    expect(file.tracks.map((t) => t.notes.length)).toEqual([0]);
  });

  it("MidiExporter.js imports stepEvents from dispatch.js", () => {
    expect(codeOf(path.join(AUDIO, "MidiExporter.js"))).toMatch(
      /import\s*\{[^}]*\bstepEvents\b[^}]*\}\s*from\s*["']\.\/dispatch["']/,
    );
  });
});

describe("stepEvents — pure", () => {
  beforeAll(async () => {
    ({ stepEvents } = await import("../dispatch"));
  });

  it("imports no Tone, directly or through anything it imports", () => {
    const { files, bare } = importClosure(path.join(AUDIO, "dispatch.js"));
    expect(files.length).toBeGreaterThan(1); // positive control: the walk followed imports
    expect(bare.filter((spec) => spec === "tone" || spec.startsWith("tone/"))).toEqual([]);
    expect(files.map((f) => path.relative(SRC, f).replace(/\\/g, "/"))).not.toContain("audio/AudioEngine.js");
  });

  it("core/timeline.js, the document it reads, imports neither Tone nor React (T3)", () => {
    const { files, bare } = importClosure(path.join(SRC, "core", "timeline.js"));
    expect(files.length).toBeGreaterThan(1); // positive control: the walk followed imports
    expect(bare.filter((spec) => ["tone", "react", "react-dom"].includes(spec.split("/")[0]))).toEqual([]);
  });

  it("playStep.js, the shared playback translation, imports no Tone either (the synths are passed in)", () => {
    const { bare } = importClosure(path.join(AUDIO, "playStep.js"));
    expect(bare.filter((spec) => spec === "tone" || spec.startsWith("tone/"))).toEqual([]);
  });

  it("playStep's toneDuration covers exactly the durations stepEvents produces, and refuses to guess others", async () => {
    const { toneDuration } = await import("../playStep");
    expect([0.5, 1, 2, 4].map(toneDuration)).toEqual(["32n", "16n", "8n", "4n"]);
    expect(() => toneDuration(3)).toThrow(/3 steps/);
  });

  it("returns the same events for the same input, twice, and does not mutate the input", () => {
    const states = [studioState(0, "A"), studioState(8, "B"), ...Object.values(SPECIAL_CASES).map((b) => b())];
    states.forEach((state) => {
      const doc = timelineFromSelection(state);
      const options = { octaveOffset: state.octaveOffset, rootValue: state.rootValue };
      const before = JSON.stringify(doc);
      for (let step = 0; step < 64; step++) {
        const first = stepEvents(doc, step, options);
        const second = stepEvents(doc, step, options);
        expect(second).toEqual(first);
        expect(second).not.toBe(first);
      }
      expect(JSON.stringify(doc)).toBe(before);
    });
  });
});

describe("stepEvents — what it says plays (default style, Modern Pop, C major, I-V-vi-IV)", () => {
  beforeAll(async () => {
    ({ stepEvents } = await import("../dispatch"));
  });

  it("step 0: kick and hat, the C major chord for a quarter note, the bass on C2", () => {
    const events = played(studioState(0, "A"), 0);
    expect(events.map((e) => [e.voice, e.instrument])).toEqual([
      ["drums", "kick"],
      ["drums", "hat"],
      ["chords", "piano"],
      ["melody", "bass"],
    ]);
    const [kick, hat, chord, bass] = events;
    expect(kick).toMatchObject({ midi: [36], durationSteps: 2, velocity: 0.8 });
    expect(hat).toMatchObject({ midi: [42], durationSteps: 0.5, velocity: 0.8 });
    expect(chord).toMatchObject({ midi: [60, 64, 67], durationSteps: 4, velocity: 1 });
    expect(bass).toMatchObject({ midi: [36], durationSteps: 1, velocity: 0.9, track: "Bass", tonicFallback: false });
  });

  it("step 16 is measure 2: the G major chord", () => {
    const chord = played(studioState(0, "A"), 16).find((e) => e.voice === "chords");
    expect(chord.midi).toEqual([67, 71, 74]);
  });

  it("no progression: every melodic track falls back to the sequencer's tonic, flagged", () => {
    const state = studioState(0, "A", { progression: [], rootValue: 3 });
    const melody = played(state, 0).filter((e) => e.voice === "melody");
    expect(melody).toEqual([
      expect.objectContaining({ instrument: "bass", midi: [39], track: "Bass", tonicFallback: true }),
    ]);
    expect(played(state, 0).some((e) => e.voice === "chords")).toBe(false);
  });

  it("each event carries the role its row was filled with (trackMapping.js), once", () => {
    const events = played(studioState(8, "A"), 8); // Joyful Reggae: Kick, Rim (the snare group), Hat, Bass
    expect(events.map((e) => [e.track, e.role])).toEqual([
      ["Kick", "kick"],
      ["Rim", "snare"],
      ["Hat", "hat"],
      ["Bass", "bass"],
    ]);
  });
});

/**
 * The goldens freeze what the pre-T3 entry points produce, and those entry
 * points (the export's three signatures, useSequencer's selection props) now
 * fill a document with `timelineFromSelection`. The app fills its own with
 * `buildStudioTimeline` (useStudioMode; the audio harness too). This pins
 * that the two are the same document, so the goldens cover what the app
 * plays.
 */
describe("T3 — the Studio's document is the goldens' document", () => {
  const rowsOf = (doc) => doc.tracks.map(({ id, name, role, steps }) => ({ id, name, role, steps }));

  it.each(BRICKS.flatMap((brick, index) => THEMES.map((theme) => [index, theme, brick.name.en])))(
    "%i:%s %s — same chords, same rows",
    (index, theme) => {
      const studio = buildStudioTimeline({ brickIndex: index, theme });
      const golden = timelineFromSelection(studioState(index, theme));
      expect(studio.chords).toEqual(golden.chords);
      expect(rowsOf(studio)).toEqual(rowsOf(golden));
      expect(studio.lengthMeasures).toBe(4);
    },
  );

  it("with every override, the same rows as the selection the panels show", () => {
    const overrides = {
      customDrums: { Kick: [0, 3, 6, 10], Clap: [4, 12] },
      customRhythm: [0, 6, 10],
      customProgression: JAZZ_251_MAJ,
      suggestedBassTrack: { name: "Bass", activeSteps: [0, 7, 15], pitchSteps: { 0: "R", 7: "5", 15: "3" } },
    };
    const studio = buildStudioTimeline({ brickIndex: 0, theme: "A", overrides });
    const selection = timelineFromSelection({ brick: BRICKS[0], ...studioSelection(BRICKS[0], "A", overrides) });
    expect(studio.chords).toEqual(selection.chords);
    expect(rowsOf(studio)).toEqual(rowsOf(selection));
  });
});

describe("T3 — the bass leads into the chord that follows in the document", () => {
  beforeAll(async () => {
    ({ stepEvents } = await import("../dispatch"));
  });

  const bassAt = (doc, step) => stepEvents(doc, step, { rootValue: 0 }).find((e) => e.track === "Bass")?.midi;

  it("a 3-chord progression over 4 measures: measure 4 (ii again) leads into V, the next degree, as the pre-T3 loop did", () => {
    // ii V I in C major, repeated: ii V I ii | V I ii V. The loop restarts on
    // ii after measure 4, but the chord after measure 4 in the progression —
    // and in the document — is V (G): the bass plays its leading tone, F#2.
    let doc = buildStudioTimeline({ brickIndex: 0, overrides: { customProgression: JAZZ_251_MAJ } });
    const bass = doc.tracks.find((t) => t.role === "bass");
    doc = setCell(doc, bass.id, 63, { vel: "normal" });
    expect(bassAt(doc, 63)).toEqual([42]);
  });

  it("a one-chord progression has nothing to lead into: the last step of the measure plays the root", () => {
    let doc = buildStudioTimeline({ brickIndex: 0, overrides: { customProgression: ["1"] } });
    const bass = doc.tracks.find((t) => t.role === "bass");
    doc = setCell(doc, bass.id, 15, { vel: "normal" });
    expect(bassAt(doc, 15)).toEqual([36]);
  });
});
