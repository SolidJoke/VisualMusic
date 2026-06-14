import { describe, it, expect, vi } from 'vitest';
import { fingeringMapToAbsolutePitches, buildAscDescSequence } from '../playbackUtils';

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
