import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFretboardPlayback } from '../useFretboardPlayback';
import * as AudioEngine from '../../audio/AudioEngine';

// Mock Tone.js pour éviter l'accès à AudioContext en JSDOM
vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  Transport: { scheduleOnce: vi.fn() },
}));

vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

describe('useFretboardPlayback', () => {
  let mockScheduler;
  let setCurrentlyPlayingNotes;
  let setContextualScaleAbsoluteValues;
  let setLastClickedContext;
  let setSinglePlayContext;
  let setScaleAnchor;

  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentlyPlayingNotes = vi.fn();
    setContextualScaleAbsoluteValues = vi.fn();
    setLastClickedContext = vi.fn();
    setSinglePlayContext = vi.fn();
    setScaleAnchor = vi.fn();
    mockScheduler = {
      ensureAudioReady: vi.fn(() => Promise.resolve()),
      startPlaybackSession: vi.fn(() => 77),
      isCurrentSession: vi.fn(() => true),
    };
  });

  it('plays single non-root note synchronously', async () => {
    const { result } = renderHook(() => useFretboardPlayback({
      playbackInstrument: 'piano',
      setPlaybackInstrument: vi.fn(),
      appMode: 'dictionary',
      dictRoot: '0', // C
      dictType: 'scale_major',
      activeNotes: [{ value: 0 }],
      guitarFingering: null,
      bassFingering: null,
      activeBrick: null,
      currentBpm: 120,
      setCurrentlyPlayingNotes,
      setContextualScaleAbsoluteValues,
      setLastClickedContext,
      setSinglePlayContext,
      setScaleAnchor,
      scheduler: mockScheduler,
    }));

    await act(async () => {
      // D4 (pitch 62) is not C (root 0), so it should play synchronously
      await result.current.playSingleNote('D4');
    });

    expect(mockScheduler.ensureAudioReady).toHaveBeenCalled();
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('piano', 'D4', '8n');
    expect(setCurrentlyPlayingNotes).toHaveBeenCalledWith([62]);
  });

  it('plays scale arpeggio — first note played immediately with Tone scheduling', async () => {
    // Avec la migration Tone.getDraw, playDictionaryNote est appelé directement
    // dans le forEach (pas de setTimeout) et les callbacks UI passent par Tone.getDraw.schedule.
    const { result } = renderHook(() => useFretboardPlayback({
      playbackInstrument: 'piano',
      setPlaybackInstrument: vi.fn(),
      appMode: 'dictionary',
      dictRoot: '0', // C
      dictType: 'scale_major',
      activeNotes: [{ value: 0 }],
      guitarFingering: null,
      bassFingering: null,
      activeBrick: null,
      currentBpm: 120,
      setCurrentlyPlayingNotes,
      setContextualScaleAbsoluteValues,
      setLastClickedContext,
      setSinglePlayContext,
      setScaleAnchor,
      scheduler: mockScheduler,
    }));

    await act(async () => {
      // C4 (pitch 60) is root 0, should trigger arpeggio
      await result.current.playSingleNote('C4');
    });

    expect(mockScheduler.ensureAudioReady).toHaveBeenCalled();
    expect(setContextualScaleAbsoluteValues).toHaveBeenCalled();

    // Après migration Tone, playDictionaryNote est appelé directement (plus de setTimeout)
    // La première note (C5) est la première de la gamme montante
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('piano', 'C5', '8n', expect.any(Number));
  });
});
