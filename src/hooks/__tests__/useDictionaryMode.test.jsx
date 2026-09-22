import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDictionaryMode } from '../useDictionaryMode';
import { AppProvider } from '../../context/AppContext';
import React from 'react';

describe('useDictionaryMode', () => {
  const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

  it('initializes with default values', () => {
    const { result } = renderHook(() => useDictionaryMode(), { wrapper });
    expect(result.current.dictRoot).toBe(0);
    expect(result.current.dictType).toBe('single_note');
  });

  it('updates dictRoot and dictType', () => {
    const { result } = renderHook(() => useDictionaryMode(), { wrapper });
    
    act(() => {
      result.current.setDictRoot(2); // D
      result.current.setDictType('chord_major');
    });

    expect(result.current.dictRoot).toBe(2);
    expect(result.current.dictType).toBe('chord_major');
  });

  // -------------------------------------------------------
  // TDD: Octave range -3 to +3
  // -------------------------------------------------------
  describe('dictOctave initial value', () => {
    it('initializes dictOctave to 0', () => {
      const { result } = renderHook(() => useDictionaryMode(), { wrapper });
      expect(result.current.dictOctave).toBe(0);
    });
  });

  describe('dictOctave setter covers -3 to +3', () => {
    it.each([-3, -2, -1, 0, 1, 2, 3])('accepts dictOctave=%i', (octave) => {
      const { result } = renderHook(() => useDictionaryMode(), { wrapper });
      act(() => { result.current.setDictOctave(octave); });
      expect(result.current.dictOctave).toBe(octave);
    });
  });

  // -------------------------------------------------------
  // TDD: activeNotes absoluteValue formula
  // Formula: absoluteValue = noteValue + (4 + dictOctave + 1) * 12
  //                        = noteValue + (5 + dictOctave) * 12
  // -------------------------------------------------------
  describe('activeNotes absoluteValue at extreme octaves (scale)', () => {
    const setupScale = () => renderHook(() => useDictionaryMode(), { wrapper });

    it('dictOctave=-3: C major root (C, value=0) → MIDI 24', () => {
      const { result } = setupScale();
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('scale_major');
        result.current.setDictOctave(-3);
      });
      const root = result.current.activeNotes[0];
      expect(root.absoluteValue).toBe(24); // 0 + (5 + -3)*12
    });

    it('dictOctave=0: C major root → MIDI 60', () => {
      const { result } = setupScale();
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('scale_major');
        result.current.setDictOctave(0);
      });
      const root = result.current.activeNotes[0];
      expect(root.absoluteValue).toBe(60);
    });

    it('dictOctave=+3: C major root → MIDI 96', () => {
      const { result } = setupScale();
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('scale_major');
        result.current.setDictOctave(3);
      });
      const root = result.current.activeNotes[0];
      expect(root.absoluteValue).toBe(96);
    });

    it('dictOctave=-3: all scale notes have absoluteValue >= 24', () => {
      const { result } = setupScale();
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('scale_major');
        result.current.setDictOctave(-3);
      });
      result.current.activeNotes.forEach(n => {
        expect(n.absoluteValue).toBeGreaterThanOrEqual(24);
      });
    });

    it('dictOctave=+3: all scale notes have absoluteValue >= 96', () => {
      const { result } = setupScale();
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('scale_major');
        result.current.setDictOctave(3);
      });
      result.current.activeNotes.forEach(n => {
        expect(n.absoluteValue).toBeGreaterThanOrEqual(96);
      });
    });
  });

  describe('activeNotes absoluteValue at extreme octaves (chord)', () => {
    it('dictOctave=-3: C major chord root → MIDI 24', () => {
      const { result } = renderHook(() => useDictionaryMode(), { wrapper });
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('chord_major');
        result.current.setDictOctave(-3);
      });
      const root = result.current.activeNotes[0];
      expect(root.absoluteValue).toBe(24);
    });

    it('dictOctave=+3: C major chord root → MIDI 96', () => {
      const { result } = renderHook(() => useDictionaryMode(), { wrapper });
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('chord_major');
        result.current.setDictOctave(3);
      });
      const root = result.current.activeNotes[0];
      expect(root.absoluteValue).toBe(96);
    });
  });

  // -------------------------------------------------------
  // VMU-146 fix2 — activeNotes order labels for chord_dim7 and chord_aug.
  // useDictionaryMode calls getChordIntervalLabel(i, semi) with the note's
  // REAL array index (harmonyEngine.js:79), one of the two conventions the
  // fix2 brief's coordinator probe measured across the CHORDS catalog.
  // -------------------------------------------------------
  describe('activeNotes order label — augmented and diminished-7th chords (VMU-146 fix2)', () => {
    it('chord_dim7: the last note (semitone 9, the "bb7") has order "bb7"', () => {
      const { result } = renderHook(() => useDictionaryMode(), { wrapper });
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('chord_dim7');
      });
      // core/theory.js CHORDS.chord_dim7.semitones = [0, 3, 6, 9] — last note is semitone 9.
      const last = result.current.activeNotes[result.current.activeNotes.length - 1];
      expect(last.order).toBe('bb7');
    });

    it('chord_aug: the last note (semitone 8, the augmented 5th) has order "#5"', () => {
      const { result } = renderHook(() => useDictionaryMode(), { wrapper });
      act(() => {
        result.current.setDictRoot(0);
        result.current.setDictType('chord_aug');
      });
      // core/theory.js CHORDS.chord_aug.semitones = [0, 4, 8] — last note is semitone 8.
      const last = result.current.activeNotes[result.current.activeNotes.length - 1];
      expect(last.order).toBe('#5');
    });
  });
});

