import React from "react";
import "./Fretboard.css";
import { getAbsoluteNoteValue } from "../../core/theory";
import { computeFretMetadata } from "../../core/fretboardUtils";
import { useFretboard } from "../../hooks/useFretboard";
import { useMediaQuery, useLandscapeMode } from "../../hooks/useMediaQuery";

const STRING_HEIGHT = typeof window !== 'undefined' ? Math.max(20, Math.min(35, window.innerHeight * 0.04)) : 35;

function Fretboard({
  instrument = "guitar"
}) {
  const {
    strings,
    fretboardGridTemplate,
    activePath,
    barreData,
    numFrets,
    activeNotes,
    fingering,
    isOutOfRange,
    dictType,
    notation,
    rootValue,
    targetValue,
    fretboardZone,
    onNoteClick,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    singlePlayContext,
    showFingering,
    fingeringMode,
    scaleAnchor,
    highlightTargetNotes,
    appMode,
  } = useFretboard(instrument);

  const isMobile = useMediaQuery('(max-width: 767px)');
  const isLandscape = useLandscapeMode();

  const visibleFretCount = isMobile || isLandscape ? 7 : 12;

  const [fretOffset, setFretOffset] = React.useState(0);

  // Auto-positionnement
  React.useEffect(() => {
    if (!activeNotes || activeNotes.length === 0) return;

    const activeFrets = activeNotes
      .filter(n => n.fret > 0)
      .map(n => n.fret);

    if (activeFrets.length === 0) {
      setFretOffset(0);
      return;
    }

    const minActiveFret = Math.min(...activeFrets);
    const maxActiveFret = Math.max(...activeFrets);

    const centerFret = Math.floor((minActiveFret + maxActiveFret) / 2);
    const idealOffset = Math.max(0, centerFret - Math.floor(visibleFretCount / 2));
    const maxOffset = Math.max(0, numFrets - visibleFretCount);

    setFretOffset(Math.min(idealOffset, maxOffset));
  }, [activeNotes, visibleFretCount, numFrets]);

  const handlePrev = () => setFretOffset(o => Math.max(0, o - 3));
  const handleNext = () => setFretOffset(o => Math.min(numFrets - visibleFretCount, o + 3));

  const firstVisibleFret = fretOffset + 1; // fret 0 is handled separately
  const lastVisibleFret = fretOffset + visibleFretCount;
  const maxOffset = Math.max(0, numFrets - visibleFretCount);
  const canGoPrev = fretOffset > 0;
  const canGoNext = fretOffset < maxOffset;

  // Calculate a truncated grid template
  const gridTemplateCols = fretboardGridTemplate.split(" ");
  const activeGridTemplate = gridTemplateCols.slice(0, visibleFretCount + 1).join(" ");

  const renderDots = () => {
    const fretsWithDots = [3, 5, 7, 9, 12, 15, 17, 19, 21];
    return (
      <div className="fret-dots-layer">
        {/* Open string dot placeholder */}
        <div className="dot-fret-cell open-string"></div>
        {Array.from({ length: visibleFretCount }).map((_, i) => {
          const fret = firstVisibleFret + i;
          return (
          <div
            key={`dot-fret-${fret}`}
            className={`dot-fret-cell`}
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
        )})}
      </div>
    );
  };

  const renderStatusRow = () => {
    // BUG-08 fix: position:absolute overlay instead of grid child.
    // .fretboard is position:relative, not display:grid — gridColumn/gridRow were ignored,
    // causing the status div to push content down and misalign O/X markers.
    const actualMap = fingering?.fingeringMap || fingering;
    if (!actualMap) return null;

    return (
      <div
        className="fretboard-status-row"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "minmax(40px, 0.5fr)", // matches first grid column
          height: "100%",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        {strings.map((_, stringIndex) => {
          const stringData = actualMap[stringIndex];
          let status = "";
          let statusClass = "";
          if (stringData?.status === 'muted') { status = "X"; statusClass = "is-muted"; }
          else if (stringData?.status === 'played' && stringData.fret === 0) { status = "O"; statusClass = "is-open"; }
          else if (stringData?.status === 'played' && stringData.fret > 0) { status = ""; }
          else if (stringData?.status === 'muffled') { status = "M"; statusClass = "is-muffled"; }

          return (
            <div
              key={`status-symbol-${stringIndex}`}
              className={`string-status-symbol ${statusClass}`}
              style={{ height: STRING_HEIGHT }}
            >
              {status}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBarres = () => {
    if (barreData.length === 0) return null;

    // Enforce single-fret barre: take only the first one found
    const b = barreData[0];

    // Only render barre if it's within the visible viewport
    if (b.fret < firstVisibleFret || b.fret > lastVisibleFret) return null;

    // Calculate relative grid column (0.5fr is col 1, fret firstVisibleFret is col 2, etc.)
    const relativeGridCol = b.fret - firstVisibleFret + 2;

    return (
      <div
        key={`barre-wrapper-${b.fret}`}
        style={{
          gridColumn: relativeGridCol,
          gridRow: "1 / -1",
          position: "relative",
          pointerEvents: "none",
          zIndex: 1.5,
          height: "100%"
        }}
      >
        <div
          className="fretboard-barre-indicator"
          style={{
            marginTop: `${b.minVisual * STRING_HEIGHT + STRING_HEIGHT * 0.15}px`,
            height: `${(b.maxVisual - b.minVisual) * STRING_HEIGHT + STRING_HEIGHT * 0.7}px`,
          }}
        />
      </div>
    );
  };

  return (
    <div
      className={`fretboard-container instrument-${instrument} ${(fingering?.isOutOfRange || isOutOfRange) ? "is-out-of-range" : ""}`}
      style={{ "--fretboard-grid": activeGridTemplate }}
      title={fingering?.isOutOfRange ? "⚠️ Accord hors tessiture instrument" : ""}
    >
      <h3 style={{ color: "#ccc", marginBottom: "10px" }}>
        {instrument === "bass" ? "🎸 Basse (4 cordes)" : "🎸 Guitare (6 cordes)"}
      </h3>
      <div className="fretboard-wrapper">
        {numFrets > visibleFretCount && (
          <div className="fretboard-navigator">
            <button
              className="fret-nav-btn"
              onClick={handlePrev}
              disabled={!canGoPrev}
              aria-label="Frettes précédentes"
            >
              ‹
            </button>
            <span className="fret-range-label">Frettes {firstVisibleFret}–{lastVisibleFret}</span>
            <button
              className="fret-nav-btn"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Frettes suivantes"
            >
              ›
            </button>
            {/* Dots position indicator */}
            <div className="fret-position-dots">
              {Array.from({ length: Math.ceil(numFrets / visibleFretCount) }).map((_, i) => (
                <span
                  key={i}
                  className={`fret-dot ${i === Math.floor(fretOffset / visibleFretCount) ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        )}
      <div className={`fretboard ${(fingering?.isOutOfRange || isOutOfRange) ? "fretboard--out-of-range" : ""}`}>
        { (fingering?.isOutOfRange || isOutOfRange) && <div className="range-warning">🚫 Out of Range</div> }
        {renderStatusRow()}
        {renderDots()}
        {renderBarres()}
        <div className="strings-layer">
          {strings.map((rawStringData, stringIndex) => {
            const openStringAbsValue = getAbsoluteNoteValue(rawStringData);
            return (
              <div
                key={`string-${stringIndex}`}
                className="string-row"
                style={{ display: "grid", gridTemplateColumns: activeGridTemplate }}
              >
                {/* Always render fret 0 (open string) */}
                {(() => {
                  const fret = 0;
                  const meta = computeFretMetadata({
                    stringIndex, fret, openStringAbsValue, activeNotes,
                    currentlyPlayingNotes, contextualScaleAbsoluteValues,
                    activePath, dictType, fingering, instrument,
                    rootValue, targetValue, showFingering, fingeringMode,
                    singlePlayContext, notation, scaleAnchor, appMode
                  });
                  return (
                    <div
                      key={`fret-${fret}`}
                      className={`fret open-string`}
                      onClick={() => onNoteClick && onNoteClick(`${meta.noteInfo.us}${Math.floor(meta.absoluteValue / 12) - 1}`, {
                        instrument, stringIndex, fret
                      })}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="string-line"></div>
                      <div className="open-string-label-container">
                           <span className="open-string-name">{meta.noteName}</span>

                           {/* Note Marker for Open Strings */}
                           {((meta.isActive && fret === 0) || meta.isPlaying) && (
                             <span className={`note-marker ${meta.roleClass} ${meta.isPlaying ? "is-playing" : ""} ${highlightTargetNotes && meta.isTargetNote ? "is-target-note" : ""} open-marker`}>
                               {meta.label}
                             </span>
                           )}
                      </div>
                    </div>
                  );
                })()}
                {/* Render visible frets */}
                {Array.from({ length: visibleFretCount }).map((_, i) => {
                  const fret = firstVisibleFret + i;
                  const meta = computeFretMetadata({
                    stringIndex, fret, openStringAbsValue, activeNotes,
                    currentlyPlayingNotes, contextualScaleAbsoluteValues,
                    activePath, dictType, fingering, instrument,
                    rootValue, targetValue, showFingering, fingeringMode,
                    singlePlayContext, notation, scaleAnchor, appMode
                  });

                  const inZone = fretboardZone === "all" ||
                    (fretboardZone === "open" && fret <= 4) ||
                    (fretboardZone === "mid" && fret >= 5 && fret <= 9) ||
                    (fretboardZone === "high" && fret >= 10 && fret <= 14);

                  return (
                    <div
                      key={`fret-${fret}`}
                      className={`fret`}
                      onClick={() => onNoteClick && onNoteClick(`${meta.noteInfo.us}${Math.floor(meta.absoluteValue / 12) - 1}`, {
                        instrument, stringIndex, fret
                      })}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="string-line"></div>
                      {(meta.isActive || meta.isPlaying) && (
                        <div
                          className={`note-marker ${meta.roleClass} ${meta.isPlaying ? "is-playing" : ""} ${highlightTargetNotes && meta.isTargetNote ? "is-target-note" : ""} ${meta.isSubtle ? "subtle-marker" : ""} ${showFingering ? "is-fingering" : ""}`}
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
    </div>
  );
}

export default React.memo(Fretboard);
