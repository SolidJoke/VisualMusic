/**
 * goldenCases.js — the inputs shared by ExportGolden.test.js and
 * PlaybackGolden.test.js (T1, VMU-137 / VMU-116).
 *
 * T1 moves "what plays on this step" out of three copies (the playback loop,
 * the MIDI exporter, the audio harness) into one pure function. The two
 * golden tests freeze what the first two produced *before* that move, so the
 * move can be shown to change nothing. They must therefore feed both
 * consumers the exact state the app feeds them, which is what `studioState`
 * reproduces: the track selection `useStudioMode`'s `activeTracks` memo makes
 * for a style and a theme (A, or B = the `*Variation` fields when a style has
 * them), with the rhythm it computes (`customRhythm || chordRhythm || [0]`).
 *
 * Not a test file (no `.test.`), so vitest does not collect it; under
 * `__tests__/`, so the VMU-140 pitch-calculation guard does not scan it.
 */
import { BRICKS } from "../../core/bricks";
import extendedTheoryData from "../../core/extendedTheoryData.json";

/** Fixed tempo for every export golden: the hashes must not depend on a style's bpm. */
export const GOLDEN_BPM = 120;

/** The two themes the Studio offers (useStudioMode.js: "A", or "B" = the *Variation fields). */
export const THEMES = ["A", "B"];

/**
 * The state the Studio hands to playback and export for one style and theme,
 * as `useStudioMode`'s `activeTracks` memo builds it (no custom drums, no
 * suggested bass), plus the octave offset and root the sequencer receives.
 *
 * @param {number} brickIndex index into BRICKS
 * @param {"A"|"B"} [theme]
 * @param {Object} [overrides] fields to replace after the selection
 */
export function studioState(brickIndex, theme = "A", overrides = {}) {
  const brick = BRICKS[brickIndex];
  const isB = theme === "B";
  const melody = isB && brick.melodyTracksVariation ? brick.melodyTracksVariation : brick.melodyTracks;
  const progression = isB && brick.nnsProgressionVariation ? brick.nnsProgressionVariation : brick.nnsProgression;
  const drums = (isB && brick.drumTracksVariation ? brick.drumTracksVariation : brick.drumTracks) || [];
  return {
    brick,
    drums,
    melody,
    progression,
    rhythm: brick.chordRhythm || [0],
    octaveOffset: 0,
    rootValue: brick.rootValue,
    ...overrides,
  };
}

/** Quick Start "Majeur II-V-I" — a three-chord progression over a four-measure loop. */
export const JAZZ_251_MAJ = extendedTheoryData.axiomRules.progressions.find((p) => p.id === "jazz_251_maj").degrees;

/**
 * The particular cases the T1 brief names (absolute chord rhythm, octave +1,
 * a 3-chord progression), plus the one path the brief lists as a
 * playback / export divergence and no style reaches: a melodic track whose
 * name does not contain "bass" (playback plays it, as the tonic, on the bass
 * synth; export drops it). `rootValue` differs from the style's root there
 * on purpose, so the golden records which of the two the tonic comes from.
 */
export const SPECIAL_CASES = {
  "rhythm-absolute-0-6-10": () => studioState(0, "A", { rhythm: [0, 6, 10] }),
  "octave-plus-1": () => studioState(0, "A", { octaveOffset: 1 }),
  "progression-jazz_251_maj": () => studioState(0, "A", { progression: JAZZ_251_MAJ }),
  "non-bass-melodic-track": () => {
    const base = studioState(0, "A", { rootValue: 3 });
    return {
      ...base,
      melody: [...base.melody, { name: "Lead", activeSteps: [1, 5, 9, 13], lowVelocitySteps: [5] }],
    };
  },
};

export { BRICKS };
