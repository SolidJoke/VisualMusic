import { describe, it, expect } from "vitest";
import { Buffer } from "node:buffer";
import { Midi } from "@tonejs/midi";
import { exportChords, exportBass, exportDrums, exportTimelineChords, exportTimelineDrums, exportTimelineBass } from "../MidiExporter";
import { stepEvents } from "../dispatch";
import { classifyDrumTrack } from "../trackMapping";
import { buildStudioTimeline, loopSteps, studioSelection } from "../../core/timeline";
import bricks from "../../data/bricks.json";

// ---------------------------------------------------------------------------
// Domain tables, independent of the implementation under test. These encode
// standard music theory (major/natural-minor scale steps, major/minor triad
// intervals, and "a 16th note at bpm X lasts (60/bpm)/4 seconds") rather than
// anything read off MidiExporter.js or theory.js's output.
// ---------------------------------------------------------------------------
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11]; // W W H W W W H
const NATURAL_MINOR_SCALE_STEPS = [0, 2, 3, 5, 7, 8, 10]; // W H W W H W W
const TRIAD_SEMITONES = { major: [0, 4, 7], minor: [0, 3, 7] };

/** A 16th-note step's duration, from the definition of BPM (quarter notes/min). */
function stepSeconds(bpm) {
  return 60 / bpm / 4;
}

/** Absolute time (s) of a given absolute 16th-note step, from tempo alone. */
function stepTime(step, bpm) {
  return step * stepSeconds(bpm);
}

/** Parses a MIDI file produced by MidiExporter back into inspectable notes. */
function parseMidi(arrayBuffer) {
  return new Midi(arrayBuffer);
}

/** Root pitch class (0-11) and triad quality for one NNS degree, by domain rules. */
function degreeRootAndQuality(nns, scaleSteps, rootValue) {
  const degree = parseInt(nns.match(/[1-7]/)[0], 10) - 1;
  const quality = nns.includes("-") || nns.includes("m") ? "minor" : "major";
  const root = (rootValue + scaleSteps[degree]) % 12;
  return { root, quality };
}

function expectedTriadPitchClasses(nns, scaleSteps, rootValue) {
  const { root, quality } = degreeRootAndQuality(nns, scaleSteps, rootValue);
  return TRIAD_SEMITONES[quality].map((s) => (root + s) % 12).sort((a, b) => a - b);
}

function pitchClassesAtTime(midi, time, tolerance = 0.01) {
  return midi.tracks[0].notes
    .filter((n) => Math.abs(n.time - time) < tolerance)
    .map((n) => n.midi % 12)
    .sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// 1. VMU-128 — every style and variation must export chords and bass without
//    throwing, and the exported files must contain notes (not be empty).
// ---------------------------------------------------------------------------
describe("exports chords and bass without throwing for every style and variation", () => {
  bricks.forEach((brick, i) => {
    const variants = [
      {
        label: "base",
        progression: brick.nnsProgression,
        melody: brick.melodyTracks,
        drums: brick.drumTracks,
      },
    ];
    if (brick.nnsProgressionVariation) {
      variants.push({
        label: "variation B",
        progression: brick.nnsProgressionVariation,
        melody: brick.melodyTracksVariation || brick.melodyTracks,
        drums: brick.drumTracksVariation || brick.drumTracks,
      });
    }

    variants.forEach(({ label, progression, melody, drums }) => {
      it(`${i}. ${brick.name.en} (${label})`, () => {
        expect(() => {
          const chordsMidi = parseMidi(exportChords(brick, progression, undefined, 0, brick.bpm, "x"));
          expect(chordsMidi.tracks[0].notes.length).toBeGreaterThan(0);

          const bassMidi = parseMidi(exportBass(melody, brick, progression, brick.bpm));
          expect(bassMidi.tracks[0].notes.length).toBeGreaterThan(0);

          // Some styles are legitimately drum-less (e.g. "Berlin School
          // Ambient" base pattern), so only require notes when the style
          // actually has drum steps to export.
          const hasDrumSteps = drums.some((t) => t.activeSteps?.length > 0);
          const drumsMidi = parseMidi(exportDrums(drums, brick.bpm, "x"));
          if (hasDrumSteps) {
            expect(drumsMidi.tracks[0].notes.length).toBeGreaterThan(0);
          } else {
            expect(drumsMidi.tracks[0].notes.length).toBe(0);
          }
        }).not.toThrow();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 2. VMU-128 — chord export must resolve pitches from brick.scaleKey (what
//    the sequencer reads to play), not brick.modeName (a field that exists on
//    no style and is filled in nowhere).
// ---------------------------------------------------------------------------
describe("chord export uses the scale the sequencer plays", () => {
  it("Modern Pop (4 Chords) — major key: 1,5,6-,4 in C major is Do, Sol, La-, Fa", () => {
    const brick = bricks[0]; // scaleKey: scale_major, rootValue: 0, prog ["1","5","6-","4"]
    expect(brick.name.en).toBe("Modern Pop (4 Chords)");
    expect(brick.scaleKey).toBe("scale_major");

    const midi = parseMidi(exportChords(brick, brick.nnsProgression, [0], 0, brick.bpm, "x"));

    brick.nnsProgression.forEach((nns, measure) => {
      const time = stepTime(measure * 16, brick.bpm);
      const expected = expectedTriadPitchClasses(nns, MAJOR_SCALE_STEPS, brick.rootValue);
      expect(pitchClassesAtTime(midi, time)).toEqual(expected);
    });
  });

  it("Oldschool Boom Bap — minor key: 1-,4-,5-,1- resolves against the natural minor scale", () => {
    const brick = bricks[10];
    expect(brick.name.en).toBe("Oldschool Boom Bap");
    expect(brick.scaleKey).toBe("scale_minor");

    const midi = parseMidi(exportChords(brick, brick.nnsProgression, [0], 0, brick.bpm, "x"));

    brick.nnsProgression.forEach((nns, measure) => {
      const time = stepTime(measure * 16, brick.bpm);
      const expected = expectedTriadPitchClasses(nns, NATURAL_MINOR_SCALE_STEPS, brick.rootValue);
      expect(pitchClassesAtTime(midi, time)).toEqual(expected);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. VMU-125 — chord export must follow the actually-played rhythm (the one
//    passed in, mirroring customRhythm || activeBrick.chordRhythm || [0]),
//    including a custom absolute-step pattern like [0, 6, 10].
//
//    T3: rewritten. These tests counted onsets over "4 measures" by
//    construction (`measure < 4`, 16 and 12 onsets), because the loop was
//    fixed at 64 steps. The export now covers the timeline document's window,
//    so the counts are per measure times the document's length, checked at 4
//    measures (what the Studio plays today: the same 16 and 12) and at 8.
//    The rhythm reaches the export through the document the Studio builds
//    from it (buildStudioTimeline, `customRhythm` override).
// ---------------------------------------------------------------------------
describe("chord export follows the modified chord rhythm, over the document's length", () => {
  /** Modern Pop with one chord throughout (isolates rhythm from harmony) and `rhythm`. */
  const oneChord = (rhythm, lengthMeasures) =>
    buildStudioTimeline({ brickIndex: 0, overrides: { customProgression: ["1"], customRhythm: rhythm }, lengthMeasures });

  describe.each([4, 8])("%i measures", (measures) => {
    it("places note onsets at steps 0, 6, 10 of every measure at 120 BPM", () => {
      const doc = oneChord([0, 6, 10], measures);
      expect(loopSteps(doc)).toBe(measures * 16);
      const midi = parseMidi(exportTimelineChords(doc, 120, { octaveOffset: 0 }));

      const expectedOnsets = [];
      for (let measure = 0; measure < measures; measure++) {
        [0, 6, 10].forEach((step) => expectedOnsets.push(stepTime(measure * 16 + step, 120)));
      }

      const actualOnsets = [...new Set(midi.tracks[0].notes.map((n) => n.time))].sort((a, b) => a - b);
      expect(actualOnsets).toEqual(expectedOnsets.sort((a, b) => a - b));
    });

    it("does not use the default one-hit-per-beat rhythm when a custom one is given", () => {
      const defaultMidi = parseMidi(exportTimelineChords(oneChord([0], measures), 120));
      const customMidi = parseMidi(exportTimelineChords(oneChord([0, 6, 10], measures), 120));

      // The default single-hit-per-beat rhythm plays on every quarter note (4
      // hits per measure); the custom one plays 3 times per measure. If the
      // export ignored the custom rhythm it would produce 4 per measure.
      const defaultOnsetCount = new Set(defaultMidi.tracks[0].notes.map((n) => n.time)).size;
      const customOnsetCount = new Set(customMidi.tracks[0].notes.map((n) => n.time)).size;
      expect(defaultOnsetCount).toBe(4 * measures);
      expect(customOnsetCount).toBe(3 * measures);
    });
  });

  // EXPORT-5 (MidiExporter.js), pinned: kept as it was, not aligned.
  it("EXPORT-5: an empty rhythm is exported as the style's own (Funk's [0, 2]), where playback plays no chord", () => {
    const funk = bricks[3];
    expect(funk.chordRhythm).toEqual([0, 2]);
    const everyOtherStep = Array.from({ length: 32 }, (_, i) => stepTime(i * 2, 120));
    const onsets = (bytes) => [...new Set(parseMidi(bytes).tracks[0].notes.map((n) => n.time))].sort((a, b) => a - b);

    const doc = buildStudioTimeline({ brickIndex: 3, overrides: { customRhythm: [] } });
    expect(onsets(exportTimelineChords(doc, 120))).toEqual(everyOtherStep);
    // The pre-T3 signature, handed the same empty rhythm, writes the same.
    expect(onsets(exportChords(funk, funk.nnsProgression, [], 0, 120, "x"))).toEqual(everyOtherStep);

    const chordEvents = Array.from({ length: loopSteps(doc) }, (_, step) => stepEvents(doc, step, {}))
      .flat()
      .filter((e) => e.voice === "chords");
    expect(chordEvents).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3b. T3 — the Studio exports its document (SequencerPanel: exportTimeline*),
//     the goldens freeze the pre-T3 signatures: at 4 measures they write the
//     same bytes, for every style and theme, overrides included.
// ---------------------------------------------------------------------------
describe("the Studio's document exports the same files as the pre-T3 signatures", () => {
  const same = (a, b) => expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  const overrides = {
    customDrums: { Kick: [0, 3, 6, 10] },
    customRhythm: [0, 2],
    customProgression: ["1", "6-", "2-", "5"],
    suggestedBassTrack: { name: "Bass", activeSteps: [0, 7, 15], pitchSteps: { 0: "R", 7: "5", 15: "3" } },
  };

  bricks.forEach((brick, index) => {
    ["A", "B"].forEach((theme) => {
      [null, overrides].forEach((withOverrides) => {
        it(`${index}:${theme} ${brick.name.en}${withOverrides ? " + overrides" : ""}`, () => {
          const doc = buildStudioTimeline({ brickIndex: index, theme, overrides: withOverrides || {} });
          const selection = studioSelection(brick, theme, withOverrides || {});
          same(exportTimelineDrums(doc, 120), exportDrums(selection.drums, 120, "x"));
          same(exportTimelineChords(doc, 120, { octaveOffset: 1 }), exportChords(brick, selection.progression, selection.rhythm, 1, 120, "x"));
          same(exportTimelineBass(doc, 120), exportBass(selection.melody, brick, selection.progression, 120));
        });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 4. VMU-128 — drum export must map track names to GM notes the same way
//    playback maps them to synths, via the shared classifyDrumTrack().
// ---------------------------------------------------------------------------
describe("drum export maps track names like playback", () => {
  const cases = [
    ["Kick", "kick", 36],
    ["Snare", "snare", 38],
    ["Clap", "snare", 38],
    ["Rim", "snare", 38],
    ["Hat", "hat", 42],
    ["Crash", "hat", 42], // not in any exact-match list: playback falls back to hi-hat
  ];

  cases.forEach(([name, expectedCategory, expectedMidiNote]) => {
    it(`${name} classifies as ${expectedCategory} (GM ${expectedMidiNote}) via the shared function`, () => {
      expect(classifyDrumTrack(name)).toBe(expectedCategory);

      const midi = parseMidi(exportDrums([{ name, activeSteps: [0] }], 120, "x"));
      const notes = midi.tracks[0].notes;
      expect(notes.length).toBeGreaterThan(0);
      notes.forEach((n) => expect(n.midi).toBe(expectedMidiNote));
    });
  });
});

// ---------------------------------------------------------------------------
// 5. VMU-125 (bass) — export must use the melody track it's given, including
//    a suggested-bass override, not some other/raw pattern.
// ---------------------------------------------------------------------------
describe("bass export uses the played bass track", () => {
  it("follows a suggested-bass override's own step pattern, not the style's original one", () => {
    const brick = bricks[0]; // Modern Pop: original Bass activeSteps are [0, 8, 14]
    const originalBass = brick.melodyTracks.find((t) => t.name === "Bass");
    expect(originalBass.activeSteps).toEqual([0, 8, 14]);

    // Shape mirrors CompositionPanel's setSuggestedBassTrack output
    // (src/components/__tests__/CompositionPanel.test.jsx:116).
    const suggestedBass = {
      name: "Bass",
      activeSteps: [0, 3, 6, 9, 12],
      pitchSteps: { 0: "R", 3: "5", 6: "R", 9: "3", 12: "R" },
    };
    const playedMelody = [suggestedBass];

    const midi = parseMidi(exportBass(playedMelody, brick, brick.nnsProgression, brick.bpm));
    const onsetSteps = midi.tracks[0].notes
      .map((n) => Math.round(n.time / stepSeconds(brick.bpm)) % 16)
      .filter((s, idx, arr) => arr.indexOf(s) === idx)
      .sort((a, b) => a - b);

    expect(onsetSteps).toEqual([0, 3, 6, 9, 12]);
  });
});
