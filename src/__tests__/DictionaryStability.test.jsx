import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import DictionaryPanel from '../components/Panels/DictionaryPanel';
import '@testing-library/jest-dom';

// Mock dependencies
vi.mock('../utils/debug', () => ({
  log: vi.fn()
}));

const mockTxt = {
  structType: "Type",
  familyNote: "Note",
  familyChord: "Chord",
  familyScale: "Scale",
  voicingGuitar: "Guitar",
  voicingBass: "Bass",
  voicingPiano: "Piano"
};

describe('DictionaryPanel Stability', () => {
  beforeEach(() => {
    cleanup();
  });

  const renderPanel = (props = {}) => {
    return render(
      <AppProvider>
        <DictionaryPanel 
          dictRoot={0}
          setDictRoot={vi.fn()}
          dictType="chord_major"
          setDictType={vi.fn()}
          playDictionaryAudio={vi.fn()}
          isPlaying={false}
          guitarFingering={null}
          bassFingering={null}
          uiTheme="vintage"
          harmonicMode={false}
          setHarmonicMode={vi.fn()}
          dictOctave={4}
          setDictOctave={vi.fn()}
          selectedVoicingIndexGuitar={0}
          setSelectedVoicingIndexGuitar={vi.fn()}
          selectedVoicingIndexBass={0}
          setSelectedVoicingIndexBass={vi.fn()}
          dictActiveNotes={[]}
          txt={mockTxt}
          {...props}
        />
      </AppProvider>
    );
  };

  it('renders without crashing', () => {
    renderPanel();
    expect(screen.getByTestId('dictionary-panel')).toBeInTheDocument();
  });

  it('switches between family types without crashing', () => {
    renderPanel();
    
    // We search by the text content directly since segments might have icons
    const buttons = screen.getAllByRole('button');
    
    // Find button by checking its text content
    const findBtn = (txt) => buttons.find(b => b.textContent.includes(txt));

    const noteBtn = findBtn("Note");
    if (noteBtn) fireEvent.click(noteBtn);
    expect(screen.getByTestId('dictionary-panel')).toBeInTheDocument();

    const scaleBtn = findBtn("Scale");
    if (scaleBtn) fireEvent.click(scaleBtn);
    expect(screen.getByTestId('dictionary-panel')).toBeInTheDocument();

    const chordBtn = findBtn("Chord");
    if (chordBtn) fireEvent.click(chordBtn);
    expect(screen.getByTestId('dictionary-panel')).toBeInTheDocument();
  });

  it('handles single note selection without crashing', () => {
    // Initial state as Note
    renderPanel({ dictType: 'single_note', dictActiveNotes: [{ absoluteValue: 60 }] });
    
    expect(screen.getByTestId('dictionary-panel')).toBeInTheDocument();
  });
});
