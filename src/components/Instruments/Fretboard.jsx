import React from 'react';
import './Fretboard.css';
import { NOTES } from '../../core/theory';

export default function Fretboard({ instrument = 'guitar', activeNotes = new Array(), notation = 'us', stringTuning, rootValue = 0, targetValue = -1, fretboardZone = 'all' }) {
    const numFrets = 14; // Rallongé à 14 cases pour avoir une vraie zone aiguë !
    const defaultGuitar = new Array(4, 11, 7, 2, 9, 4);
    const defaultBass = new Array(7, 2, 9, 4);
    const strings = stringTuning ? stringTuning : (instrument === 'bass' ? defaultBass : defaultGuitar);

    const getFrets = () => {
        let frets = new Array();
        for(let i = 0; i <= numFrets; i++) frets.push(i);
        return frets;
    };

    // NOUVEAU : Le filtre de zone de la main gauche
    const isFretInZone = (fret) => {
        if (fretboardZone === 'all') return true;
        if (fretboardZone === 'open') return fret >= 0 && fret <= 4;
        if (fretboardZone === 'mid') return fret >= 5 && fret <= 9;
        if (fretboardZone === 'high') return fret >= 10 && fret <= 14;
        return true;
    };

    return (
        <div className="fretboard-container">
            <h3 style={{color: '#ccc', marginBottom: '10px'}}>{instrument === 'bass' ? '🎸 Basse (4 cordes)' : '🎸 Guitare (6 cordes)'}</h3>
            <div className="fretboard">
                {strings.map((baseNoteValue, stringIndex) => (
                    <div key={`string-${stringIndex}`} className="string-row">
                        {getFrets().map(fret => {
                            const noteValue = (baseNoteValue + fret) % 12;
                            const noteInfo = NOTES.at(noteValue);
                            
                            const isActive = activeNotes.some(n => (n % 12) === noteValue);
                            const hasDot = new Array(3, 5, 7, 9, 12).includes(fret) && stringIndex === Math.floor(strings.length / 2);
                            const inZone = isFretInZone(fret); // Vérification de la zone
                            
                            let roleClass = '';
                            if (isActive) {
                                const interval = (noteValue - rootValue + 12) % 12;
                                if (noteValue === targetValue) roleClass = 'role-target';
                                else if (interval === 0) roleClass = 'role-root';
                                else if (interval === 3 || interval === 4) roleClass = 'role-third';
                                else if (interval === 7) roleClass = 'role-fifth';
                                else roleClass = 'role-scale';
                            }
                            
                            return (
                                <div key={`fret-${fret}`} className={`fret ${fret === 0 ? 'open-string' : ''}`}>
                                    <div className="string-line"></div>
                                    {hasDot && !isActive && <div className="fret-dot"></div>}
                                    {fret === 0 && (<div style={{ position: 'absolute', left: '-30px', color: '#d4c4a8', fontWeight: 'bold', fontSize: '13px', zIndex: 2 }}>{noteInfo[notation]}</div>)}
                                    {isActive && (
                                        <div 
                                            className={`note-marker ${roleClass}`} 
                                            title={`${noteInfo.us} / ${noteInfo.eu}`}
                                            // L'opacité est réduite si la note est en dehors de la zone sélectionnée
                                            style={{ opacity: inZone ? 1 : 0.25, transition: 'opacity 0.3s' }}
                                        >
                                            {noteInfo[notation]}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}