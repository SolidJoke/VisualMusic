import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
});
