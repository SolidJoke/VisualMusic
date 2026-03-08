import React from 'react';
import './PianoKeyboard.css';
import { NOTES } from '../../core/theory';

const BLACK_KEYS = new Array(1, 3, 6, 8, 10);

export default function PianoKeyboard({ activeNotes = new Array(), numOctaves = 2, notation = 'us', rootValue = 0, targetValue = -1 }) {
    const keys = new Array();

    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < 12; i++) {
            const noteInfo = NOTES.at(i);
            const isBlack = BLACK_KEYS.includes(i);
            const isActive = activeNotes.includes(i);

            let roleClass = '';
            if (isActive) {
                const interval = (i - rootValue + 12) % 12;
                // SI c'est la Note Magique de ce mode, on l'illumine en Or !
                if (i === targetValue) roleClass = 'role-target';
                else if (interval === 0) roleClass = 'role-root';
                else if (interval === 3 || interval === 4) roleClass = 'role-third';
                else if (interval === 7) roleClass = 'role-fifth';
                else roleClass = 'role-scale';
            }

            keys.push(
                <div key={`octave-${octave}-note-${i}`} className={`piano-key ${isBlack ? 'black-key' : 'white-key'} ${roleClass}`} title={`${noteInfo.us} / ${noteInfo.eu}`}>
                    <div className="note-label">{noteInfo[notation]}</div>
                </div>
            );
        }
    }
    return <div className="piano-container">{keys}</div>;
}