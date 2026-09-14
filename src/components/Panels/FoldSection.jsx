import React from "react";

/**
 * VMU-112 — a collapsible instrument section.
 *
 * Replaces "Tout afficher / Mode Focus": instead of switching which
 * instruments exist in the DOM via a layout mode, every section is always
 * mounted with a header, and folding it unmounts only its content
 * (rendered conditionally, never CSS-hidden — App.css forces
 * `display: inline-flex !important` on every button under 768px, so a
 * hidden-by-CSS section would still show its button there with nothing to
 * toggle).
 *
 * Folding is presentation only: this component has no idea which
 * instrument is played (`playbackInstrument`) and never touches it — the
 * caller decides what `children` are, folding just decides whether they are
 * mounted.
 */
const FoldSection = ({
  id,
  title,
  expanded,
  onToggle,
  expandedLabel,
  collapsedLabel,
  children,
}) => {
  const contentId = `${id}-content`;

  return (
    <div
      className={`fold-section panel${expanded ? "" : " panel--collapsed"}`}
      style={{ width: "100%", marginBottom: "12px" }}
    >
      <button
        type="button"
        className="fold-section__header panel__header"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <span className="panel__title">{title}</span>
        <span className="fold-section__indicator">
          <span aria-hidden="true" className="panel__toggle">
            {expanded ? "▲" : "▼"}
          </span>
          <span className="fold-section__state-text">
            {expanded ? expandedLabel : collapsedLabel}
          </span>
        </span>
      </button>

      {expanded && (
        <div id={contentId} className="fold-section__content">
          {children}
        </div>
      )}
    </div>
  );
};

export default FoldSection;
