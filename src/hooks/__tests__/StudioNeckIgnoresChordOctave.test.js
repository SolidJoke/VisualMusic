import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMusicEngine } from '../useMusicEngine';
import { useStudioPlayback } from '../useStudioPlayback';
import { getGuitarFingering, getBassFingering } from '../../core/fingeringLogic';

// VMU-201 — decision 2026-10-30: "Octave des accords" (`chordOctaveOffset`)
// moves the piano, the loop and the MIDI export. The guitar and the bass keep
// their own position whatever the setting is.
//
// Before this ticket the Studio passed the offset to the neck shape, so at ±2
// the guitar jumped from the open C shape to an A-string barre and a false
// "hors tessiture" warning fired — its notes (G2…G4) are well inside the
// guitar's 40..86. These tests pin the drawn shape (useMusicEngine) and, so the
// exception is not silently widened, that the piano still follows the setting.

vi.mock('tone', () => ({
  now: vi.fn(() => 1.0),
  getDraw: vi.fn(() => ({ schedule: vi.fn() })),
  Transport: { scheduleOnce: vi.fn(), start: vi.fn() },
}));

vi.mock('../../audio/AudioEngine', () => ({
  playDictionaryNote: vi.fn(),
}));

const ACTIVE_BRICK = { rootValue: 0, scaleKey: 'scale_major' };
const C_MAJOR = { rootNote: { value: 0 }, nns: '1' };

const OFFSETS = [-2, 0, 2];

/** The engine as AppDesktop wires it in the Studio, with C major clicked. */
function renderEngine(chordOctaveOffset) {
  return renderHook(() => useMusicEngine({
    appMode: 'studio',
    activeBrick: ACTIVE_BRICK,
    clickedChord: C_MAJOR,
    currentAbsoluteNotes: [60, 64, 67],
    chordOctaveOffset,
    displayMode: 'chord',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    placementByInstrument: {},
    dictRoot: '0',
    dictType: 'chord_major',
    dictActiveNotes: [],
    dictOctave: 0,
  }));
}

/** The pitches handleChordClick sends when the piano owns the realization. */
async function pianoPitches(chordOctaveOffset) {
  const setCurrentAbsoluteNotes = vi.fn();
  const { result } = renderHook(() => useStudioPlayback({
    playbackInstrument: 'piano',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    activeBrick: null,
    chordOctaveOffset,
    currentAbsoluteNotes: [],
    setCurrentAbsoluteNotes,
    setCurrentlyPlayingNotes: vi.fn(),
    setClickedChord: vi.fn(),
    scheduler: {
      ensureAudioReady: vi.fn(() => Promise.resolve()),
      startPlaybackSession: vi.fn(() => 1),
      isCurrentSession: vi.fn(() => true),
    },
    useShellVoicings: false,
  }));

  await act(async () => {
    await result.current.handleChordClick(C_MAJOR, 0);
  });
  return setCurrentAbsoluteNotes.mock.calls.at(-1)[0];
}

describe('VMU-201 — the Studio necks ignore "Octave des accords"', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['guitarFingering', 'bassFingering'])(
    '%s: the drawn shape is the same at -2, 0 and 2, and never out of range',
    (key) => {
      const at0 = renderEngine(0).result.current[key];
      expect(at0).toBeTruthy();
      expect(at0.isOutOfRange).toBeFalsy();

      for (const offset of OFFSETS) {
        const fingering = renderEngine(offset).result.current[key];
        expect(fingering.fingeringMap).toEqual(at0.fingeringMap);
        expect(fingering.isOutOfRange).toBeFalsy();
      }
    },
  );

  it('the guitar draws the open C shape (x32010) at every offset', () => {
    const frets = (offset) => {
      const { fingeringMap } = renderEngine(offset).result.current.guitarFingering;
      return Object.fromEntries(
        Object.entries(fingeringMap).map(([stringIndex, entry]) => [stringIndex, entry.fret]),
      );
    };
    // Low E muted (-1 in the v2 map), A 3, D 2, G open 0, B 1, high E open 0.
    const openC = { 0: 0, 1: 1, 2: 0, 3: 2, 4: 3, 5: -1 };
    for (const offset of OFFSETS) expect(frets(offset)).toEqual(openC);
  });

  it.each(['guitar', 'bass'])(
    '%s: the position list is the octave-0 list at -2, 0 and 2',
    (instrument) => {
      const placementsAt = (offset) =>
        renderEngine(offset).result.current.placementsByInstrument[instrument];
      const at0 = placementsAt(0);
      expect(at0.length).toBeGreaterThan(0);

      for (const offset of OFFSETS) expect(placementsAt(offset)).toEqual(at0);

      // The equality above is necessary but does not bite on its own: the list
      // never reads `chordOctaveOffset`, so hard-coding another octave in
      // placementSelectionFor leaves the three lists equal to each other. Pin
      // the list to the octave-0 shape instead: the guitar's default grip, and
      // the octave the shapes were asked for (the bass grip does not depend on
      // it, so only its octave field can catch the mutation).
      const getDefault = instrument === 'guitar' ? getGuitarFingering : getBassFingering;
      const octave0 = getDefault(C_MAJOR.rootNote.value, 'chord_major', null, 0);
      const defaultPlacement = at0.find((placement) => placement.isDefault);
      expect(defaultPlacement).toBeTruthy();
      expect(defaultPlacement.fingering.fingeringMap).toEqual(octave0.fingeringMap);
      for (const placement of at0) expect(placement.fingering.octave).toBe(0);
    },
  );

  it('the piano still follows the setting: offset 2 is 24 semitones above offset 0', async () => {
    const at0 = await pianoPitches(0);
    const at2 = await pianoPitches(2);

    expect(at0.length).toBeGreaterThan(0);
    expect(at2).toEqual(at0.map((pitch) => pitch + 24));
  });
});
