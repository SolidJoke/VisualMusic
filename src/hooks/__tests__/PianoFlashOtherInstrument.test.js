import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFretboardPlayback } from '../useFretboardPlayback';
import { useDictionaryPlayback } from '../useDictionaryPlayback';
import { useStudioPlayback } from '../useStudioPlayback';
import * as AudioEngine from '../../audio/AudioEngine';

// VMU-180, point 5 — the piano must not blink a note that another instrument
// plays. PianoKeyboard flashes every PUBLISHED note that carries no instrument
// (a bare pitch is "the piano's own"), and ignores one tagged with another
// instrument. Measured in the served page before this fix (scripts/
// display_vs_sound_probe.mjs, point 5): a single note played by the guitar, a
// non-root note clicked on a neck, and a chord clicked in the Studio while the
// guitar or the bass sounds, all made the piano flash the neck's pitches.
//
// A neck lights a published note only when it also carries the string and the
// fret (core/fretboardUtils.js resolvePlayingState), so the tagged note keeps
// both. What stays bare, deliberately: a note of the piano itself, and a note
// published with no place on a neck.

// The playback hooks schedule their animation through Tone's draw clock. The
// callbacks are queued, not run: a test that needs a scheduled step (the bass
// arpeggio, VMU-199) decides which one to look at, as InstrumentOwnNotes does.
const drawQueue = [];
vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: (cb) => drawQueue.push(cb) })),
  Transport: { scheduleOnce: vi.fn(), start: vi.fn() },
}));

vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

const scheduler = () => ({
  ensureAudioReady: vi.fn(() => Promise.resolve()),
  startPlaybackSession: vi.fn(() => 1),
  isCurrentSession: vi.fn(() => true),
});

beforeEach(() => {
  drawQueue.length = 0;
});

/** The last non-empty array handed to a setCurrentlyPlayingNotes spy. */
const published = (setter) =>
  setter.mock.calls
    .map((c) => c[0])
    .filter((a) => Array.isArray(a) && a.length > 0)
    .at(-1);

/** Every non-empty array handed to a setCurrentlyPlayingNotes spy, in order. */
const publishedAll = (setter) =>
  setter.mock.calls
    .map((c) => c[0])
    .filter((a) => Array.isArray(a) && a.length > 0);

// ─── a note clicked on a neck (useFretboardPlayback) ───────────────────────

function renderFretboard(playbackInstrument = 'piano') {
  const setCurrentlyPlayingNotes = vi.fn();
  const hook = renderHook(() =>
    useFretboardPlayback({
      playbackInstrument,
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
      scheduler: scheduler(),
    }),
  );
  return { ...hook, setCurrentlyPlayingNotes };
}

describe('VMU-180 point 5 — a non-root note clicked on a neck is published with its instrument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guitar: G3 on string 2, fret 0 is published as the guitar\'s, with its place', async () => {
    const { result, setCurrentlyPlayingNotes } = renderFretboard();
    await act(async () => {
      await result.current.autoPlayNote('G3', { instrument: 'guitar', stringIndex: 2, fret: 0 });
    });
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('guitar', 'G3', '8n');
    expect(published(setCurrentlyPlayingNotes)).toEqual([
      { absoluteValue: 55, stringIndex: 2, fret: 0, instrument: 'guitar' },
    ]);
  });

  it('bass: G2 on string 1, fret 5 is published as the bass\'s, with its place', async () => {
    const { result, setCurrentlyPlayingNotes } = renderFretboard();
    await act(async () => {
      await result.current.autoPlayNote('G2', { instrument: 'bass', stringIndex: 1, fret: 5 });
    });
    expect(published(setCurrentlyPlayingNotes)).toEqual([
      { absoluteValue: 43, stringIndex: 1, fret: 5, instrument: 'bass' },
    ]);
  });

  it('guard — the piano\'s own key stays a bare pitch', async () => {
    const { result, setCurrentlyPlayingNotes } = renderFretboard();
    await act(async () => {
      await result.current.autoPlayNote('G4', { instrument: 'piano' });
    });
    expect(published(setCurrentlyPlayingNotes)).toEqual([67]);
  });
});

// ─── ▶ of a single note (useDictionaryPlayback) ───────────────────────────

function renderDictionary(instrument, realizations) {
  const setCurrentlyPlayingNotes = vi.fn();
  const hook = renderHook(() =>
    useDictionaryPlayback({
      dictRoot: '0',
      dictType: 'single_note',
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
      scheduler: scheduler(),
    }),
  );
  return { ...hook, setCurrentlyPlayingNotes };
}

describe('VMU-180 point 5 — ▶ of a single note on a neck is published with its instrument', () => {
  beforeEach(() => vi.clearAllMocks());

  // The realization of a single note carries no string or fret (measured in the
  // page), so the tag has no place; the neck lights every place of the pitch.
  it("guitar: C4 is published as the guitar's", async () => {
    const { result, setCurrentlyPlayingNotes } = renderDictionary('guitar', {
      piano: [{ absoluteValue: 60 }],
      guitar: [{ absoluteValue: 60 }],
      bass: [],
    });
    await act(async () => {
      await result.current.playDictionaryAudio('guitar');
    });
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('guitar', 'C4', '2n');
    expect(published(setCurrentlyPlayingNotes)).toEqual([{ absoluteValue: 60, instrument: 'guitar' }]);
  });

  it("bass: C4 is published as the bass's", async () => {
    const { result, setCurrentlyPlayingNotes } = renderDictionary('bass', {
      piano: [{ absoluteValue: 60 }],
      guitar: [],
      bass: [{ absoluteValue: 60 }],
    });
    await act(async () => {
      await result.current.playDictionaryAudio('bass');
    });
    expect(published(setCurrentlyPlayingNotes)).toEqual([{ absoluteValue: 60, instrument: 'bass' }]);
  });

  it('guard — the piano\'s note stays a bare pitch', async () => {
    const { result, setCurrentlyPlayingNotes } = renderDictionary('piano', {
      piano: [{ absoluteValue: 60 }],
      guitar: [],
      bass: [],
    });
    await act(async () => {
      await result.current.playDictionaryAudio('piano');
    });
    expect(published(setCurrentlyPlayingNotes)).toEqual([60]);
  });
});

// ─── a chord clicked in the Studio (useStudioPlayback) ────────────────────

const G_CHORD = { rootNote: { value: 7 }, nns: '1' };

function renderStudio(instrument) {
  const setCurrentAbsoluteNotes = vi.fn();
  const setCurrentlyPlayingNotes = vi.fn();
  const hook = renderHook(() =>
    useStudioPlayback({
      playbackInstrument: instrument,
      selectedRootStringGuitar: null,
      selectedRootStringBass: null,
      activeBrick: null,
      chordOctaveOffset: 0,
      currentAbsoluteNotes: [],
      setCurrentAbsoluteNotes,
      setCurrentlyPlayingNotes,
      setClickedChord: vi.fn(),
      scheduler: scheduler(),
      useShellVoicings: false,
    }),
  );
  return { ...hook, setCurrentAbsoluteNotes, setCurrentlyPlayingNotes };
}

describe('VMU-180 point 5 — a Studio chord click publishes the neck\'s notes with their instrument', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guitar: every flashed note carries instrument "guitar" and its place; the stored notes stay bare', async () => {
    const { result, setCurrentAbsoluteNotes, setCurrentlyPlayingNotes } = renderStudio('guitar');
    await act(async () => {
      await result.current.handleChordClick(G_CHORD, 0);
    });
    const flashed = published(setCurrentlyPlayingNotes);
    expect(flashed).toHaveLength(6);
    expect(
      flashed.every(
        (n) => n.instrument === 'guitar' && Number.isFinite(n.stringIndex) && Number.isFinite(n.fret),
      ),
    ).toBe(true);
    // The Studio's own state (the piano's chord, the next inversion) keeps pitches.
    const stored = setCurrentAbsoluteNotes.mock.calls.at(-1)[0];
    expect(stored.every((n) => typeof n === 'number')).toBe(true);
    expect(flashed.map((n) => n.absoluteValue)).toEqual(stored);
  });

  it('bass: every flashed note carries instrument "bass" and its place; the stored notes stay bare', async () => {
    const { result, setCurrentAbsoluteNotes, setCurrentlyPlayingNotes } = renderStudio('bass');
    await act(async () => {
      await result.current.handleChordClick(G_CHORD, 0);
    });
    // VMU-199: the monophonic bass plays its grip as a rising arpeggio, one
    // note at a time, each light scheduled through the draw clock. Run every
    // queued step so all the publications can be read, in order.
    act(() => {
      while (drawQueue.length) drawQueue.shift()();
    });
    const flashed = publishedAll(setCurrentlyPlayingNotes);
    // One publication per arpeggio step, each of exactly one note: the piano
    // flashes nothing because every one carries the bass's instrument tag.
    expect(flashed).toHaveLength(3);
    expect(flashed.map((notes) => notes.length)).toEqual([1, 1, 1]);
    const notes = flashed.map(([note]) => note);
    expect(
      notes.every(
        (n) => n.instrument === 'bass' && Number.isFinite(n.stringIndex) && Number.isFinite(n.fret),
      ),
    ).toBe(true);
    // Lowest first: the published pitches rise.
    const pitches = notes.map((n) => n.absoluteValue);
    for (let i = 1; i < pitches.length; i++) {
      expect(pitches[i]).toBeGreaterThan(pitches[i - 1]);
    }
    // The Studio's own state (the piano's chord, the next inversion) keeps pitches.
    const stored = setCurrentAbsoluteNotes.mock.calls.at(-1)[0];
    expect(stored.every((n) => typeof n === 'number')).toBe(true);
    expect(pitches).toEqual(stored);
  });

  it('guard — with the piano sounding, the notes stay bare pitches', async () => {
    const { result, setCurrentlyPlayingNotes } = renderStudio('piano');
    await act(async () => {
      await result.current.handleChordClick(G_CHORD, 0);
    });
    const flashed = published(setCurrentlyPlayingNotes);
    expect(flashed.length).toBeGreaterThan(0);
    expect(flashed.every((n) => typeof n === 'number')).toBe(true);
  });
});
