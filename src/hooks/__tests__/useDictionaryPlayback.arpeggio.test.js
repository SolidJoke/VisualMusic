import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The draw callbacks are captured, not run, so the test can play the
// animation back in schedule order and check what each step lit.
const draws = vi.hoisted(() => ({ scheduled: [] }));

vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({
    schedule: (cb, time) => draws.scheduled.push({ cb, time }),
  })),
  Transport: { scheduleOnce: vi.fn() },
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
import { useDictionaryPlayback } from '../useDictionaryPlayback';

// C major on the bass as the neck draws it: C2 G2 C3. Deliberately unsorted,
// so the arpeggio's own sort is what puts them in playing order.
const C_BASS = [
  { value: 0, absoluteValue: 48, order: 1, stringIndex: 1, fret: 5, instrument: 'bass' }, // C3
  { value: 0, absoluteValue: 36, order: 1, stringIndex: 2, fret: 3, instrument: 'bass' }, // C2
  { value: 7, absoluteValue: 43, order: 5, stringIndex: 1, fret: 0, instrument: 'bass' }, // G2
];

const C_GUITAR = [
  { value: 0, absoluteValue: 48, order: 1, stringIndex: 4, fret: 3, instrument: 'guitar' },
  { value: 4, absoluteValue: 52, order: 3, stringIndex: 3, fret: 2, instrument: 'guitar' },
  { value: 7, absoluteValue: 55, order: 5, stringIndex: 2, fret: 0, instrument: 'guitar' },
  { value: 0, absoluteValue: 60, order: 1, stringIndex: 1, fret: 1, instrument: 'guitar' },
  { value: 4, absoluteValue: 64, order: 3, stringIndex: 0, fret: 0, instrument: 'guitar' },
];

function mount(instrument, realizations) {
  const setCurrentlyPlayingNotes = vi.fn();
  const scheduler = {
    ensureAudioReady: vi.fn(() => Promise.resolve()),
    startPlaybackSession: vi.fn(() => 42),
    isCurrentSession: vi.fn(() => true),
  };
  const hook = renderHook(() => useDictionaryPlayback({
    dictRoot: '0',
    dictType: 'chord_major',
    dictOctave: 0,
    playbackInstrument: instrument,
    setPlaybackInstrument: vi.fn(),
    guitarFingering: null,
    bassFingering: null,
    activeBrick: null,
    realizationsByInstrument: realizations,
    currentBpm: 120,
    lastClickedContext: null,
    setCurrentlyPlayingNotes,
    scheduler,
  }));
  return { ...hook, setCurrentlyPlayingNotes };
}

/** Runs the captured draw callbacks in schedule order; returns what was lit. */
function litInOrder(setCurrentlyPlayingNotes) {
  for (const { cb } of [...draws.scheduled].sort((a, b) => a.time - b.time)) cb();
  return setCurrentlyPlayingNotes.mock.calls
    .map((c) => c[0])
    .filter((a) => Array.isArray(a) && a.length > 0);
}

describe('VMU-199 — a bass chord in the Dictionary is a rising arpeggio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    draws.scheduled.length = 0;
  });

  it('calls the engine once per drawn note, low to high, a sixteenth apart', async () => {
    const { result } = mount('bass', { bass: C_BASS, piano: [], guitar: [] });

    await act(async () => {
      await result.current.playDictionaryAudio('bass');
    });

    expect(AudioEngine.playDictionaryNote.mock.calls).toEqual([
      ['bass', 'C2', '16n', 1],
      ['bass', 'G2', '16n', 1.125],
      ['bass', 'C3', '16n', 1.25],
    ]);
    expect(DictionaryVoices.rememberDictionaryVoice).toHaveBeenCalledTimes(3);
  });

  it('lights one tagged note at a time, in playing order, and clears it after', async () => {
    const { result, setCurrentlyPlayingNotes } = mount('bass', {
      bass: C_BASS, piano: [], guitar: [],
    });

    await act(async () => {
      await result.current.playDictionaryAudio('bass');
    });

    const lit = litInOrder(setCurrentlyPlayingNotes);
    expect(lit).toHaveLength(3);
    expect(lit.map((notes) => notes.length)).toEqual([1, 1, 1]);
    expect(lit.map(([note]) => note.absoluteValue)).toEqual([36, 43, 48]);
    expect(lit.every(([note]) => note.instrument === 'bass')).toBe(true);
    // The tagged realization objects themselves, so the neck lights them.
    expect(lit.map(([note]) => note)).toEqual([C_BASS[1], C_BASS[2], C_BASS[0]]);
  });

  it('a guitar chord still plays all its notes in one call, lit together', async () => {
    const { result, setCurrentlyPlayingNotes } = mount('guitar', {
      guitar: C_GUITAR, piano: [], bass: [],
    });

    await act(async () => {
      await result.current.playDictionaryAudio('guitar');
    });

    expect(AudioEngine.playDictionaryNote.mock.calls).toEqual([
      ['guitar', ['C3', 'E3', 'G3', 'C4', 'E4'], '2n'],
    ]);
    const lit = litInOrder(setCurrentlyPlayingNotes);
    expect(lit).toHaveLength(1);
    expect(lit[0]).toEqual(C_GUITAR);
  });
});
