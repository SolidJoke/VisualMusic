// C-103 (Step 3a) — the pure window rules: how many octaves / frets fit in a
// height, and which fret window a neck shows. Every size is a parameter, so the
// tests pass the page's own values (61px keys, 18px chrome, 142px fixed rows,
// 1645px full-neck rows, 22 frets) and the real share function
// (verticalFretShare) to prove the module itself hard-codes none of them.
import { describe, it, expect } from "vitest";
import { chooseKeySize, chooseKeyboardOctaves, chooseFretWindow } from "../instrumentWindow";
import { verticalFretShare } from "../../components/Instruments/verticalNeckGeometry";

describe("chooseKeySize (C-105: full 61px, floor 44px, 18px chrome, 2 octaves)", () => {
  const opts = { fullKeyPx: 61, minKeyPx: 44, chromePx: 18, targetOctaves: 2 };

  it.each([
    [738, 48], // 1920x970: (738 - 18) / 15 = 48
    [820, 53], // 2048x1052: floor(802 / 15) = 53
    [933, 61], // 2 octaves fit at the full key
    [2000, 61], // never above the full key
    [678, 44], // exactly the floor
    [498, 44], // 1536x730: the floor wins over 32
    [Infinity, 61], // jsdom / "everything fits"
  ])("available %spx -> %ipx key", (available, key) => {
    expect(chooseKeySize(available, opts)).toBe(key);
  });

  it("feeds the octave rule with the shrunk key (2 octaves at 48px, 1 at the floor)", () => {
    // 2 octaves at 48px: 15 * 48 + 18 = 738, exactly the available height.
    expect(chooseKeyboardOctaves(738, { keyPx: chooseKeySize(738, opts), chromePx: 18, maxOctaves: 4 }).octaves).toBe(2);
    // 1536x730 shrinks to the 44px floor, and only 1 octave (8 * 44 + 18 = 370) fits.
    expect(chooseKeyboardOctaves(498, { keyPx: chooseKeySize(498, opts), chromePx: 18, maxOctaves: 4 }).octaves).toBe(1);
  });
});

describe("chooseKeyboardOctaves (61px keys, 18px chrome, max 4 octaves)", () => {
  const opts = { keyPx: 61, chromePx: 18, maxOctaves: 4 };

  it.each([
    [1787, 4, 29, 1787, true],
    [1786, 3, 22, 1360, true],
    [1360, 3, 22, 1360, true],
    [1042, 2, 15, 933, true],
    [933, 2, 15, 933, true],
    [600, 1, 8, 506, true],
    [300, 1, 8, 506, false],
  ])("available %ipx -> %i octaves, %i white keys, %ipx", (available, octaves, keys, height, fits) => {
    expect(chooseKeyboardOctaves(available, opts)).toEqual({ octaves, keys, height, fits });
  });

  it("honours a higher minOctaves", () => {
    expect(chooseKeyboardOctaves(933, { ...opts, minOctaves: 2 })).toEqual({ octaves: 2, keys: 15, height: 933, fits: true });
  });
});

describe("chooseFretWindow (a parameterised neck)", () => {
  it("counts the largest number of equal rows that fit, anchored at the nut when nothing plays", () => {
    const share = () => 0.1; // 10 equal rows, 10px each when fullRowsHeight = 100
    expect(chooseFretWindow([], { keyboardHeight: 130, fixedRows: 100, fullRowsHeight: 100, numFrets: 10, share }))
      .toEqual({ firstFret: 1, lastFret: 3, fretCount: 3, height: 130, holdsAll: true, fits: true });
    expect(chooseFretWindow([], { keyboardHeight: 129, fixedRows: 100, fullRowsHeight: 100, numFrets: 10, share }))
      .toEqual({ firstFret: 1, lastFret: 2, fretCount: 2, height: 120, holdsAll: true, fits: true });
  });

  it("picks the lowest window that holds every active fret", () => {
    const share = () => 0.1;
    expect(chooseFretWindow([5, 6], { keyboardHeight: 130, fixedRows: 100, fullRowsHeight: 100, numFrets: 10, share }))
      .toMatchObject({ firstFret: 4, lastFret: 6, fretCount: 3, holdsAll: true });
  });

  it("anchors on the root's fret when no window holds everything", () => {
    const share = () => 0.1;
    expect(chooseFretWindow([1, 10], { keyboardHeight: 130, fixedRows: 100, fullRowsHeight: 100, numFrets: 10, share, anchorFret: 5 }))
      .toMatchObject({ firstFret: 5, lastFret: 7, fretCount: 3, holdsAll: false });
    // The anchor is clamped so the window stays on the neck.
    expect(chooseFretWindow([1, 10], { keyboardHeight: 130, fixedRows: 100, fullRowsHeight: 100, numFrets: 10, share, anchorFret: 20 }))
      .toMatchObject({ firstFret: 8, lastFret: 10, holdsAll: false });
  });

  it("ignores fret 0 (the open-string row is always drawn, not part of the window)", () => {
    const share = () => 0.1;
    expect(chooseFretWindow([0, 2], { keyboardHeight: 130, fixedRows: 100, fullRowsHeight: 100, numFrets: 10, share }))
      .toMatchObject({ firstFret: 1, lastFret: 3, holdsAll: true });
  });
});

describe("chooseFretWindow with the real neck geometry (22 frets, 142px fixed, 1645px rows)", () => {
  const opts = { fixedRows: 142, fullRowsHeight: 1645, numFrets: 22, share: verticalFretShare };

  it("keeps the full neck when the full keyboard length fits", () => {
    expect(chooseFretWindow([], { ...opts, keyboardHeight: 1787 }))
      .toEqual({ firstFret: 1, lastFret: 22, fretCount: 22, height: 1787, holdsAll: true, fits: true });
  });

  it("3 octaves (1360px) -> 15 frets", () => {
    const w = chooseFretWindow([], { ...opts, keyboardHeight: 1360 });
    expect(w).toMatchObject({ firstFret: 1, lastFret: 15, fretCount: 15, fits: true });
    expect(w.height).toBeCloseTo(1338.36, 1);
  });

  it("2 octaves (933px) -> 9 frets", () => {
    const w = chooseFretWindow([], { ...opts, keyboardHeight: 933 });
    expect(w).toMatchObject({ firstFret: 1, lastFret: 9, fretCount: 9, fits: true });
    expect(w.height).toBeCloseTo(898.27, 1);
  });

  it("moves the window up to hold active frets, keeping the count", () => {
    // 9 frets, active notes on frets 12-14: the lowest holding window is 6..14
    // (6 <= 12 and 14 <= 6 + 8), so it stays as low as it can while holding all.
    const w = chooseFretWindow([12, 13, 14], { ...opts, keyboardHeight: 933 });
    expect(w).toMatchObject({ firstFret: 6, lastFret: 14, fretCount: 9, holdsAll: true });
  });
});
