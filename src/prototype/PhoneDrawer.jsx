import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import "./PhoneDrawer.css";

/**
 * C-109 (phone, lot 1) — A′'s bottom sheet.
 *
 * The phone has ONE instrument on the stage; the rest of A′ (the centre
 * column) lives here, in a fixed sheet rising from the bottom. Three heights:
 *
 *   folded  150px (--phone-drawer-folded) — the transport block at the top
 *   half    55dvh
 *   full    92dvh
 *
 * The handle is the only cycle control in this lot (no drag gesture): a real
 * 44 x 22 button, folded -> half -> full, and full -> half. Escape and the
 * browser's Back button go DOWN one step. Every rise pushes one history entry
 * (`history.pushState`), every fall pops it, so Back never leaves the app while
 * the sheet is open; at folded there is no entry left and Back behaves
 * normally. A press on the stage folds the sheet outright (the parent calls
 * `fold()` through the ref): from full that pops the two entries it pushed.
 *
 * The height is owned by the parent, which remembers it per mode (Studio /
 * Dictionary) in React state; this component only reports the change and
 * keeps the history stack in step.
 */

const DRAWER_HEIGHTS = ["folded", "half", "full"];

/** The current history state as a plain object (a number/null state is possible). */
function historyState() {
  const state = typeof window !== "undefined" ? window.history.state : null;
  return state && typeof state === "object" ? state : {};
}

/**
 * How many entries this sheet has pushed to reach `height` — the heights always
 * rise one step at a time (folded -> half -> full), so the level is the depth.
 */
function depthOf(height) {
  return height === "full" ? 2 : height === "half" ? 1 : 0;
}

const PhoneDrawer = forwardRef(function PhoneDrawer(
  { height, onHeightChange, label, handleLabel, children },
  ref
) {
  // Read by the listeners below. commit() writes it at once; the effect keeps
  // it in step when the parent changes the height for another reason (a mode
  // switch, which brings that mode's remembered height back).
  const heightRef = useRef(height);
  // How many entries this sheet has pushed. The parent remembers a height per
  // mode, so a mode switch can bring half/full back with no entry behind it —
  // the reconciliation effect below pushes what is missing (and drops what is
  // left over when a folded memory comes back). Without it, a remembered half
  // would make Back leave the app.
  const depthRef = useRef(0);
  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  useEffect(() => {
    const needed = depthOf(height);
    if (depthRef.current === needed) return;
    if (depthRef.current > needed) {
      const excess = depthRef.current - needed;
      depthRef.current = needed;
      window.history.go(-excess);
      return;
    }
    // Rise one level at a time, exactly as the handle does.
    for (let level = depthRef.current; level < needed; level += 1) {
      const next = level === 0 ? "half" : "full";
      window.history.pushState({ ...historyState(), phoneDrawerHeight: next }, "");
      depthRef.current = level + 1;
    }
  }, [height]);

  const commit = useCallback(
    (next) => {
      heightRef.current = next;
      onHeightChange(next);
    },
    [onHeightChange]
  );

  const rise = useCallback(() => {
    const current = heightRef.current;
    const next = current === "folded" ? "half" : "full";
    if (next === current) return;
    window.history.pushState({ ...historyState(), phoneDrawerHeight: next }, "");
    depthRef.current = depthOf(next);
    commit(next);
  }, [commit]);

  const stepDown = useCallback(() => {
    const current = heightRef.current;
    if (current === "folded") return;
    const next = current === "full" ? "half" : "folded";
    const hadEntry = depthRef.current > 0;
    depthRef.current = depthOf(next);
    // The sheet moves at once; the entry pops behind it and the popstate
    // listener lands on the same height.
    commit(next);
    if (hadEntry) window.history.back();
  }, [commit]);

  const fold = useCallback(() => {
    if (heightRef.current === "folded") return;
    // Full was reached through half: two entries to pop. Half: one.
    const depth = depthRef.current;
    depthRef.current = 0;
    commit("folded");
    if (depth > 0) window.history.go(-depth);
  }, [commit]);

  useImperativeHandle(ref, () => ({ fold }), [fold]);

  const onHandleClick = useCallback(() => {
    if (heightRef.current === "full") stepDown();
    else rise();
  }, [rise, stepDown]);

  // Escape goes down one step — unless the key is meant for something on top
  // (a typed tempo, an open list, a real window), which owns Escape itself.
  useEffect(() => {
    if (height === "folded") return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      const target = e.target;
      const typing =
        "textarea, select, [contenteditable='true'], input[type='number'], input[type='text'], input:not([type])";
      if (target && typeof target.closest === "function" && target.closest(typing)) return;
      if (document.querySelector(".custom-select-container.is-open")) return;
      // A window or a menu on top owns Escape first.
      if (document.querySelector(".modal-container, .help-modal-overlay, .theory-modal-content, .proto-a__help-panel")) return;
      stepDown();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [height, stepDown]);

  // The browser's Back button (and every history.popState of our own falls).
  // The entry we pushed names the sheet's height; the app's original entry has
  // no such name and means folded.
  useEffect(() => {
    const onPopState = (e) => {
      const named = e.state && e.state.phoneDrawerHeight;
      const next = DRAWER_HEIGHTS.includes(named) ? named : "folded";
      depthRef.current = depthOf(next);
      commit(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [commit]);

  return (
    <section
      className="phone-drawer"
      data-s1="phone-drawer"
      data-drawer-height={height}
      role="region"
      aria-label={label}
    >
      <button
        type="button"
        className="phone-drawer__handle"
        aria-label={handleLabel}
        aria-expanded={height !== "folded"}
        data-fn="nav.tiroir-poignee"
        onClick={onHandleClick}
      >
        <span className="phone-drawer__grip" aria-hidden="true" />
      </button>
      <div className="phone-drawer__body">{children}</div>
    </section>
  );
});

export default PhoneDrawer;
