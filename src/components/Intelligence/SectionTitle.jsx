import React, { useEffect, useId, useState } from "react";

/**
 * A title with, when `help` is given, a small "?" that unfolds one or two
 * sentences under it (VMU-195-A). On click, not on hover (VMU-151): a second
 * click or Escape folds it. Escape is taken in the capture phase while a help
 * is open, so it folds the help first and the window's own Escape (which
 * closes it) only fires on the next press.
 *
 * `id` names the test hooks (comp-help-<id>); `name` (plain text) names the
 * button for screen readers; `Tag` is the title's element; what follows the
 * title (a value display, say) goes in `extra`.
 */
export default function SectionTitle({ id, name, Tag = "label", htmlFor, className = "section-label", help, helpLabel, extra = null, children }) {
  const [open, setOpen] = useState(false);
  const textId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <>
      <div className="section-head">
        <Tag className={className} htmlFor={Tag === "label" ? htmlFor : undefined}>{children}</Tag>
        {help && (
          <button
            type="button"
            className="help-btn"
            data-testid={`comp-help-${id}`}
            aria-expanded={open}
            aria-controls={open ? textId : undefined}
            aria-label={`${helpLabel || "Help"} : ${name || id}`}
            onClick={() => setOpen((v) => !v)}
          >
            ?
          </button>
        )}
        {extra}
      </div>
      {help && open && (
        <p id={textId} role="note" className="help-text" data-testid={`comp-help-text-${id}`}>
          {help}
        </p>
      )}
    </>
  );
}
