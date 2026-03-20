import React from "react";
import "./PianoKeyboard.css";
import { NOTES, getAbsoluteNoteValue } from "../../core/theory";

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [1, 3, 6, 8, 10];
const WHITE_KEY_WIDTH = 50;

const FLAT_EQUIVALENTS = {
  1: { us: "Db", eu: "Réb" },
  3: { us: "Eb", eu: "Mib" },
  6: { us: "Gb", eu: "Solb" },
  8: { us: "Ab", eu: "Lab" },
  10: { us: "Bb", eu: "Sib" },
};

export default function PianoKeyboard({
  activeNotes = [],
  numOctaves = 3,
  notation = "us",
  rootValue = 0,
  targetValue = -1,
  onNoteClick,
  currentlyPlayingNotes = [],
  contextualScaleAbsoluteValues = [],
  dictType = null,
}) {
  const [showExplanations, setShowExplanations] = React.useState(false);
  const keys = [];

  const renderKeyLabel = (
    i,
    isActive,
    activeNote,
    isBlack,
    orderToDisplay,
    isSubtle,
  ) => {
    const noteInfo = NOTES.at(i);
    let labelContent = <span>{noteInfo[notation]}</span>;
    const flatEq = FLAT_EQUIVALENTS[i];

    if (isBlack && flatEq) {
      labelContent = (
        <>
          <span>{noteInfo[notation]}</span>
          <span className="flat-label">{flatEq[notation]}</span>
        </>
      );
    }

    if (orderToDisplay) {
      labelContent = (
        <>
          {labelContent}
          <span className="note-order">({orderToDisplay})</span>
        </>
      );
    } else if (isSubtle) {
      // Do not show order, just basic label as defined above
    }
    return labelContent;
  };

  const getKeyRoleClass = (i, isActive) => {
    if (!isActive) return "";
    const interval = (i - rootValue + 12) % 12;
    if (i === targetValue) return "role-target";
    if (interval === 0) return "role-root";
    if (interval === 3 || interval === 4) return "role-third";
    if (interval === 7) return "role-fifth";
    return "role-scale";
  };

  for (let octave = 0; octave < numOctaves; octave++) {
    for (let i = 0; i < 12; i++) {
      const noteInfo = NOTES.at(i);
      const isBlack = BLACK_KEYS.includes(i);
      const noteName = `${noteInfo.us}${octave + 2}`; // Start piano at octave 2
      const absoluteValue = getAbsoluteNoteValue(noteName);

      const activeNote = activeNotes.find((n) => {
        if (n.absoluteValue !== undefined) {
          return n.absoluteValue === absoluteValue;
        }
        return n.value % 12 === i % 12;
      });
      const isActive = !!activeNote;
      const isPlaying = currentlyPlayingNotes.includes(absoluteValue);

      const isScaleMode = dictType?.includes("scale");
      const hasContextualScale =
        contextualScaleAbsoluteValues &&
        contextualScaleAbsoluteValues.length > 0;

      let orderToDisplay = null;
      let isSubtle = false;

      if (hasContextualScale) {
        const ctxNote = contextualScaleAbsoluteValues.find(
          (n) => n.absoluteValue === absoluteValue,
        );
        if (ctxNote) {
          orderToDisplay = ctxNote.order;
        } else if (isActive) {
          isSubtle = true;
        }
      } else if (isScaleMode) {
        if (isActive) {
          const interval = (i - rootValue + 12) % 12;
          if (interval === 0) orderToDisplay = "1";
          else isSubtle = true;
        }
      } else {
        if (isActive && activeNote.order) orderToDisplay = activeNote.order;
      }

      const roleClass = getKeyRoleClass(i, isActive);
      const subtleClass = isSubtle ? "subtle-highlight" : "";

      if (isBlack) {
        // Render a 0-width wrapper that sits cleanly between the two adjacent white keys
        keys.push(
          <div
            key={`octave-${octave}-note-${i}-wrapper`}
            className="black-key-wrapper"
          >
            <div
              className={`piano-key black-key ${roleClass} ${subtleClass} ${isPlaying ? "is-playing" : ""}`}
              title={`${noteInfo.us} / ${noteInfo.eu}`}
              onClick={() =>
                onNoteClick && onNoteClick(noteName, { instrument: "piano" })
              }
            >
              <div className="note-label">
                {renderKeyLabel(
                  i,
                  isActive,
                  activeNote,
                  true,
                  orderToDisplay,
                  isSubtle,
                )}
              </div>
            </div>
          </div>,
        );
      } else {
        keys.push(
          <div
            key={`octave-${octave}-note-${i}`}
            className={`piano-key white-key ${roleClass} ${subtleClass} ${isPlaying ? "is-playing" : ""}`}
            title={`${noteInfo.us} / ${noteInfo.eu}`}
            onClick={() => onNoteClick && onNoteClick(noteName)}
          >
            <div className="note-label">
              {renderKeyLabel(
                i,
                isActive,
                activeNote,
                false,
                orderToDisplay,
                isSubtle,
              )}
            </div>
          </div>,
        );
      }
    }
  }

  return (
    <div className="piano-wrapper">
      {activeNotes.some((n) => n.order) && (
        <div className="explanations-toggle-container">
          <button
            className="toggle-explanations-btn"
            onClick={() => setShowExplanations(!showExplanations)}
          >
            {showExplanations
              ? "Masquer les explications"
              : "Que signifient les nombres ?"}
          </button>
          {showExplanations && (
            <div className="numbers-explanation">
              Les nombres affichés avec les notes correspondent à leur rôle ou
              degré dans l'accord/la gamme.
              <br />
              Par exemple, (1) est la fondamentale (racine), (3) la tierce, (5)
              la quinte, etc.
            </div>
          )}
        </div>
      )}
      <div
        className="piano-container-wrapper"
        style={{ maxWidth: "100%", overflowX: "auto" }}
      >
        <div className="piano-container" style={{ width: "fit-content" }}>
          {keys}
        </div>
      </div>
    </div>
  );
}
