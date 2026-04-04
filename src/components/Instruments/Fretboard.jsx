import React, { useMemo } from "react";
import "./Fretboard.css";
import { NOTES, getAbsoluteNoteValue } from "../../core/theory";
import { calcActivePath } from "../../core/fretboardLogic";
import { FINGER_LABELS } from "../../core/fingeringLogic";

export default function Fretboard({
  instrument = "guitar",
  activeNotes = [],
  notation = "us",
  stringTuning,
  rootValue = 0,
  targetValue = -1,
  fretboardZone = "all",
  onNoteClick,
  currentlyPlayingNotes = [],
  contextualScaleAbsoluteValues = [],
  dictType = null,
  lastClickedContext = null,
  singlePlayContext = null,
  showFingering = false,
  fingeringMode = "numeric",
  fingering = null, // Format: { [stringIndex]: { [fret]: finger } }
}) {
  const numFrets = 14;
  const defaultGuitar = ["E2", "A2", "D3", "G3", "B3", "E4"];
  const defaultBass = ["E1", "A1", "D2", "G2"];
  const strings = (
    stringTuning
      ? stringTuning
      : instrument === "bass"
        ? defaultBass
        : defaultGuitar
  )
    .slice()
    .reverse();

  const getFrets = (count = numFrets) => {
    let frets = [];
    for (let i = 0; i <= count; i++) frets.push(i);
    return frets;
  };

  const isFretInZone = (fret) => {
    if (fretboardZone === "all") return true;
    if (fretboardZone === "open") return fret >= 0 && fret <= 4;
    if (fretboardZone === "mid") return fret >= 5 && fret <= 9;
    if (fretboardZone === "high") return fret >= 10 && fret <= 14;
    return true;
  };

  const getNoteNameFromValue = (val) => {
    if (val === null || val === undefined) return "";
    const noteInfo = NOTES[val % 12];
    const octave = Math.floor(val / 12) - 1;
    return `${noteInfo.us}${octave}`;
  };

  const activePath = useMemo(() => {
    return calcActivePath({
      contextualScaleAbsoluteValues,
      dictType,
      lastClickedContext,
      instrument,
      strings,
      numFrets
    });
  }, [
    contextualScaleAbsoluteValues,
    dictType,
    lastClickedContext,
    instrument,
    strings,
    numFrets,
  ]);

  const renderDots = () => {
    const fretsWithDots = [3, 5, 7, 9, 12];
    return (
      <div className="fret-dots-layer">
        {getFrets().map((fret) => (
          <div
            key={`dot-fret-${fret}`}
            className={`dot-fret-cell ${fret === 0 ? "open-string" : ""}`}
          >
            {fretsWithDots.includes(fret) &&
              (fret === 12 ? (
                <div className="double-dot-container">
                  <div className="fretboard-dot"></div>
                  <div className="fretboard-dot"></div>
                </div>
              ) : (
                <div className="fretboard-dot"></div>
              ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`fretboard-container instrument-${instrument}`}>
      <h3 style={{ color: "#ccc", marginBottom: "10px" }}>
        {instrument === "bass"
          ? "🎸 Basse (4 cordes)"
          : "🎸 Guitare (6 cordes)"}
      </h3>
      <div className="fretboard">
        {renderDots()}
        <div className="strings-layer">
          {strings.map((rawStringData, stringIndex) => {
            const openStringAbsValue = getAbsoluteNoteValue(rawStringData);
            return (
              <div key={`string-${stringIndex}`} className="string-row">
                {getFrets().map((fret) => {
                  const absoluteValue = openStringAbsValue + fret;
                  const noteValue = absoluteValue % 12;
                  const noteInfo = NOTES.at(noteValue);
                  const activeNote = activeNotes.find((n) => {
                    if (n.absoluteValue !== undefined) {
                      return n.absoluteValue === absoluteValue;
                    }
                    return n.value % 12 === noteValue;
                  });
                  const isActive = !!activeNote;
                  const isPlaying =
                    currentlyPlayingNotes.includes(absoluteValue);
                  const inZone = isFretInZone(fret);

                  const isScaleMode = dictType?.includes("scale");
                  const hasContextualScale =
                    contextualScaleAbsoluteValues &&
                    contextualScaleAbsoluteValues.length > 0;
                  const hasPath = activePath.length > 0;

                  let orderToDisplay = null;
                  let isSubtle = false;
                  let isPlayingInContext =
                    currentlyPlayingNotes.includes(absoluteValue);

                  // Fix: if a singlePlayContext is active for this instrument,
                  // restrict the highlight to the exact (string, fret) that was clicked.
                  // This prevents all occurrences of the same pitch from lighting up.
                  if (
                    isPlayingInContext &&
                    singlePlayContext !== null &&
                    singlePlayContext.instrument === instrument
                  ) {
                    isPlayingInContext =
                      singlePlayContext.stringIndex === stringIndex &&
                      singlePlayContext.fret === fret;
                  }

                  if (hasContextualScale) {
                    const ctxNote = contextualScaleAbsoluteValues.find(
                      (n) => n.absoluteValue === absoluteValue,
                    );
                    if (ctxNote) {
                      if (hasPath && isScaleMode) {
                        const inPath = activePath.find(
                          (p) =>
                            p.stringIndex === stringIndex && p.fret === fret,
                        );
                        if (inPath) {
                          orderToDisplay = ctxNote.order;
                        } else {
                          isSubtle = true;
                          isPlayingInContext = false;
                        }
                      } else {
                        orderToDisplay = ctxNote.order;
                      }
                    } else if (isActive) {
                      isSubtle = true;
                      isPlayingInContext = false;
                    }
                  } else if (isScaleMode) {
                    if (isActive) {
                      const interval = (noteValue - rootValue + 12) % 12;
                      if (interval === 0) orderToDisplay = "1";
                      else isSubtle = true;
                    }
                  } else {
                    if (isActive && activeNote.order)
                      orderToDisplay = activeNote.order;
                  }

                  let roleClass = "";
                  if (isActive) {
                    const interval = (noteValue - rootValue + 12) % 12;
                    if (noteValue === targetValue) roleClass = "role-target";
                    else if (interval === 0) roleClass = "role-root";
                    else if (interval === 3 || interval === 4)
                      roleClass = "role-third";
                    else if (interval === 7) roleClass = "role-fifth";
                    else roleClass = "role-scale";
                  }
                  return (
                    <div
                      key={`fret-${fret}`}
                      className={`fret ${fret === 0 ? "open-string" : ""}`}
                      onClick={() =>
                        onNoteClick &&
                        onNoteClick(getNoteNameFromValue(absoluteValue), {
                          instrument,
                          stringIndex,
                          fret,
                        })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <div className="string-line"></div>
                      {fret === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            left: "-30px",
                            color: "#d4c4a8",
                            fontWeight: "bold",
                            fontSize: "13px",
                            zIndex: 2,
                          }}
                        >
                          {noteInfo[notation]}
                        </div>
                      )}
                      {isActive && (
                        <div
                          className={`note-marker ${roleClass} ${isPlayingInContext ? "is-playing" : ""} ${isSubtle ? "subtle-marker" : ""} ${showFingering ? "is-fingering" : ""}`}
                          title={`${noteInfo.us} / ${noteInfo.eu}`}
                          style={{
                            opacity: inZone ? 1 : 0.25,
                            transition: "opacity 0.3s",
                          }}
                        >
                          {showFingering && fingering?.[stringIndex]?.[fret] 
                            ? (() => {
                                const raw = fingering[stringIndex][fret];
                                const labels = fingeringMode === 'anatomic' ? FINGER_LABELS.anatomic : FINGER_LABELS.numeric;
                                return labels[raw] ?? raw;
                              })()
                            : isSubtle ? "" : orderToDisplay || noteInfo[notation]
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
