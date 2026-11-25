// @ts-check
// VMU-234 — the REFERENCE for the equivalence tests: a copy of the
// computation hooks/useStudioMode.js held on main at b990c16, before the
// generator chain. Do not "fix" it: it is what the chain must reproduce.
import { BRICKS } from "../../bricks";
import { buildStudioTimeline } from "../../timeline";
import { loopLengthForCycle, maxCycleLength } from "../../loopWindow";
import { effectiveRoot, transposeTimeline } from "../../keyChoice";
import { applyEditedChords } from "../../progressionEdit";
import { applyChance, isNeutral } from "../../chance";
import { grooveOf } from "../../groove";

export function oldHasOverrides(overrides, customChords = null, chance = null) {
  return Boolean(
    overrides.customDrums ||
      overrides.customRhythm ||
      overrides.customProgression ||
      overrides.suggestedBassTrack ||
      (customChords && (customChords.A || customChords.B)) ||
      (chance && !isNeutral(chance)),
  );
}
const OLD_NO_DROPPED = Object.freeze({});
export const oldVariationOf = (theme) => (theme === "B" ? "B" : "A");

/** useStudioMode's memos at b990c16, in order, as one function. */
export function oldPlayed({ brickIndex, theme, overrides, customChords, chance, keyChoice, swing, humanize, listenOriginal }) {
  const activeBrick = BRICKS.at(Number(brickIndex));
  const keyRoot = effectiveRoot(activeBrick.rootValue, keyChoice);
  const isHearingOriginal = listenOriginal && oldHasOverrides(overrides, customChords, chance);
  const editedChords = customChords?.[oldVariationOf(theme)] ?? null;
  const cycleSteps = maxCycleLength(overrides);
  const { lengthMeasures } = loopLengthForCycle(cycleSteps);
  const editedDoc = (() => {
    const doc = buildStudioTimeline({ brickIndex, theme, overrides, lengthMeasures });
    return editedChords ? applyEditedChords(doc, editedChords, cycleSteps) : doc;
  })();
  const chanced = applyChance(editedDoc, chance);
  const groove = grooveOf(swing, humanize, chance.seed);
  const timeline = (() => {
    const doc = transposeTimeline(
      isHearingOriginal ? buildStudioTimeline({ brickIndex, theme }) : chanced.doc,
      keyRoot - activeBrick.rootValue,
    );
    return groove ? { ...doc, groove } : doc;
  })();
  const chanceDropped = isHearingOriginal ? OLD_NO_DROPPED : chanced.dropped;
  return { timeline, chanceDropped, hasEdits: oldHasOverrides(overrides, customChords, chance), isHearingOriginal };
}
