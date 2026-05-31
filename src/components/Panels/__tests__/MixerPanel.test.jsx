import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MixerPanel from '../MixerPanel';

vi.mock('../../../context/AppContext', () => ({
  useAppContext: () => ({
    txt: { mixerVolumes: 'Mixer Volumes' }
  })
}));

describe('MixerPanel component', () => {
  it('renders MixerPanel correctly with details and summary', () => {
    const mockHandleChange = vi.fn();
    const mockSetMaster = vi.fn();
    const instrumentVolumes = {
      kick: 0,
      snare: 0,
      hat: 0,
      bass: 0,
      piano: 0,
      guitar: 0
    };

    render(
      <MixerPanel
        instrumentVolumes={instrumentVolumes}
        handleInstrumentVolumeChange={mockHandleChange}
        masterVolume={0}
        setMasterVolume={mockSetMaster}
        txt={{ mixerVolumes: 'Mixer Volumes' }}
        uiTheme="modern"
        isPlaying={false}
      />
    );

    // It should render the summary header
    expect(screen.getAllByText(/Mixer Volumes/i).length).toBeGreaterThan(0);
  });
});
