// src/components/Sequencer/PianoRoll.jsx
import React from 'react';
import './PianoRoll.css';

export default function PianoRoll({ tracks = new Array(), totalSteps = 16 }) {
    const steps = new Array();
    for (let i = 0; i < totalSteps; i++) {
        steps.push(i);
    }

    return (
        <div className="piano-roll-container">
            <h3 style={{color: '#ccc', marginTop: 0, marginBottom: '15px'}}>
                ⏱️ Séquenceur Rythmique ({totalSteps} cases)
            </h3>
            
            <div className="piano-roll-header">
                <div className="track-label-header">Instrument</div>
                {steps.map(step => {
                    const isBeat = step % 4 === 0;
                    return (
                        <div key={`header-${step}`} className={`step-header ${isBeat ? 'beat-marker' : ''}`}>
                            {isBeat ? (step / 4) + 1 : ''}
                        </div>
                    );
                })}
            </div>

            {tracks.map((track, trackIndex) => (
                <div key={`track-${trackIndex}`} className="piano-roll-track">
                    <div className="track-label">{track.name}</div>
                    
                    {steps.map(step => {
                        const isActive = track.activeSteps.includes(step);
                        // On vérifie si la note doit avoir une vélocité réduite
                        const isLowVel = track.lowVelocitySteps && track.lowVelocitySteps.includes(step);
                        const isBeat = step % 4 === 0;
                        
                        return (
                            <div
                                key={`step-${trackIndex}-${step}`}
                                className={`step-cell ${isActive ? track.colorClass : ''} ${isBeat ? 'beat-marker' : ''}`}
                                // L'astuce visuelle : on baisse l'opacité si la vélocité est faible !
                                style={{ opacity: isLowVel ? 0.4 : 1 }}
                                title={isLowVel ? "Vélocité réduite (-30%)" : "Vélocité normale"}
                            >
                                {isActive ? (isLowVel ? 'v' : 'X') : ''}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}