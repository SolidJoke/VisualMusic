// @ts-check
// src/hooks/usePianoWindow.js
//
// VMU-031, lot 2 — the phone piano's window and the ‹ › that move it.
//
// The window follows the notes (core/pianoWindow.js pianoWindowView). A ‹ › press
// moves it by an octave and the move HOLDS until the active notes change; at
// that moment the window falls back on the notes. "The notes changed" is the
// list of pitches itself: a new chord, a new scale, a new octave in the
// Dictionary, a new chord octave in the Studio all give a different list, and
// a re-render with the same list keeps the move.
//
// The remembered move is stored with the notes it was made for and compared
// while rendering (React's way to reset state on a changed input), so there is
// no frame where the old move shows on the new notes.

import { useCallback, useState } from "react";
import { pianoWindowView, shiftWindowStart } from "../core/pianoWindow";

/**
 * @param {number[]} pitches the active notes, absolute MIDI pitches
 * @param {number|null} rootPc 0-11
 * @param {import("../core/pianoWindow").KeyboardSpec} keyboard
 */
export function usePianoWindow(pitches, rootPc, keyboard) {
  const notesKey = `${pitches.join(",")}|${rootPc}|${keyboard.lowestOctave}|${keyboard.octaveCount}|${keyboard.windowOctaves}`;
  const [moved, setMoved] = useState(
    /** @type {{notesKey: string, start: number|null}} */ ({ notesKey, start: null }),
  );
  if (moved.notesKey !== notesKey) setMoved({ notesKey, start: null });
  const manualStart = moved.notesKey === notesKey ? moved.start : null;

  const view = pianoWindowView(pitches, rootPc, keyboard, manualStart);

  const { lowestOctave, octaveCount, windowOctaves } = keyboard;
  const shift = useCallback(
    (/** @type {number} */ delta) => {
      setMoved((prev) => {
        const current = prev.notesKey === notesKey && prev.start !== null
          ? prev.start
          : pianoWindowView(pitches, rootPc, { lowestOctave, octaveCount, windowOctaves }).startOctave;
        return { notesKey, start: shiftWindowStart(current, delta, { lowestOctave, octaveCount, windowOctaves }) };
      });
    },
    // `pitches` is the content `notesKey` already names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notesKey, lowestOctave, octaveCount, windowOctaves],
  );

  return { ...view, notesKey, shift };
}
