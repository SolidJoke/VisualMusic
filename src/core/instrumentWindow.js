// @ts-check
// src/core/instrumentWindow.js
//
// C-103 (Step 3a) — how much of the vertical piano and necks A′ shows when the
// window is shorter than the full instruments.
//
// The rule Gabriel set: below 2045px of height the instruments do NOT shrink —
// a white key stays 61px, a fret row keeps its full-neck height — they show
// FEWER of them. Two pure functions here turn "how many px do I have" into
// "how many octaves / frets do I draw", and — for the necks — "which window of
// frets", the same way core/noteEngine.js's chooseKeyboardWindow picks which
// octaves the piano shows.
//
// Everything is a parameter. Nothing in this file knows 61, 1787, 1645, 22,
// 142 or 4: the page reads those from its CSS (--proto-key, --proto-inst-h,
// --fbv-head, --fbv-fret, --fbv-n, --proto-keys) and passes them here. The
// share function is the neck's row-height distribution (verticalNeckGeometry.js
// verticalFretShare); it is passed, not imported, so core stays free of any
// component dependency.

/**
 * The number of octaves (plus the closing C) that fit in `availableHeight`.
 *
 * A keyboard of k octaves has 7k + 1 white keys (each octave's 7 whites plus
 * the closing C) and its box's chrome, so its height is `(7k + 1) * keyPx +
 * chromePx`. The answer is the LARGEST k in [minOctaves, maxOctaves] whose
 * height fits; when even minOctaves does not fit, minOctaves is returned with
 * `fits: false` (the page never asks for less than the minimum).
 *
 * @param {number} availableHeight px the keyboard may use
 * @param {{keyPx: number, chromePx: number, maxOctaves: number, minOctaves?: number}} opts
 * @returns {{octaves: number, keys: number, height: number, fits: boolean}}
 */
export function chooseKeyboardOctaves(availableHeight, { keyPx, chromePx, maxOctaves, minOctaves = 1 }) {
  const heightFor = (octaves) => (7 * octaves + 1) * keyPx + chromePx;

  let octaves = minOctaves;
  for (let k = maxOctaves; k >= minOctaves; k--) {
    if (heightFor(k) <= availableHeight) {
      octaves = k;
      break;
    }
  }

  const keys = 7 * octaves + 1;
  const height = heightFor(octaves);
  return { octaves, keys, height, fits: height <= availableHeight };
}

/**
 * The fret window a vertical neck shows: how many frets, and which ones.
 *
 * The neck is as long as the keyboard (fixedRows + its fret rows at full-neck
 * row heights). Its count is the LARGEST number of frets whose full-neck rows
 * fit in `keyboardHeight`, taken at the nut (frets 1..n, the tallest rows), so
 * any window of that many frets also fits. The window's start then follows the
 * music, mirroring chooseKeyboardWindow:
 *
 *   1. no active fret (or an empty neck): the lowest window, fret 1;
 *   2. otherwise the lowest window that holds every active fret;
 *   3. if none does (the notes span more frets than the window), the window
 *      starts on the lowest root's fret (`anchorFret`, clamped to the neck),
 *      and `holdsAll` says some frets are left out.
 *
 * Fret 0 (the open-string row) is not part of the window; the component always
 * draws it above the nut. `share(fret, numFrets)` is the neck's row-height
 * share (0..1, summing to 1 over 1..numFrets), so a row keeps its full-neck
 * height regardless of the window: `fullRowsHeight * share(fret, numFrets)`.
 *
 * @param {number[]} activeFrets the frets the neck's notes occupy (fret 0 ignored)
 * @param {{keyboardHeight: number, fixedRows: number, fullRowsHeight: number,
 *   numFrets: number, share: (fret: number, numFrets: number) => number,
 *   anchorFret?: number}} opts
 * @returns {{firstFret: number, lastFret: number, fretCount: number,
 *   height: number, holdsAll: boolean, fits: boolean}}
 */
export function chooseFretWindow(activeFrets, {
  keyboardHeight,
  fixedRows,
  fullRowsHeight,
  numFrets,
  share,
  anchorFret = 1,
}) {
  const EPS = 1e-6;

  // The share of frets 1..n (at full-neck row heights): the neck's rows height
  // when the nut-anchored window of n frets is drawn.
  const cumShare = (n) => {
    let s = 0;
    for (let f = 1; f <= n; f++) s += share(f, numFrets);
    return s;
  };

  // The count: the largest number of frets whose nut-anchored rows fit.
  let fretCount = 1;
  let fits = false;
  for (let n = numFrets; n >= 1; n--) {
    if (fixedRows + fullRowsHeight * cumShare(n) <= keyboardHeight + EPS) {
      fretCount = n;
      fits = true;
      break;
    }
  }

  const frets = Array.isArray(activeFrets)
    ? activeFrets.filter((f) => Number.isFinite(f) && f > 0 && f <= numFrets)
    : [];

  const maxStart = numFrets - fretCount + 1;
  let firstFret = 1;
  let holdsAll = true;

  if (frets.length > 0) {
    const low = Math.min(...frets);
    const high = Math.max(...frets);
    const holds = (s) => s <= low && high <= s + fretCount - 1;

    let fitting;
    for (let s = 1; s <= maxStart; s++) {
      if (holds(s)) { fitting = s; break; }
    }

    if (fitting !== undefined) {
      firstFret = fitting;
    } else {
      holdsAll = false;
      firstFret = Math.max(1, Math.min(anchorFret, maxStart));
    }
  }

  const lastFret = firstFret + fretCount - 1;

  // The rendered neck's height: its fixed rows plus the window's rows, each at
  // its full-neck height. Rounded down to 0.01px like verticalFretPitch, so a
  // rounding can never make the neck taller than the length it was given.
  let windowShare = 0;
  for (let f = firstFret; f <= lastFret; f++) windowShare += share(f, numFrets);
  const height = Math.floor((fixedRows + fullRowsHeight * windowShare) * 100 + 1e-6) / 100;

  return { firstFret, lastFret, fretCount, height, holdsAll, fits };
}
