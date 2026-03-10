import React from 'react';
import './Fretboard.css';
import { NOTES, getAbsoluteNoteValue } from '../../core/theory';

export default function Fretboard({ instrument = 'guitar', activeNotes = [], notation = 'us', stringTuning, rootValue = 0, targetValue = -1, fretboardZone = 'all', onNoteClick, currentlyPlayingNotes = [] }) {
    const numFrets = 14;
    const defaultGuitar = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
    const defaultBass = ['E1', 'A1', 'D2', 'G2'];
    const strings = (stringTuning ? stringTuning : (instrument === 'bass' ? defaultBass : defaultGuitar)).slice().reverse();

    const getFrets = (count = numFrets) => {
        let frets = [];
        for (let i = 0; i <= count; i++) frets.push(i);
        return frets;
    };

    const isFretInZone = (fret) => {
        if (fretboardZone === 'all') return true;
        if (fretboardZone === 'open') return fret >= 0 && fret <= 4;
        if (fretboardZone === 'mid') return fret >= 5 && fret <= 9;
        if (fretboardZone === 'high') return fret >= 10 && fret <= 14;
        return true;
    };

    const getNoteNameFromValue = (val) => {
        if (val === null || val === undefined) return '';
        const noteInfo = NOTES[val % 12];
        const octave = Math.floor(val / 12) - 1;
        return `${noteInfo.us}${octave}`;
    }

    const renderDots = () => {
        const fretsWithDots = [3, 5, 7, 9, 12];
        return (
            <div className="fret-dots-layer">
                {getFrets().map(fret => (
                    <div key={`dot-fret-${fret}`} className={`dot-fret-cell ${fret === 0 ? 'open-string' : ''}`}>
                        {fretsWithDots.includes(fret) && (
                            fret === 12 ? (
                                <div className="double-dot-container">
                                    <div className="fretboard-dot"></div>
                                    <div className="fretboard-dot"></div>
                                </div>
                            ) : (
                                <div className="fretboard-dot"></div>
                            )
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fretboard-container">
            <h3 style={{ color: '#ccc', marginBottom: '10px' }}>{instrument === 'bass' ? '🎸 Basse (4 cordes)' : '🎸 Guitare (6 cordes)'}</h3>
            <div className="fretboard">
                {renderDots()}
                <div className="strings-layer">
                    {strings.map((rawStringData, stringIndex) => {
                        const openStringAbsValue = getAbsoluteNoteValue(rawStringData);
                        return (
                            <div key={`string-${stringIndex}`} className="string-row">
                                {getFrets().map(fret => {
                                    const absoluteValue = openStringAbsValue + fret;
                                    const noteValue = absoluteValue % 12;
                                    const noteInfo = NOTES.at(noteValue);
                                    const activeNote = activeNotes.find(n => (n.value % 12) === noteValue);
                                    const isActive = !!activeNote;
                                    const isPlaying = currentlyPlayingNotes.includes(absoluteValue);
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
                                            onClick={() => onNoteClick && onNoteClick(getNoteNameFromValue(absoluteValue))}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="string-line"></div>
                                            {fret === 0 && (<div style={{ position: 'absolute', left: '-30px', color: '#d4c4a8', fontWeight: 'bold', fontSize: '13px', zIndex: 2 }}>{noteInfo[notation]}</div>)}
                                            {isActive && (
                                                <div
                                                    className={`note-marker ${roleClass} ${isPlaying ? 'is-playing' : ''}`}
                                                    title={`${noteInfo.us} / ${noteInfo.eu}`}
                                                    style={{ opacity: inZone ? 1 : 0.25, transition: 'opacity 0.3s' }}
                                                >
                                                    {activeNote.order || noteInfo[notation]}
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
        </div>
    );
}