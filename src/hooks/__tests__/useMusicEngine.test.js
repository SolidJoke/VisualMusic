import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMusicEngine } from '../useMusicEngine';
import { generateChordsFromNNS } from '../../core/theory';

// Mock theory and fingering logic if necessary, or use real ones for high-fidelity tests
describe('useMusicEngine', () => {
  const defaultParams = {
    appMode: 'studio',
    activeBrick: { 
      rootValue: 0, 
      modeName: 'Ionian', 
      guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      bassStrings: ['E1', 'A1', 'D2', 'G2'],
      theme: { primary: '#ffd700', bg: '#1a1a1a' }
    },
    clickedChord: { rootNote: { value: 0 }, nns: 'I' }, // C Major
    currentAbsoluteNotes: [48, 52, 55], // C3, E3, G3
    chordOctaveOffset: 0,
    displayMode: 'chord',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: '0',
    dictType: 'chord_major',
    dictActiveNotes: [],
    dictOctave: 0,
  };

  it('calculates guitar fingering for C Major chord in studio mode', () => {
    const { result } = renderHook(() => useMusicEngine(defaultParams));
    
    expect(result.current.guitarFingering).toBeDefined();
    // In MusicState v2, string 5 (Low E) should be muted for C Major open if it picks that shape
    // or it might pick a barre. But let's check the structure first.
    const fingering = result.current.guitarFingering;
    expect(fingering.fingeringMap).toBeDefined();
    
    // Check if the structure matches v2
    const lowE = fingering.fingeringMap[5];
    expect(lowE).toHaveProperty('status');
    expect(['played', 'open', 'muted']).toContain(lowE.status);
  });

  it('handles octave offset correctly', () => {
    const { result, rerender } = renderHook(
      (params) => useMusicEngine(params),
      { initialProps: defaultParams }
    );

    const initialOctave = result.current.guitarFingering.octave;
    
    rerender({ ...defaultParams, chordOctaveOffset: 1 });
    
    expect(result.current.guitarFingering.octave).toBe(initialOctave + 1);
  });

  it('reports isOutOfRange when notes are beyond instrument capability', () => {
    // Note E8 (MIDI 100) is way beyond guitar (max ~88)
    const outOfRangeParams = {
      ...defaultParams,
      currentAbsoluteNotes: [100, 104, 107],
      chordOctaveOffset: 4
    };
    const { result } = renderHook(() => useMusicEngine(outOfRangeParams));
    expect(result.current.guitarFingering.isOutOfRange).toBe(true);
  });

  it('detects out of range specifically for bass in dictionary mode', () => {
    const bassOutOfRangeParams = {
      ...defaultParams,
      appMode: 'dictionary',
      dictRoot: '0', // C
      dictType: 'chord_major',
      dictOctave: 2 // C4/C5 area
    };
    const { result } = renderHook(() => useMusicEngine(bassOutOfRangeParams));
    expect(result.current.isBassOutOfRange).toBe(true);
  });

  // VMU-117 — the "Vue instrument: Accords/Basse/Les deux" instrument-view
  // toggle is removed. In Studio mode, with a chord clicked, the notes
  // shown must always be the clicked chord's own notes (currentAbsoluteNotes,
  // mapped as-is) — never a separate "bass view" re-derivation folded into
  // octave 2 (previously reachable through that toggle's "Basse" option).
  it("shows the clicked chord's own notes, not a bass-only re-derivation", () => {
    const params = {
      ...defaultParams,
      clickedChord: { rootNote: { value: 0 }, nns: 'I' }, // C Major
      currentAbsoluteNotes: [48, 52, 55], // C3, E3, G3 — the actually-played voicing
    };
    const { result } = renderHook(() => useMusicEngine(params));
    const absoluteValues = result.current.activeNotes
      .map((n) => n.absoluteValue)
      .sort((a, b) => a - b);
    expect(absoluteValues).toEqual([48, 52, 55]);
  });
});

// VMU-129 — pendant la lecture, les instruments doivent suivre l'accord de
// la mesure en cours (publié par useSequencer.resolveMeasureChord), pas le
// dernier accord cliqué. À l'arrêt, rien ne change : c'est toujours
// clickedChord. Valeurs dérivées du domaine — "Pop Moderne (4 Accords)"
// (bricks.json), progression I-V-vi-IV en do majeur (rootValue 0,
// scale_major), triades à l'état fondamental, MIDI do4=60 :
//   I  (do majeur)  -> do4 mi4 sol4 = 60 64 67
//   V  (sol majeur) -> sol4 si4 ré5 = 67 71 74
describe('useMusicEngine — les instruments suivent la mesure en cours pendant la lecture (VMU-129)', () => {
  const activeBrick = { rootValue: 0, scaleKey: 'scale_major' };

  /** Same shape useSequencer.resolveMeasureChord publishes via setCurrentPlayingChord. */
  function playingChordFor(nns, absolutePitches) {
    const chord = generateChordsFromNNS(activeBrick.rootValue, activeBrick.scaleKey, [nns])[0];
    return { ...chord, absolutePitches };
  }

  const baseParams = {
    appMode: 'studio',
    activeBrick,
    displayMode: 'chord',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: '0',
    dictType: 'chord_major',
    dictActiveNotes: [],
    dictOctave: 0,
    chordOctaveOffset: 0,
  };

  it('measure 1 (I) shows do majeur, measure 2 (V) shows sol majeur — they differ and match the table', () => {
    const measure1 = playingChordFor('1', [60, 64, 67]);
    const measure2 = playingChordFor('5', [67, 71, 74]);

    const { result, rerender } = renderHook(
      (props) => useMusicEngine(props),
      {
        initialProps: {
          ...baseParams,
          clickedChord: null,
          currentAbsoluteNotes: [],
          isPlaying: true,
          currentPlayingChord: measure1,
        },
      }
    );
    const pitches1 = result.current.activeNotes.map((n) => n.absoluteValue).sort((a, b) => a - b);
    expect(pitches1).toEqual([60, 64, 67]);

    rerender({
      ...baseParams,
      clickedChord: null,
      currentAbsoluteNotes: [],
      isPlaying: true,
      currentPlayingChord: measure2,
    });
    const pitches2 = result.current.activeNotes.map((n) => n.absoluteValue).sort((a, b) => a - b);
    expect(pitches2).toEqual([67, 71, 74]);

    expect(pitches1).not.toEqual(pitches2);
  });

  // Break-proof for the test above: with `effectiveChord` reverted to plain
  // `clickedChord` (the pre-VMU-129 single source), this fails — measured
  // by hand, see the VMU-129 report for the command and the red output.
  it('at rest (isPlaying false), a stale currentPlayingChord is ignored — the clicked chord still governs', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' }; // do majeur, cliqué
    const staleFromPlayback = playingChordFor('5', [67, 71, 74]); // sol majeur, resté d'une lecture precedente

    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55], // do3 mi3 sol3 — la voix jouée au clic
        isPlaying: false,
        currentPlayingChord: staleFromPlayback,
      })
    );
    const pitches = result.current.activeNotes.map((n) => n.absoluteValue).sort((a, b) => a - b);
    // Un remplacement (au lieu d'un ajout) montrerait [67, 71, 74] ici.
    expect(pitches).toEqual([48, 52, 55]);
  });

  it('the fretboard fingerings also follow the chord playing, not the clicked one', () => {
    const measure2 = playingChordFor('5', [67, 71, 74]); // sol majeur
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        activeBrick: { ...activeBrick, guitarStrings: undefined, bassStrings: undefined },
        clickedChord: null,
        currentAbsoluteNotes: [],
        isPlaying: true,
        currentPlayingChord: measure2,
      })
    );
    // Racine sol (valeur chromatique 7) attendue dans le doigté, pas do (0).
    expect(result.current.guitarFingering).not.toBeNull();
    expect(result.current.currentRootValue).toBe(7);
  });
});
