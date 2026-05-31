
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useStudioMode } from '../useStudioMode';

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
});
