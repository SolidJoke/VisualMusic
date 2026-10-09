import { useEffect, useRef, useState } from "react";

/**
 * Typing the tempo (VMU-181): a click on the number opens a number field,
 * Enter commits, Escape cancels, and only a whole number within [min, max]
 * reaches `onCommit` (anything else leaves the tempo as it was).
 *
 * The classic sidebar's BPM badge (components/Layout/Sidebar.jsx) has done
 * this since before A′; A′'s transport (prototype/PrototypeA.jsx) needs the
 * very same behaviour, so the logic lives here once and each caller keeps its
 * own markup — the sidebar's DOM is unchanged.
 *
 * The field opens on the current tempo, read when it opens (no copy of the
 * tempo kept in step with it). A blur commits, like Enter; once Enter or
 * Escape has closed the field, a late blur of the unmounting input does
 * nothing (Escape must not commit what was typed).
 *
 * @param {Object} options
 * @param {number} options.currentBpm  the tempo shown
 * @param {(bpm: number) => void} options.onCommit  receives the new tempo as a number
 * @param {number} [options.min]
 * @param {number} [options.max]
 */
export function useBpmEditor({ currentBpm, onCommit, min = 60, max = 200 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const closedRef = useRef(true);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const start = () => {
    if (editing) return;
    closedRef.current = false;
    setDraft(String(currentBpm));
    setEditing(true);
  };

  const commit = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    setEditing(false);
    const num = parseInt(draft, 10);
    if (!Number.isNaN(num) && num >= min && num <= max) onCommit(num);
  };

  const cancel = () => {
    closedRef.current = true;
    setEditing(false);
  };

  return {
    editing,
    start,
    inputProps: {
      ref: inputRef,
      type: "number",
      min: String(min),
      max: String(max),
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
      },
      onClick: (e) => e.stopPropagation(),
    },
  };
}

export default useBpmEditor;
