// @ts-check
// VMU-140 — property tests for the note engine (src/core/noteEngine.js),
// the first brick of VMU-115.
//
// The bug: the Dictionary's scale/chord notes were built from a pitch class
// (0-11, octave already lost) plus a fixed octave base, so any note whose
// class fell below the root's landed an octave too low. do-only coverage in
// PitchConsistency.test.js could never see it — do is the one root a scale
// never crosses. These tests generate every (scale-or-chord, root, octave)
// combination the Dictionary's own selectors allow and check the shape
// realizeScale/realizeChord promise: ascending from the root, root-to-root+12
// for a scale, fundamental position (no modulo) for a chord.
import { describe, it, expect } from "vitest";
import { SCALES, CHORDS, resolveScaleSemitones } from "../theory";
import { realizeNote, realizeScale, realizeChord } from "../noteEngine";

const ROOTS = Array.from({ length: 12 }, (_, i) => i); // 0=C ... 11=B
// dictOctave -3..+3 (useDictionaryMode.js's selector) maps to baseOctave
// 4+dictOctave, i.e. 1..7 (theory.js:824-826, computeAbsoluteNote).
const OCTAVES = [1, 2, 3, 4, 5, 6, 7];

describe("noteEngine — realizeNote", () => {
  it("matches the app's MIDI convention: C4 = 60 (theory.js:75-78, :846-849)", () => {
    expect(realizeNote(0, 4)).toBe(60);
  });

  it("covers the Dictionary's octave selector range for C (-3..+3 -> 24..96)", () => {
    expect(realizeNote(0, 1)).toBe(24);
    expect(realizeNote(0, 7)).toBe(96);
  });
});

describe("noteEngine — realizeScale, properties over the whole SCALES catalogue", () => {
  const scaleKeys = Object.keys(SCALES);

  it("catalogue sanity — finds every scale key (garde-fou du garde-fou)", () => {
    // If SCALES's shape changed under us, an empty/partial key list would
    // make every loop below check nothing and pass by doing so.
    expect(scaleKeys.length).toBeGreaterThanOrEqual(18);
    expect(scaleKeys).toContain("scale_pentatonic_major");
  });

  let casesChecked = 0;
  const violations = [];

  for (const key of scaleKeys) {
    const semitones = resolveScaleSemitones(key);
    for (const root of ROOTS) {
      for (const octave of OCTAVES) {
        casesChecked++;
        const pitches = realizeScale(root, key, octave);
        const label = `${key} root=${root} octave=${octave}`;

        if (pitches.length !== semitones.length + 1) {
          violations.push(
            `${label}: expected ${semitones.length + 1} pitches (degrees + closing note), got ${pitches.length}`
          );
          continue;
        }

        const expectedFirst = realizeNote(root, octave);
        if (pitches[0] !== expectedFirst) {
          violations.push(`${label}: first pitch ${pitches[0]} !== root at octave (${expectedFirst})`);
        }

        for (let i = 1; i < pitches.length; i++) {
          if (!(pitches[i] > pitches[i - 1])) {
            violations.push(
              `${label}: pitch ${i} (${pitches[i]}) is not strictly above pitch ${i - 1} (${pitches[i - 1]})`
            );
          }
        }

        const last = pitches[pitches.length - 1];
        if (last !== pitches[0] + 12) {
          violations.push(`${label}: closing note ${last} !== first pitch + 12 (${pitches[0] + 12})`);
        }

        semitones.forEach((semi, i) => {
          const expectedPc = (root + semi) % 12;
          const actualPc = ((pitches[i] % 12) + 12) % 12;
          if (actualPc !== expectedPc) {
            violations.push(`${label}: degree ${i} pitch class ${actualPc} !== expected ${expectedPc} (root+${semi})`);
          }
        });
      }
    }
  }

  it(`generates one case per scale x root x octave (${scaleKeys.length} scales x 12 roots x 7 octaves)`, () => {
    expect(casesChecked).toBe(scaleKeys.length * ROOTS.length * OCTAVES.length);
  });

  it(
    "first pitch is the root at the requested octave, every next pitch is strictly higher, the last " +
      "pitch closes exactly one octave above the root, and every degree's pitch class matches the " +
      "scale's cumulative semitones — for every scale, every root, every octave",
    () => {
      expect(violations).toEqual([]);
    }
  );
});

describe("noteEngine — realizeChord, properties over the whole CHORDS catalogue", () => {
  const chordKeys = Object.keys(CHORDS);

  it("catalogue sanity — finds every chord key (garde-fou du garde-fou)", () => {
    expect(chordKeys.length).toBeGreaterThanOrEqual(13);
    expect(chordKeys).toContain("chord_9");
  });

  let casesChecked = 0;
  const violations = [];

  for (const key of chordKeys) {
    const { semitones } = CHORDS[key];
    for (const root of ROOTS) {
      for (const octave of OCTAVES) {
        casesChecked++;
        const pitches = realizeChord(root, semitones, octave);
        const label = `${key} root=${root} octave=${octave}`;

        if (pitches.length !== semitones.length) {
          violations.push(`${label}: expected ${semitones.length} pitches, got ${pitches.length}`);
          continue;
        }

        const expectedFirst = realizeNote(root, octave);
        if (pitches[0] !== expectedFirst) {
          violations.push(`${label}: first pitch ${pitches[0]} !== root at octave (${expectedFirst})`);
        }

        for (let i = 1; i < pitches.length; i++) {
          if (!(pitches[i] > pitches[i - 1])) {
            violations.push(
              `${label}: pitch ${i} (${pitches[i]}) is not strictly above pitch ${i - 1} (${pitches[i - 1]})`
            );
          }
        }

        semitones.forEach((semi, i) => {
          const expected = expectedFirst + semi;
          if (pitches[i] !== expected) {
            violations.push(
              `${label}: pitch ${i} is ${pitches[i]}, expected fundamental position root+${semi} = ${expected} (no modulo)`
            );
          }
        });
      }
    }
  }

  it(`generates one case per chord x root x octave (${chordKeys.length} chords x 12 roots x 7 octaves)`, () => {
    expect(casesChecked).toBe(chordKeys.length * ROOTS.length * OCTAVES.length);
  });

  it(
    "first pitch is the root at the requested octave, every next pitch is strictly higher, and every " +
      "pitch sits at exactly root+semitone with no modulo — so an extension (9th, 11th, 13th) stays " +
      "above the octave instead of folding back next to the root — for every chord, every root, every octave",
    () => {
      expect(violations).toEqual([]);
    }
  );
});

describe("noteEngine — the reported bug, directly on the engine", () => {
  it("mi pentatonique majeure, root=mi (4), octave 4: mi4 fa#4 sol#4 si4 do#5 mi5 — not do#4 (VMU-140)", () => {
    expect(realizeScale(4, "scale_pentatonic_major", 4)).toEqual([64, 66, 68, 71, 73, 76]);
  });

  it("la majeur (root=la, 9), octave 4: la4 do#5 mi5", () => {
    expect(realizeChord(9, CHORDS.chord_major.semitones, 4)).toEqual([69, 73, 76]);
  });

  it("do9 (root=0), octave 4: do4 mi4 sol4 sib4 ré5 — the 9th (74) stays above the octave, not folded to ré4 (62)", () => {
    expect(realizeChord(0, CHORDS.chord_9.semitones, 4)).toEqual([60, 64, 67, 70, 74]);
  });
});
