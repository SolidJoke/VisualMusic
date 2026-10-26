import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

/**
 * ConfirmDialog (VMU-126) - "this will erase something, go on?".
 *
 * Rendered only while the question is open (the caller mounts and unmounts
 * it). Two choices; the SAFE one ("keep") is the default:
 *   - the focus lands on it when the box opens;
 *   - Escape and a click outside the box mean "keep";
 *   - the focus goes back to what had it before, when the box closes.
 *
 * While it is open, no key reaches the rest of the page: it listens on
 * `window` in the capture phase and stops every key but its own, so the
 * global shortcuts (Space plays, S / D switch the mode), a window under it
 * (Modal closes on Escape) and the A′ drawer (closes on Escape) do not react
 * to a key typed to answer this box. Tab is kept inside the two buttons.
 * Listened to on `window` rather than on the box: focus can sit on <body>
 * after a click on the box's text, and the keys must still be caught then.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.body
 * @param {string} props.keepLabel     the safe choice (the default)
 * @param {string} props.confirmLabel  the destructive choice
 * @param {() => void} props.onKeep
 * @param {() => void} props.onConfirm
 */
const ConfirmDialog = ({ title, body, keepLabel, confirmLabel, onKeep, onConfirm }) => {
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef(null);
  const keepRef = useRef(null);
  const confirmRef = useRef(null);
  // The latest onKeep, read by the key listener without re-registering it.
  const onKeepRef = useRef(onKeep);
  useEffect(() => {
    onKeepRef.current = onKeep;
  });

  useEffect(() => {
    const previous = document.activeElement;
    keepRef.current?.focus();
    return () => {
      if (previous && previous.isConnected && typeof previous.focus === "function") previous.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        onKeepRef.current();
        return;
      }
      if (e.key === "Tab") {
        const keep = keepRef.current;
        const confirm = confirmRef.current;
        if (!keep || !confirm) return;
        // Focus wraps round the two buttons: from the last one in the Tab
        // direction (or from outside the box) back to the first.
        const first = e.shiftKey ? confirm : keep;
        const last = e.shiftKey ? keep : confirm;
        const inside = boxRef.current?.contains(document.activeElement);
        if (!inside || document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return createPortal(
    <div className="modal-overlay confirm-dialog-overlay" onClick={onKeep} data-testid="confirm-dialog-overlay">
      <div
        className="confirm-dialog theme-modern"
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="confirm-dialog__title" id={titleId}>
          {title}
        </h2>
        <p className="confirm-dialog__body" id={bodyId}>
          {body}
        </p>
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__btn confirm-dialog__btn--keep" ref={keepRef} onClick={onKeep}>
            {keepLabel}
          </button>
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--confirm"
            ref={confirmRef}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
