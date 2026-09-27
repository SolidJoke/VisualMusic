// src/core/__tests__/inversionAndPlayability_symbolReading.test.js
//
// VMU-162 — getInversionType and calculatePlayabilityScore (core/harmonyEngine.js)
// each read a chord symbol by hand instead of through theory.js's single rule
// (parseChordSymbol / resolveNnsToChordType, PR #132, VMU-157/158). Three
// concrete misreadings, confirmed by reading `185318d`:
//
// - getInversionType: `isMinor = nns.includes('-') || nns.includes('m')`
//   matches the lowercase "m" inside "maj7" — "1maj7" (a major seventh,
//   lowercase NNS notation — theory.js's SUFFIX_TYPES has both 'maj7' and
//   'Maj7' as distinct valid suffixes) reads as MINOR: its third is placed
//   at +3 semitones instead of +4.
//
// - getInversionType: `isDim = ... || nns.includes('b5')` treats ANY symbol
//   containing "b5" as a diminished chord — but "b5" alone (no 7/dim suffix)
//   is a chord built on the flat-5th SCALE DEGREE, a plain major triad in
//   this codebase's own convention (see NnsResolution.test.js, style 16
//   "Thrash / Groove Metal", E locrian: "b5" -> "Bb", type chord_major). Its
//   fifth is a perfect 5th (+7), not a diminished 5th (+6) — the coordinator
//   named this "libellé d'inversion faux pour Metal Épique B, Groove Metal"
//   (both styles use a bare "b5" in their progression).
//
// - calculatePlayabilityScore's `if (!type) { if (nns.includes('maj7')) ...
//   else if (nns.includes('7')) type = 'chord_7' ... }` chain is case
//   sensitive: "1Maj7" (capital M, VMU-157/158's own roman-numeral
//   normalization of "IMaj7") fails the 'maj7' check and falls through to
//   the bare `includes('7')` check, scoring as a DOMINANT seventh. The bare
//   degree "7" (a major triad on the mode's 7th degree — same convention as
//   "1", "4", "5", see NnsResolution.test.js row `["7", "scale_dorian",
//   "Bb"]`) hits the same `includes('7')` check and is also scored as a
//   dominant seventh.
//
// All four cases are red against `185318d` and green once both functions
// route through parseChordSymbol / resolveNnsToChordType.
import { describe, it, expect } from 'vitest';
import { getInversionType, calculatePlayabilityScore } from '../harmonyEngine';

describe('VMU-162 — getInversionType reads the symbol through the single rule, not by hand', () => {
  it('"1maj7" (major 7th, lowercase NNS notation) is NOT read as minor: bass=third is a major third away (+4)', () => {
    // C major 7 (root=0): major third = E (pitch class 4). MIDI 64 = E4.
    expect(getInversionType(64, 0, '1maj7')).toBe('first');
  });

  it('"1Maj7" (capital M, the roman-numeral normalization) reads the same way — consistency check', () => {
    expect(getInversionType(64, 0, '1Maj7')).toBe('first');
  });

  it('"b5" (a plain triad on the flat-5 degree — "Metal Épique B", "Groove Metal") is NOT read as diminished: bass=fifth is a perfect 5th away (+7)', () => {
    // C major triad built "on" the symbol "b5" (root=0): perfect 5th = G
    // (pitch class 7). MIDI 67 = G4.
    expect(getInversionType(67, 0, 'b5')).toBe('second');
  });
});

describe('VMU-162 — calculatePlayabilityScore reads the symbol through the single rule, not by hand', () => {
  it('"1Maj7" scores exactly like a dictionary chord_maj7, not like a dominant chord_7', () => {
    const maj7ByNns = calculatePlayabilityScore([{ nns: '1Maj7', rootNote: { value: 0 } }]).score;
    const maj7ByDict = calculatePlayabilityScore([{ dictType: 'chord_maj7', rootValue: 0 }]).score;
    const dom7ByDict = calculatePlayabilityScore([{ dictType: 'chord_7', rootValue: 0 }]).score;
    expect(maj7ByNns).toBe(maj7ByDict);
    expect(maj7ByNns).not.toBe(dom7ByDict);
  });

  it('"7" (a plain triad on the mode\'s 7th degree — not a dominant 7th chord) scores like chord_major, not like chord_7', () => {
    const degree7 = calculatePlayabilityScore([{ nns: '7', rootNote: { value: 0 } }]).score;
    const majorTriad = calculatePlayabilityScore([{ dictType: 'chord_major', rootValue: 0 }]).score;
    const dom7 = calculatePlayabilityScore([{ dictType: 'chord_7', rootValue: 0 }]).score;
    expect(degree7).toBe(majorTriad);
    expect(degree7).not.toBe(dom7);
  });
});
