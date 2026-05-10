import React from "react";
import "./PianoKeyboard.css";
import { NOTES, getAbsoluteNoteValue } from "../../core/theory";
import { getHarmonicSeries } from "../../core/acousticEngine";
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
  numOctaves = 7,
  notation = "us",
  rootValue = 0,
  targetValue = -1,
  onNoteClick,
  currentlyPlayingNotes = [],
  contextualScaleAbsoluteValues = [],
  dictType = null,
  lang = "fr",
  txt = {},
  harmonicMode = false
}) {
  const keys = [];

  const harmonicSeries = React.useMemo(() => {
    if (!harmonicMode) return [];
    const midi = Number(rootValue) + 48;
    const baseFreq = 440 * Math.pow(2, (midi - 69) / 12);
    return getHarmonicSeries(baseFreq, 32);
  }, [harmonicMode, rootValue]);

  const harmonicMap = React.useMemo(() => {
    const map = {};
    harmonicSeries.forEach((h) => {
      const midiFloat = 69 + 12 * Math.log2(h.frequency / 440);
      const pc = Math.round(midiFloat) % 12;
      // h contains { order, frequency, noteName, centsOffset }
      // We keep the lowest order (rank) for each pitch class
      if (!map[pc] || h.order < map[pc].rank) {
        map[pc] = {
          rank: h.order,
          deviationCents: h.centsOffset,
        };
      }
    });
    return map;
  }, [harmonicSeries]);

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

    if (harmonicMode && harmonicMap[i]) {
      const { rank, deviationCents } = harmonicMap[i];
      const sign = deviationCents > 0 ? "+" : "";
      const devStr = Math.round(deviationCents) === 0 ? "0" : `${sign}${Math.round(deviationCents)}`;
      
      labelContent = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.2 }}>
          <span>{noteInfo[notation]}</span>
          <span style={{ fontSize: "10px", color: "#ffb74d", fontWeight: "bold" }}>H{rank}</span>
          <span style={{ fontSize: "9px", color: "#90caf9" }}>{devStr}¢</span>
        </div>
      );
    }

    return labelContent;
  };

  const getKeyRoleClass = (i, isActive, activeNote) => {
    if (!isActive) return "";
    if (i === targetValue) return "role-target";
    
    // Use the explicitly passed order if available (favors clicked chord roles)
    // If order is provided (e.g. 1, 3, 5), map to role classes
    const order = activeNote?.order !== undefined ? String(activeNote.order) : null;
    if (order) {
      if (order === "1") return "role-root";
      if (order === "3") return "role-third";
      if (order === "5") return "role-fifth";
      return "role-extension";
    }
    const interval = (i - rootValue + 12) % 12;
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
        // In Dictionary Mode or if no absolute pitch provided,
        // we restrict display to a single central octave (Octave 4) to avoid clutter.
        // Octave 4 is index 2 in our 0-indexed octave loop (starting at C2).
        return (n.value % 12 === i % 12) && (octave === 2);
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
              className={`piano-key black-key ${getKeyRoleClass(i, isActive, activeNote)} ${subtleClass} ${isPlaying ? "is-playing" : ""}`}
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
            className={`piano-key white-key ${getKeyRoleClass(i, isActive, activeNote)} ${subtleClass} ${isPlaying ? "is-playing" : ""}`}
            title={`${noteInfo.us} / ${noteInfo.eu}`}
            onClick={() => onNoteClick && onNoteClick(noteName, { instrument: "piano" })}
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
