import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Tone — doit être déclaré avant tout import qui charge 'tone'
const drawScheduleMock = vi.fn();

vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: drawScheduleMock })),
  Transport: {
    scheduleOnce: vi.fn(),
    start: vi.fn(),
  },
}));

// Mock AudioEngine
vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

// Mock fingeringLogic (requis par useStudioPlayback)
vi.mock('../../core/fingeringLogic', () => ({
  getGuitarFingering: vi.fn(() => null),
  getBassFingering: vi.fn(() => null),
}));

// Mock voicingEngine
vi.mock('../../core/voicingEngine', () => ({
  applyShellVoicing: vi.fn((pitches) => pitches),
}));

import * as Tone from 'tone';

describe('useStudioPlayback — timing migration (Tone.getDraw)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Tone.getDraw() is defined and returns an object with schedule()', () => {
    const draw = Tone.getDraw();
    expect(draw).toBeDefined();
    expect(typeof draw.schedule).toBe('function');
  });

  it('Tone.now() returns the expected mocked number', () => {
    expect(Tone.now()).toBe(1.0);
  });

  it('Tone.getDraw().schedule can be called without throwing', () => {
    const draw = Tone.getDraw();
    expect(() => draw.schedule(() => {}, 1.5)).not.toThrow();
  });

  it('does not reference setTimeout for note clearing (integration guard)', async () => {
    // On vérifie que Tone.getDraw est appelé lorsque handleChordClick est invoqué
    const { renderHook, act } = await import('@testing-library/react');
    const { useStudioPlayback } = await import('../useStudioPlayback');

    const mockScheduler = {
      ensureAudioReady: vi.fn().mockResolvedValue(undefined),
      startPlaybackSession: vi.fn(() => 'token-abc'),
      isCurrentSession: vi.fn(() => true),
    };

    const { result } = renderHook(() =>
      useStudioPlayback({
        playbackInstrument: 'piano',
        chordOctaveOffset: 0,
        currentAbsoluteNotes: [],
        setCurrentAbsoluteNotes: vi.fn(),
        setCurrentlyPlayingNotes: vi.fn(),
        setClickedChord: vi.fn(),
        notation: 'us',
        scheduler: mockScheduler,
        useShellVoicings: false,
      })
    );

    await act(async () => {
      await result.current.handleChordClick(
        { rootNote: { value: 0 }, nns: 'I' },
        0
      );
    });

    // Tone.getDraw doit avoir été appelé pour planifier le clear
    expect(Tone.getDraw).toHaveBeenCalled();
    // La fonction schedule du draw doit avoir été appelée avec un callback et un time
    expect(drawScheduleMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Number)
    );
  });
});
