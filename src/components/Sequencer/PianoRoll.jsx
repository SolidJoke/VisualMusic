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
    return (
        <div className="piano-roll">
            {tracks.map((track, trackIndex) => {
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
                                    'step',
                                    isActive ? colorClass : '',
                                    isActive && isLowVel ? 'step--ghost' : '',
                                    isCurrent ? 'step--current' : '',
                                    stepIndex % 4 === 0 ? 'step--beat' : '',
                                    stepIndex % 16 === 0 ? 'step--measure' : '',
                                ].filter(Boolean).join(' ');

                                return (
                                    <div
                                        key={stepIndex}
                                        className={classes}
                                        title={isActive ? buildTooltip(track.name, stepIndex, isLowVel, pitchLabel) : ''}
                                    >
                                        {isActive && isLowVel && (
                                            <span className="step__ghost-label">👻</span>
                                        )}
                                        {isActive && pitchLabel && (
                                            <span className="step__pitch-label">{pitchLabel}</span>
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