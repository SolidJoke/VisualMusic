import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const draws = vi.hoisted(() => ({ scheduled: [] }));

vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({
    schedule: (cb, time) => draws.scheduled.push({ cb, time }),
  })),
  Transport: { scheduleOnce: vi.fn(), start: vi.fn() },
}));

vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

vi.mock('../../audio/dictionaryVoices', () => ({
  rememberDictionaryVoice: vi.fn(),
  stopDictionaryVoices: vi.fn(),
}));

import * as AudioEngine from '../../audio/AudioEngine';
import * as DictionaryVoices from '../../audio/dictionaryVoices';
import { useStudioPlayback } from '../useStudioPlayback';

const C_CHORD = { rootNote: { value: 0 }, nns: '1' };

function mount(instrument, currentBpm) {
  const setCurrentAbsoluteNotes = vi.fn();
  const setCurrentlyPlayingNotes = vi.fn();
  const hook = renderHook(() => useStudioPlayback({
    playbackInstrument: instrument,
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    activeBrick: null,
    chordOctaveOffset: 0,
    currentAbsoluteNotes: [],
    setCurrentAbsoluteNotes,
    setCurrentlyPlayingNotes,
    setClickedChord: vi.fn(),
    scheduler: {
      ensureAudioReady: vi.fn(() => Promise.resolve()),
      startPlaybackSession: vi.fn(() => 7),
      isCurrentSession: vi.fn(() => true),
    },
    useShellVoicings: false,
    currentBpm,
  }));
  return { ...hook, setCurrentAbsoluteNotes, setCurrentlyPlayingNotes };
}

/** Runs the captured draw callbacks in schedule order; returns what was lit. */
function litInOrder(setCurrentlyPlayingNotes) {
  for (const { cb } of [...draws.scheduled].sort((a, b) => a.time - b.time)) cb();
  return setCurrentlyPlayingNotes.mock.calls
    .map((c) => c[0])
    .filter((a) => Array.isArray(a) && a.length > 0);
}

describe('VMU-199 — a bass chord click in the Studio is a rising arpeggio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    draws.scheduled.length = 0;
  });

  it('plays the drawn grip note by note, a sixteenth apart at 120 bpm', async () => {
    const { result, setCurrentAbsoluteNotes } = mount('bass', 120);

    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    expect(AudioEngine.playDictionaryNote.mock.calls).toEqual([
      ['bass', 'C2', '16n', 1],
      ['bass', 'G2', '16n', 1.125],
      ['bass', 'C3', '16n', 1.25],
    ]);
    // The chord context is still the whole chord.
    expect(setCurrentAbsoluteNotes).toHaveBeenCalledWith([36, 43, 48]);
  });

  it('takes back the previous voices before scheduling, and remembers each note', async () => {
    const { result } = mount('bass', 120);

    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    expect(DictionaryVoices.stopDictionaryVoices).toHaveBeenCalledTimes(1);
    expect(DictionaryVoices.rememberDictionaryVoice).toHaveBeenCalledTimes(3);
    expect(DictionaryVoices.stopDictionaryVoices.mock.invocationCallOrder[0]).toBeLessThan(
      AudioEngine.playDictionaryNote.mock.invocationCallOrder[0],
    );
  });

  it('lights one tagged note at a time, in playing order', async () => {
    const { result, setCurrentlyPlayingNotes } = mount('bass', 120);

    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    const lit = litInOrder(setCurrentlyPlayingNotes);
    expect(lit).toHaveLength(3);
    expect(lit.map((notes) => notes.length)).toEqual([1, 1, 1]);
    expect(lit.map(([note]) => note.absoluteValue)).toEqual([36, 43, 48]);
    expect(lit.every(([note]) => note.instrument === 'bass')).toBe(true);
  });

  it('defaults to 120 bpm when no tempo is given', async () => {
    const { result } = mount('bass', undefined);

    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    expect(AudioEngine.playDictionaryNote.mock.calls.map((c) => c[3])).toEqual([1, 1.125, 1.25]);
  });

  it('a piano click is unchanged: one call with the whole chord', async () => {
    const { result, setCurrentlyPlayingNotes } = mount('piano', 120);

    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    expect(AudioEngine.playDictionaryNote.mock.calls).toEqual([
      ['piano', ['C4', 'E4', 'G4'], '2n'],
    ]);
    expect(DictionaryVoices.stopDictionaryVoices).not.toHaveBeenCalled();
    expect(setCurrentlyPlayingNotes).toHaveBeenCalledWith([60, 64, 67]);
  });

  it('a guitar click is unchanged: one call with the whole grip', async () => {
    const { result, setCurrentlyPlayingNotes } = mount('guitar', 120);

    await act(async () => {
      await result.current.handleChordClick(C_CHORD, 0);
    });

    expect(AudioEngine.playDictionaryNote.mock.calls).toEqual([
      ['guitar', ['C3', 'E3', 'G3', 'C4', 'E4'], '2n'],
    ]);
    expect(DictionaryVoices.stopDictionaryVoices).not.toHaveBeenCalled();
    expect(setCurrentlyPlayingNotes).toHaveBeenCalledTimes(1);
    expect(setCurrentlyPlayingNotes.mock.calls[0][0].map((n) => n.absoluteValue)).toEqual([
      48, 52, 55, 60, 64,
    ]);
    expect(setCurrentlyPlayingNotes.mock.calls[0][0].every((n) => n.instrument === 'guitar')).toBe(
      true,
    );
  });
});
