/**
 * What a position control shows and how its arrows step — shared by the
 * classic page's PositionSelector (components/Layout/PositionSelector.jsx) and
 * A′'s column heads (src/prototype/InstrumentHead.jsx, L1b-1b), so the two say
 * the same words for the same placement and cycle the same way. Moved here
 * unchanged from PositionSelector.jsx: one copy, not two.
 *
 * Placements are core/placements.js listPlacements' (nut -> body); an index is
 * a rank in that list, null = the default placement.
 */

/**
 * What the arrows show for one placement: a scale box is numbered from the
 * nut, "3 sur 5" (it read "3 eu 5": the notation code was passed as
 * fingeringLogic.js's separator); a shape keeps its own label, with "-shape" in
 * the page's language.
 *
 * @param {{index: number, label: string, fingering?: any}} placement
 * @param {number} count
 * @param {Record<string, any>} txt the page's translations (voicingOf, shapeLabel)
 */
export function placementText(placement, count, txt) {
  if (placement.fingering?.isScaleMode) return `${placement.index + 1} ${txt.voicingOf || "of"} ${count}`;
  return placement.label.replace('-shape', `-${txt.shapeLabel || 'shape'}`);
}

/**
 * The label of a position control: the chosen placement's, or with none chosen
 * the default one's marked as such (txt.positionDefault) — a single note has
 * none: every place of it is lit, "Toutes les notes" (a scale with no box: the
 * full neck).
 *
 * @param {Object} args
 * @param {Array<any>} args.placements
 * @param {number|null} args.placementIndex
 * @param {boolean} args.isScaleMode
 * @param {Record<string, any>} args.txt
 */
export function placementLabel({ placements = [], placementIndex = null, isScaleMode = false, txt }) {
  const count = placements.length;
  const current = placementCursor(placements, placementIndex);
  if (placementIndex !== null) {
    return current >= 0 ? placementText(placements[current], count, txt) : "Position";
  }
  const defaultPlacement = placements.find((p) => p.isDefault) ?? null;
  if (defaultPlacement) {
    const text = placementText(defaultPlacement, count, txt);
    return typeof txt.positionDefault === "function" ? txt.positionDefault(text) : text;
  }
  return isScaleMode ? txt.fullNeck : txt.voicingAllNotes;
}

/**
 * The chosen entry's rank, or -1 when the index points nowhere (a list that
 * changed under it): the arrows then behave as they did for an unknown id.
 *
 * @param {Array<any>} placements
 * @param {number|null} placementIndex
 */
export function placementCursor(placements, placementIndex) {
  const count = placements.length;
  return Number.isInteger(placementIndex) && placementIndex >= 0 && placementIndex < count ? placementIndex : -1;
}

/**
 * The index one arrow leads to: › from the default to the first entry, then
 * nut -> body, then back to the default (null); ‹ the other way. undefined when
 * there is nothing to step through (an empty list): the caller does nothing.
 *
 * @param {Array<any>} placements
 * @param {number|null} placementIndex
 * @param {1|-1} direction
 * @returns {number|null|undefined}
 */
export function stepPlacement(placements, placementIndex, direction) {
  const count = placements.length;
  if (count === 0) return undefined;
  const current = placementCursor(placements, placementIndex);
  if (direction > 0) {
    if (placementIndex === null) return 0;
    if (current === count - 1) return null;
    return current + 1;
  }
  if (placementIndex === null) return count - 1;
  if (current <= 0) return null;
  return current - 1;
}
