import React from 'react';
import './PianoRoll.css';
import './Chance.css';
import './Groove.css';
import { sequencerViewSize } from '../../core/loopWindow';
import { chanceAt, densityOf } from '../../core/chance';

/**
 * PianoRoll — Step sequencer display with velocity & pitch indicators
 *
 * Props:
 * - tracks: rows of the timeline document (core/timeline.js, T3):
 *   { name, steps } where `steps[i]` is the cell of absolute step i — null
 *   (silent) or { vel: "normal"|"ghost", pitch? } — so a measure shows its
 *   own cells, not measure 1's again
 * - totalSteps: number (default 16) — the document's window
 * - currentStep: number (-1 = none)
 * - viewRequest: number — a send's request; when it changes, the roll shows
 *   the whole loop (VMU-214)
 * - chance: (VMU-221, the Studio's A′ page only; absent elsewhere = nothing
 *   changes) { T, settings, dropped, mode, onCycle(trackId, step),
 *   onDensity(trackId, percent) } — the chance of each cell, the steps the
 *   draw removed in this version (`dropped`, trackId -> steps; drawn dashed),
 *   whether touching a cell sets its chance (`mode`), and the densities, in
 *   this roll's bar. The chord row has no chance.
 * - groove: (VMU-223, the Studio's A′ page only; absent = nothing changes)
 *   { swingShift, note } — `swingShift`, in steps (core/groove.js
 *   swingOffsetSteps): the odd cells are drawn that much to the right, the way
 *   they sound; `note`: the short text the roll's bar shows ("Balancé 66 % ·
 *   Humanisation 40 %"), empty when nothing is set.
 */
export default function PianoRoll({ tracks = [], totalSteps = 16, currentStep = -1, viewRequest = 0, chance = null, groove = null }) {
    const swingShift = groove?.swingShift || 0;
    const chanceTracks = chance ? tracks.filter((t) => t && t.role !== 'chordHits') : [];
    const [isZoomed, setIsZoomed] = React.useState(false);
    const [pageSize, setPageSize] = React.useState(16); // 16, 32, or 64 steps visible
    const [currentPage, setCurrentPage] = React.useState(0); // 0-indexed page

    // VMU-214: after a send, show the whole loop — the smallest of 16/32/64
    // that fits it, else 64, page 1. The user's own density choice holds until
    // the next send; a re-send re-applies the view. The initial mount is not a
    // send, so the default density stays.
    const lastViewRequest = React.useRef(viewRequest);
    React.useEffect(() => {
        if (viewRequest === lastViewRequest.current) return;
        lastViewRequest.current = viewRequest;
        setPageSize(sequencerViewSize(totalSteps));
        setCurrentPage(0);
    }, [viewRequest, totalSteps]);

    // Auto-advance page during playback
    React.useEffect(() => {
        if (currentStep >= 0 && pageSize < totalSteps) {
            const expectedPage = Math.floor(currentStep / pageSize);
            if (expectedPage !== currentPage) {
                setCurrentPage(expectedPage % Math.ceil(totalSteps / pageSize));
            }
        }
    }, [currentStep, pageSize, totalSteps, currentPage]);

    // Reset page to 0 when pageSize changes
    React.useEffect(() => {
        setCurrentPage(0);
    }, [pageSize]);

    // Compute visible step range
    const visibleStart = currentPage * pageSize;
    const visibleEnd = Math.min(visibleStart + pageSize, totalSteps);
    const totalPages = Math.ceil(totalSteps / pageSize);

    return (
        <div
            className={`piano-roll ${isZoomed ? 'is-zoomed' : ''}${swingShift ? ' piano-roll--swung' : ''}`}
            style={swingShift ? { '--swing-shift': swingShift } : undefined}
            data-swing-shift={swingShift || undefined}
        >
            <div className="piano-roll-controls">
                {/* Step density selector */}
                <div className="step-density-selector">
                    {[16, 32, 64].map(size => (
                        <button
                            key={size}
                            className={`step-density-btn ${pageSize === size ? 'active' : ''}`}
                            onClick={() => setPageSize(size)}
                            disabled={size > totalSteps}
                        >
                            {size}
                        </button>
                    ))}
                </div>

                {/* Page selector — only show if not viewing all steps */}
                {pageSize < totalSteps && (
                    <div className="page-selector">
                        {Array.from({ length: totalPages }).map((_, p) => (
                            <button
                                key={p}
                                className={`page-btn ${currentPage === p ? 'active' : ''}`}
                                onClick={() => setCurrentPage(p)}
                            >
                                {p + 1}
                            </button>
                        ))}
                        <span className="page-indicator">PAGE {currentPage + 1}/{totalPages}</span>
                    </div>
                )}

                {/* VMU-223: what the groove does to this roll. */}
                {groove?.note ? <span className="groove-badge" data-groove="badge">{groove.note}</span> : null}

                {/* VMU-221: the density of each track of this roll (0-100 %). */}
                {chanceTracks.map((track) => {
                    const value = densityOf(chance.settings, track.id);
                    return (
                        <label key={track.id} className="chance-density" title={chance.T.densityHint} data-chance="density" data-track={track.id}>
                            <span className="chance-density__name">{chance.T.density} · {track.name}</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                className="proto-a__volume-slider chance-density__slider"
                                value={value}
                                aria-label={`${chance.T.density} — ${track.name}`}
                                aria-valuetext={`${value} %`}
                                style={{ '--value': `${value}%` }}
                                onChange={(e) => chance.onDensity(track.id, Number(e.target.value))}
                            />
                            <output>{value} %</output>
                        </label>
                    );
                })}

                {/* Keep the zoom button */}
                <button 
                    className="btn-header-action" 
                    onClick={() => setIsZoomed(!isZoomed)}
                    style={{ fontSize: '10px', height: '24px', minWidth: '60px' }}
                >
                    {isZoomed ? 'Normal' : 'Zoom'}
                </button>
            </div>
            {tracks.filter(Boolean).map((track, trackIndex) => {
                const colorClass = `bg-${track.name.toLowerCase()}`;
                // VMU-221: this row's chances and removed hits (none for the chord row).
                const withChance = Boolean(chance) && track.role !== 'chordHits';
                const droppedSteps = withChance ? new Set(chance.dropped?.[track.id] ?? []) : null;

                return (
                    <div key={trackIndex} className="track-row">
                        <div className="track-name">{track.name}</div>
                        <div className="steps-container">
                            {Array.from({ length: visibleEnd - visibleStart }).map((_, i) => {
                                const stepIndex = visibleStart + i;
                                // The cell of this very step: absolute, never folded back onto measure 1.
                                const cell = track.steps?.[stepIndex] ?? null;
                                const isActive = cell !== null;
                                const isLowVel = cell?.vel === 'ghost';
                                const isCurrent = currentStep === stepIndex;
                                const pitchLabel = cell?.pitch || null;
                                const isDropped = Boolean(droppedSteps && droppedSteps.has(stepIndex));
                                const level = withChance && (isActive || isDropped) ? chanceAt(chance.settings, track.id, stepIndex) : 100;
                                const touchable = withChance && chance.mode && (isActive || isDropped);
                                // VMU-223: an odd step sounds late with the swing; a hit on it is drawn late
                                // (an empty cell stays on the grid, so the grid is not blurred by overlaps).
                                const isSwung = swingShift > 0 && stepIndex % 2 === 1 && (isActive || isDropped);

                                // Build CSS classes
                                const classes = [
                                    'step-lamp',
                                    isActive ? 'active' : '',
                                    isActive ? colorClass : '',
                                    isActive && isLowVel ? 'step--ghost' : '',
                                    isDropped ? `step--dropped ${colorClass}` : '',
                                    level < 100 ? `step--chance step--chance-${level}` : '',
                                    touchable ? 'step--touch' : '',
                                    isCurrent ? 'step--current' : '',
                                    isSwung ? 'step--swung' : '',
                                    stepIndex % 4 === 0 ? 'step--beat' : '',
                                    stepIndex % 16 === 0 ? 'step--measure' : '',
                                    isZoomed ? 'zoomed' : '',
                                ].filter(Boolean).join(' ');

                                return (
                                    <div
                                        key={stepIndex}
                                        className={classes}
                                        style={{ 
                                            opacity: isActive ? (isLowVel ? 0.5 : 1.0) : 1.0,
                                            boxShadow: isActive 
                                                ? `0 0 ${isLowVel ? '10px' : '20px'} var(--active-glow, currentColor)` 
                                                : 'none',
                                            transform: `${isSwung ? 'translateX(calc(var(--swing-shift, 0) * (100% + 4px))) ' : ''}${isActive && !isLowVel ? 'scale(1.05)' : 'scale(1)'}`,
                                            zIndex: isActive ? 2 : 1
                                        }}
                                        title={isActive ? buildTooltip(track.name, stepIndex, isLowVel, pitchLabel, level) : isDropped ? `${track.name} — Step ${stepIndex + 1} | ${chance.T.cellRemoved}` : ''}
                                        data-chance-level={level < 100 ? level : undefined}
                                        data-dropped={isDropped ? '' : undefined}
                                        {...(touchable
                                            ? {
                                                role: 'button',
                                                tabIndex: 0,
                                                'aria-label': `${track.name} ${stepIndex + 1} — ${chance.T.cellChance} ${level} %${isDropped ? ` — ${chance.T.cellRemoved}` : ''}`,
                                                onClick: () => chance.onCycle(track.id, stepIndex),
                                                onKeyDown: (e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        chance.onCycle(track.id, stepIndex);
                                                    }
                                                },
                                            }
                                            : null)}
                                    >
                                        {level < 100 && (
                                            <>
                                                <div className="step__chance-veil" style={{ height: `${100 - level}%` }} aria-hidden="true" />
                                                <span className="step__chance-label" aria-hidden="true">{level}</span>
                                            </>
                                        )}
                                        {isActive && pitchLabel && (
                                            <span className="step__pitch-label">{pitchLabel}</span>
                                        )}
                                        {isActive && isLowVel && (
                                            <div className="step__dim-overlay" />
                                        )}
                                    </div>
                                );

                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Build a descriptive tooltip for a step.
 */
function buildTooltip(trackName, stepIndex, isGhost, pitchLabel, level = 100) {
    const parts = [`${trackName} — Step ${stepIndex + 1}`];
    if (level < 100) parts.push(`${level} %`);
    if (isGhost) parts.push('Velocity: Ghost (low)');
    if (pitchLabel) parts.push(`Pitch: ${pitchLabel}`);
    return parts.join(' | ');
}