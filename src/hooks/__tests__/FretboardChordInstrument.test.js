import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFretboardPlayback } from '../useFretboardPlayback';
import * as AudioEngine from '../../audio/AudioEngine';

// VMU-180 — a chord clicked on a neck publishes notes TAGGED with the neck's
// instrument. An untagged pitch is read by PianoKeyboard as the piano's own, so
// the guitar's grip made the keyboard flash. `instrument` is the third
// parameter of fingeringMapToAbsolutePitches (playbackUtils.js).

vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  Transport: { scheduleOnce: vi.fn() },
}));

vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

// Open C grip x32010 in the V2 shape useMusicEngine exposes to the app.
const C_GUITAR_V2 = {
  0: { fret: 0, status: 'open' },
  1: { fret: 1, status: 'played' },
  2: { fret: 0, status: 'open' },
  3: { fret: 2, status: 'played' },
  4: { fret: 3, status: 'played' },
  5: { fret: -1, status: 'muted' },
};

// C major on the bass, from getBassFingering(0, 'chord_major', null):
// A string fret 3 (C2), D string fret 5 (G2), G string fret 5 (C3).
const C_BASS_V2 = {
  0: { fret: 5, status: 'played' },
  1: { fret: 5, status: 'played' },
  2: { fret: 3, status: 'played' },
  3: { fret: -1, status: 'muted' },
};

function renderFretboard(overrides) {
  const setCurrentlyPlayingNotes = vi.fn();
  const hook = renderHook(() =>
    useFretboardPlayback({
      playbackInstrument: 'piano',
      setPlaybackInstrument: vi.fn(),
      appMode: 'dictionary',
      dictRoot: '0',
      dictType: 'chord_major',
      activeNotes: [],
      guitarFingering: null,
      bassFingering: null,
      activeBrick: null,
      currentBpm: 120,
      lastClickedContext: null,
      setCurrentlyPlayingNotes,
      setContextualScaleAbsoluteValues: vi.fn(),
      setLastClickedContext: vi.fn(),
      setSinglePlayContext: vi.fn(),
      setScaleAnchor: vi.fn(),
      scheduler: {
        ensureAudioReady: vi.fn(() => Promise.resolve()),
        startPlaybackSession: vi.fn(() => 1),
        isCurrentSession: vi.fn(() => true),
      },
      ...overrides,
    }),
  );
  return { ...hook, setCurrentlyPlayingNotes };
}

/** The last non-empty array handed to setCurrentlyPlayingNotes. */
const publishedNotes = (setter) =>
  setter.mock.calls
    .map((c) => c[0])
    .filter((a) => Array.isArray(a) && a.length > 0)
    .at(-1);

describe('VMU-180 — a chord click on a neck publishes notes tied to its instrument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guitar: every note published for the grip carries instrument "guitar"', async () => {
    const { result, setCurrentlyPlayingNotes } = renderFretboard({
      guitarFingering: { fingeringMap: C_GUITAR_V2 },
    });

    await act(async () => {
      await result.current.autoPlayNote('C3', { instrument: 'guitar', stringIndex: 4, fret: 3 });
    });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith(
      'guitar',
      ['C3', 'E3', 'G3', 'C4', 'E4'],
      '2n',
    );
    const published = publishedNotes(setCurrentlyPlayingNotes);
    expect(published).toHaveLength(5);
    expect(published.every((n) => n?.instrument === 'guitar')).toBe(true);
  });

  it('bass: every note published for the grip carries instrument "bass"', async () => {
    const { result, setCurrentlyPlayingNotes } = renderFretboard({
      bassFingering: { fingeringMap: C_BASS_V2 },
    });

    await act(async () => {
      await result.current.autoPlayNote('C2', { instrument: 'bass', stringIndex: 2, fret: 3 });
    });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('bass', ['C2', 'G2', 'C3'], '2n');
    const published = publishedNotes(setCurrentlyPlayingNotes);
    expect(published).toHaveLength(3);
    expect(published.every((n) => n?.instrument === 'bass')).toBe(true);
  });
});
