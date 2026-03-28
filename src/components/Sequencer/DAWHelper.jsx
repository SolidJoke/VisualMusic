import React from 'react';
import './DAWHelper.css';

/**
 * DAWHelper — Textual description of the current pattern for DAW reproduction.
 *
 * Reads drum and melody tracks and generates a human-readable summary
 * that a user can use to recreate the pattern in their DAW.
 *
 * Props:
 * - drumTracks: Array of { name, activeSteps, lowVelocitySteps? }
 * - melodyTracks: Array of { name, activeSteps, lowVelocitySteps?, pitchSteps? }
 * - bpm: number
 * - genreName: string
 * - lang: 'fr' | 'en' | 'pt' | 'zh'
 */
export default function DAWHelper({ drumTracks = [], melodyTracks = [], bpm, genreName, lang = 'fr' }) {
    const labels = LABELS[lang] || LABELS.fr;

    return (
        <div className="daw-helper">
            <div className="daw-helper__title">
                {labels.title}
            </div>

            {/* Drum tracks */}
            {drumTracks.map((track, i) => (
                <div key={`d-${i}`} className="daw-helper__line">
                    <span className="daw-helper__icon">🥁</span>
                    <span className="daw-helper__text">
                        <strong>{track.name}</strong>:{' '}
                        {labels.steps} {formatSteps(track.activeSteps)}
                        {track.lowVelocitySteps?.length > 0 && (
                            <span className="daw-helper__ghost">
                                {' '}— {labels.ghost}: {formatSteps(track.lowVelocitySteps)}
                            </span>
                        )}
                        {' '}({describePattern(track.name, track.activeSteps)})
                    </span>
                </div>
            ))}

            {/* Melody tracks */}
            {melodyTracks.map((track, i) => (
                <div key={`m-${i}`} className="daw-helper__line">
                    <span className="daw-helper__icon">🎹</span>
                    <span className="daw-helper__text">
                        <strong>{track.name}</strong>:{' '}
                        {labels.steps} {formatSteps(track.activeSteps)}
                        {track.lowVelocitySteps?.length > 0 && (
                            <span className="daw-helper__ghost">
                                {' '}— {labels.ghost}: {formatSteps(track.lowVelocitySteps)}
                            </span>
                        )}
                        {track.pitchSteps && (
                            <span>
                                {' '}— {labels.pitches}: {formatPitchSteps(track.pitchSteps, track.activeSteps)}
                            </span>
                        )}
                    </span>
                </div>
            ))}

            {/* Meta info */}
            <div className="daw-helper__meta">
                ⏱️ {bpm} BPM | 🎵 {genreName} | 📐 16 {labels.steps16th}
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Format step indices as 1-based human-readable list */
function formatSteps(steps) {
    return steps.map(s => s + 1).join(', ');
}

/** Format pitchSteps as "step:interval" pairs */
function formatPitchSteps(pitchSteps, activeSteps) {
    return activeSteps
        .filter(s => pitchSteps[s])
        .map(s => `${s + 1}:${pitchSteps[s]}`)
        .join(', ');
}

/** Describe a common drum pattern in musical terms */
function describePattern(name, steps) {
    const n = name.toLowerCase();
    const len = steps.length;

    if (n.includes('kick')) {
        if (arraysEqual(steps, [0, 4, 8, 12])) return 'four-on-the-floor';
        if (arraysEqual(steps, [0, 8])) return 'beats 1 & 3';
        if (len <= 2) return 'sparse';
        if (len >= 8) return 'double kick';
        return `${len} hits`;
    }
    if (n.includes('snare') || n.includes('clap')) {
        if (arraysEqual(steps, [4, 12])) return 'backbeat (2 & 4)';
        if (arraysEqual(steps, [8])) return 'halftime (beat 3)';
        return `${len} hits`;
    }
    if (n.includes('hat')) {
        if (len >= 16) return '16th notes (all)';
        if (len === 8) return '8th notes';
        if (len === 4) return 'quarter notes';
        return `${len} hits`;
    }
    if (n.includes('bass')) {
        return `${len}-note pattern`;
    }
    return `${len} hits`;
}

function arraysEqual(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ─── i18n labels ─────────────────────────────────────────────────────

const LABELS = {
    fr: {
        title: '📋 Aide DAW — Reproduire ce pattern',
        steps: 'Steps',
        ghost: 'Ghost notes',
        pitches: 'Hauteurs',
        steps16th: 'doubles-croches par mesure',
    },
    en: {
        title: '📋 DAW Helper — Reproduce this pattern',
        steps: 'Steps',
        ghost: 'Ghost notes',
        pitches: 'Pitches',
        steps16th: '16th notes per bar',
    },
    pt: {
        title: '📋 Ajuda DAW — Reproduzir este padrão',
        steps: 'Steps',
        ghost: 'Ghost notes',
        pitches: 'Alturas',
        steps16th: 'semicolcheias por compasso',
    },
    zh: {
        title: '📋 DAW 帮助 — 复制此节奏',
        steps: 'Steps',
        ghost: 'Ghost notes',
        pitches: '音高',
        steps16th: '十六分音符/小节',
    },
};
