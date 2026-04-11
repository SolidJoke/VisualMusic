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

  // Compute barre positions: frets where finger 1 covers 2+ consecutive strings
  const barreData = useMemo(() => {
    if (!fingering || !showFingering) return [];
    const isScaleMode = dictType?.includes('scale');
    if (isScaleMode) return [];

    // fingering format: { [stringIndex]: { [fret]: finger } }
    // strings is reversed (high E = index 0, low E = index last)
    // We need to find frets where finger=1 on multiple strings
    const fretFingerOneStrings = {}; // { fret: [stringIndex, ...] }

    Object.entries(fingering).forEach(([strIdxStr, fretMap]) => {
      const strIdx = parseInt(strIdxStr, 10);
      Object.entries(fretMap).forEach(([fretStr, finger]) => {
        const fret = parseInt(fretStr, 10);
        if (fret > 0 && finger === 1) {
          if (!fretFingerOneStrings[fret]) fretFingerOneStrings[fret] = [];
          fretFingerOneStrings[fret].push(strIdx);
        }
      });
    });

    const barres = [];
    Object.entries(fretFingerOneStrings).forEach(([fretStr, strIndices]) => {
      if (strIndices.length >= 2) {
        barres.push({
          fret: parseInt(fretStr, 10),
          minString: Math.min(...strIndices),
          maxString: Math.max(...strIndices),
          count: strIndices.length,
        });
      }
    });
    return barres;
  }, [fingering, showFingering, dictType]);

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

  // Render barre indicators — vertical pill connecting strings fretted by finger 1
  // Uses CSS absolute positioning relative to .fretboard
  const renderBarres = () => {
    if (barreData.length === 0) return null;
    const numStrings = strings.length;
    const STRING_HEIGHT = 35; // matches .string-row height in CSS
    const FRETBOARD_PADDING = 10; // matches padding-top in .fretboard
    const OPEN_STRING_FLEX = 0.5;
    // Each fret takes flex:1, open string takes flex:0.5
    // We approximate fret width as 100% / (numFrets + 0.5) per fret
    // Position = (fret - 0.5) / (numFrets + 0.5) so it's centered in the fret cell
    const totalFlex = numFrets + OPEN_STRING_FLEX;

    return barreData.map(({ fret, minString, maxString }) => {
      const leftPct = ((fret - 0.5 + OPEN_STRING_FLEX) / totalFlex) * 100;
      const widthPct = (0.7 / totalFlex) * 100; // pill width

      // strings array is reversed: index 0 = high E, last = low E
      // minString/maxString are original stringIndex (0=high E in reversed array)
      const topPx = FRETBOARD_PADDING + minString * STRING_HEIGHT + STRING_HEIGHT * 0.2;
      const heightPx = (maxString - minString) * STRING_HEIGHT + STRING_HEIGHT * 0.6;

      return (
        <div
          key={`barre-f${fret}`}
          title={`Barré (doigt 1) à la case ${fret}`}
          style={{
            position: 'absolute',
            left: `${leftPct}%`,
            top: `${topPx}px`,
            width: `${widthPct}%`,
            minWidth: '18px',
            height: `${heightPx}px`,
            backgroundColor: 'rgba(96, 165, 250, 0.35)',
            border: '2px solid rgba(96, 165, 250, 0.8)',
            borderRadius: '12px',
            zIndex: 3,
            pointerEvents: 'none',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 8px rgba(96, 165, 250, 0.4)',
          }}
        />
      );
    });
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
        {renderBarres()}
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
                  let isActive = !!activeNote;
                  const isPlaying =
                    currentlyPlayingNotes.includes(absoluteValue);
                  const inZone = isFretInZone(fret);

                  const isScaleMode = dictType?.includes("scale");
                  const hasContextualScale =
                    contextualScaleAbsoluteValues &&
                    contextualScaleAbsoluteValues.length > 0;
                  const hasPath = activePath.length > 0;

                  // Only apply voicing masking when in chord (not scale) mode
                  const isGuitarFingeringActive = showFingering && instrument === "guitar" && fingering && !isScaleMode;

                  if (isGuitarFingeringActive) {
                    const fingerAtLocation = fingering[stringIndex]?.[fret];
                    const isFingeredNode = fingerAtLocation && fingerAtLocation !== 'X' && fingerAtLocation !== 'O';
                    const isOpenAndTargeted = fret === 0 && fingerAtLocation === 'O';
                    const isPartOfVoicing = isFingeredNode || isOpenAndTargeted;
                    
                    if (!isPartOfVoicing) {
                      isActive = false;
                    }
                  }

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
                            left: "-35px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            zIndex: 2,
                          }}
                        >
                          <span style={{ color: "#d4c4a8", fontWeight: "bold", fontSize: "13px" }}>
                            {noteInfo[notation]}
                          </span>
                          {isGuitarFingeringActive && (() => {
                             const stringFingering = fingering?.[stringIndex] || {};
                             const hasX = Object.values(stringFingering).includes('X');
                             const hasO = stringFingering[0] === 'O';
                             if (hasX) return <span style={{ color: "#e74c3c", fontWeight: "bold", fontSize: "14px" }}>X</span>;
                             if (hasO) return <span style={{ color: "#2ecc71", fontWeight: "bold", fontSize: "14px" }}>O</span>;
                             return null;
                          })()}
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
                          {showFingering && !isScaleMode && fingering?.[stringIndex]?.[fret] 
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
