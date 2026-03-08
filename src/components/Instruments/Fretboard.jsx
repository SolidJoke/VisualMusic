import React from 'react';
import './Fretboard.css';
import { NOTES } from '../../core/theory';

export default function Fretboard({ instrument = 'guitar', activeNotes = [], notation = 'us', stringTuning, rootValue = 0, targetValue = -1, fretboardZone = 'all', onNoteClick }) {
    const numFrets = 14; 
    // On utilise maintenant des strings par défaut pour correspondre à notre structure de données
    const defaultGuitar = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
    const defaultBass = ['E1', 'A1', 'D2', 'G2'];
    const strings = stringTuning ? stringTuning : (instrument === 'bass' ? defaultBass : defaultGuitar);

    const getFrets = () => {
        let frets = [];
        for(let i = 0; i <= numFrets; i++) frets.push(i);
        return frets;
    };

    const isFretInZone = (fret) => {
        if (fretboardZone === 'all') return true;
        if (fretboardZone === 'open') return fret >= 0 && fret <= 4;
        if (fretboardZone === 'mid') return fret >= 5 && fret <= 9;
        if (fretboardZone === 'high') return fret >= 10 && fret <= 14;
        return true;
    };

    // Helper 1: Extraction numérique simple pour l'affichage visuel
    const getNumericValueOfString = (str) => {
        const letter = String(str).replace(/[0-9]/g, '');
        const found = NOTES.find(n => n.us === letter);
        return found ? found.value : 0;
    };

    // Helper 2: Calcul scientifique de la note absolue pour Tone.js (ex: Frette 8 sur E2 -> C3)
    const getAbsoluteNote = (rawString, fret) => {
        const strVal = String(rawString);
        const letter = strVal.replace(/[0-9]/g, '');
        const baseOctaveStr = strVal.replace(/[^0-9]/g, '');
        const baseOctave = baseOctaveStr ? parseInt(baseOctaveStr, 10) : 2; 
        
        const found = NOTES.find(n => n.us === letter);
        const baseNoteClass = found ? found.value : 0;
        
        const totalSemitones = baseNoteClass + fret;
        const absoluteNoteClass = totalSemitones % 12;
        const octaveShift = Math.floor(totalSemitones / 12);
        const finalOctave = baseOctave + octaveShift;
        
        const finalNoteInfo = NOTES.at(absoluteNoteClass);
        return `${finalNoteInfo.us}${finalOctave}`;
    };

    return (
        <div className="fretboard-container">
            <h3 style={{color: '#ccc', marginBottom: '10px'}}>{instrument === 'bass' ? '🎸 Basse (4 cordes)' : '🎸 Guitare (6 cordes)'}</h3>
            <div className="fretboard">
                {strings.map((rawStringData, stringIndex) => {
                    const baseNoteValue = getNumericValueOfString(rawStringData);

                    return (
                        <div key={`string-${stringIndex}`} className="string-row">
                            {getFrets().map(fret => {
                                const noteValue = (baseNoteValue + fret) % 12;
                                const noteInfo = NOTES.at(noteValue);
                                
                                const isActive = activeNotes.some(n => (n % 12) === noteValue);
                                const hasDot = [3, 5, 7, 9, 12].includes(fret) && stringIndex === Math.floor(strings.length / 2);
                                const inZone = isFretInZone(fret); 
                                
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
                                    <div 
                                        key={`fret-${fret}`} 
                                        className={`fret ${fret === 0 ? 'open-string' : ''}`}
                                        onClick={() => onNoteClick && onNoteClick(getAbsoluteNote(rawStringData, fret))}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="string-line"></div>
                                        {hasDot && !isActive && <div className="fret-dot"></div>}
                                        {fret === 0 && (<div style={{ position: 'absolute', left: '-30px', color: '#d4c4a8', fontWeight: 'bold', fontSize: '13px', zIndex: 2 }}>{noteInfo[notation]}</div>)}
                                        {isActive && (
                                            <div 
                                                className={`note-marker ${roleClass}`} 
                                                title={`${noteInfo.us} / ${noteInfo.eu}`}
                                                style={{ opacity: inZone ? 1 : 0.25, transition: 'opacity 0.3s' }}
                                            >
                                                {noteInfo[notation]}
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
    );
}