// @ts-check
// L1a (VMU-031) — chooseKeyboardWindow, the note engine's rule for which
// 4 octaves of the 7 the vertical piano shows.
//
// The keyboard the window is chosen from is the horizontal one at 4K: 7
// octaves from C2 (PianoKeyboard.jsx, numOctaves), i.e. C2..B8. A window is 4
// octaves plus its closing C (29 white keys, spec S1-9): C2..C6 by default.
//
// The rule (coordinator's decision, L1a brief, scope item 2):
//   - default C2..C6 whenever it holds every active note;
//   - otherwise the lowest window that holds them all;
//   - if no window holds them all (they span more than 4 octaves), the window
//     starts on the octave of the lowest root, and says so (holdsAll false).
import { describe, it, expect } from "vitest";
import { chooseKeyboardWindow, realizeNote } from "../noteEngine";

const KEYBOARD = { lowestOctave: 2, octaveCount: 7, windowOctaves: 4 };
const C = (octave) => realizeNote(0, octave);
const E = (octave) => realizeNote(4, octave);
const G = (octave) => realizeNote(7, octave);

describe("noteEngine — chooseKeyboardWindow (vertical piano, L1a)", () => {
  it("nothing to show: the default window, C2..C6", () => {
    expect(chooseKeyboardWindow([], KEYBOARD)).toEqual({ startOctave: 2, holdsAll: true });
  });

  it("notes inside C2..C6, closing C6 included: the default window", () => {
    expect(chooseKeyboardWindow([C(4), E(4), G(4)], KEYBOARD, 0)).toEqual({ startOctave: 2, holdsAll: true });
    expect(chooseKeyboardWindow([C(2), C(6)], KEYBOARD, 0)).toEqual({ startOctave: 2, holdsAll: true });
  });

  it("Do majeur at octave +3 (C7 E7 G7): the lowest window that holds it, C4..C8", () => {
    expect(chooseKeyboardWindow([C(7), E(7), G(7)], KEYBOARD, 0)).toEqual({ startOctave: 4, holdsAll: true });
  });

  it("Do majeur at octave +2 (C6 E6 G6): C3..C7", () => {
    expect(chooseKeyboardWindow([C(6), E(6), G(6)], KEYBOARD, 0)).toEqual({ startOctave: 3, holdsAll: true });
  });

  it("the highest window, C5..C9, when the notes need it", () => {
    expect(chooseKeyboardWindow([realizeNote(5, 7), realizeNote(2, 8)], KEYBOARD, 2)).toEqual({ startOctave: 5, holdsAll: true });
  });

  it("order of the input does not matter", () => {
    expect(chooseKeyboardWindow([G(7), C(7), E(7)], KEYBOARD, 0)).toEqual({ startOctave: 4, holdsAll: true });
  });

  it("more than 4 octaves apart: no window holds them all, it starts on the lowest root's octave", () => {
    // E2 and E7 (root E): nothing holds both; the lowest root is E2 -> C2.
    expect(chooseKeyboardWindow([E(2), E(7)], KEYBOARD, 4)).toEqual({ startOctave: 2, holdsAll: false });
    // C3 ... G8 (root C): the lowest root is C3 -> C3..C7.
    expect(chooseKeyboardWindow([C(3), E(5), G(8)], KEYBOARD, 0)).toEqual({ startOctave: 3, holdsAll: false });
  });

  it("the lowest ROOT, not the lowest note, anchors an overflowing window", () => {
    // Root G: the lowest note is C2 but the lowest G is G4 -> C4..C8.
    expect(chooseKeyboardWindow([C(2), G(4), G(8)], KEYBOARD, 7)).toEqual({ startOctave: 4, holdsAll: false });
  });

  it("no root among the notes (or none given): the lowest note anchors it", () => {
    expect(chooseKeyboardWindow([E(3), G(8)], KEYBOARD, 0)).toEqual({ startOctave: 3, holdsAll: false });
    expect(chooseKeyboardWindow([E(3), G(8)], KEYBOARD)).toEqual({ startOctave: 3, holdsAll: false });
  });

  it("the anchor is clamped to the keyboard: never below C2, never above the C5..C9 window", () => {
    expect(chooseKeyboardWindow([C(1), G(8)], KEYBOARD, 0)).toEqual({ startOctave: 2, holdsAll: false });
    expect(chooseKeyboardWindow([E(2), realizeNote(10, 8)], KEYBOARD, 10)).toEqual({ startOctave: 5, holdsAll: false });
  });
});
