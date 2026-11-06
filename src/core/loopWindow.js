// @ts-check
/**
 * loopWindow.js — the Studio's loop window, derived from the longest cycle an
 * active Math & Rythmes override asks to play (VMU-214).
 *
 * Until now the loop was fixed at 4 measures. A whole-circle override
 * (`{ activeSteps, cycleLength }`) repeats its cycle across measures, so a
 * cycle longer than 64 steps was cut at 64 and its tail never sounded. The
 * window now grows with the longest active cycle, clamped by the document's 8
 * measures:
 *
 *   - `maxCycleLength(overrides)` reads the longest `cycleLength` among the
 *     active overrides (customRhythm, every customDrum, suggestedBassTrack);
 *   - `loopLengthForCycle(cycleSteps)` turns that into the smallest length of
 *     TIMELINE_LENGTHS that is at least 4 measures and holds the whole cycle,
 *     8 measures at most (128 steps); a cycle longer than 128 steps is cut
 *     (`cut: true`);
 *   - `sequencerViewSize(totalSteps)` is the piano roll's density after a send:
 *     the smallest of 16/32/64 that shows the whole loop, else 64.
 *
 * Everything here is pure: no React, no Tone, no clock. The document itself is
 * still built by core/timeline.js, which this module must not change.
 *
 * @module core/loopWindow
 */
import { MAX_STEPS, STEPS_PER_MEASURE, TIMELINE_LENGTHS } from "./timeline";

/** `value` as a positive integer, 0 when it is absent, empty or not a number. */
function positiveInt(value) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * The loop window for a cycle of `cycleSteps` steps.
 *
 * The window is the smallest length of TIMELINE_LENGTHS that is at least 4
 * measures (the Studio's length today) and holds the whole cycle; the document
 * has no length past 8 measures, so a longer cycle is cut at 128 steps.
 *
 * @param {number|string} cycleSteps the longest active cycle, in steps (0 = none)
 * @returns {{ lengthMeasures: number, cut: boolean }} `lengthMeasures` is one of
 *   TIMELINE_LENGTHS; `cut` is true when the cycle does not fit in 128 steps.
 */
export function loopLengthForCycle(cycleSteps) {
  const steps = Math.max(0, positiveInt(cycleSteps));
  const cut = steps > MAX_STEPS;
  const lengthMeasures = TIMELINE_LENGTHS.filter(
    (len) => len >= 4 && len * STEPS_PER_MEASURE >= steps,
  ).reduce((min, len) => Math.min(min, len), 8);
  return { lengthMeasures, cut };
}

/**
 * The longest `cycleLength` among the active overrides, in steps (0 when none
 * of them is a whole-circle override). Array-shaped overrides (one measure)
 * carry no cycle.
 *
 * @param {import("./timeline").StudioOverrides} [overrides]
 * @returns {number}
 */
export function maxCycleLength(overrides = {}) {
  const lengths = [];
  const push = (value) => {
    const n = positiveInt(value);
    if (n) lengths.push(n);
  };

  const rhythm = overrides.customRhythm;
  if (rhythm && !Array.isArray(rhythm)) push(rhythm.cycleLength);

  const drums = overrides.customDrums;
  if (drums && typeof drums === "object") {
    for (const value of Object.values(drums)) {
      if (value && !Array.isArray(value)) push(value.cycleLength);
    }
  }

  if (overrides.suggestedBassTrack) push(overrides.suggestedBassTrack.cycleLength);

  return lengths.reduce((max, n) => Math.max(max, n), 0);
}

/**
 * The piano roll density after a send: the smallest of 16/32/64 that shows the
 * whole loop, else 64 (the loop is then spread over several pages).
 *
 * @param {number|string} totalSteps the document's window, in steps
 * @returns {number} 16, 32 or 64
 */
export function sequencerViewSize(totalSteps) {
  const steps = Math.max(0, positiveInt(totalSteps));
  return [16, 32, 64].find((size) => size >= steps) ?? 64;
}
