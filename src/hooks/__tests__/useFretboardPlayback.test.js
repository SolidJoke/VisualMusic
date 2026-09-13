import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFretboardPlayback } from '../useFretboardPlayback';
import * as AudioEngine from '../../audio/AudioEngine';

// Mock Tone.js pour éviter l'accès à AudioContext en JSDOM
vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  Transport: { scheduleOnce: vi.fn() },
}));

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

  it('plays scale arpeggio — first note played immediately with Tone scheduling', async () => {
    // Avec la migration Tone.getDraw, playDictionaryNote est appelé directement
    // dans le forEach (pas de setTimeout) et les callbacks UI passent par Tone.getDraw.schedule.
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

    // Après migration Tone, playDictionaryNote est appelé directement (plus de setTimeout)
    // La première note est la fondamentale cliquée, C4. Ce test attendait C5 —
    // une octave au-dessus de la note cliquée — et passait.
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('piano', 'C4', '8n', expect.any(Number));
  });
});

// VMU-105. Clicking the guitar neck while the piano is selected switches the
// instrument AND plays, in the same event. `setPlaybackInstrument` has not
// re-rendered the hook yet, so a `playbackInstrument` read from the closure is
// still 'piano'. Measured in the browser on 62b80bb: the guitar grip of C major
// (C3-E4) went to the piano sampler, an octave below the piano's own C4-G4 —
// the "chord played lower" Gabriel heard. The mock below never re-renders,
// which is exactly that same-event state.
describe('useFretboardPlayback — plays the instrument that was clicked (VMU-105)', () => {
  // Standard tuning, low string first: E2 A2 D3 G3 B3 E4. Fretboard indices
  // count from the highest string, so index 4 is the A string (A2 = MIDI 45).
  // Open C grip x32010, pitches derived from the instrument, not from the code:
  // A2+3 = C3 (48), D3+2 = E3 (52), G3 open (55), B3+1 = C4 (60), E4 open (64).
  const openCGrip = {
    0: { fret: 0, status: 'open' },
    1: { fret: 1, status: 'played' },
    2: { fret: 0, status: 'open' },
    3: { fret: 2, status: 'played' },
    4: { fret: 3, status: 'played' },
    5: { fret: null, status: 'muted' },
  };

  const renderWithPianoSelected = (overrides) => {
    const setPlaybackInstrument = vi.fn();
    const scheduler = {
      ensureAudioReady: vi.fn(() => Promise.resolve()),
      startPlaybackSession: vi.fn(() => 1),
      isCurrentSession: vi.fn(() => true),
    };
    const hook = renderHook(() => useFretboardPlayback({
      playbackInstrument: 'piano',
      setPlaybackInstrument,
      appMode: 'dictionary',
      dictRoot: '0',
      dictType: 'chord_major',
      activeNotes: [],
      guitarFingering: { fingeringMap: openCGrip },
      bassFingering: null,
      activeBrick: null,
      currentBpm: 120,
      lastClickedContext: null,
      setCurrentlyPlayingNotes: vi.fn(),
      setContextualScaleAbsoluteValues: vi.fn(),
      setLastClickedContext: vi.fn(),
      setSinglePlayContext: vi.fn(),
      setScaleAnchor: vi.fn(),
      scheduler,
      ...overrides,
    }));
    return { ...hook, setPlaybackInstrument };
  };

  beforeEach(() => vi.clearAllMocks());

  it('a chord root clicked on the guitar plays the guitar grip on the guitar', async () => {
    const { result, setPlaybackInstrument } = renderWithPianoSelected();

    await act(async () => {
      await result.current.autoPlayNote('C3', { instrument: 'guitar', stringIndex: 4, fret: 3 });
    });

    expect(setPlaybackInstrument).toHaveBeenCalledWith('guitar');
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledTimes(1);
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('guitar', ['C3', 'E3', 'G3', 'C4', 'E4'], '2n');
  });

  it('a non-root note clicked on the guitar plays that note on the guitar', async () => {
    const { result } = renderWithPianoSelected();

    await act(async () => {
      // D string, fret 2 = E3: a chord tone, but not the root.
      await result.current.autoPlayNote('E3', { instrument: 'guitar', stringIndex: 3, fret: 2 });
    });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith('guitar', 'E3', '8n');
    expect(AudioEngine.playDictionaryNote).not.toHaveBeenCalledWith('piano', expect.anything(), expect.anything());
  });

  it('a scale root clicked on the guitar plays every note of the box on the guitar', async () => {
    // C major box fragment: A string frets 3 and 5 (C3, D3), D string fret 2
    // (E3), G string fret 5 (C4). Root to root and back: C3 D3 E3 C4 E3 D3 C3.
    const { result } = renderWithPianoSelected({
      dictType: 'scale_major',
      guitarFingering: {
        scaleFrets: [
          { stringIndex: 4, fret: 3 },
          { stringIndex: 4, fret: 5 },
          { stringIndex: 3, fret: 2 },
          { stringIndex: 2, fret: 5 },
        ],
      },
    });

    await act(async () => {
      await result.current.autoPlayNote('C3', { instrument: 'guitar', stringIndex: 4, fret: 3 });
    });

    const calls = AudioEngine.playDictionaryNote.mock.calls;
    expect(calls.map((c) => c[1])).toEqual(['C3', 'D3', 'E3', 'C4', 'E3', 'D3', 'C3']);
    expect(calls.map((c) => c[0])).toEqual(Array(7).fill('guitar'));
  });
});
