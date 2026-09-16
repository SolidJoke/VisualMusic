import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMusicEngine } from '../useMusicEngine';
import { generateChordsFromNNS } from '../../core/theory';

// Mock theory and fingering logic if necessary, or use real ones for high-fidelity tests
describe('useMusicEngine', () => {
  const defaultParams = {
    appMode: 'studio',
    activeBrick: { 
      rootValue: 0, 
      modeName: 'Ionian', 
      guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      bassStrings: ['E1', 'A1', 'D2', 'G2'],
      theme: { primary: '#ffd700', bg: '#1a1a1a' }
    },
    clickedChord: { rootNote: { value: 0 }, nns: 'I' }, // C Major
    currentAbsoluteNotes: [48, 52, 55], // C3, E3, G3
    chordOctaveOffset: 0,
    displayMode: 'chord',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: '0',
    dictType: 'chord_major',
    dictActiveNotes: [],
    dictOctave: 0,
  };

  it('calculates guitar fingering for C Major chord in studio mode', () => {
    const { result } = renderHook(() => useMusicEngine(defaultParams));
    
    expect(result.current.guitarFingering).toBeDefined();
    // In MusicState v2, string 5 (Low E) should be muted for C Major open if it picks that shape
    // or it might pick a barre. But let's check the structure first.
    const fingering = result.current.guitarFingering;
    expect(fingering.fingeringMap).toBeDefined();
    
    // Check if the structure matches v2
    const lowE = fingering.fingeringMap[5];
    expect(lowE).toHaveProperty('status');
    expect(['played', 'open', 'muted']).toContain(lowE.status);
  });

  it('handles octave offset correctly', () => {
    const { result, rerender } = renderHook(
      (params) => useMusicEngine(params),
      { initialProps: defaultParams }
    );

    const initialOctave = result.current.guitarFingering.octave;
    
    rerender({ ...defaultParams, chordOctaveOffset: 1 });
    
    expect(result.current.guitarFingering.octave).toBe(initialOctave + 1);
  });

  it('reports isOutOfRange when notes are beyond instrument capability', () => {
    // Note E8 (MIDI 100) is way beyond guitar (max ~88)
    const outOfRangeParams = {
      ...defaultParams,
      currentAbsoluteNotes: [100, 104, 107],
      chordOctaveOffset: 4
    };
    const { result } = renderHook(() => useMusicEngine(outOfRangeParams));
    expect(result.current.guitarFingering.isOutOfRange).toBe(true);
  });

  it('detects out of range specifically for bass in dictionary mode', () => {
    const bassOutOfRangeParams = {
      ...defaultParams,
      appMode: 'dictionary',
      dictRoot: '0', // C
      dictType: 'chord_major',
      dictOctave: 2 // C4/C5 area
    };
    const { result } = renderHook(() => useMusicEngine(bassOutOfRangeParams));
    expect(result.current.isBassOutOfRange).toBe(true);
  });

  // VMU-117 — the "Vue instrument: Accords/Basse/Les deux" instrument-view
  // toggle is removed. In Studio mode, with a chord clicked, the notes
  // shown must always be the clicked chord's own notes (currentAbsoluteNotes,
  // mapped as-is) — never a separate "bass view" re-derivation folded into
  // octave 2 (previously reachable through that toggle's "Basse" option).
  it("shows the clicked chord's own notes, not a bass-only re-derivation", () => {
    const params = {
      ...defaultParams,
      clickedChord: { rootNote: { value: 0 }, nns: 'I' }, // C Major
      currentAbsoluteNotes: [48, 52, 55], // C3, E3, G3 — the actually-played voicing
    };
    const { result } = renderHook(() => useMusicEngine(params));
    const absoluteValues = result.current.activeNotes
      .map((n) => n.absoluteValue)
      .sort((a, b) => a - b);
    expect(absoluteValues).toEqual([48, 52, 55]);
  });
});

// VMU-129 — pendant la lecture, les instruments doivent suivre l'accord de
// la mesure en cours (publié par useSequencer.resolveMeasureChord), pas le
// dernier accord cliqué. À l'arrêt, rien ne change : c'est toujours
// clickedChord. Valeurs dérivées du domaine — "Pop Moderne (4 Accords)"
// (bricks.json), progression I-V-vi-IV en do majeur (rootValue 0,
// scale_major), triades à l'état fondamental, MIDI do4=60 :
//   I  (do majeur)  -> do4 mi4 sol4 = 60 64 67
//   V  (sol majeur) -> sol4 si4 ré5 = 67 71 74
describe('useMusicEngine — les instruments suivent la mesure en cours pendant la lecture (VMU-129)', () => {
  const activeBrick = { rootValue: 0, scaleKey: 'scale_major' };

  /** Same shape useSequencer.resolveMeasureChord publishes via setCurrentPlayingChord. */
  function playingChordFor(nns, absolutePitches) {
    const chord = generateChordsFromNNS(activeBrick.rootValue, activeBrick.scaleKey, [nns])[0];
    return { ...chord, absolutePitches };
  }

  const baseParams = {
    appMode: 'studio',
    activeBrick,
    displayMode: 'chord',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: '0',
    dictType: 'chord_major',
    dictActiveNotes: [],
    dictOctave: 0,
    chordOctaveOffset: 0,
  };

  it('measure 1 (I) shows do majeur, measure 2 (V) shows sol majeur — they differ and match the table', () => {
    const measure1 = playingChordFor('1', [60, 64, 67]);
    const measure2 = playingChordFor('5', [67, 71, 74]);

    const { result, rerender } = renderHook(
      (props) => useMusicEngine(props),
      {
        initialProps: {
          ...baseParams,
          clickedChord: null,
          currentAbsoluteNotes: [],
          isPlaying: true,
          currentPlayingChord: measure1,
        },
      }
    );
    const pitches1 = result.current.activeNotes.map((n) => n.absoluteValue).sort((a, b) => a - b);
    expect(pitches1).toEqual([60, 64, 67]);

    rerender({
      ...baseParams,
      clickedChord: null,
      currentAbsoluteNotes: [],
      isPlaying: true,
      currentPlayingChord: measure2,
    });
    const pitches2 = result.current.activeNotes.map((n) => n.absoluteValue).sort((a, b) => a - b);
    expect(pitches2).toEqual([67, 71, 74]);

    expect(pitches1).not.toEqual(pitches2);
  });

  // Break-proof for the test above: with `effectiveChord` reverted to plain
  // `clickedChord` (the pre-VMU-129 single source), this fails — measured
  // by hand, see the VMU-129 report for the command and the red output.
  it('at rest (isPlaying false), a stale currentPlayingChord is ignored — the clicked chord still governs', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' }; // do majeur, cliqué
    const staleFromPlayback = playingChordFor('5', [67, 71, 74]); // sol majeur, resté d'une lecture precedente

    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55], // do3 mi3 sol3 — la voix jouée au clic
        isPlaying: false,
        currentPlayingChord: staleFromPlayback,
      })
    );
    const pitches = result.current.activeNotes.map((n) => n.absoluteValue).sort((a, b) => a - b);
    // Un remplacement (au lieu d'un ajout) montrerait [67, 71, 74] ici.
    expect(pitches).toEqual([48, 52, 55]);
  });

  it('the fretboard fingerings also follow the chord playing, not the clicked one', () => {
    const measure2 = playingChordFor('5', [67, 71, 74]); // sol majeur
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        activeBrick: { ...activeBrick, guitarStrings: undefined, bassStrings: undefined },
        clickedChord: null,
        currentAbsoluteNotes: [],
        isPlaying: true,
        currentPlayingChord: measure2,
      })
    );
    // Racine sol (valeur chromatique 7) attendue dans le doigté, pas do (0).
    expect(result.current.guitarFingering).not.toBeNull();
    expect(result.current.currentRootValue).toBe(7);
  });
});

// VMU-123 — les cibles (targetValuesByInstrument) suivent le meme accord
// "effectif" que le reste du moteur (VMU-129) : l'accord joue pendant la
// lecture, l'accord clique a l'arret, la note caracteristique du mode sans
// accord. Piano et guitare recoivent les cibles ; la basse jamais (decision
// #4 du brief). Do majeur (racine 0, chord_major), preset par defaut
// majorMinor -> tierce mi (4). Sol majeur (racine 7) -> tierce si (11).
//
// Rouge predit (mesure avant ce commit) : `targetValue` valait -1 des qu'un
// accord existait (musicContext, useMusicEngine.js:151-153) ; ces tests White-
// box appellent le hook reel et echouaient donc tous sur le code d'avant.
describe('useMusicEngine — target notes (VMU-123)', () => {
  const activeBrick = { rootValue: 0, scaleKey: 'scale_major' };

  function playingChordFor(nns, absolutePitches) {
    const chord = generateChordsFromNNS(activeBrick.rootValue, activeBrick.scaleKey, [nns])[0];
    return { ...chord, absolutePitches };
  }

  const baseParams = {
    appMode: 'studio',
    activeBrick,
    displayMode: 'chord',
    selectedRootStringGuitar: null,
    selectedRootStringBass: null,
    selectedVoicingIndexGuitar: null,
    selectedVoicingIndexBass: null,
    dictRoot: '0',
    dictType: 'chord_major',
    dictActiveNotes: [],
    dictOctave: 0,
    chordOctaveOffset: 0,
  };

  it('while playing, the targets follow the chord being PLAYED, not the last clicked one', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' }; // do majeur clique
    const playingV = playingChordFor('5', [67, 71, 74]); // sol majeur en cours

    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55],
        isPlaying: true,
        currentPlayingChord: playingV,
        targetNotesPreset: 'majorMinor',
      })
    );
    // Tierce de sol majeur = si (11), pas tierce de do majeur = mi (4).
    expect(result.current.targetValuesByInstrument.piano).toEqual([11]);
    expect(result.current.targetValuesByInstrument.guitar).toEqual([11]);
  });

  it('at rest, a stale currentPlayingChord is ignored — the clicked chord still governs the targets', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' }; // do majeur
    const staleFromPlayback = playingChordFor('5', [67, 71, 74]); // sol majeur, obsolete

    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55],
        isPlaying: false,
        currentPlayingChord: staleFromPlayback,
        targetNotesPreset: 'majorMinor',
      })
    );
    expect(result.current.targetValuesByInstrument.piano).toEqual([4]); // mi, tierce de do
  });

  it('with no chord at all (Studio at rest, nothing clicked), the targets fall back to the characteristic note of the mode', () => {
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: null,
        currentAbsoluteNotes: [],
        isPlaying: false,
        currentPlayingChord: null,
        targetNotesPreset: 'majorMinor',
      })
    );
    // scale_major -> targetInterval 11 (note sensible), depuis do (0) -> si (11).
    expect(result.current.targetValuesByInstrument.piano).toEqual([11]);
  });

  it('with no chord, and a mode that declares no targetInterval, the targets are empty — never the root', () => {
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        activeBrick: { rootValue: 0, scaleKey: 'scale_harmonic_minor' }, // pas de targetInterval
        clickedChord: null,
        currentAbsoluteNotes: [],
        isPlaying: false,
        currentPlayingChord: null,
        targetNotesPreset: 'majorMinor',
      })
    );
    expect(result.current.targetValuesByInstrument.piano).toEqual([]);
  });

  it('the bass never receives a target, whatever the preset or the chord', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' };
    for (const preset of ['majorMinor', 'color', 'skeleton']) {
      const { result } = renderHook(() =>
        useMusicEngine({
          ...baseParams,
          clickedChord: clicked,
          currentAbsoluteNotes: [48, 52, 55],
          isPlaying: false,
          currentPlayingChord: null,
          targetNotesPreset: preset,
        })
      );
      expect(result.current.targetValuesByInstrument.bass).toEqual([]);
    }
  });

  it('preset "off" clears every instrument, chord or not', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' };
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55],
        isPlaying: false,
        currentPlayingChord: null,
        targetNotesPreset: 'off',
      })
    );
    expect(result.current.targetValuesByInstrument).toEqual({ piano: [], guitar: [], bass: [] });
  });

  it('Dictionary mode, a chord family, computes targets from dictRoot/dictType exactly like Studio', () => {
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        appMode: 'dictionary',
        clickedChord: null,
        currentAbsoluteNotes: [],
        dictRoot: '7', // sol
        dictType: 'chord_major',
        targetNotesPreset: 'majorMinor',
      })
    );
    expect(result.current.targetValuesByInstrument.piano).toEqual([11]); // si, tierce de sol
  });

  it('Dictionary mode, a scale family (no chord), falls back to the mode characteristic note', () => {
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        appMode: 'dictionary',
        clickedChord: null,
        currentAbsoluteNotes: [],
        dictRoot: '0',
        dictType: 'scale_major',
        targetNotesPreset: 'majorMinor',
      })
    );
    expect(result.current.targetValuesByInstrument.piano).toEqual([11]);
  });

  it('Dictionary mode, a single note (no chord, no scale), never shows a target', () => {
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        appMode: 'dictionary',
        clickedChord: null,
        currentAbsoluteNotes: [],
        dictRoot: '0',
        dictType: 'single_note',
        targetNotesPreset: 'majorMinor',
      })
    );
    expect(result.current.targetValuesByInstrument.piano).toEqual([]);
  });

  // VMU-123 (trouve en QA de VMU-129) — inversionText lisait encore
  // clickedChord/currentAbsoluteNotes directement : pendant la lecture,
  // l'etiquette de renversement restait celle de l'accord clique (ou vide).
  it('inversionText follows the chord being PLAYED, not the last clicked one', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' }; // do majeur, fondamentale
    // Sol majeur joue en 1er renversement : basse = si (71), fondamentale sol (7).
    const playingVFirstInversion = playingChordFor('5', [71, 74, 79]);

    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55], // do majeur a l'etat fondamental (clique)
        isPlaying: true,
        currentPlayingChord: playingVFirstInversion,
      })
    );
    // Si inversionText lisait encore clickedChord/currentAbsoluteNotes, ce
    // serait "root" (do majeur fondamental, l'accord clique) au lieu du
    // premier renversement de l'accord reellement joue.
    expect(result.current.inversionText).toBe('first');
  });

  it('at rest, inversionText still reads the clicked chord (unchanged pre-VMU-129 behaviour)', () => {
    const clicked = { rootNote: { value: 0 }, nns: '1' };
    const { result } = renderHook(() =>
      useMusicEngine({
        ...baseParams,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55], // do majeur, etat fondamental
        isPlaying: false,
        currentPlayingChord: null,
      })
    );
    expect(result.current.inversionText).toBe('root');
  });
});

// VMU-123 point 4 du "Definition de terminé" — preuve de cassage : si le
// calcul des cibles lisait l'accord CLIQUE au lieu d'effectiveChord pendant
// la lecture, ce test doit repasser au rouge. Vecu comme un test normal ici
// (pas un script jetable) pour qu'il proteje la regression dans le temps ;
// la sortie de la version cassee est citee dans le rapport, pas rejouee ici.
describe('useMusicEngine — target notes, breakage proof scaffold (VMU-123)', () => {
  it('while playing, the targets differ from what the CLICKED chord alone would give', () => {
    const activeBrick = { rootValue: 0, scaleKey: 'scale_major' };
    const clicked = { rootNote: { value: 0 }, nns: '1' }; // do majeur
    const playingV = { ...generateChordsFromNNS(0, 'scale_major', ['5'])[0], absolutePitches: [67, 71, 74] };

    const { result } = renderHook(() =>
      useMusicEngine({
        appMode: 'studio',
        activeBrick,
        displayMode: 'chord',
        selectedRootStringGuitar: null,
        selectedRootStringBass: null,
        selectedVoicingIndexGuitar: null,
        selectedVoicingIndexBass: null,
        dictRoot: '0',
        dictType: 'chord_major',
        dictActiveNotes: [],
        dictOctave: 0,
        chordOctaveOffset: 0,
        clickedChord: clicked,
        currentAbsoluteNotes: [48, 52, 55],
        isPlaying: true,
        currentPlayingChord: playingV,
        targetNotesPreset: 'majorMinor',
      })
    );
    // Cible du CLIQUE (do majeur) serait mi (4) ; cible attendue est celle du
    // JOUE (sol majeur) = si (11). Si le hook lit clickedChord au lieu
    // d'effectiveChord, cette assertion echoue (voir rapport pour la sortie
    // mesuree de cette regression volontaire).
    expect(result.current.targetValuesByInstrument.piano).toEqual([11]);
    expect(result.current.targetValuesByInstrument.piano).not.toEqual([4]);
  });
});
