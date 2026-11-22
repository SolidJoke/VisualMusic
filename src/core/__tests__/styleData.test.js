// @ts-check
import { describe, it, expect } from "vitest";
import { BRICKS } from "../bricks";
import { CHORDS, SCALES, PITCH_MAP, parseChordSymbol, getScaleNotes } from "../theory";
import { STEPS_PER_MEASURE, MAX_MEASURES } from "../timeline";
import { drumExportKey } from "../../audio/MidiExporter";
import { classifyMelodicTrack } from "../../audio/trackMapping";

/**
 * VMU-226 E8 — the net under the styles' data (src/data/bricks.json).
 *
 * Why it exists: the Studio's styles are the examples a person composes from,
 * and until now nothing checked the data itself. `bricks.test.js` checks that
 * a style has *a* name, *a* tempo and *a* progression, in two languages. The
 * audio goldens (ExportGolden, PlaybackGolden) freeze what a style plays, so
 * they catch any change but cannot say whether the change is valid. A step
 * written at 16 in a 16-step pattern, or a chord named "4mj7", is silent: the
 * timeline simply never plays the first, and the second falls back to a major
 * triad (theory.js parseChordSymbol returns `type: null` and
 * resolveNnsToChordType answers "major"). This file says what a valid style
 * is, once, for all of them, so lots of new or reworked styles (VMU-226) have
 * something to fail against before anybody has to listen.
 *
 * What is checked, and against what:
 *   - a name in the four interface languages (fr, en, pt, zh);
 *   - a tempo in 60-200 (the styles run from 85 to 180 today);
 *   - the key: a root 0-11 and a scale theory.js knows, with enough degrees
 *     for the progression;
 *   - every chord of both progressions (A and the B variation): a degree, a
 *     suffix theory.js reads, a type it has in CHORDS. 1 to MAX_MEASURES chords;
 *   - every pattern (drums and bass, A and B): steps inside the loop
 *     (STEPS_PER_MEASURE = 16, timeline.js), no step twice, ghost steps and
 *     pitch steps only on steps that play, pitches the bass engine knows
 *     (PITCH_MAP);
 *   - every drum row named for a GM key the export knows (`drumExportKey`,
 *     VMU-217): a name it does not know is exported on the fallback key,
 *     and playback plays it as a hi-hat (trackMapping.js);
 *   - every melodic row is a bass row (`classifyMelodicTrack`): the export
 *     drops any other, and the Studio plays it as the tonic.
 *
 * Not checked on purpose: how many styles there are (new genres, E3, must not
 * need this file edited), and how they sound (a person listens).
 */

/** Interface languages every style's name must exist in. */
const LANGUAGES = ["fr", "en", "pt", "zh"];

/** A tempo no style should leave: slower is not a groove, faster is not playable by ear. */
const BPM_RANGE = [60, 200];

/** @type {any[]} */
const STYLES = BRICKS;

/**
 * A defect this net found on its first run, left in place on purpose: Epic
 * Metal writes the bass pitch "b2" (the phrygian flat second), which
 * theory.js's PITCH_MAP does not list, so `getBassNote` falls back to the
 * root and those notes sound as the root. Fixing it takes a "b2" entry in
 * PITCH_MAP (theory.js, out of VMU-226 lot 1's reach) or other pitches in
 * Epic Metal (a style this lot does not touch, whose goldens must not move).
 * The exemption is this style and this pitch only, and the test at the bottom
 * fails the day PITCH_MAP learns "b2", so the exemption cannot outlive the bug.
 */
const KNOWN_PITCH_GAPS = [{ style: "Epic Metal", pitch: "b2" }];

/**
 * Everything wrong with one style, as readable sentences. Empty: valid.
 * Pure on its argument, so the tests below can run it on a deliberately broken
 * copy (the net's own positive control).
 *
 * @param {any} brick one entry of bricks.json
 * @returns {string[]}
 */
export function styleProblems(brick) {
  /** @type {string[]} */
  const problems = [];

  LANGUAGES.forEach((lang) => {
    const name = brick?.name?.[lang];
    if (typeof name !== "string" || name.trim() === "") problems.push(`name.${lang} is missing or empty`);
  });

  const [bpmMin, bpmMax] = BPM_RANGE;
  if (!Number.isInteger(brick.bpm) || brick.bpm < bpmMin || brick.bpm > bpmMax) {
    problems.push(`bpm ${brick.bpm} is not a whole number between ${bpmMin} and ${bpmMax}`);
  }

  const scaleKnown = typeof brick.scaleKey === "string" && brick.scaleKey in SCALES;
  if (!scaleKnown) problems.push(`scaleKey "${brick.scaleKey}" is not a scale theory.js knows`);
  const rootKnown = Number.isInteger(brick.rootValue) && brick.rootValue >= 0 && brick.rootValue <= 11;
  if (!rootKnown) problems.push(`rootValue ${brick.rootValue} is not 0-11`);

  ["nnsProgression", "nnsProgressionVariation"].forEach((field) => {
    const progression = brick[field];
    if (progression === undefined) {
      if (field === "nnsProgression") problems.push("nnsProgression is missing");
      return;
    }
    if (!Array.isArray(progression) || progression.length < 1 || progression.length > MAX_MEASURES) {
      problems.push(`${field} must hold 1 to ${MAX_MEASURES} chords`);
      return;
    }
    const degrees = scaleKnown && rootKnown ? getScaleNotes(brick.rootValue, brick.scaleKey).length : Infinity;
    progression.forEach((/** @type {string} */ nns, /** @type {number} */ i) => {
      const where = `${field}[${i}] "${nns}"`;
      const symbol = typeof nns === "string" ? parseChordSymbol(nns) : null;
      if (!symbol || symbol.degree === null) return problems.push(`${where}: no degree`);
      if (!symbol.type) return problems.push(`${where}: "${symbol.suffix}" is not a chord name theory.js reads`);
      if (!(symbol.type in CHORDS)) return problems.push(`${where}: type ${symbol.type} is not in CHORDS`);
      if (!symbol.accidental && symbol.degree > degrees) {
        problems.push(`${where}: degree ${symbol.degree} does not exist in ${brick.scaleKey} (${degrees} degrees)`);
      }
    });
  });

  if (brick.chordRhythm !== undefined) {
    const rhythm = brick.chordRhythm;
    const bad = !Array.isArray(rhythm) || rhythm.some((/** @type {any} */ s) => !Number.isInteger(s) || s < 0 || s >= STEPS_PER_MEASURE);
    if (bad) problems.push(`chordRhythm must list steps 0-${STEPS_PER_MEASURE - 1}`);
  }

  [
    ["drumTracks", "drum"],
    ["drumTracksVariation", "drum"],
    ["melodyTracks", "melody"],
    ["melodyTracksVariation", "melody"],
  ].forEach(([field, kind]) => {
    const tracks = brick[field];
    if (tracks === undefined) {
      if (field === "drumTracks" || field === "melodyTracks") problems.push(`${field} is missing`);
      return;
    }
    if (!Array.isArray(tracks)) return problems.push(`${field} is not a list`);
    const seen = new Set();
    tracks.forEach((/** @type {any} */ track) => {
      const where = `${field} "${track?.name}"`;
      if (typeof track?.name !== "string" || track.name === "") return problems.push(`${field}: a row has no name`);
      if (seen.has(track.name)) problems.push(`${where}: two rows share this name`);
      seen.add(track.name);

      if (kind === "drum" && drumExportKey(track.name, -1) === -1) {
        problems.push(`${where}: the export has no GM key for this name`);
      }
      if (kind === "melody" && classifyMelodicTrack(track.name) !== "bass") {
        problems.push(`${where}: a melodic row must be a bass row (its name contains "bass")`);
      }

      const steps = track.activeSteps;
      const stepOk = (/** @type {any} */ s) => Number.isInteger(s) && s >= 0 && s < STEPS_PER_MEASURE;
      if (!Array.isArray(steps) || !steps.every(stepOk)) {
        problems.push(`${where}: activeSteps must be whole steps 0-${STEPS_PER_MEASURE - 1} (the loop is ${STEPS_PER_MEASURE} steps)`);
        return;
      }
      if (new Set(steps).size !== steps.length) problems.push(`${where}: a step is listed twice`);

      (track.lowVelocitySteps ?? []).forEach((/** @type {number} */ s) => {
        if (!steps.includes(s)) problems.push(`${where}: ghost step ${s} is not an active step`);
      });
      Object.entries(track.pitchSteps ?? {}).forEach(([step, pitch]) => {
        if (!steps.includes(Number(step))) problems.push(`${where}: pitch on step ${step}, which does not play`);
        const known = KNOWN_PITCH_GAPS.some((gap) => gap.style === brick.name?.en && gap.pitch === pitch);
        if (!(pitch in PITCH_MAP) && !known) problems.push(`${where}: pitch "${pitch}" is not one the bass engine knows`);
      });
    });
  });

  return problems;
}

describe("VMU-226 E8 — the styles' data", () => {
  it("holds styles to check", () => {
    expect(STYLES.length).toBeGreaterThan(0);
  });

  STYLES.forEach((brick, index) => {
    it(`${index}: ${brick.name?.en ?? "(no english name)"} is a valid style`, () => {
      expect(styleProblems(brick)).toEqual([]);
    });
  });

  it("gives every style its own name, in every language", () => {
    LANGUAGES.forEach((lang) => {
      const names = STYLES.map((b) => b.name[lang]);
      expect(new Set(names).size, `two styles share a ${lang} name`).toBe(names.length);
    });
  });

  // E1: two styles with the same progression in the same key are one style
  // shown twice (Modern Pop 4 Chords / Ballad; Funk/Disco Loop / Groovy Funk /
  // Disco Funk were exactly that). Theme B is free to share chords.
  it("never plays the same progression in the same key under two names", () => {
    const seen = new Map();
    STYLES.forEach((b) => {
      const key = JSON.stringify([b.rootValue, b.scaleKey, b.nnsProgression]);
      expect(seen.get(key), `${b.name.en} repeats the progression of ${seen.get(key)}`).toBeUndefined();
      seen.set(key, b.name.en);
    });
  });

  // E1: ten styles used to play the very same kick-snare-hat; the same
  // groove under a different name is not a different style.
  it("never gives two styles the same drums in theme A", () => {
    const seen = new Map();
    STYLES.forEach((b) => {
      const key = JSON.stringify(
        [...b.drumTracks]
          .map((/** @type {any} */ t) => [t.name, [...t.activeSteps].sort((x, y) => x - y), [...(t.lowVelocitySteps ?? [])].sort((x, y) => x - y)])
          .sort(),
      );
      expect(seen.get(key), `${b.name.en} plays the same drums as ${seen.get(key)}`).toBeUndefined();
      seen.set(key, b.name.en);
    });
  });
});

describe("VMU-226 E8 — known defects the net tolerates", () => {
  KNOWN_PITCH_GAPS.forEach(({ style, pitch }) => {
    it(`still has ${style} writing "${pitch}", which PITCH_MAP does not list (remove the exemption when this fails)`, () => {
      const brick = STYLES.find((b) => b.name.en === style);
      const used = [...brick.melodyTracks, ...(brick.melodyTracksVariation ?? [])].some((t) =>
        Object.values(t.pitchSteps ?? {}).includes(pitch),
      );
      expect(used && !(pitch in PITCH_MAP)).toBe(true);
    });
  });
});

describe("VMU-226 E8 — the net itself (positive control)", () => {
  /** A deep copy of a valid style the tests are free to break. */
  const fresh = () => structuredClone(STYLES[0]);

  it("accepts the copy it starts from", () => {
    expect(styleProblems(fresh())).toEqual([]);
  });

  it("refuses a track step outside the loop", () => {
    const brick = fresh();
    brick.drumTracks[0].activeSteps.push(STEPS_PER_MEASURE);
    expect(styleProblems(brick).join("\n")).toMatch(/activeSteps must be whole steps/);
  });

  it("refuses a chord name theory.js does not read", () => {
    const brick = fresh();
    brick.nnsProgression[2] = "4mj7";
    expect(styleProblems(brick).join("\n")).toMatch(/not a chord name theory\.js reads/);
  });

  it("refuses a chord with no degree", () => {
    const brick = fresh();
    brick.nnsProgressionVariation = ["1", "IIII"];
    expect(styleProblems(brick).join("\n")).toMatch(/no degree/);
  });

  it("refuses a missing translation", () => {
    const brick = fresh();
    delete brick.name.zh;
    expect(styleProblems(brick).join("\n")).toMatch(/name\.zh is missing/);
  });

  it("refuses a drum row the export has no GM key for", () => {
    const brick = fresh();
    brick.drumTracks.push({ name: "Wobble", activeSteps: [0] });
    expect(styleProblems(brick).join("\n")).toMatch(/no GM key/);
  });

  it("refuses a ghost step on a step that does not play, and an unknown bass pitch", () => {
    const brick = fresh();
    brick.melodyTracks[0].lowVelocitySteps = [1];
    brick.melodyTracks[0].pitchSteps = { 0: "R", 8: "9th" };
    const text = styleProblems(brick).join("\n");
    expect(text).toMatch(/ghost step 1/);
    expect(text).toMatch(/pitch "9th"/);
  });

  it("refuses a tempo out of range and a degree the scale does not have", () => {
    const brick = fresh();
    brick.bpm = 20;
    brick.scaleKey = "scale_pentatonic_minor";
    brick.nnsProgression = ["1", "6"];
    const text = styleProblems(brick).join("\n");
    expect(text).toMatch(/bpm 20/);
    expect(text).toMatch(/degree 6 does not exist/);
  });
});
