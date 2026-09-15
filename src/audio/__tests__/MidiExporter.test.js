import { describe, it, expect } from "vitest";
import { Midi } from "@tonejs/midi";
import { exportChords, exportBass, exportDrums } from "../MidiExporter";
import { classifyDrumTrack } from "../trackMapping";
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

/** Absolute time (s) of a given absolute 16th-note step (0..63), from tempo alone. */
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
// ---------------------------------------------------------------------------
describe("chord export follows the modified chord rhythm", () => {
  it("places note onsets at steps 0, 6, 10 of every measure at 120 BPM", () => {
    const brick = bricks[0];
    const rhythm = [0, 6, 10];
    const progression = ["1"]; // single chord throughout, isolates rhythm from harmony

    const midi = parseMidi(exportChords(brick, progression, rhythm, 0, 120, "x"));

    const expectedOnsets = [];
    for (let measure = 0; measure < 4; measure++) {
      rhythm.forEach((step) => expectedOnsets.push(stepTime(measure * 16 + step, 120)));
    }

    const actualOnsets = [...new Set(midi.tracks[0].notes.map((n) => n.time))].sort((a, b) => a - b);
    expect(actualOnsets).toEqual(expectedOnsets.sort((a, b) => a - b));
  });

  it("does not use the default one-hit-per-beat rhythm when a custom one is given", () => {
    const brick = bricks[0];
    const defaultMidi = parseMidi(exportChords(brick, ["1"], [0], 0, 120, "x"));
    const customMidi = parseMidi(exportChords(brick, ["1"], [0, 6, 10], 0, 120, "x"));

    // The default single-hit-per-beat rhythm plays on every quarter note (16
    // hits across 4 measures); the custom one plays 3 times per measure (12
    // hits). If the export ignored the custom rhythm it would produce 16.
    const defaultOnsetCount = new Set(defaultMidi.tracks[0].notes.map((n) => n.time)).size;
    const customOnsetCount = new Set(customMidi.tracks[0].notes.map((n) => n.time)).size;
    expect(defaultOnsetCount).toBe(16);
    expect(customOnsetCount).toBe(12);
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
