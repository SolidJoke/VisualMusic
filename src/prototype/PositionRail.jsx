import React, { useId, useState } from "react";
import { NOTES, midiToDisplayName, resolveScaleSemitones } from "../core/theory";
import { verticalFretShare, verticalFretRowTopShare } from "../components/Instruments/verticalNeckGeometry";

// VMU-202 (slice 3) — the position rail beside A′'s vertical neck, only when a
// scale is shown (a chord, a note or the Studio have no rail). Design E1,
// variant B "onglets et fils" (tabs and threads):
//   - one numbered tab (44 x 44) per position, at the row of its first fret,
//     one row down when two positions start at the same fret (so the tabs
//     never overlap);
//   - one thread per position, from its first fret's row to its last fret's
//     row, in the lane `railLanes` assigned it — 4px, 8px and the Assistant's
//     gradient for the chosen one; a "grand écart" (span 5) thread is dotted
//     and its tab carries ⚠; a shift position's thread is cut where the hand
//     moves, marked with a small arrow;
//   - the start octave as one "Do3 ▾" button (98 x 44) opening the list of
//     reachable octaves, replacing the minimal panel select of slice 2;
//   - a ribbon of the octave's note names (Do · Ré · Mi · … · Do), each cell
//     lighting while ▶ plays that note — the same moment the pastille lights.
//
// Presentational and absolute-positioned: it reads the same state PrototypeA
// already holds and calls the same setters (setPlacementIndex / setStartPitch).
// Its data-fn names are `jouer.position-rail-<id>-<n>` (NOT in the parity
// registry: the registry counts one data-fn per function, and the number of
// tabs is the scale's, so the tabs are their own, dynamic family).

const RAIL_W = 98;      // 44 (tabs) + 6 (gap) + 4 lanes x 12
const TAB = 44;         // a tab, 44 x 44
const LANE_X = 50;      // the first lane's left edge (44 + 6)
const LANE_W = 12;      // one lane
const THREAD = 4;       // a thread, 4px
const THREAD_CHOSEN = 8; // 8px for the chosen position
const NUM_FRETS = 22;   // VMU-202: both necks carry 22 frets
const RIBBON_CELL_MAX = 46; // a ribbon cell never wider than this (the board splits into 8)

/** The two head rows and the open-string row, the fixed part above --fbv-rows-h. */
const HEAD_OFFSET = "calc(2 * var(--fbv-head, 36px) + var(--fbv-fret, 70px))";

/** The top of a fret's row, as a CSS length (fret 0 is the fixed open row). */
function rowTopCss(fret) {
  if (fret === 0) return "calc(2 * var(--fbv-head, 36px))";
  return `calc(${HEAD_OFFSET} + var(--fbv-rows-h, 1540px) * ${verticalFretRowTopShare(fret, NUM_FRETS)})`;
}

/** The height of a fret's row. */
function rowHeightCss(fret) {
  if (fret === 0) return "var(--fbv-fret, 70px)";
  return `calc(var(--fbv-rows-h, 1540px) * ${verticalFretShare(fret, NUM_FRETS)})`;
}

/** The centre of a fret's row — the tab's and the thread's anchor. */
function rowCentreCss(fret) {
  if (fret === 0) return "calc(2 * var(--fbv-head, 36px) + var(--fbv-fret, 70px) / 2)";
  const share = verticalFretRowTopShare(fret, NUM_FRETS) + verticalFretShare(fret, NUM_FRETS) / 2;
  return `calc(${HEAD_OFFSET} + var(--fbv-rows-h, 1540px) * ${share})`;
}

/** A thread (or one shift segment) from fret `lo` to fret `hi`, top + height. */
function threadCss(lo, hi) {
  return { top: rowCentreCss(lo), height: `calc(${rowCentreCss(hi)} - ${rowCentreCss(lo)})` };
}

/** The octave's note names for the ribbon: N+1 cells, and the pitch each lights on. */
function ribbonNotes(dictType, startPitch, notation) {
  const semitones = resolveScaleSemitones(dictType) ?? resolveScaleSemitones("scale_major");
  return [...semitones, 12].map((s) => {
    const pc = (((startPitch + s) % 12) + 12) % 12;
    return { name: notation === "eu" ? NOTES[pc].eu : NOTES[pc].us, pitch: startPitch + s };
  });
}

const playingPitch = (n) => (n && typeof n === "object" ? n.absoluteValue : n);

export default function PositionRail({
  id,
  placements,
  startPitches,
  startPitch,
  chosenIndex,
  notation,
  dictType,
  currentlyPlayingNotes,
  onSelectPosition,
  onSelectStartPitch,
  T,
  strings = 6,
}) {
  const [listOpen, setListOpen] = useState(false);
  const listId = useId();

  const railPlacements = placements.filter((p) => p?.rail);
  if (railPlacements.length === 0) return null;

  const isPlaying = (pitch) => (currentlyPlayingNotes || []).some((n) => playingPitch(n) === pitch);
  const notes = ribbonNotes(dictType, startPitch, notation);

  return (
    <>
      <div className="proto-a__position-rail" role="group" aria-label={T.positionRail}>
        <div className="proto-a__rail-head">
          <button
            type="button"
            className="proto-a__rail-start"
            data-fn={`jouer.position-depart-${id}`}
            aria-haspopup="listbox"
            aria-expanded={listOpen}
            aria-controls={listOpen ? listId : undefined}
            title={T.positionStartPitch}
            onClick={() => setListOpen((o) => !o)}
          >
            <span className="proto-a__rail-start-value">
              {startPitch !== null && startPitch !== undefined ? midiToDisplayName(startPitch, notation) : ""}
            </span>
            <span className="proto-a__rail-caret" aria-hidden="true">▾</span>
          </button>
          {listOpen && (
            <div className="proto-a__rail-list" id={listId} role="listbox" aria-label={T.positionStartPitch}>
              {(startPitches || []).map((o) => (
                <button
                  key={o.pitch}
                  type="button"
                  role="option"
                  aria-selected={o.pitch === startPitch}
                  className="proto-a__rail-option"
                  data-start-pitch={o.pitch}
                  onClick={() => {
                    if (onSelectStartPitch) onSelectStartPitch(o.pitch);
                    setListOpen(false);
                  }}
                >
                  {midiToDisplayName(o.pitch, notation)}
                </button>
              ))}
            </div>
          )}
        </div>

        {railPlacements.map((p, i) => {
          const rail = p.rail;
          const chosen = chosenIndex === p.index;
          const grandEcart = rail.warning === "grandEcart";
          // Two positions starting at the same fret would pile their tabs on
          // the same row; the second (and each later) one drops one row per
          // earlier position with that same first fret. The engine's minimal
          // windows never share a first fret (core/scalePositions.js), so this
          // is defensive — the design asks for it regardless.
          const sameStart = railPlacements.slice(0, i).filter((q) => q.rail.minFret === rail.minFret).length;
          const tabFret = rail.minFret + sameStart;
          const tabTop = `calc(${rowTopCss(tabFret)} + (${rowHeightCss(tabFret)} - ${TAB}px) / 2)`;
          const threadWidth = chosen ? THREAD_CHOSEN : THREAD;
          const threadLeft = `calc(${LANE_X}px + ${rail.lane} * ${LANE_W}px)`;
          const threadClass = [
            "proto-a__rail-thread",
            grandEcart ? "is-grand-ecart" : "",
            chosen ? "is-active" : "",
          ].filter(Boolean).join(" ");
          const tabClass = [
            "proto-a__rail-tab",
            grandEcart ? "is-grand-ecart" : "",
            chosen ? "is-active" : "",
          ].filter(Boolean).join(" ");
          const tabFn = `jouer.position-rail-${id}-${p.label}`;
          const choose = () => { if (onSelectPosition) onSelectPosition(p.index); };
          const threadStyle = (seg) => ({
            left: threadLeft,
            top: seg.top,
            height: seg.height,
            "--rail-thread-w": `${threadWidth}px`,
          });

          return (
            <React.Fragment key={p.id}>
              {rail.shift ? (
                <>
                  <button
                    type="button"
                    className={`${threadClass} is-shift`}
                    style={threadStyle(threadCss(rail.shift.from.lo, rail.shift.from.hi))}
                    data-rail-thread={p.label}
                    data-rail-lane={rail.lane}
                    data-rail-segment="1"
                    aria-label={`${T.positionRailTab} ${p.label}`}
                    aria-pressed={chosen}
                    onClick={choose}
                  />
                  <span className="proto-a__rail-shift" style={{ top: rowCentreCss(rail.shift.from.hi) }} aria-hidden="true">↓</span>
                  <button
                    type="button"
                    className={`${threadClass} is-shift`}
                    style={threadStyle(threadCss(rail.shift.to.lo, rail.shift.to.hi))}
                    data-rail-thread={p.label}
                    data-rail-lane={rail.lane}
                    data-rail-segment="2"
                    aria-label={`${T.positionRailTab} ${p.label}`}
                    aria-pressed={chosen}
                    onClick={choose}
                  />
                </>
              ) : (
                <button
                  type="button"
                  className={threadClass}
                  style={threadStyle(threadCss(rail.minFret, rail.maxFret))}
                  data-rail-thread={p.label}
                  data-rail-lane={rail.lane}
                  aria-label={`${T.positionRailTab} ${p.label}`}
                  aria-pressed={chosen}
                  onClick={choose}
                />
              )}
              <button
                type="button"
                className={tabClass}
                style={{ top: tabTop }}
                data-fn={tabFn}
                data-rail-tab={p.label}
                data-rail-fret={rail.minFret}
                aria-label={`${T.positionRailTab} ${p.label}`}
                aria-pressed={chosen}
                onClick={choose}
              >
                {p.label}
                {grandEcart && (
                  <span className="proto-a__rail-warn" title={T.positionRailGrandEcart} aria-label={T.positionRailGrandEcart}>⚠</span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div
        className="proto-a__ribbon"
        aria-label={T.positionRibbon}
        // VMU-202 (slice 3): the ribbon spans the board exactly — the same
        // string columns as the fretboard beside it (6 on the guitar, 4 on the
        // bass). PrototypeA.css turns these into the width (string pitch x
        // strings) and the 46px cap on each of the 8 cells.
        style={{ "--proto-strings": strings, "--proto-cell-max": `${RIBBON_CELL_MAX}px` }}
      >
        {notes.map((n, i) => (
          <span
            key={i}
            className={`proto-a__ribbon-note ${isPlaying(n.pitch) ? "is-playing" : ""}`}
            data-ribbon-note={n.name}
            data-ribbon-playing={isPlaying(n.pitch) ? "true" : "false"}
          >
            {n.name}
          </span>
        ))}
      </div>
    </>
  );
}
