import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tone — doit être déclaré avant tout import qui charge 'tone'
const drawScheduleMock = vi.fn();

vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: drawScheduleMock })),
  Transport: { scheduleOnce: vi.fn() },
}));

vi.mock('../../audio/AudioEngine', () => ({ playDictionaryNote: vi.fn() }));
vi.mock('../../core/fretboardLogic', () => ({ calcActivePath: vi.fn(() => []) }));
vi.mock('../../core/debugScale', () => ({
  logScalePosition: vi.fn(),
  logPlaybackSequence: vi.fn(),
  logNotePlay: vi.fn(),
}));

import * as Tone from 'tone';

describe('useDictionaryPlayback — Tone.getDraw usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Tone.getDraw is defined and schedule is callable', () => {
    const draw = Tone.getDraw();
    expect(draw.schedule).toBeDefined();
    expect(() => draw.schedule(() => {}, 2.0)).not.toThrow();
  });

  it('Tone.now() returns a consistent mocked number', () => {
    expect(Tone.now()).toBe(1.0);
  });

  it('Tone.getDraw().schedule is called for chord clear (integration)', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useDictionaryPlayback } = await import('../useDictionaryPlayback');

    const mockScheduler = {
      ensureAudioReady: vi.fn().mockResolvedValue(undefined),
      startPlaybackSession: vi.fn(() => 'token-dict-1'),
      isCurrentSession: vi.fn(() => true),
    };

    const { result } = renderHook(() =>
      useDictionaryPlayback({
        dictType: 'chord_major',
        dictRoot: '0',
        playbackInstrument: 'piano',
        chordOctaveOffset: 0,
        activeNotes: [],
        setCurrentlyPlayingNotes: vi.fn(),
        scheduler: mockScheduler,
      })
    );

    await act(async () => {
      await result.current.playDictionaryAudio();
    });

    // Tone.getDraw doit être appelé pour planifier le clear de l'accord
    expect(Tone.getDraw).toHaveBeenCalled();
    expect(drawScheduleMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Number)
    );
  });

  it('Tone.getDraw().schedule is called for single note clear (fallback)', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useDictionaryPlayback } = await import('../useDictionaryPlayback');

    const mockScheduler = {
      ensureAudioReady: vi.fn().mockResolvedValue(undefined),
      startPlaybackSession: vi.fn(() => 'token-dict-2'),
      isCurrentSession: vi.fn(() => true),
    };

    const { result } = renderHook(() =>
      useDictionaryPlayback({
        dictType: 'note',
        dictRoot: '0',
        playbackInstrument: 'piano',
        activeNotes: [],
        setCurrentlyPlayingNotes: vi.fn(),
        scheduler: mockScheduler,
      })
    );

    await act(async () => {
      await result.current.playDictionaryAudio();
    });

    expect(Tone.getDraw).toHaveBeenCalled();
    expect(drawScheduleMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Number)
    );
  });
});
