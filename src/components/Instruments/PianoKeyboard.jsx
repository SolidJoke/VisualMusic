import React from 'react';
import './PianoKeyboard.css';
import { NOTES } from '../../core/theory';

const BLACK_KEYS = [1, 3, 6, 8, 10];

export default function PianoKeyboard({ activeNotes = [], numOctaves = 3, notation = 'us', rootValue = 0, targetValue = -1, onNoteClick }) {
    const keys = [];

    // Détection auto : Si on a des notes >= 12, c'est qu'on utilise des inversions précises
    const isAbsoluteMode = activeNotes.some(n => n >= 12);

    for (let octave = 0; octave < numOctaves; octave++) {
        for (let i = 0; i < 12; i++) {
            const noteInfo = NOTES.at(i);
            const isBlack = BLACK_KEYS.includes(i);
            const absoluteNote = octave * 12 + i;

            // En mode dictionnaire, on allume tous les 'i', en mode Studio on cible l'absoluteNote
            const isActive = isAbsoluteMode ? activeNotes.includes(absoluteNote) : activeNotes.includes(i);

            let roleClass = '';
            if (isActive) {
                const interval = (i - rootValue + 12) % 12;
                if (i === targetValue) roleClass = 'role-target';
                else if (interval === 0) roleClass = 'role-root';
                else if (interval === 3 || interval === 4) roleClass = 'role-third';
                else if (interval === 7) roleClass = 'role-fifth';
                else roleClass = 'role-scale';
            }

            // Calcul du nom absolu de la note pour Tone.js (ex: "C3", "F#4")
            // Le clavier visuel commence à l'octave 3 par défaut
            const absoluteNoteName = `${noteInfo.us}${octave + 3}`;

            keys.push(
                <div 
                    key={`octave-${octave}-note-${i}`} 
                    className={`piano-key ${isBlack ? 'black-key' : 'white-key'} ${roleClass}`} 
                    title={`${noteInfo.us} / ${noteInfo.eu}`}
                    onClick={() => onNoteClick && onNoteClick(absoluteNoteName)}
                >
                    <div className="note-label">{noteInfo[notation]}</div>
                </div>
            );
        }
    }
    return <div className="piano-container">{keys}</div>;
}