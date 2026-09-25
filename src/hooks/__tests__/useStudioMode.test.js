
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useStudioMode } from '../useStudioMode';
import { buildStudioTimeline } from '../../core/timeline';

// Mock BRICKS if necessary, but we can probably use the real ones if they are simple
describe('useStudioMode', () => {
  it('initializes with default brick', () => {
    const { result } = renderHook(() => useStudioMode());
    expect(result.current.currentBrickIndex).toBe(0);
    expect(result.current.activeBrick).toBeDefined();
  });

  it('updates currentBrickIndex', () => {
    const { result } = renderHook(() => useStudioMode());
    
    act(() => {
      result.current.setCurrentBrickIndex(1);
    });

    expect(result.current.currentBrickIndex).toBe(1);
  });

  // T3: the hook builds the timeline document playback and the export read.
  it('hands over the timeline document of the current style and theme, at 4 measures', () => {
    const { result } = renderHook(() => useStudioMode());
    expect(result.current.timeline).toEqual(buildStudioTimeline({ brickIndex: 0, theme: 'A' }));
    expect(result.current.timeline.lengthMeasures).toBe(4);

    act(() => {
      result.current.setCurrentBrickIndex(8);
      result.current.setCurrentTheme('B');
    });
    expect(result.current.timeline.origin).toEqual({ brickIndex: 8, variation: 'B' });
    expect(result.current.timeline).toEqual(buildStudioTimeline({ brickIndex: 8, theme: 'B' }));
  });

  it('rebuilds the document when an override changes, and keeps the selection the panels show', () => {
    const { result } = renderHook(() => useStudioMode());
    act(() => {
      result.current.setCustomRhythm([0, 6, 10]);
    });
    const chords = result.current.timeline.tracks.find((t) => t.role === 'chordHits');
    expect(chords.provenance).toEqual(Array(8).fill('math'));
    expect(chords.steps.slice(0, 16).flatMap((cell, step) => (cell ? [step] : []))).toEqual([0, 6, 10]);
    expect(result.current.activeTracks.rhythm).toEqual([0, 6, 10]);
    expect(result.current.activeTracks.progression).toEqual(['1', '5', '6-', '4']);
  });
});
