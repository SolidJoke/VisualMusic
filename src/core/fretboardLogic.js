import { getAbsoluteNoteValue } from "./theory";

/**
 * Calcule le chemin optimal de doigté sur le manche (activePath).
 */
export function calcActivePath({
  contextualScaleAbsoluteValues,
  dictType,
  lastClickedContext,
  instrument,
  strings,
  numFrets,
}) {
  if (
    !contextualScaleAbsoluteValues ||
    contextualScaleAbsoluteValues.length === 0
  )
    return [];
  if (!dictType?.includes("scale") && !dictType?.includes("chord")) return [];
  if (!lastClickedContext) return [];

  // --- Position playing parameters ---
  // Guitar: 4-fret span (one finger per fret).
  // Bass: 3-fret span in low positions (frets 0-4, wider frets), 4-fret elsewhere.
  const getSpan = (fret) => {
    if (instrument === "bass") return fret <= 4 ? 3 : 4;
    return 4;
  };
  const SHIFT_PENALTY = 80;

  let startFret = 5;
  let currentString = 0;

  if (lastClickedContext.instrument === instrument) {
    startFret = lastClickedContext.fret;
    currentString = lastClickedContext.stringIndex;
  } else {
    const rootAbs = contextualScaleAbsoluteValues[0].absoluteValue;
    let bestStart = null;
    let minStartCost = Infinity;
    strings.forEach((rawStringData, sIdx) => {
      const f = rootAbs - getAbsoluteNoteValue(rawStringData);
      if (f >= 0 && f <= numFrets) {
        const cost = Math.abs(f - 5);
        if (cost < minStartCost) {
          minStartCost = cost;
          bestStart = { stringIndex: sIdx, fret: f };
        }
      }
    });
    if (bestStart) {
      startFret = bestStart.fret;
      currentString = bestStart.stringIndex;
    } else {
      return [];
    }
  }

  // The position window: hand stays within [windowStart, windowStart + span - 1]
  let windowStart = Math.max(0, startFret - 1);

  const path = [];
  path.push({
    stringIndex: currentString,
    fret: startFret,
    absoluteValue: contextualScaleAbsoluteValues[0].absoluteValue,
  });

  for (let i = 1; i < contextualScaleAbsoluteValues.length; i++) {
    const targetAbs = contextualScaleAbsoluteValues[i].absoluteValue;
    let best = null;
    let minCost = Infinity;

    strings.forEach((rawStringData, sIdx) => {
      const openStringAbsValue = getAbsoluteNoteValue(rawStringData);
      const f = targetAbs - openStringAbsValue;
      if (f < 0 || f > numFrets) return;

      const span = getSpan(windowStart);
      const windowEnd = windowStart + span - 1;
      const inWindow = f >= windowStart && f <= windowEnd;

      // Position-playing cost function:
      // - Being inside the window is free (no span penalty)
      // - Being outside triggers a shift penalty
      // - Prefer strings close to current, slightly favour moving toward higher strings
      const spanPenalty = inWindow ? 0 : SHIFT_PENALTY + Math.abs(f - windowStart) * 5;
      const stringDiff = Math.abs(sIdx - currentString);
      const backtrack = sIdx < currentString ? 15 : 0;

      const cost = spanPenalty + stringDiff * 3 + backtrack;

      if (cost < minCost) {
        minCost = cost;
        best = {
          stringIndex: sIdx,
          fret: f,
          absoluteValue: targetAbs,
          causesShift: !inWindow,
          newWindowStart: inWindow ? windowStart : Math.max(0, f - 1),
        };
      }
    });

    if (best) {
      if (best.causesShift) {
        windowStart = best.newWindowStart;
      }
      path.push({
        stringIndex: best.stringIndex,
        fret: best.fret,
        absoluteValue: best.absoluteValue,
      });
      currentString = best.stringIndex;
    }
  }
  return path;
}
