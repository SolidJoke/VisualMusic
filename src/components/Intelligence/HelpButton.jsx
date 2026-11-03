import React, { useEffect, useId, useState } from "react";

/**
 * The discreet "?" that unfolds a beginner sentence under its label
 * (VMU-195-B fix 2). Click, Enter or Space toggles it; a second click folds
 * it. Escape is taken in the capture phase while it is open, so it folds
 * before the window's own Escape (bubble phase) closes the window. The label
 * keeps its `title` tooltip for mice that only hover.
 *
 * Unlike SectionTitle, this renders only the button and its sentence, so it
 * can sit inline (the phrase's − / + groups, the footer). The caller places it
 * where the sentence must appear.
 */
export default function HelpButton({ id, name, help, helpLabel }) {
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
      {open && (
        <p id={textId} role="note" className="help-text" data-testid={`comp-help-text-${id}`}>
          {help}
        </p>
      )}
    </>
  );
}
