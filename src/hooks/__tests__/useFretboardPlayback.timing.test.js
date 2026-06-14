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

import * as Tone from 'tone';

describe('useFretboardPlayback — Tone.getDraw usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Tone.getDraw is defined and schedule is callable', () => {
    const draw = Tone.getDraw();
    expect(draw.schedule).toBeDefined();
    expect(() => draw.schedule(() => {}, 1.5)).not.toThrow();
  });

  it('Tone.now() returns a number', () => {
    expect(typeof Tone.now()).toBe('number');
  });

  it('Tone.getDraw().schedule is called for chord clear (integration)', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useFretboardPlayback } = await import('../useFretboardPlayback');

    const mockScheduler = {
      ensureAudioReady: vi.fn().mockResolvedValue(undefined),
      startPlaybackSession: vi.fn(() => 'token-fret-1'),
      isCurrentSession: vi.fn(() => true),
    };

    const { result } = renderHook(() =>
      useFretboardPlayback({
        playbackInstrument: 'piano',
        setPlaybackInstrument: vi.fn(),
        appMode: 'dictionary',
        dictRoot: '0', // C
        dictType: 'chord_major',
        activeNotes: [{ value: 0 }],
        guitarFingering: null,
        bassFingering: null,
        activeBrick: null,
        currentBpm: 120,
        lastClickedContext: null,
        setCurrentlyPlayingNotes: vi.fn(),
        setContextualScaleAbsoluteValues: vi.fn(),
        setLastClickedContext: vi.fn(),
        setSinglePlayContext: vi.fn(),
        setScaleAnchor: vi.fn(),
        scheduler: mockScheduler,
      })
    );

    // C4 (pitch 60) est la racine → déclenche séquence chord
    await act(async () => {
      await result.current.playSingleNote('C4');
    });

    // Tone.getDraw doit être appelé pour planifier le clear de l'accord
    expect(Tone.getDraw).toHaveBeenCalled();
    expect(drawScheduleMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Number)
    );
  });
});
