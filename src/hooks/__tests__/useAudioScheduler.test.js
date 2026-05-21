import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAudioScheduler } from '../useAudioScheduler';
import * as AudioEngine from '../../audio/AudioEngine';

vi.mock('../../audio/AudioEngine', () => ({
  startAudioEngine: vi.fn(() => Promise.resolve()),
  setMasterVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
}));

describe('useAudioScheduler', () => {
  it('manages playback tokens correctly', () => {
    const { result } = renderHook(() => useAudioScheduler({
      isAudioReady: false,
      setIsAudioReady: vi.fn(),
      masterVolume: -10,
    }));

    const token1 = result.current.startPlaybackSession();
    expect(token1).toBe(1);
    expect(result.current.isCurrentSession(token1)).toBe(true);

    const token2 = result.current.startPlaybackSession();
    expect(token2).toBe(2);
    expect(result.current.isCurrentSession(token1)).toBe(false);
    expect(result.current.isCurrentSession(token2)).toBe(true);
  });

  it('calls startAudioEngine and sets volume when ensureAudioReady is called and isAudioReady is false', async () => {
    const setIsAudioReady = vi.fn();
    const { result } = renderHook(() => useAudioScheduler({
      isAudioReady: false,
      setIsAudioReady,
      masterVolume: -10,
    }));

    await act(async () => {
      await result.current.ensureAudioReady();
    });

    expect(AudioEngine.startAudioEngine).toHaveBeenCalled();
    expect(AudioEngine.setMasterVolume).toHaveBeenCalledWith(-10);
    expect(setIsAudioReady).toHaveBeenCalledWith(true);
  });

  it('does not call startAudioEngine if isAudioReady is true', async () => {
    vi.clearAllMocks();
    const setIsAudioReady = vi.fn();
    const { result } = renderHook(() => useAudioScheduler({
      isAudioReady: true,
      setIsAudioReady,
      masterVolume: -10,
    }));

    await act(async () => {
      await result.current.ensureAudioReady();
    });

    expect(AudioEngine.startAudioEngine).not.toHaveBeenCalled();
    expect(setIsAudioReady).not.toHaveBeenCalled();
  });
});
