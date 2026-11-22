import React, { useEffect, useRef, useState } from 'react';
import './DAWHelper.css';
import { NOTES, toRoman } from '../../core/theory';
import { chordsInWindow, describeChord } from '../../core/timeline';

/**
 * DAWHelper — Textual description of the current pattern for DAW reproduction.
 *
 * Reads drum and melody tracks and generates a human-readable summary
 * that a user can use to recreate the pattern in their DAW.
 *
 * Props:
 * - drumTracks: Array of { name, activeSteps, lowVelocitySteps? } — one measure of each drum row
 * - melodyTracks: Array of { name, activeSteps, lowVelocitySteps?, pitchSteps? } — one measure of each melodic row
 * - bpm: number
 * - genreName: string
 * - lang: 'fr' | 'en' | 'pt' | 'zh'
 * - timeline: the timeline document the loop plays (core/timeline.js, T3) — its chords, in its key
 * - notation: 'eu' | 'us' — which chord-name notation to display (AppContext, VMU-100)
 */
export default function DAWHelper({ drumTracks = [], melodyTracks = [], bpm, genreName, lang = 'fr', timeline = null, notation = 'eu' }) {
    const labels = LABELS[lang] || LABELS.fr;

    // VMU-131 — one entry per chord the loop plays, in order. T3: the chords
    // of the timeline's window, as the document lays them out — the same
    // chordAt the chord and bass rows follow during playback (dispatch.js),
    // shown with the document's describeChord — never a second calculation.
    const measureChords = timeline
        ? chordsInWindow(timeline).map(({ chord }) => describeChord(timeline.key, chord))
        : [];

    // VMU-217 — "Copy the progression": one line a user pastes in a DAW note
    // or a chat, in the notation the chord row shows.
    const progressionLine = formatProgressionLine({ key: timeline?.key, bpm, chords: measureChords, notation });
    const [copyState, setCopyState] = useState('idle'); // 'idle' | 'copied' | 'failed'
    const resetTimer = useRef(null);
    useEffect(() => () => clearTimeout(resetTimer.current), []);
    const copyProgression = async () => {
        let next = 'copied';
        try {
            await navigator.clipboard.writeText(progressionLine);
        } catch {
            next = 'failed';
        }
        setCopyState(next);
        clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopyState('idle'), 2000);
    };

    return (
        <div className="daw-helper">
            <div className="daw-helper__title">
                {labels.title}
            </div>

            {/* Chord-per-measure row (VMU-131) */}
            {measureChords.length > 0 && (
                <div className="daw-helper__chords" data-testid="daw-helper-chords">
                    {measureChords.map((chord, i) => (
                        <span key={`c-${i}`} className="daw-helper__chord">
                            <span className="daw-helper__chord-degree">{toRoman(chord.nns)}</span>{' '}
                            <span className="daw-helper__chord-name">
                                {notation === 'us' ? chord.chordNameUS : chord.chordNameEU}
                            </span>
                        </span>
                    ))}
                </div>
            )}
            {measureChords.length > 0 && (
                <button
                    type="button"
                    className="daw-helper__copy"
                    data-testid="daw-helper-copy"
                    onClick={copyProgression}
                    aria-live="polite"
                >
                    {copyState === 'copied' ? labels.copied : copyState === 'failed' ? labels.copyFailed : labels.copy}
                </button>
            )}

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

            {/* Pitch Explanation Tip */}
            {(melodyTracks.some(t => t.pitchSteps)) && (
                <div className="daw-helper__tip">
                    {labels.pitchInfo}
                </div>
            )}

            {/* Meta info */}
            <div className="daw-helper__meta">
                ⏱️ {bpm} BPM | 🎵 {genreName} | 📐 16 {labels.steps16th}
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** "Sol · 130 bpm · Am7 – D7 – Gmaj7 – Gmaj7": key, tempo, then the chords the row above shows. */
function formatProgressionLine({ key, bpm, chords, notation }) {
    const tonic = key ? NOTES.find((note) => note.value === key.rootValue) : null;
    const names = chords.map((chord) => (notation === 'us' ? chord.chordNameUS : chord.chordNameEU));
    return [tonic && (notation === 'us' ? tonic.us : tonic.eu), `${bpm} bpm`, names.join(' – ')]
        .filter(Boolean)
        .join(' · ');
}

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
        return `Bass pattern (${len} hits)`;
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
        pitches: 'Hauteurs (R=Fondamentale, 3=Tierce, 5=Quinte)',
        steps16th: 'doubles-croches par mesure',
        pitchInfo: '💡 Les étiquettes (R, 3, 5, etc.) indiquent le degré par rapport à l\'accord en cours.',
        copy: 'Copier la progression',
        copied: 'Copié ✓',
        copyFailed: 'Copie impossible'
    },
    en: {
        title: '📋 DAW Helper — Reproduce this pattern',
        steps: 'Steps',
        ghost: 'Ghost notes',
        pitches: 'Pitches (R=Root, 3=Third, 5=Fifth)',
        steps16th: '16th notes per bar',
        pitchInfo: '💡 Labels (R, 3, 5, etc.) indicate the scale degree relative to the active chord.',
        copy: 'Copy the progression',
        copied: 'Copied ✓',
        copyFailed: 'Copy failed'
    },
    pt: {
        title: '📋 Ajuda DAW — Reproduzir este padrão',
        steps: 'Steps',
        ghost: 'Ghost notes',
        pitches: 'Alturas (0=Fundamental, +7=Quinta, +12=Oitava)',
        steps16th: 'semicolcheias por compasso',
        pitchInfo: '💡 Os números indicam o deslocamento de semitons em relação à nota fundamental do acorde.',
        copy: 'Copiar a progressão',
        copied: 'Copiado ✓',
        copyFailed: 'Falha ao copiar'
    },
    zh: {
        title: '📋 DAW 帮助 — 复制此节奏',
        steps: 'Steps',
        ghost: 'Ghost notes',
        pitches: '音高 (0=基音, +7=五度, +12=八度)',
        steps16th: '十六分音符/小节',
        pitchInfo: '💡 数字表示相对于和弦根音的半音偏移。',
        copy: '复制和弦进行',
        copied: '已复制 ✓',
        copyFailed: '复制失败'
    },
};
