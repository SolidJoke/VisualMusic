// @ts-check
import { useEffect, useRef, useCallback } from "react";

/**
 * Select an instrument and play it, in one gesture, without playing the wrong
 * one (VMU-101).
 *
 * `play` is a callback bound to the CURRENT selection — in the app it is
 * playDictionaryAudio, a useCallback closing over playbackInstrument and the
 * notes realized for it. Calling it in the same event as `setSelected` runs the
 * previous render's callback: the old instrument sounds while the screen shows
 * the new one. That is the heard-versus-shown divergence #103 removed, rebuilt
 * by a button.
 *
 * So selecting a different instrument only records the intent. The play happens
 * after the render that commits the new selection, when `play` has been rebound
 * to it. Selecting the instrument already selected plays at once: nothing needs
 * to re-render.
 *
 * A ref rather than state holds the intent, so that clearing it does not cost a
 * render and cannot trigger a second play.
 *
 * @param {Object} options
 * @param {string} options.selected currently selected instrument id
 * @param {(id: string) => void} options.setSelected
 * @param {() => void} options.play plays the currently selected instrument
 * @returns {(id: string) => void} selectAndPlay
 */
export function useSelectThenPlay({ selected, setSelected, play }) {
  const pending = useRef(/** @type {string|null} */ (null));

  // No dependency array on purpose: this must see every committed render, and
  // it does nothing unless an intent is waiting for its selection to land.
  useEffect(() => {
    if (pending.current !== null && pending.current === selected) {
      pending.current = null;
      if (play) play();
    }
  });

  return useCallback(
    (id) => {
      if (setSelected) setSelected(id);
      if (id === selected) {
        // Already the selection: `play` is bound to it, play now. Also cancels
        // an intent from an earlier tap in the same event, so a double tap
        // plays only the last choice.
        pending.current = null;
        if (play) play();
        return;
      }
      pending.current = id;
    },
    [selected, setSelected, play]
  );
}
