import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import DictChordPanel from '../DictChordPanel';
import { AppProvider } from '../../../context/AppContext';

vi.mock('../../Common/CustomSelect', () => ({
  default: () => <div data-testid="custom-select">CustomSelect</div>
}));

describe('DictChordPanel Smoke Test', () => {
  it('renders without crashing with minimal props', () => {
    const props = {
      dictType: 'chord_major',
      setDictType: vi.fn(),
      dictRoot: 0,
      setDictRoot: vi.fn(),
      uiTheme: 'modern',
      groupedChords: [],
      emotionText: null,
      descriptionText: null,
      moodProfile: null,
      recommendedScales: [],
      applySubstitution: vi.fn()
    };

    const html = renderToString(
      <AppProvider>
        <DictChordPanel {...props} />
      </AppProvider>
    );

    expect(html).toBeTruthy();
    expect(html).toContain('CustomSelect');
  });

  it('renders chord selector when groupedChords has items', () => {
    const props = {
      dictType: 'chord_major',
      setDictType: vi.fn(),
      dictRoot: 0,
      setDictRoot: vi.fn(),
      uiTheme: 'modern',
      groupedChords: [
        {
          category: 'Triads',
          labelKey: 'triads',
          items: ['chord_major', 'chord_minor']
        }
      ],
      emotionText: null,
      descriptionText: null,
      moodProfile: null,
      recommendedScales: [],
      applySubstitution: vi.fn()
    };

    const html = renderToString(
      <AppProvider>
        <DictChordPanel {...props} />
      </AppProvider>
    );

    expect(html).toBeTruthy();
    expect(html).toContain('CustomSelect');
  });
});
