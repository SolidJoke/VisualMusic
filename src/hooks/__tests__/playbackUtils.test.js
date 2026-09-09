import { describe, it, expect, vi } from 'vitest';
import { fingeringMapToAbsolutePitches, buildAscDescSequence, buildScaleBoxSequence } from '../playbackUtils';

// La convention MIDI du projet : getAbsoluteNoteValue('E2') = 40, 'A2' = 45, 'D3' = 50
// (octave+1)*12 + noteValue → E2=(2+1)*12+4=40, A2=(2+1)*12+9=45, D3=(3+1)*12+2=50
vi.mock('../../core/theory', () => ({
  getAbsoluteNoteValue: (noteName) => {
    const map = { 'E2': 40, 'A2': 45, 'D3': 50, 'G3': 55, 'B3': 59, 'E4': 64 };
    return map[noteName] ?? 60;
  }
}));

vi.mock('../../core/tunings', () => ({
  TUNINGS: {
    GUITAR_STANDARD: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    BASS_STANDARD: ['E1', 'A1', 'D2', 'G2'],
  }
}));

describe('fingeringMapToAbsolutePitches', () => {
  it('retourne les pitches triés par absoluteValue ascendant', () => {
    // Map avec strings dans ordre d\'insertion non-trié (string 2 avant string 0)
    const fingeringMap = {
      2: { 3: 1 },  // D3(50) + 3 = 53
      0: { 5: 2 },  // E2(40) + 5 = 45
      1: { 2: 3 },  // A2(45) + 2 = 47
    };
    const reversedTuning = ['E2', 'A2', 'D3'];
    const result = fingeringMapToAbsolutePitches(fingeringMap, reversedTuning);
    const values = result.map(p => p.absoluteValue);
    // Doit être en ordre ascendant, peu importe l'ordre d'insertion de fingeringMap
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('exclut les cordes mutées (X)', () => {
    const fingeringMap = { 0: { 2: 'X' }, 1: { 3: 1 } };
    const reversedTuning = ['E2', 'A2'];
    const result = fingeringMapToAbsolutePitches(fingeringMap, reversedTuning);
    expect(result).toHaveLength(1);
  });

  it("attache l'instrument si fourni", () => {
    const fingeringMap = { 0: { 2: 1 } };
    const result = fingeringMapToAbsolutePitches(fingeringMap, ['E2'], 'guitar');
    expect(result[0].instrument).toBe('guitar');
  });
});

describe('buildAscDescSequence', () => {
  it('construit [A,B,C,D,C,B,A] depuis [A,B,C,D]', () => {
    const result = buildAscDescSequence([10, 20, 30, 40]);
    expect(result).toEqual([10, 20, 30, 40, 30, 20, 10]);
  });

  it('gère un seul élément', () => {
    expect(buildAscDescSequence([42])).toEqual([42]);
  });
});

describe('buildScaleBoxSequence', () => {
  // Accordage inversé tel que le construit useFretboardPlayback :
  // index 0 = corde la plus AIGUË.
  const REVERSED = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];

  // Position 3 sur 5 de la gamme de Do majeur à la guitare, telle que la
  // renvoie getAvailableScaleFingerings(0, 'scale_major', 'guitar', standard).
  // Valeurs relevées sur la fonction réelle, pas inventées.
  const C_MAJOR_POS_2 = [
    { stringIndex: 5, fret: 8 },  // E2 + 8  = 48  Do3
    { stringIndex: 4, fret: 5 },  // A2 + 5  = 50  Ré3
    { stringIndex: 4, fret: 7 },  // A2 + 7  = 52  Mi3
    { stringIndex: 4, fret: 8 },  // A2 + 8  = 53  Fa3
    { stringIndex: 3, fret: 5 },  // D3 + 5  = 55  Sol3
    { stringIndex: 3, fret: 7 },  // D3 + 7  = 57  La3
    { stringIndex: 2, fret: 4 },  // G3 + 4  = 59  Si3
    { stringIndex: 2, fret: 5 },  // G3 + 5  = 60  Do4
  ];

  it('produit des hauteurs numériques, pas des chaînes', () => {
    // Le défaut corrigé : reversedTuning[i] est un NOM de note, donc
    // `reversedTuning[i] + fret` concatène — 'G3' + 5 === 'G35' — et tout
    // `% 12` en aval devient NaN, jusqu'au NOTES[NaN] qui levait une exception.
    const seq = buildScaleBoxSequence(C_MAJOR_POS_2, REVERSED, 0, 'guitar');

    expect(seq.length).toBeGreaterThan(0);
    for (const note of seq) {
      expect(typeof note.absoluteValue).toBe('number');
      expect(Number.isFinite(note.absoluteValue)).toBe(true);
      expect(Number.isNaN(note.absoluteValue % 12)).toBe(false);
    }
  });

  it('monte de la fondamentale à l’octave sur une gamme majeure, puis redescend', () => {
    const seq = buildScaleBoxSequence(C_MAJOR_POS_2, REVERSED, 0, 'guitar');
    const pitches = seq.map((n) => n.absoluteValue);

    // Aller : 8 notes, de Do3 à Do4
    const ascending = pitches.slice(0, 8);
    expect(ascending).toEqual([48, 50, 52, 53, 55, 57, 59, 60]);

    // La première note jouée est la fondamentale, la dernière de l'aller est
    // son octave. C'est le sens musical, indépendamment des valeurs MIDI.
    expect(ascending[0] % 12).toBe(0);
    expect(ascending[ascending.length - 1] - ascending[0]).toBe(12);

    // Et les intervalles sont bien ceux d'une gamme majeure : ton, ton,
    // demi-ton, ton, ton, ton, demi-ton.
    const intervals = ascending.slice(1).map((p, i) => p - ascending[i]);
    expect(intervals).toEqual([2, 2, 1, 2, 2, 2, 1]);

    // Retour : on redescend sans rejouer le sommet, jusqu'à la fondamentale.
    expect(pitches).toEqual([...ascending, ...[...ascending].slice(0, -1).reverse()]);
  });

  it('trie par hauteur même si scaleFrets arrive dans le désordre', () => {
    const shuffled = [C_MAJOR_POS_2[6], C_MAJOR_POS_2[0], C_MAJOR_POS_2[3],
                      C_MAJOR_POS_2[7], C_MAJOR_POS_2[1], C_MAJOR_POS_2[5],
                      C_MAJOR_POS_2[2], C_MAJOR_POS_2[4]];

    const fromShuffled = buildScaleBoxSequence(shuffled, REVERSED, 0, 'guitar');
    const fromOrdered = buildScaleBoxSequence(C_MAJOR_POS_2, REVERSED, 0, 'guitar');

    expect(fromShuffled.map((n) => n.absoluteValue))
      .toEqual(fromOrdered.map((n) => n.absoluteValue));
  });

  it('conserve corde et frette pour le retour visuel', () => {
    const seq = buildScaleBoxSequence(C_MAJOR_POS_2, REVERSED, 0, 'guitar');
    expect(seq[0]).toMatchObject({ absoluteValue: 48, stringIndex: 5, fret: 8, instrument: 'guitar' });
  });

  it('retourne un tableau vide sans scaleFrets', () => {
    expect(buildScaleBoxSequence([], REVERSED, 0)).toEqual([]);
    expect(buildScaleBoxSequence(undefined, REVERSED, 0)).toEqual([]);
  });
});
