import React from 'react';
import './PianoKeyboard.css';
import { NOTES, getAbsoluteNoteValue } from '../../core/theory';

const BLACK_KEYS = [1, 3, 6, 8, 10];
const WHITE_KEY_WIDTH = 50;
const OCTAVE_WIDTH = 7 * WHITE_KEY_WIDTH;
const BLACK_KEY_OFFSETS = { 1: 35, 3: 85, 6: 185, 8: 235, 10: 285 };

export default function PianoKeyboard({ activeNotes = [], numOctaves = 3, notation = 'us', rootValue = 0, targetValue = -1, onNoteClick, currentlyPlayingNotes = [] }) {
    const keys = [];
    let whiteKeyCounter = 0;

    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < 12; i++) {
            const noteInfo = NOTES.at(i);
            const isBlack = BLACK_KEYS.includes(i);
            const noteName = `${noteInfo.us}${octave + 2}`; // Start piano at octave 2
            const absoluteValue = getAbsoluteNoteValue(noteName);

            const activeNote = activeNotes.find(n => (n.value % 12) === (i % 12));
            const isActive = !!activeNote;
            const isPlaying = currentlyPlayingNotes.includes(absoluteValue);

            let roleClass = '';
            if (isActive) {
                const interval = (i - rootValue + 12) % 12;
                if (i === targetValue) roleClass = 'role-target';
                else if (interval === 0) roleClass = 'role-root';
                else if (interval === 3 || interval === 4) roleClass = 'role-third';
                else if (interval === 7) roleClass = 'role-fifth';
                else roleClass = 'role-scale';
            }

            const keyStyle = {};
            if (isBlack) {
                const offset = BLACK_KEY_OFFSETS[i];
                if (offset !== undefined) {
                    keyStyle.left = `${(octave * OCTAVE_WIDTH) + offset}px`;
                }
            } else {
                whiteKeyCounter++;
            }

            keys.push(
                <div 
                    key={`octave-${octave}-note-${i}`} 
                    className={`piano-key ${isBlack ? 'black-key' : 'white-key'} ${roleClass} ${isPlaying ? 'is-playing' : ''}`} 
                    title={`${noteInfo.us} / ${noteInfo.eu}`}
                    onClick={() => onNoteClick && onNoteClick(noteName)}
                    style={keyStyle}
                >
                    <div className="note-label">{isActive ? (activeNote.order || noteInfo[notation]) : noteInfo[notation]}</div>
                </div>
            );
        }
    }
    return <div className="piano-container" style={{width: `${whiteKeyCounter * WHITE_KEY_WIDTH}px`}}>{keys}</div>;
}