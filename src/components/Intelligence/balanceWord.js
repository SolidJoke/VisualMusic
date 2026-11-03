/**
 * VMU-195-B: the balance of the stacked rhythms is a word, not a percentage.
 * The three bands are the reference's: a centroid that sits on the centre
 * (< 0.01 of the radius) is "balanced", under 0.15 "almost balanced", beyond
 * "tilted". Thresholds live here (not in the panel file) so the wheel, the
 * panel and the tests agree without breaking fast refresh.
 */
export const BALANCE_THRESHOLDS = { even: 0.01, almost: 0.15 };

/** @param {number} offset centroid distance (0..1 of the radius)
 *  @param {{even:string, almost:string, tilted:string}} words
 *  @returns {string} the word for that offset */
export function balanceWordFor(offset, words) {
  if (offset < BALANCE_THRESHOLDS.even) return words.even;
  if (offset < BALANCE_THRESHOLDS.almost) return words.almost;
  return words.tilted;
}
