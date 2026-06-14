import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDictionaryPlayback } from '../useDictionaryPlayback';
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

describe('useDictionaryPlayback', () => {
  let mockScheduler;
  let setCurrentlyPlayingNotes;

  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentlyPlayingNotes = vi.fn();
    mockScheduler = {
      ensureAudioReady: vi.fn(() => Promise.resolve()),
      startPlaybackSession: vi.fn(() => 42),
      isCurrentSession: vi.fn(() => true),
    };
  });

  it('plays chord simultaneously', async () => {
    const { result } = renderHook(() => useDictionaryPlayback({
      dictType: 'chord_major',
      dictRoot: '0', // C
      playbackInstrument: 'piano',
      chordOctaveOffset: 0,
      activeNotes: [],
      setCurrentlyPlayingNotes,
      scheduler: mockScheduler,
    }));

    await act(async () => {
      await result.current.playDictionaryAudio();
    });

    expect(mockScheduler.ensureAudioReady).toHaveBeenCalled();
    expect(mockScheduler.startPlaybackSession).toHaveBeenCalled();
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith(
      'piano',
      ['C5', 'E5', 'G5'],
      '2n'
    );
    expect(setCurrentlyPlayingNotes).toHaveBeenCalledWith([60, 64, 67]);
  });

  it('plays single note fallback if dictType is neither chord nor scale', async () => {
    const { result } = renderHook(() => useDictionaryPlayback({
      dictType: 'note',
      dictRoot: '0', // C
      playbackInstrument: 'piano',
      activeNotes: [],
      setCurrentlyPlayingNotes,
      scheduler: mockScheduler,
    }));

    await act(async () => {
      await result.current.playDictionaryAudio();
    });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith(
      'piano',
      'C4', // Dans le cas fallback, c'est bien C4
      '2n'
    );
    // setCurrentlyPlayingNotes est appelé 2 fois : d'abord avec [], puis avec [60] (absNote pour C4 est 60 dans theory)
    expect(setCurrentlyPlayingNotes).toHaveBeenNthCalledWith(1, []);
    expect(setCurrentlyPlayingNotes).toHaveBeenNthCalledWith(2, [60]);
  });
});
