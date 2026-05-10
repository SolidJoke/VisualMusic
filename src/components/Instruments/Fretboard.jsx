import React, { useMemo, useRef } from "react";
import "./Fretboard.css";
import { NOTES, getAbsoluteNoteValue } from "../../core/theory";
import { calcActivePath } from "../../core/fretboardLogic";
import { computeFretMetadata, getFretWidths } from "../../core/fretboardUtils";

const STRING_HEIGHT = 35;

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
  scaleAnchor = null,
}) {
  const numFrets = 22;
  const fretboardRef = useRef(null);
  
  const strings = useMemo(() => {
    const defaultGuitar = ["E2", "A2", "D3", "G3", "B3", "E4"];
    const defaultBass = ["E1", "A1", "D2", "G2"];
    return (
      stringTuning
        ? stringTuning
        : instrument === "bass"
          ? defaultBass
          : defaultGuitar
    ).slice().reverse();
  }, [stringTuning, instrument]);

  const fretWidths = useMemo(() => getFretWidths(numFrets), [numFrets]);

  const fretboardGridTemplate = useMemo(() => {
    let cols = ["minmax(40px, 0.5fr)"]; 
    fretWidths.forEach(w => cols.push(`${w.toFixed(4)}fr`));
    return cols.join(" ");
  }, [fretWidths]);

  // Helper for barre positioning - estimates X based on DOM if available, else fractions
  const getFretX = (fretIndex) => {
    if (!fretboardRef.current) return 0;
    const fretElements = fretboardRef.current.querySelectorAll(".dot-fret-cell");
    if (fretElements[fretIndex]) {
      return fretElements[fretIndex].offsetLeft;
    }
    return 0;
  };

  const getFretWidth = (fretIndex) => {
    if (!fretboardRef.current) return 0;
    const fretElements = fretboardRef.current.querySelectorAll(".dot-fret-cell");
    if (fretElements[fretIndex]) {
      return fretElements[fretIndex].offsetWidth;
    }
    return 0;
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
  }, [contextualScaleAbsoluteValues, dictType, lastClickedContext, instrument, strings, numFrets]);

  const barreData = useMemo(() => {
    const actualMap = fingering?.fingeringMap || fingering;
    if (!actualMap || !showFingering || dictType?.includes('scale')) return [];

    const numStrings = strings.length;
    const fretFingerOneVisual = {}; 

    Object.entries(actualMap).forEach(([strIdxStr, fretMap]) => {
      const visualIdx = (numStrings - 1) - parseInt(strIdxStr, 10);
      if (!fretMap) return;
      Object.entries(fretMap).forEach(([fretStr, finger]) => {
        const fret = parseInt(fretStr, 10);
        if (fret > 0 && finger === 1) {
          if (!fretFingerOneVisual[fret]) fretFingerOneVisual[fret] = [];
          fretFingerOneVisual[fret].push(visualIdx);
        }
      });
    });

    return Object.entries(fretFingerOneVisual)
      .filter(([_, indices]) => indices.length >= 2)
      .map(([fret, indices]) => ({
        fret: parseInt(fret, 10),
        minVisual: Math.min(...indices),
        maxVisual: Math.max(...indices),
      }));
  }, [fingering, showFingering, dictType, strings]);

  const renderDots = () => {
    const fretsWithDots = [3, 5, 7, 9, 12, 15, 17, 19, 21];
    return (
      <div className="fret-dots-layer">
        {Array.from({ length: numFrets + 1 }).map((_, fret) => (
          <div
            key={`dot-fret-${fret}`}
            className={`dot-fret-cell ${fret === 0 ? "open-string" : ""}`}
          >
            {fretsWithDots.includes(fret) && (
              fret === 12 ? (
                <div className="double-dot-container">
                  <div className="fretboard-dot"></div>
                  <div className="fretboard-dot"></div>
                </div>
              ) : <div className="fretboard-dot"></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBarres = () => {
    if (barreData.length === 0) return null;

    return barreData.map((b, idx) => {
      return (
        <div
          key={`barre-${idx}`}
          className="fretboard-barre-indicator"
          style={{
            gridColumn: b.fret + 1,
            gridRow: "1 / -1",
            marginTop: `${b.minVisual * STRING_HEIGHT + STRING_HEIGHT * 0.15}px`,
            height: `${(b.maxVisual - b.minVisual) * STRING_HEIGHT + STRING_HEIGHT * 0.7}px`,
          }}
        />
      );
    });
  };

  return (
    <div 
      className={`fretboard-container instrument-${instrument} ${fingering?.isOutOfRange ? "is-out-of-range" : ""}`}
      style={{ "--fretboard-grid": fretboardGridTemplate }}
      title={fingering?.isOutOfRange ? "⚠️ Accord hors tessiture instrument" : ""}
    >
      <h3 style={{ color: "#ccc", marginBottom: "10px" }}>
        {instrument === "bass" ? "🎸 Basse (4 cordes)" : "🎸 Guitare (6 cordes)"}
      </h3>
      <div className="fretboard" ref={fretboardRef}>
        {renderDots()}
        {renderBarres()}
        <div className="strings-layer">
          {strings.map((rawStringData, stringIndex) => {
            const openStringAbsValue = getAbsoluteNoteValue(rawStringData);
            return (
              <div key={`string-${stringIndex}`} className="string-row">
                {Array.from({ length: numFrets + 1 }).map((_, fret) => {
                  const meta = computeFretMetadata({
                    stringIndex, fret, openStringAbsValue, activeNotes, 
                    currentlyPlayingNotes, contextualScaleAbsoluteValues,
                    activePath, dictType, fingering, instrument,
                    rootValue, targetValue, showFingering, fingeringMode,
                    singlePlayContext, notation, scaleAnchor
                  });

                  const inZone = fretboardZone === "all" || 
                    (fretboardZone === "open" && fret <= 4) ||
                    (fretboardZone === "mid" && fret >= 5 && fret <= 9) ||
                    (fretboardZone === "high" && fret >= 10 && fret <= 14);

                  return (
                    <div
                      key={`fret-${fret}`}
                      className={`fret ${fret === 0 ? "open-string" : ""}`}
                      onClick={() => onNoteClick && onNoteClick(`${meta.noteInfo.us}${Math.floor(meta.absoluteValue / 12) - 1}`, {
                        instrument, stringIndex, fret
                      })}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="string-line"></div>
                      {fret === 0 && (
                        <div className="open-string-label-container">
                          <span className="open-string-name">{meta.noteName}</span>
                           {(meta.isNoteOpen || meta.isPlaying) && (
                             <span className={`note-marker ${meta.roleClass} ${meta.isPlaying ? "is-playing" : ""} open-marker`}>
                               {meta.label}
                             </span>
                           )}
                          {(() => {
                             const actualMap = fingering?.fingeringMap || (fingering && !fingering.isScaleBox ? fingering : null) || {};
                             const stringFingering = actualMap[stringIndex] || {};
                             if (stringFingering['X'] === true) return <span className="mute-x">X</span>;
                             if (stringFingering[0] === 'O') return <span className="open-o">O</span>;
                             return null;
                          })()}
                        </div>
                      )}
                      {(meta.isActive || meta.isPlaying) && !meta.isNoteOpen && (
                        <div
                          className={`note-marker ${meta.roleClass} ${meta.isPlaying ? "is-playing" : ""} ${meta.isSubtle && !meta.isPlaying ? "subtle-marker" : ""} ${showFingering ? "is-fingering" : ""}`}
                          title={`${meta.noteInfo.us} / ${meta.noteInfo.eu}`}
                          style={{
                            opacity: inZone ? 1 : 0.25,
                            transition: "opacity 0.3s",
                          }}
                        >
                          {meta.label}
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
