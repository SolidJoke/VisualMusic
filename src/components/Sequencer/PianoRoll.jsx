import React from 'react';
import './PianoRoll.css';

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
 */
export default function PianoRoll({ tracks = [], totalSteps = 16, currentStep = -1 }) {
    const [isZoomed, setIsZoomed] = React.useState(false);
    const [pageSize, setPageSize] = React.useState(16); // 16, 32, or 64 steps visible
    const [currentPage, setCurrentPage] = React.useState(0); // 0-indexed page

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
        <div className={`piano-roll ${isZoomed ? 'is-zoomed' : ''}`}>
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

                                // Build CSS classes
                                const classes = [
                                    'step-lamp',
                                    isActive ? 'active' : '',
                                    isActive ? colorClass : '',
                                    isActive && isLowVel ? 'step--ghost' : '',
                                    isCurrent ? 'step--current' : '',
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
                                            transform: isActive && !isLowVel ? 'scale(1.05)' : 'scale(1)',
                                            zIndex: isActive ? 2 : 1
                                        }}
                                        title={isActive ? buildTooltip(track.name, stepIndex, isLowVel, pitchLabel) : ''}
                                    >
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
function buildTooltip(trackName, stepIndex, isGhost, pitchLabel) {
    const parts = [`${trackName} — Step ${stepIndex + 1}`];
    if (isGhost) parts.push('Velocity: Ghost (low)');
    if (pitchLabel) parts.push(`Pitch: ${pitchLabel}`);
    return parts.join(' | ');
}