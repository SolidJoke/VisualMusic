/**
 * Geometry of the vertical neck (Fretboard orientation="vertical", S1
 * prototype, ?prototype=a).
 *
 * A real neck's frets get closer from the nut towards the body, which is what
 * lets a player find a fret by its width alone. L1a-fix1 made the pitch a
 * straight line from 84px on fret 1 down to 56px on the last fret, so a neck
 * was as tall as with 70px rows.
 *
 * L1a-fix2 (Gabriel, 2026-10-06): the two necks must be as long as the
 * keyboard (1816px: 29 white keys of 62px and the keyboard box's 18px), not
 * 1682px (guitar) and 1542px (bass). The shape and the RATIO stay - fret 1 is
 * 1.5 times the last fret, the 84 : 56 - and the scale changes: the rows are
 * normalised to fill what is left of the length once the neck's fixed lines
 * (the two head rows and the open-string row above the nut) are taken off.
 * Straight line, the rows' weights go from FRET_PITCH_RATIO on fret 1 to 1 on
 * the last:
 *
 *     weight(n) = 1 + (RATIO - 1) * (numFrets - n) / (numFrets - 1)
 *     share(n)  = weight(n) / sum of the weights = weight(n) / (numFrets * (1 + (RATIO - 1) / 2))
 *     pitch(n)  = share(n) * rowsHeight
 *
 * The shares sum to 1 for ANY number of frets, so the same function fills the
 * same length for the guitar (22 frets: 91.3px down to 60.9px, mean 76.1px)
 * and the bass (20 frets: 100.4px down to 67.0px, mean 83.7px) - the bass, with
 * fewer frets in the same length, has the larger scale. S1-5 (>= 64px up to
 * fret 12) and S1-4 (>= 52px everywhere) hold with room to spare.
 *
 * Where the length comes from: the PAGE. PrototypeA.css derives it once from
 * the keyboard (--proto-inst-h, from the key thickness) and gives it to the
 * necks as --fbv-h; Fretboard.css turns it into the rows' height
 * (--fbv-rows-h = --fbv-h minus the fixed lines). This module only supplies the
 * SHARES: Fretboard.jsx writes each row's height as a calc() of
 * --fbv-rows-h times its share in --fbv-pitch, so there is no px number
 * here to keep in step with the keyboard. verticalFretPitch is that same
 * multiplication in px, for the tests, the report and anyone who wants the
 * numbers: what a browser lays out, to the 0.01px.
 *
 * ONE function of the fret number. The row's height, the pastilles, the fret
 * numbers and the markers are all laid out inside that row, so none of them has
 * a position of its own to keep in step.
 */

/** Fret 1 is this many times the last fret (84 : 56, as in fix1). */
export const FRET_PITCH_RATIO = 1.5;

/**
 * The share (0..1) of the neck's rows height that the row of fret `fret`
 * (1 .. numFrets) takes. The shares of one neck sum to 1. Rounded to 1e-8:
 * far below what a pixel can show, and the sum stays 1 to 1e-7.
 */
export function verticalFretShare(fret, numFrets) {
  const t = numFrets > 1 ? (numFrets - fret) / (numFrets - 1) : 0; // 1 on fret 1, 0 on the last
  const weight = 1 + (FRET_PITCH_RATIO - 1) * t;
  const totalWeight = numFrets * (1 + (FRET_PITCH_RATIO - 1) / 2);
  return Math.round((weight / totalWeight) * 1e8) / 1e8;
}

/**
 * The row's height in px for a neck whose rows share `rowsHeight` px:
 * its share of them, rounded DOWN to 0.01px (a rounding can then never make
 * the neck taller than the length it was given).
 */
export function verticalFretPitch(fret, numFrets, rowsHeight) {
  return Math.floor(verticalFretShare(fret, numFrets) * rowsHeight * 100 + 1e-6) / 100;
}

/**
 * What Fretboard.jsx writes as --fbv-pitch on a fret row: a CSS length that is
 * the row's share of --fbv-rows-h, which Fretboard.css defines on the neck from
 * the page's length. The fallback is never used (the neck always defines
 * --fbv-rows-h); it is the 22-fret neck with 70px rows.
 */
export function verticalFretPitchCss(fret, numFrets) {
  return `calc(var(--fbv-rows-h, 1540px) * ${verticalFretShare(fret, numFrets)})`;
}

/**
 * The frets that carry a marker on a real neck, and how many dots each:
 * 3, 5, 7, 9, 15, 17, 19, 21 one, 12 two. Gabriel's list. A neck draws only
 * the ones it has (the bass stops at 20).
 */
export const INLAY_FRET_DOTS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 };
