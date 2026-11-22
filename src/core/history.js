// @ts-check
/**
 * VMU-227 — undo / redo for the Studio, as a pure value.
 *
 * `createHistory(initial)` makes `{ past, present, future }`; the functions
 * below return a new history (or the very same object when nothing changes).
 * No React, no clock: hooks/useStudioMode.js holds one and feeds it the
 * Studio's snapshot (style, variation, key, the four overrides).
 *
 * Two rules the Studio relies on:
 *   - a state equal BY VALUE to the present adds no step, so a change that
 *     lands back where it was (or a re-render) is not an action;
 *   - a new action empties the future, the way every editor does.
 * The past is bounded: the oldest step falls out beyond HISTORY_LIMIT.
 */

export const HISTORY_LIMIT = 50;

/**
 * @template T
 * @typedef {{ past: T[], present: T, future: T[] }} History
 */

/**
 * Structural equality for plain data (objects, arrays, numbers, strings,
 * booleans, null). `undefined` and `null` differ; key order does not matter.
 *
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function sameState(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    return a.length === b.length && a.every((item, i) => sameState(item, b[i]));
  }
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameState(a[key], b[key]));
}

/**
 * @template T
 * @param {T} initial
 * @returns {History<T>}
 */
export function createHistory(initial) {
  return { past: [], present: initial, future: [] };
}

/**
 * The present becomes `next`, the old present a step in the past, the future
 * is dropped. The same history when `next` equals the present by value.
 *
 * @template T
 * @param {History<T>} history
 * @param {T} next
 * @returns {History<T>}
 */
export function record(history, next) {
  if (sameState(history.present, next)) return history;
  const past = [...history.past, history.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [] };
}

/**
 * @template T
 * @param {History<T>} history
 * @returns {boolean}
 */
export function canUndo(history) {
  return history.past.length > 0;
}

/**
 * @template T
 * @param {History<T>} history
 * @returns {boolean}
 */
export function canRedo(history) {
  return history.future.length > 0;
}

/**
 * @template T
 * @param {History<T>} history
 * @returns {History<T>}
 */
export function undo(history) {
  if (!canUndo(history)) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

/**
 * @template T
 * @param {History<T>} history
 * @returns {History<T>}
 */
export function redo(history) {
  if (!canRedo(history)) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: rest,
  };
}
