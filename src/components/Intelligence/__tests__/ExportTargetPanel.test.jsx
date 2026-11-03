import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import ExportTargetPanel from '../ExportTargetPanel';

// VMU-195-B: the footer no longer hosts an instrument selector — the instrument
// moved into the phrase. What stays is "● en direct sur …", "Envoyer maintenant",
// the optional Listen button and "↺ Rythme du style".
describe('ExportTargetPanel Smoke Test (VMU-195-B)', () => {
  const txt = {
    kick: 'Kick', snare: 'Snare', hat: 'Hat', bass: 'Bass', chordsOut: 'Chords',
    liveOn: 'en direct sur', exportBtn: 'Envoyer maintenant', exportSuccess: 'Envoyé !',
    resetAll: '↺ Rythme du style', listen: '▶ Écouter', stopListen: '■ Arrêter',
  };

  it('renders the live note, the send button and the reset button', () => {
    const html = renderToString(
      <ExportTargetPanel
        txt={txt}
        exportTarget="Kick"
        showExportSuccess={false}
        handleExport={vi.fn()}
        handleClearOverrides={vi.fn()}
      />
    );

    expect(html).toContain('en direct sur');
    expect(html).toContain('kick'); // lower-cased instrument name
    expect(html).toContain('Envoyer maintenant');
    expect(html).toContain('↺ Rythme du style');
    expect(html).toContain('data-testid="comp-export"');
    expect(html).toContain('data-testid="comp-live-note"');
  });

  it('shows the success message after a send', () => {
    const html = renderToString(
      <ExportTargetPanel
        txt={txt}
        exportTarget="Kick"
        showExportSuccess
        handleExport={vi.fn()}
        handleClearOverrides={vi.fn()}
      />
    );
    expect(html).toContain('Envoyé !');
  });

  it('offers Listen / Stop only when a playback toggle is wired', () => {
    const html = renderToString(
      <ExportTargetPanel
        txt={txt}
        exportTarget="Kick"
        showExportSuccess={false}
        handleExport={vi.fn()}
        handleClearOverrides={vi.fn()}
        isPlaying={false}
        togglePlayback={vi.fn()}
      />
    );
    expect(html).toContain('▶ Écouter');
  });
});
