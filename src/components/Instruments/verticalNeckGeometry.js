/**
 * Geometry of the vertical neck (Fretboard orientation="vertical", S1
 * prototype, ?prototype=a).
 *
 * Until L1a-fix1 every fret row was 70px high. A real neck is not: the frets
 * get closer from the nut towards the body, which is what lets a player find
 * a fret by its width alone. Gabriel asked for that - not the exact
 * proportions, but close enough to tell the cases apart.
 *
 * The real taper (each fret 2^(-1/12) of the one before) cannot be used as it
 * is: it would drop under the 64px S1-5 needs up to fret 12 and under the
 * ~52px a 48px pastille needs to stay clear of its neighbour. The coordinator
 * chose a straight line instead, from NEAR on fret 1 to FAR on the neck's
 * last fret:
 *
 *     pitch(n) = NEAR - (NEAR - FAR) * (n - 1) / (numFrets - 1)
 *
 * The mean of a straight line is its midpoint, (84 + 56) / 2 = 70: whatever
 * the number of frets, the rows sum to numFrets x 70px - the height a neck of
 * 70px rows had (guitar 22 frets, 1540px; bass 20 frets, 1400px). That is why
 * the function takes the neck's fret count: with one slope for both, the bass
 * would have ended 27px lower than it did. Fret 12 is 69px on the guitar, 68px
 * on the bass; the last fret 56px, so >= 64px up to fret 12 (S1-5) and >= 52px
 * everywhere (S1-4) hold with room to spare.
 *
 * ONE function of the fret number. Fretboard.jsx writes its value on each
 * fret row as --fbv-pitch; the row's height, the pastilles, the fret numbers
 * and the markers are all laid out inside that row, so none of them has a
 * position of its own to keep in step.
 */

/** px of the row of fret 1 (next to the nut). */
export const FRET_PITCH_NEAR = 84;

/** px of the row of the neck's last fret (next to the body). */
export const FRET_PITCH_FAR = 56;

/**
 * Height in px of the row of fret `fret` (1 .. numFrets): the distance
 * between the wire before it and its own. Rounded DOWN to 0.01px: the value
 * written in the DOM and the one the tests compare are the same number, and a
 * neck can never come out taller than numFrets x 70px by rounding.
 */
export function verticalFretPitch(fret, numFrets) {
  const t = numFrets > 1 ? (fret - 1) / (numFrets - 1) : 0;
  return Math.floor((FRET_PITCH_NEAR - (FRET_PITCH_NEAR - FRET_PITCH_FAR) * t) * 100 + 1e-6) / 100;
}

/**
 * The frets that carry a marker on a real neck, and how many dots each:
 * 3, 5, 7, 9, 15, 17, 19, 21 one, 12 two. Gabriel's list. A neck draws only
 * the ones it has (the bass stops at 20).
 */
export const INLAY_FRET_DOTS = { 3: 1, 5: 1, 7: 1, 9: 1, 12: 2, 15: 1, 17: 1, 19: 1, 21: 1 };
