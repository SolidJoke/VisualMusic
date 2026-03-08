import React from 'react';
import './PianoRoll.css';

export default function PianoRoll({ tracks = new Array(), totalSteps = 16, currentStep = -1 }) {
    return (
        <div className="piano-roll">
            {tracks.map((track, trackIndex) => (
                <div key={trackIndex} className="track-row">
                    <div className="track-name">{track.name}</div>
                    <div className="steps-container">
                        {Array.from({ length: totalSteps }).map((_, stepIndex) => {
                            const isActive = track.activeSteps.includes(stepIndex);
                            const isLowVel = track.lowVelocitySteps?.includes(stepIndex);
                            const isCurrent = currentStep === stepIndex; // NOUVEAU : Détection de la lecture

                            return (
                                <div 
                                    key={stepIndex} 
                                    className={`step ${isActive ? track.colorClass : ''}`}
                                    style={{ 
                                        opacity: isActive && isLowVel ? 0.4 : 1,
                                        // NOUVEAU : Effet visuel quand la tête de lecture passe dessus
                                        border: isCurrent ? '2px solid #fff' : '1px solid #333',
                                        boxShadow: isCurrent && isActive ? '0 0 10px #fff' : 'none',
                                        transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                                        transition: 'all 0.1s'
                                    }}
                                ></div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

