import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import DictPositionPanel from '../DictPositionPanel';
import { AppProvider } from '../../../context/AppContext';

vi.mock('../../Intelligence/VoicingAlert', () => ({
  default: () => <div data-testid="voicing-alert">VoicingAlert</div>
}));

vi.mock('../../Common/CustomSelect', () => ({
  default: () => <div data-testid="custom-select">CustomSelect</div>
}));

describe('DictPositionPanel Smoke Test', () => {
  it('renders without crashing with family=chord', () => {
    const props = {
      family: 'chord',
      dictType: 'chord_major',
      dictRoot: 0,
      dictOctave: 0,
      dictActiveNotes: [],
      guitarFingering: null,
      bassFingering: null,
      uiTheme: 'modern',
      selectedVoicingIndexGuitar: null,
      setSelectedVoicingIndexGuitar: vi.fn(),
      selectedVoicingIndexBass: null,
      setSelectedVoicingIndexBass: vi.fn()
    };

    const html = renderToString(
      <AppProvider>
        <DictPositionPanel {...props} />
      </AppProvider>
    );

    expect(html).toBeTruthy();
    expect(html).toContain('CustomSelect');
  });

  it('renders without crashing with family=scale', () => {
    const props = {
      family: 'scale',
      dictType: 'scale_major',
      dictRoot: 0,
      dictOctave: 0,
      dictActiveNotes: [],
      guitarFingering: null,
      bassFingering: null,
      uiTheme: 'modern',
      selectedVoicingIndexGuitar: null,
      setSelectedVoicingIndexGuitar: vi.fn(),
      selectedVoicingIndexBass: null,
      setSelectedVoicingIndexBass: vi.fn()
    };

    const html = renderToString(
      <AppProvider>
        <DictPositionPanel {...props} />
      </AppProvider>
    );

    expect(html).toBeTruthy();
    expect(html).toContain('CustomSelect');
  });

  it('renders without crashing with family=note', () => {
    const props = {
      family: 'note',
      dictType: 'note',
      dictRoot: 0,
      dictOctave: 0,
      dictActiveNotes: [{ absoluteValue: 60 }],
      guitarFingering: null,
      bassFingering: null,
      uiTheme: 'modern',
      selectedVoicingIndexGuitar: null,
      setSelectedVoicingIndexGuitar: vi.fn(),
      selectedVoicingIndexBass: null,
      setSelectedVoicingIndexBass: vi.fn()
    };

    const html = renderToString(
      <AppProvider>
        <DictPositionPanel {...props} />
      </AppProvider>
    );

    expect(html).toBeTruthy();
    expect(html).toContain('CustomSelect');
  });
});
