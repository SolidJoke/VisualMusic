// VMU-123 — the target-notes selector replaces the old "Aide Impro" button
// (FLASH-12), which had no effect where it was shown: the old targetValue
// was only ever computed in Studio (useMusicEngine.js:151-153 on
// origin/main@32cfb4b), never in Dictionary. The new selector is shown for
// BOTH the Accord and Gamme families — the old button only showed for
// Gamme — and never for Note (brief decision #3).
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AppProvider } from '../../../context/AppContext';
import DictionaryPanel from '../DictionaryPanel';

vi.mock('../../../utils/debug', () => ({ log: vi.fn() }));

afterEach(cleanup);

function renderPanel(props = {}) {
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
        uiTheme="modern"
        harmonicMode={false}
        setHarmonicMode={vi.fn()}
        dictOctave={0}
        setDictOctave={vi.fn()}
        selectedVoicingIndexGuitar={null}
        setSelectedVoicingIndexGuitar={vi.fn()}
        selectedVoicingIndexBass={null}
        setSelectedVoicingIndexBass={vi.fn()}
        dictActiveNotes={[]}
        targetNotesPreset="majorMinor"
        setTargetNotesPreset={vi.fn()}
        {...props}
      />
    </AppProvider>
  );
}

describe('DictionaryPanel — target notes selector placement (VMU-123)', () => {
  it('is shown for the Accord family (dictType chord_*)', () => {
    renderPanel({ dictType: 'chord_major' });
    expect(screen.getByTestId('target-notes-selector')).not.toBeNull();
  });

  it('is shown for the Gamme family (dictType scale_*) — the old button only showed here', () => {
    renderPanel({ dictType: 'scale_major' });
    expect(screen.getByTestId('target-notes-selector')).not.toBeNull();
  });

  it('is NOT shown for the Note family (brief decision #3: type Note -> rien)', () => {
    renderPanel({ dictType: 'single_note', dictActiveNotes: [{ absoluteValue: 60 }] });
    expect(screen.queryByTestId('target-notes-selector')).toBeNull();
  });

  it('no longer renders the old "Aide Impro" / "Helper Actif" button text, in any family', () => {
    for (const dictType of ['chord_major', 'scale_major', 'single_note']) {
      const { unmount } = renderPanel({ dictType, dictActiveNotes: dictType === 'single_note' ? [{ absoluteValue: 60 }] : [] });
      expect(screen.queryByText(/Aide Impro/i)).toBeNull();
      expect(screen.queryByText(/Helper Actif/i)).toBeNull();
      unmount();
    }
  });

  it('changing preset calls setTargetNotesPreset with the clicked preset key', () => {
    const setTargetNotesPreset = vi.fn();
    renderPanel({ dictType: 'chord_major', targetNotesPreset: 'off', setTargetNotesPreset });
    const skeletonBtn = screen.getAllByRole('button').find((b) => /squelette/i.test(b.textContent));
    skeletonBtn.click();
    expect(setTargetNotesPreset).toHaveBeenCalledWith('skeleton');
  });
});
