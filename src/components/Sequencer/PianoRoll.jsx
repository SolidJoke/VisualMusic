import React from 'react';
import './PianoRoll.css';

/**
 * PianoRoll — Step sequencer display with velocity & pitch indicators
 *
 * Props:
 * - tracks: Array of { name, activeSteps, lowVelocitySteps?, pitchSteps? }
 * - totalSteps: number (default 16)
 * - currentStep: number (-1 = none)
 */
export default function PianoRoll({ tracks = [], totalSteps = 16, currentStep = -1 }) {
    const [isZoomed, setIsZoomed] = React.useState(false);

    return (
        <div className={`piano-roll ${isZoomed ? 'is-zoomed' : ''}`}>
            <div className="piano-roll-header">
                <button 
                    className="btn-header-action" 
                    onClick={() => setIsZoomed(!isZoomed)}
                    style={{ fontSize: '10px', height: '24px', minWidth: '80px' }}
                >
                    {isZoomed ? '🔍 Normal' : '🔍 Zoom'}
                </button>
            </div>
            {tracks.filter(Boolean).map((track, trackIndex) => {
                const colorClass = `bg-${track.name.toLowerCase()}`;

                return (
                    <div key={trackIndex} className="track-row">
                        <div className="track-name">{track.name}</div>
                        <div className="steps-container">
                            {Array.from({ length: totalSteps }).map((_, stepIndex) => {
                                // Support looping if track data is shorter than totalSteps
                                const relativeStep = stepIndex % 16;
                                const isActive = track.activeSteps.includes(relativeStep);
                                const isLowVel = track.lowVelocitySteps?.includes(relativeStep);
                                const isCurrent = currentStep === stepIndex;
                                const pitchLabel = track.pitchSteps?.[relativeStep] || null;

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