import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFretboardPlayback } from '../useFretboardPlayback';
import * as AudioEngine from '../../audio/AudioEngine';

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

  it('plays scale arpeggio asynchronously when root note is clicked', async () => {
    vi.useFakeTimers();

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

    // Advance timers to trigger the first note playback
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('piano', 'C5', '8n');

    vi.useRealTimers();
  });
});
