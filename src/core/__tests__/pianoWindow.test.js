// VMU-031 lot 2 — the phone piano's window: two octaves that hold the notes
// that sound (a low chord, a high scale, a chord moved up an octave), the ‹ ›
// that move it and stop at the keyboard's ends, and the scroll that keeps the
// lit keys inside a stage shorter than the keyboard.
import { describe, it, expect } from "vitest";
import { pianoWindowView, shiftWindowStart, windowStartRange, scrollToReveal, PHONE_PIANO_OCTAVES, PHONE_PIANO_KEY_MIN, PHONE_BLACK_RATIO } from "../pianoWindow";
import { chooseKeySize } from "../instrumentWindow";
import { realizeChord, realizeScale, realizeNote } from "../noteEngine";

// The phone's keyboard: C2..B8 (7 octaves), a window of two octaves + the closing C.
const KB = { lowestOctave: 2, octaveCount: 7, windowOctaves: PHONE_PIANO_OCTAVES };
const C = (octave) => realizeNote(0, octave);

/** Every pitch is between the window's lowest C and its closing C. */
const holds = (view, pitches) =>
  pitches.every((p) => C(view.startOctave) <= p && p <= C(view.startOctave + PHONE_PIANO_OCTAVES));

describe("the phone shows two octaves that hold the notes", () => {
  it("is C2..C4 with nothing to show", () => {
    const v = pianoWindowView([], null, KB);
    expect(v.startOctave).toBe(2);
    expect(v.manual).toBe(false);
  });

  it("a low chord (C2 E2 G2) is held by the lowest window", () => {
    const pitches = realizeChord(0, [0, 4, 7], 2);
    const v = pianoWindowView(pitches, 0, KB);
    expect(v.startOctave).toBe(2);
    expect(v.holdsAll).toBe(true);
    expect(holds(v, pitches)).toBe(true);
  });

  it("a C major chord at octave 4 and the same chord +1 octave are both held", () => {
    for (const octave of [4, 5]) {
      const pitches = realizeChord(0, [0, 4, 7], octave);
      const v = pianoWindowView(pitches, 0, KB);
      expect(holds(v, pitches)).toBe(true);
      expect(v.holdsAll).toBe(true);
    }
    // +1 octave moves the window up an octave: C4 chord -> C3..C5, C5 chord -> C4..C6.
    expect(pianoWindowView(realizeChord(0, [0, 4, 7], 4), 0, KB).startOctave).toBe(3);
    expect(pianoWindowView(realizeChord(0, [0, 4, 7], 5), 0, KB).startOctave).toBe(4);
  });

  it("a high scale (B major scale at octave 7, the Dictionary's +3) is held, up to the keyboard's top", () => {
    const pitches = realizeScale(11, "scale_major", 7);
    expect(Math.max(...pitches)).toBe(realizeNote(11, 8)); // B8
    const v = pianoWindowView(pitches, 11, KB);
    expect(holds(v, pitches)).toBe(true);
    expect(v.holdsAll).toBe(true);
    expect(v.startOctave).toBe(7); // C7..C9 — the keyboard's last window
    expect(v.canNext).toBe(false);
  });

  it("a 9th chord (more than an octave wide) is held with room to spare", () => {
    const pitches = realizeChord(7, [0, 4, 7, 10, 14], 4);
    const v = pianoWindowView(pitches, 7, KB);
    expect(holds(v, pitches)).toBe(true);
  });

  it("a span wider than the window anchors on the lowest root and says it leaves notes out", () => {
    // C3 and C6: three octaves apart, no two-octave window holds both.
    const pitches = [C(3), C(6)];
    const v = pianoWindowView(pitches, 0, KB);
    expect(v.holdsAll).toBe(false);
    expect(v.startOctave).toBe(3);
  });
});

describe("‹ › move the window by an octave and stop at the ends", () => {
  it("windowStartRange: C2..C7 for the 7-octave keyboard", () => {
    expect(windowStartRange(KB)).toEqual({ min: 2, max: 7 });
  });

  it("a shift is clamped to the keyboard", () => {
    expect(shiftWindowStart(2, -1, KB)).toBe(2);
    expect(shiftWindowStart(2, 1, KB)).toBe(3);
    expect(shiftWindowStart(7, 1, KB)).toBe(7);
    expect(shiftWindowStart(6, 1, KB)).toBe(7);
  });

  it("a manual start wins over the notes' window, and is clamped", () => {
    const pitches = realizeChord(0, [0, 4, 7], 4);
    const moved = pianoWindowView(pitches, 0, KB, 5);
    expect(moved.manual).toBe(true);
    expect(moved.startOctave).toBe(5);
    expect(moved.holdsAll).toBe(false); // the chord is below the moved window
    expect(pianoWindowView(pitches, 0, KB, 99).startOctave).toBe(7);
    expect(pianoWindowView(pitches, 0, KB, -4).startOctave).toBe(2);
  });

  it("canPrev / canNext are false exactly at the ends", () => {
    expect(pianoWindowView([], null, KB, 2)).toMatchObject({ canPrev: false, canNext: true });
    expect(pianoWindowView([], null, KB, 4)).toMatchObject({ canPrev: true, canNext: true });
    expect(pianoWindowView([], null, KB, 7)).toMatchObject({ canPrev: true, canNext: false });
  });
});

describe("the phone key: two octaves fit, never under 33px, black at 75%", () => {
  const opts = { fullKeyPx: 61, minKeyPx: PHONE_PIANO_KEY_MIN, chromePx: 18, targetOctaves: PHONE_PIANO_OCTAVES };

  it.each([
    [545, 35], // a 412 x 915 stage: floor((545 - 18) / 15)
    [414, 33], // a 360 x 740 stage: 26 would be under the floor; the stage scrolls
    [Infinity, 61], // jsdom
  ])("room %spx -> %ipx key", (room, key) => {
    expect(chooseKeySize(room, opts)).toBe(key);
  });

  it("the black key at the floor is over WCAG 2.5.8's 24px", () => {
    expect(PHONE_PIANO_KEY_MIN * PHONE_BLACK_RATIO).toBeGreaterThanOrEqual(24);
    expect(PHONE_BLACK_RATIO).toBe(0.75);
  });
});

describe("scrollToReveal: lit keys stay inside the stage", () => {
  const view = { top: 64, bottom: 590 };

  it("does nothing when the notes are inside", () => {
    expect(scrollToReveal({ top: 300, bottom: 400 }, view)).toBe(0);
  });

  it("scrolls down by the smallest move that brings the lowest note in", () => {
    expect(scrollToReveal({ top: 500, bottom: 640 }, view)).toBe(640 + 8 - 590);
  });

  it("scrolls up for a note above the view", () => {
    expect(scrollToReveal({ top: 40, bottom: 80 }, view)).toBe(40 - 8 - 64);
  });

  it("when the notes are taller than the view, the highest note's edge goes to the top", () => {
    expect(scrollToReveal({ top: 100, bottom: 900 }, view)).toBe(100 - 8 - 64);
  });
});
