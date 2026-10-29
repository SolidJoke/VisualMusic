import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStudioPlayback } from '../useStudioPlayback';
import { getGuitarFingering, getBassFingering } from '../../core/fingeringLogic';
import { getInstrumentTuning, fingeringMapToAbsolutePitches } from '../playbackUtils';
import { midiToNoteName, resolveNnsToChordType } from '../../core/theory';
import * as AudioEngine from '../../audio/AudioEngine';

// VMU-180 — in the Studio the chord a neck DRAWS is the chord the click PLAYS.
// useMusicEngine asks fingeringLogic for the default shape at
// `chordOctaveOffset`; useStudioPlayback asked for it at the default octave.
// With "Octave des accords" away from 0 the neck drew one grip and the audio
// engine was given another. G major is the measured example: an open G (320003)
// at octave 0, an E-shape barre (355433) at octave 2. (C major is not usable
// here: its open shape mutes the low E, and fingeringLogic encodes a muted
// string as `{ X: true }`, which fingeringMapToAbsolutePitches' V1 branch reads
// as a fret — NaN. That is pre-existing and outside this ticket.)

vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  Transport: { scheduleOnce: vi.fn(), start: vi.fn() },
}));

vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

const G_CHORD = { rootNote: { value: 7 }, nns: '1' };
const CHORD_TYPE = resolveNnsToChordType(G_CHORD.nns);

/** What the neck draws at `octave`: the same two calls useMusicEngine makes. */
function shapePitches(getFingering, instrument, octave) {
  const fingering = getFingering(G_CHORD.rootNote.value, CHORD_TYPE, null, octave);
  const reversedTuning = [...getInstrumentTuning(instrument, null)].reverse();
  return fingeringMapToAbsolutePitches(fingering.fingeringMap, reversedTuning).map(
    (p) => p.absoluteValue,
  );
}

function renderStudio(instrument, chordOctaveOffset) {
  const setCurrentAbsoluteNotes = vi.fn();
  const setCurrentlyPlayingNotes = vi.fn();
  const hook = renderHook(() =>
    useStudioPlayback({
      playbackInstrument: instrument,
      selectedRootStringGuitar: null,
      selectedRootStringBass: null,
      activeBrick: null,
      chordOctaveOffset,
      currentAbsoluteNotes: [],
      setCurrentAbsoluteNotes,
      setCurrentlyPlayingNotes,
      setClickedChord: vi.fn(),
      scheduler: {
        ensureAudioReady: vi.fn(() => Promise.resolve()),
        startPlaybackSession: vi.fn(() => 1),
        isCurrentSession: vi.fn(() => true),
      },
      useShellVoicings: false,
    }),
  );
  return { ...hook, setCurrentAbsoluteNotes };
}

describe('VMU-180 — the Studio chord click plays the drawn shape at the chord octave', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guitar: the octave selector does change the drawn shape (premise of this file)', () => {
    // Open G at 0 (G2 B2 D3 G3 B3 G4) vs E-shape barre at 2
    // (G2 D3 G3 B3 D4 G4).
    expect(shapePitches(getGuitarFingering, 'guitar', 2)).not.toEqual(
      shapePitches(getGuitarFingering, 'guitar', 0),
    );
  });

  it('bass: the shape does not change with the octave (bass fingering ignores it)', () => {
    // Stated so the bass case below is not mistaken for a regression test that
    // can fail before the fix: getBassFingering uses `octave` only for its
    // range report, never to pick the grip.
    expect(shapePitches(getBassFingering, 'bass', 2)).toEqual(
      shapePitches(getBassFingering, 'bass', 0),
    );
  });

  it('guitar: C major at octave 0 plays x32010 without throwing on the muted low E', async () => {
    // getGuitarFingering(0, 'chord_major', null, 0) is the open C shape:
    // low E muted (X), A fret 3 (C3=48), D fret 2 (E3=52), G open (G3=55),
    // B fret 1 (C4=60), high E open (E4=64). fingeringLogic writes the muted
    // string as `{ X: true }`; reading "X" as a fret pushed NaN into the chord
    // and midiToNoteName(NaN) threw on NOTES[NaN].us.
    const C_MAJOR = { rootNote: { value: 0 }, nns: '1' };
    const { result, setCurrentAbsoluteNotes } = renderStudio('guitar', 0);

    await act(async () => {
      await result.current.handleChordClick(C_MAJOR, 0);
    });

    const expected = [48, 52, 55, 60, 64];
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith(
      'guitar',
      expected.map(midiToNoteName),
      '2n',
    );
    expect(setCurrentAbsoluteNotes).toHaveBeenCalledWith(expected);
  });

  it.each([
    ['guitar', getGuitarFingering],
    ['bass', getBassFingering],
  ])('%s: chordOctaveOffset 2 plays the shape drawn at octave 2', async (instrument, getFingering) => {
    const expected = shapePitches(getFingering, instrument, 2);
    const { result, setCurrentAbsoluteNotes } = renderStudio(instrument, 2);

    await act(async () => {
      await result.current.handleChordClick(G_CHORD, 0);
    });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith(
      instrument,
      expected.map(midiToNoteName),
      '2n',
    );
    expect(setCurrentAbsoluteNotes).toHaveBeenCalledWith(expected);
  });

  it.each([
    ['guitar', getGuitarFingering],
    ['bass', getBassFingering],
  ])('%s: chordOctaveOffset 0 still plays the octave-0 shape', async (instrument, getFingering) => {
    const expected = shapePitches(getFingering, instrument, 0);
    const { result } = renderStudio(instrument, 0);

    await act(async () => {
      await result.current.handleChordClick(G_CHORD, 0);
    });

    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith(
      instrument,
      expected.map(midiToNoteName),
      '2n',
    );
  });
});
