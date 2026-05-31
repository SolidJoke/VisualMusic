import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMusicEngine } from '../useMusicEngine';

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
    visualFocus: 'chords',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: '0',
    dictType: 'chord_major',
    dictActiveNotes: [],
    dictOctave: 0,
    fingeringMode: 'anatomic'
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
});
