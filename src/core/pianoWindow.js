// @ts-check
// src/core/pianoWindow.js
//
// VMU-031, lot 2 — the phone's piano: which two octaves the stage shows, how a
// manual ‹ › moves them, and how big the keys are.
//
// The note engine already knows how to pick the window that holds a set of
// notes (noteEngine.js chooseKeyboardWindow, VMU-031 L1a). What it did not know
// is a window that somebody MOVED: the phone has two buttons for it, and the
// moved window has to hold until the notes change, then fall back on the notes.
// Everything here is pure; the React state that remembers "moved" lives in
// hooks/usePianoWindow.js. Nothing in this file knows a pixel size of the page:
// the page reads them from its CSS and passes them in (core/instrumentWindow.js
// has the same rule).

import { chooseKeyboardWindow, realizeNote } from "./noteEngine";

/** The phone shows two octaves (plus the closing C): 15 white keys. */
export const PHONE_PIANO_OCTAVES = 2;

/**
 * The phone's white key never goes below this many px of thickness: a black key
 * drawn at PHONE_BLACK_RATIO of it is then 24.75px, over WCAG 2.5.8's 24px.
 * The 44px floor (--hit-min) of the 768..2559px pages does NOT apply to the
 * phone's piano (the coordinator's decision of 2026-11-22: two octaves first).
 */
export const PHONE_PIANO_KEY_MIN = 33;

/** A black key is drawn at 75% of a white one (a real piano's is 58%): for the finger. */
export const PHONE_BLACK_RATIO = 0.75;

/**
 * @typedef {{lowestOctave: number, octaveCount: number, windowOctaves: number}} KeyboardSpec
 */

/**
 * The lowest and highest window starts the keyboard allows — the same range
 * chooseKeyboardWindow draws its candidates from.
 *
 * @param {KeyboardSpec} keyboard
 * @returns {{min: number, max: number}} scientific octaves of the window's lowest C
 */
export function windowStartRange({ lowestOctave, octaveCount, windowOctaves }) {
  return { min: lowestOctave, max: lowestOctave + octaveCount - windowOctaves };
}

/**
 * A window start moved by `delta` octaves and kept inside the keyboard.
 *
 * @param {number} start
 * @param {number} delta
 * @param {KeyboardSpec} keyboard
 * @returns {number}
 */
export function shiftWindowStart(start, delta, keyboard) {
  const { min, max } = windowStartRange(keyboard);
  return Math.max(min, Math.min(max, start + delta));
}

/**
 * The window the stage shows now.
 *
 * `manualStart` is where ‹ › last put it, or null when nobody moved it since
 * the notes changed: then the window is the one that holds the notes
 * (chooseKeyboardWindow). A manual start is clamped to the keyboard.
 *
 * @param {number[]} pitches the active notes, absolute MIDI pitches
 * @param {number|null} rootPc 0-11, anchors a window that cannot hold everything
 * @param {KeyboardSpec} keyboard
 * @param {number|null} [manualStart]
 * @returns {{startOctave: number, manual: boolean, holdsAll: boolean, canPrev: boolean, canNext: boolean}}
 */
export function pianoWindowView(pitches, rootPc, keyboard, manualStart = null) {
  const { min, max } = windowStartRange(keyboard);
  const auto = chooseKeyboardWindow(pitches, keyboard, rootPc);
  const manual = manualStart !== null && manualStart !== undefined;
  const startOctave = manual ? Math.max(min, Math.min(max, /** @type {number} */ (manualStart))) : auto.startOctave;
  const low = realizeNote(0, startOctave);
  const high = realizeNote(0, startOctave + keyboard.windowOctaves);
  const holdsAll = pitches.every((p) => low <= p && p <= high);
  return { startOctave, manual, holdsAll, canPrev: startOctave > min, canNext: startOctave < max };
}

/**
 * How far to scroll a stage so the notes that sound are in it.
 *
 * The phone's stage scrolls inside itself when two octaves at their minimum key
 * do not fit its height (a 360 x 740 phone: the keys need ~100px more). The
 * window holds the notes, but a note can sit on a key scrolled out of sight —
 * the very thing the user complained about, only in another dimension. This
 * says how much to move: 0 when the notes are already inside the view; else the
 * smallest move that brings them in; when they are taller than the view, the
 * highest note's edge goes to the top (the keyboard reads high at the top).
 *
 * @param {{top: number, bottom: number}} notes the lit keys' extent, viewport px
 * @param {{top: number, bottom: number}} view the stage's visible area, viewport px
 * @param {number} [pad] px of air kept around the notes
 * @returns {number} px to add to scrollTop (negative: scroll up)
 */
export function scrollToReveal(notes, view, pad = 8) {
  const above = notes.top - pad - view.top;
  const below = notes.bottom + pad - view.bottom;
  if (notes.bottom - notes.top + 2 * pad > view.bottom - view.top) return above;
  if (above < 0) return above;
  if (below > 0) return below;
  return 0;
}
