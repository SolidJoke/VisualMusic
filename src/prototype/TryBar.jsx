// @ts-check
/**
 * VMU-227 — "try without fear": ↶ ↷ and "Hear the original", beside the Play
 * button.
 *
 * ↶ ↷ are the Studio's undo / redo (hooks/useStudioMode.js), greyed when there
 * is nothing to undo or redo. "Hear the original" is HELD: mouse, touch (a long
 * press) or the Space bar once it has the focus. While it is held the page plays
 * and shows the style without the user's edits (useStudioMode's
 * `isHearingOriginal`); on release the edits come back, the music never stops.
 * Every target is at least 44 px (the page's --hit-min).
 *
 * @param {Object} props
 * @param {any} props.T the page's labels (protoA)
 * @param {boolean} props.canUndo
 * @param {boolean} props.canRedo
 * @param {() => void} props.onUndo
 * @param {() => void} props.onRedo
 * @param {boolean} props.hasEdits whether there is anything to compare with
 * @param {boolean} props.holding whether the button is held (it is shown pressed)
 * @param {(on: boolean) => void} props.onHold
 */
export default function TryBar({ T, canUndo, canRedo, onUndo, onRedo, hasEdits, holding, onHold }) {
  const holdProps = {
    onPointerDown: (/** @type {import("react").PointerEvent<HTMLButtonElement>} */ e) => {
      if (e.button !== undefined && e.button > 0) return;
      // Follow the finger / the mouse out of the button: the release is ours.
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* a synthetic pointer has nothing to capture */
      }
      onHold(true);
    },
    onPointerUp: () => onHold(false),
    onPointerCancel: () => onHold(false),
    onLostPointerCapture: () => onHold(false),
    onBlur: () => onHold(false),
    // A long press on a phone opens the context menu: it is the gesture here.
    onContextMenu: (/** @type {import("react").SyntheticEvent} */ e) => e.preventDefault(),
    onKeyDown: (/** @type {import("react").KeyboardEvent} */ e) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) onHold(true);
      }
    },
    onKeyUp: (/** @type {import("react").KeyboardEvent} */ e) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        onHold(false);
      }
    },
  };
  return (
    <div className="proto-a__try" role="group" data-fn="jouer.essayer">
      <button
        type="button"
        className="proto-a__btn proto-a__btn--square"
        aria-label={T.undoLabel}
        title={T.undoLabel}
        disabled={!canUndo}
        data-fn="jouer.annuler"
        onClick={onUndo}
      >
        ↶
      </button>
      <button
        type="button"
        className="proto-a__btn proto-a__btn--square"
        aria-label={T.redoLabel}
        title={T.redoLabel}
        disabled={!canRedo}
        data-fn="jouer.retablir"
        onClick={onRedo}
      >
        ↷
      </button>
      <button
        type="button"
        className={`proto-a__btn proto-a__hold ${holding ? "is-active" : ""}`}
        aria-pressed={holding}
        aria-disabled={!hasEdits}
        title={T.hearOriginalHint}
        data-fn="jouer.ecouter-original"
        data-hold-original=""
        {...holdProps}
      >
        {T.hearOriginal}
      </button>
    </div>
  );
}
