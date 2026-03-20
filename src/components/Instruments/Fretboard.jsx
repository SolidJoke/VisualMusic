import React, { useMemo } from "react";
import "./Fretboard.css";
import { NOTES, getAbsoluteNoteValue } from "../../core/theory";

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
    if (
      !contextualScaleAbsoluteValues ||
      contextualScaleAbsoluteValues.length === 0
    )
      return [];
    if (!dictType?.includes("scale")) return [];
    if (!lastClickedContext) return [];

    let startFret = 5;
    let currentString = 0;

    if (lastClickedContext.instrument === instrument) {
      startFret = lastClickedContext.fret;
      currentString = lastClickedContext.stringIndex;
    } else {
      const rootAbs = contextualScaleAbsoluteValues[0].absoluteValue;
      let bestStart = null;
      let minStartCost = Infinity;
      strings.forEach((rawStringData, sIdx) => {
        const f = rootAbs - getAbsoluteNoteValue(rawStringData);
        if (f >= 0 && f <= numFrets) {
          const cost = Math.abs(f - 5);
          if (cost < minStartCost) {
            minStartCost = cost;
            bestStart = { stringIndex: sIdx, fret: f };
          }
        }
      });
      if (bestStart) {
        startFret = bestStart.fret;
        currentString = bestStart.stringIndex;
      } else {
        return [];
      }
    }

    const path = [];
    path.push({
      stringIndex: currentString,
      fret: startFret,
      absoluteValue: contextualScaleAbsoluteValues[0].absoluteValue,
    });

    for (let i = 1; i < contextualScaleAbsoluteValues.length; i++) {
      const targetAbs = contextualScaleAbsoluteValues[i].absoluteValue;
      let best = null;
      let minCost = Infinity;

      strings.forEach((rawStringData, sIdx) => {
        const openStringAbsValue = getAbsoluteNoteValue(rawStringData);
        const f = targetAbs - openStringAbsValue;
        if (f >= 0 && f <= numFrets) {
          const fretJump = Math.abs(f - startFret);
          const stringDiff = Math.abs(sIdx - currentString);

          let cost = fretJump * 10 + stringDiff * 2;
          if (sIdx > currentString) cost += 50;

          if (cost < minCost) {
            minCost = cost;
            best = { stringIndex: sIdx, fret: f, absoluteValue: targetAbs };
          }
        }
      });

      if (best) {
        path.push(best);
        currentString = best.stringIndex;
      }
    }
    return path;
  }, [
    contextualScaleAbsoluteValues,
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
    <div className="fretboard-container">
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
                          className={`note-marker ${roleClass} ${isPlayingInContext ? "is-playing" : ""} ${isSubtle ? "subtle-marker" : ""}`}
                          title={`${noteInfo.us} / ${noteInfo.eu}`}
                          style={{
                            opacity: inZone ? 1 : 0.25,
                            transition: "opacity 0.3s",
                          }}
                        >
                          {isSubtle ? "" : orderToDisplay || noteInfo[notation]}
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
