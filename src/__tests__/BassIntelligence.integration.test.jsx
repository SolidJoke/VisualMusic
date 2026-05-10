/**
 * @vitest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import { AppProvider } from '../context/AppContext';

// Mocking Tone.js
vi.mock("tone", () => ({
  start: vi.fn(),
  Transport: {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  Draw: { schedule: vi.fn() },
  Destination: { volume: { value: 0 } },
  Analyser: vi.fn(() => ({
    dispose: vi.fn(),
  })),
}));

// Mock AudioEngine to avoid Tone.js issues in tests
vi.mock('../audio/AudioEngine', () => ({
    chordSynth: { triggerAttackRelease: vi.fn() },
    kickSynth: { triggerAttackRelease: vi.fn() },
    snareSynth: { triggerAttackRelease: vi.fn() },
    hatSynth: { triggerAttackRelease: vi.fn() },
    bassSynth: { triggerAttackRelease: vi.fn() },
    applyGenrePreset: vi.fn(),
    initPianoSampler: vi.fn((cb) => cb && cb()),
    initGuitarSampler: vi.fn(),
    getPianoSynth: vi.fn(),
    setInstrumentVolume: vi.fn(),
    playDictionaryNote: vi.fn(),
    masterAnalyser: {},
    setBpm: vi.fn(),
    startAudioEngine: vi.fn(),
    setMasterVolume: vi.fn(),
}));

vi.mock("../components/Visualizer/AudioVisualizer", () => ({
  default: () => <div data-testid="mock-visualizer">Visualizer Mock</div>,
}));

describe('Bass Intelligence Integration', () => {
    it('should show "Suggest Bass" button in Studio mode', async () => {
        render(
            <AppProvider>
                <App />
            </AppProvider>
        );

        // Switch to Studio mode if not already there
        const studioBtn = screen.getByTestId('btn-mode-studio');
        fireEvent.click(studioBtn);

        // Check for Suggest Bass button
        const suggestBtn = screen.getByText(/Suggest Bass/i);
        expect(suggestBtn).toBeInTheDocument();
    });

    it('should change button text after suggesting bass', async () => {
        render(
            <AppProvider>
                <App />
            </AppProvider>
        );

        const studioBtn = screen.getByTestId('btn-mode-studio');
        fireEvent.click(studioBtn);

        const suggestBtn = screen.getByText(/Suggest Bass/i);
        fireEvent.click(suggestBtn);

        await waitFor(() => {
            expect(screen.getByText(/Bass OK/i)).toBeInTheDocument();
        });
    });
});
