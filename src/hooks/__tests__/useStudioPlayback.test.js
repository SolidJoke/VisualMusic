import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStudioPlayback } from '../useStudioPlayback';
import * as AudioEngine from '../../audio/AudioEngine';

vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

describe('useStudioPlayback', () => {
  let mockScheduler;
  let setCurrentAbsoluteNotes;
  let setCurrentlyPlayingNotes;
  let setClickedChord;

  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentAbsoluteNotes = vi.fn();
    setCurrentlyPlayingNotes = vi.fn();
    setClickedChord = vi.fn();
    mockScheduler = {
      ensureAudioReady: vi.fn(() => Promise.resolve()),
    };
  });

  it('handles chord click for piano correctly', async () => {
    const chordMock = {
      rootNote: { value: 0 }, // C
      nns: 'I',
    };

    const { result } = renderHook(() => useStudioPlayback({
      playbackInstrument: 'piano',
      chordOctaveOffset: 0,
      currentAbsoluteNotes: [],
      setCurrentAbsoluteNotes,
      setCurrentlyPlayingNotes,
      setClickedChord,
      notation: 'us',
      scheduler: mockScheduler,
    }));

    await act(async () => {
      await result.current.handleChordClick(chordMock, 0);
    });

    expect(mockScheduler.ensureAudioReady).toHaveBeenCalled();
    expect(setClickedChord).toHaveBeenCalledWith(chordMock);
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith(
      'piano',
      ['C4', 'E4', 'G4'],
      '2n'
    );
    expect(setCurrentAbsoluteNotes).toHaveBeenCalledWith([48, 52, 55]);
    expect(setCurrentlyPlayingNotes).toHaveBeenCalledWith([48, 52, 55]);
  });
});
