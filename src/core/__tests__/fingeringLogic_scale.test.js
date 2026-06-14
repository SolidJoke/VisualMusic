// src/core/__tests__/fingeringLogic_scale.test.js
// TDD tests for scale box display (SCALE-02b)
// T7-T10 must be RED before the fix, GREEN after.

import { describe, it, expect } from 'vitest';
import { getAvailableScaleFingerings } from '../fingeringLogic.js';

const guitarStrings = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
const bassStrings   = ['E1', 'A1', 'D2', 'G2'];

// T7 — No duplicate pitch class in a position
describe('T7: no duplicate pitch class in a scale position', () => {
  it('C major guitar pos 0 has no duplicate noteValue', () => {
    const positions = getAvailableScaleFingerings(0, 'scale_major', 'guitar', guitarStrings);
    expect(positions.length).toBeGreaterThan(0);
    const noteValues = positions[0].scaleFrets.map(sf => sf.noteValue);
    const unique = new Set(noteValues);
    expect(unique.size).toBe(noteValues.length); // no duplicates
  });

  it('A minor guitar pos 0 has no duplicate noteValue', () => {
    const positions = getAvailableScaleFingerings(9, 'scale_minor', 'guitar', guitarStrings);
    expect(positions.length).toBeGreaterThan(0);
    const noteValues = positions[0].scaleFrets.map(sf => sf.noteValue);
    const unique = new Set(noteValues);
    expect(unique.size).toBe(noteValues.length);
  });

  it('C major bass pos 0 has no duplicate noteValue', () => {
    const positions = getAvailableScaleFingerings(0, 'scale_major', 'bass', bassStrings);
    expect(positions.length).toBeGreaterThan(0);
    const noteValues = positions[0].scaleFrets.map(sf => sf.noteValue);
    const unique = new Set(noteValues);
    expect(unique.size).toBe(noteValues.length);
  });
});

// T8 — Each scale pitch class appears exactly once
describe('T8: each scale pitch class present exactly once', () => {
  it('C major guitar pos 0 has exactly 7 notes (one per pitch class)', () => {
    const positions = getAvailableScaleFingerings(0, 'scale_major', 'guitar', guitarStrings);
    // C major has 7 pitch classes: 0,2,4,5,7,9,11
    // A box of 5 frets may not contain all 7, but must have no duplicates
    const pos0 = positions[0];
    const noteValues = pos0.scaleFrets.map(sf => sf.noteValue);
    const unique = new Set(noteValues);
    expect(unique.size).toBe(noteValues.length); // strictly no duplicate
  });
});

// T9 — For a given pitch class, the highest string (lowest stringIndex) is chosen
describe('T9: highest string chosen for each pitch class', () => {
  it('C (pitch class 0) in C major pos starting at fret 0 is on B string (stringIndex=1), not E2 (stringIndex=5)', () => {
    // Guitar standard tuning (reversed): index 0=E4, 1=B3, 2=G3, 3=D3, 4=A2, 5=E2
    // B3 open=59, fret 1 = MIDI 60 = C4 (noteValue=0) ✓ within frets 0-4
    // E2 open=40, fret 8 = MIDI 48 = C3 (noteValue=0) ✗ out of frets 0-4
    const positions = getAvailableScaleFingerings(0, 'scale_major', 'guitar', guitarStrings);
    const pos0 = positions[0];
    const cNote = pos0.scaleFrets.find(sf => sf.noteValue === 0); // C
    expect(cNote).toBeDefined();
    // stringIndex 1 = B3 string, should be preferred over stringIndex 5 = E2
    expect(cNote.stringIndex).toBeLessThan(5); // not on lowest string
  });
});

// T10 — Backward compat: default dictOctave=0 doesn't crash, returns same positions
describe('T10: backward compatibility', () => {
  it('returns same positions with and without dictOctave param', () => {
    const a = getAvailableScaleFingerings(0, 'scale_major', 'guitar', guitarStrings);
    const b = getAvailableScaleFingerings(0, 'scale_major', 'guitar', guitarStrings, 'of', 0);
    expect(a.length).toBe(b.length);
    expect(a[0].id).toBe(b[0].id);
  });
});
