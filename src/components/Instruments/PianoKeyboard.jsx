import React, { useState, useRef, useCallback } from "react";
import "./PianoKeyboard.css";
import { NOTES, getAbsoluteNoteValue } from "../../core/theory";
import { getHarmonicSeries } from "../../core/acousticEngine";
import { getRoleForDegreeLabel } from "../../core/harmonyEngine";
import { useAppContext } from "../../context/AppContext";
import { useMusicEngineContext } from "../../context/MusicEngineContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [1, 3, 6, 8, 10];
const WHITE_KEY_WIDTH = 50;
// orientation="vertical" (S1 prototype): C2..C6, as the spec's mock-up.
const VERTICAL_OCTAVES = 4;

const FLAT_EQUIVALENTS = {
  1: { us: "Db", eu: "Réb" },
  3: { us: "Eb", eu: "Mib" },
  6: { us: "Gb", eu: "Solb" },
  8: { us: "Ab", eu: "Lab" },
  10: { us: "Bb", eu: "Sib" },
};

/**
 * @param {object} [props]
 * @param {"horizontal"|"vertical"} [props.orientation] - S1 prototype
 *   (`?prototype=a`) only. Default "horizontal": the app never passes it, and
 *   the horizontal render is unchanged. "vertical" turns the geometry, never
 *   the text: high notes at the top, black keys on the left, C2 to C6
 *   (29 white keys), one label per key laid out horizontally.
 */
function PianoKeyboard({ orientation = "horizontal" } = {}) {
  const {
    activeNotes = [],
    currentRootValue: rootValue = 0,
    targetValuesByInstrument = {},
    autoPlayNote: onNoteClick,
    currentlyPlayingNotes = [],
    contextualScaleAbsoluteValues = [],
    dictType: rawDictType = null,
    appMode
  } = useMusicEngineContext();
  // VMU-123 — piano gets the shared target notes (unlike the bass, which
  // never does; see useFretboard.js's instrument-keyed suppression).
  const targetValues = targetValuesByInstrument.piano || [];

  const dictType = appMode === "dictionary" ? rawDictType : null;
  const numOctaves = 7;
  const isMobile = useMediaQuery('(max-width: 767px)');
  const is4K = useMediaQuery('(min-width: 3840px)');
  const isSmallDesktop = useMediaQuery('(max-width: 1439px)');
  const visibleOctaveCount = isMobile ? 2 : is4K ? 7 : isSmallDesktop ? 3 : 4;
  const [octaveOffset, setOctaveOffset] = useState(0);

  const { notation, state } = useAppContext();
  const { harmonicMode } = state;
  const keys = [];

  const scrubberRef = useRef(null);

  const handleScrubberInteraction = useCallback((e) => {
    if (!scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const newOffset = Math.round(ratio * (numOctaves - visibleOctaveCount));
    setOctaveOffset(newOffset);
  }, [numOctaves, visibleOctaveCount]);

  const handleScrubberMouseDown = useCallback((e) => {
    handleScrubberInteraction(e);
    const onMove = (moveEvent) => handleScrubberInteraction(moveEvent);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [handleScrubberInteraction]);

  const handleScrubberTouchStart = useCallback((e) => {
    handleScrubberInteraction(e);
    const onMove = (moveEvent) => handleScrubberInteraction(moveEvent);
    const onEnd = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }, [handleScrubberInteraction]);

  const harmonicSeries = React.useMemo(() => {
    if (!harmonicMode) return [];
    const midi = Number(rootValue) + 48;
    const baseFreq = 440 * Math.pow(2, (midi - 69) / 12);
    return getHarmonicSeries(baseFreq, 32, notation);
  }, [harmonicMode, rootValue, notation]);

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

  const getKeyRoleClass = (i, isActive, activeNote, isPlaying) => {
    if (!isActive && !isPlaying) return "";
    if (targetValues.includes(i)) return "role-target";
    
    // Use the explicitly passed order if available (favors clicked chord roles)
    // Degree label ("1", "b3", "3", "5"...) -> role, single rule (VMU-146)
    const order = activeNote?.order !== undefined ? String(activeNote.order) : null;
    if (order) {
      return `role-${getRoleForDegreeLabel(order)}`;
    }
    
    // Fallback to calculation based on current rootValue
    const interval = (i - rootValue + 12) % 12;
    if (interval === 0) return "role-root";
    if (interval === 3 || interval === 4) return "role-third";
    if (interval === 7) return "role-fifth";
    
    return isActive ? "role-scale" : "role-extension";
  };

  const maxOffset = numOctaves - visibleOctaveCount;
  const clampedOffset = Math.min(Math.max(octaveOffset, 0), maxOffset);
  const startOctave = isMobile ? 1 : clampedOffset;
  const endOctave = isMobile ? 2 : clampedOffset + visibleOctaveCount - 1;

  // One key's musical state (active, playing, role, degree), shared by both
  // orientations so the vertical keyboard cannot drift from the horizontal
  // one: same matching rules, same roles (S1 brief, "mêmes hauteurs, mêmes
  // rôles"). `octave` is 0-based from C2, as in the render loop below.
  const describeKey = (octave, i) => {
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
      const isRoot = (n.value % 12) === (rootValue % 12);
      const isScaleMode = dictType?.includes("scale");
      
      // In scale mode, we want to highlight the 8th note (the octave) to complete the visual scale
      if (isScaleMode && isRoot && octave === 3) {
          return true;
      }

      return (n.value % 12 === i % 12) && (octave === 2);
    });
    const isActive = !!activeNote;
    const isPlaying = currentlyPlayingNotes.some(item => {
      if (typeof item === 'object' && item !== null) {
        return item.absoluteValue === absoluteValue;
      }
      return item === absoluteValue;
    });

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
      }
    } else {
      if (isActive && activeNote.order) orderToDisplay = activeNote.order;
    }

    const subtleClass = isSubtle ? "subtle-highlight" : "";
    return { noteInfo, isBlack, noteName, absoluteValue, activeNote, isActive, isPlaying, orderToDisplay, isSubtle, subtleClass };
  };

  if (orientation === "vertical") {
    // C2..B5 plus the closing C6: 4 octaves, 29 white keys (spec S1-9), in
    // ascending order here, laid out high-at-top by the index below.
    const vertical = [];
    for (let octave = 0; octave < VERTICAL_OCTAVES; octave++) {
      for (let i = 0; i < 12; i++) vertical.push({ octave, i, ...describeKey(octave, i) });
    }
    vertical.push({ octave: VERTICAL_OCTAVES, i: 0, ...describeKey(VERTICAL_OCTAVES, 0) });

    const whites = vertical.filter((k) => !k.isBlack).reverse(); // high at top
    const whiteIndex = new Map(whites.map((k, idx) => [k.absoluteValue, idx]));

    const renderVerticalLabel = (k) => {
      if (k.isActive || k.isPlaying) {
        return renderKeyLabel(k.i, k.isActive, k.activeNote, k.isBlack, k.orderToDisplay, k.isSubtle);
      }
      // Inactive keys stay blank, except each C, named with its octave
      // (spec §3: "le nom de chaque Do (Do2…Do6) sur sa touche").
      if (k.i === 0) {
        return <span className="piano-octave-name">{`${k.noteInfo[notation]}${k.octave + 2}`}</span>;
      }
      return null;
    };

    const renderVerticalKey = (k, top) => {
      const label = renderVerticalLabel(k);
      return (
        <div
          key={`v-${k.absoluteValue}`}
          className={`piano-key ${k.isBlack ? "black-key" : "white-key"} ${getKeyRoleClass(k.i, k.isActive, k.activeNote, k.isPlaying)} ${k.subtleClass} ${k.isPlaying ? "is-playing" : ""}`}
          title={`${k.noteInfo.us} / ${k.noteInfo.eu}`}
          data-abs={k.absoluteValue}
          style={{ top }}
          onClick={() => onNoteClick && onNoteClick(k.noteName, { instrument: "piano" })}
        >
          {label && <div className="note-label">{label}</div>}
        </div>
      );
    };

    return (
      <div className="piano-wrapper piano-wrapper--vertical" data-orientation="vertical">
        <div className="piano-vertical" style={{ "--piano-v-count": whites.length }}>
          {whites.map((k, idx) => renderVerticalKey(k, `calc(var(--piano-v-key, 62px) * ${idx})`))}
          {vertical
            .filter((k) => k.isBlack)
            .map((k) => {
              // A black key straddles the boundary between its white
              // neighbours: the top edge of the white key just below it.
              const below = whiteIndex.get(k.absoluteValue - 1);
              return renderVerticalKey(k, `calc(var(--piano-v-key, 62px) * ${below} - var(--piano-v-black, 36px) / 2)`);
            })}
        </div>
      </div>
    );
  }

  for (let octave = startOctave; octave <= endOctave; octave++) {
    for (let i = 0; i < 12; i++) {
      const { noteInfo, isBlack, noteName, activeNote, isActive, isPlaying, orderToDisplay, isSubtle, subtleClass } = describeKey(octave, i);

      if (isBlack) {
        // Render a 0-width wrapper that sits cleanly between the two adjacent white keys
        keys.push(
          <div
            key={`octave-${octave}-note-${i}-wrapper`}
            className="black-key-wrapper"
          >
            <div
              className={`piano-key black-key ${getKeyRoleClass(i, isActive, activeNote, isPlaying)} ${subtleClass} ${isPlaying ? "is-playing" : ""}`}
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
            className={`piano-key white-key ${getKeyRoleClass(i, isActive, activeNote, isPlaying)} ${subtleClass} ${isPlaying ? "is-playing" : ""}`}
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

  const scrubberActivePoints = [];
  if (!isMobile) {
    for (let oct = 0; oct < numOctaves; oct++) {
      for (let i = 0; i < 12; i++) {
        const noteInfo = NOTES.at(i);
        const noteName = `${noteInfo.us}${oct + 2}`;
        const absoluteValue = getAbsoluteNoteValue(noteName);
        const isActive = activeNotes.some((n) => {
          if (n.absoluteValue !== undefined) return n.absoluteValue === absoluteValue;
          return (n.value % 12 === i % 12) && (oct === 2);
        });
        if (isActive) {
          const posRatio = (oct * 12 + i) / (numOctaves * 12);
          scrubberActivePoints.push(posRatio);
        }
      }
    }
  }

  const thumbLeft = (clampedOffset / numOctaves) * 100;
  const thumbWidth = (visibleOctaveCount / numOctaves) * 100;

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

      {!isMobile && !is4K && visibleOctaveCount < numOctaves && (
        <div
          className="piano-scrubber"
          ref={scrubberRef}
          onMouseDown={handleScrubberMouseDown}
          onTouchStart={handleScrubberTouchStart}
          title="Drag to navigate the keyboard"
          aria-label="Piano octave navigator"
        >
          <div
            className="piano-scrubber-thumb"
            style={{ left: `${thumbLeft}%`, width: `${thumbWidth}%` }}
          />
          {scrubberActivePoints.map((ratio, idx) => (
            <div
              key={idx}
              className="piano-scrubber-note"
              style={{ left: `${ratio * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(PianoKeyboard);
