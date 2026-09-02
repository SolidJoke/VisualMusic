import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import ExportTargetPanel from '../ExportTargetPanel';

describe('ExportTargetPanel Smoke Test', () => {
  it('renders export panel with correct label', () => {
    const props = {
      txt: { exportPanel: 'EXPORT PANEL', target: 'TARGET', kick: 'KICK', snare: 'SNARE', hat: 'HAT', bass: 'BASS', chordsOut: 'CHORDS', exportBtn: 'EXPORT', exportSuccess: 'SUCCESS', resetAll: 'RESET' },
      exportTarget: 'Kick',
      setExportTarget: vi.fn(),
      showExportSuccess: false,
      handleExport: vi.fn(),
      handleClearOverrides: vi.fn()
    };

    const html = renderToString(<ExportTargetPanel {...props} />);

    expect(html).toContain('EXPORT PANEL');
    expect(html).toContain('EXPORT');
  });

  it('shows success message when showExportSuccess is true', () => {
    const props = {
      txt: { exportPanel: 'EXPORT PANEL', target: 'TARGET', kick: 'KICK', snare: 'SNARE', hat: 'HAT', bass: 'BASS', chordsOut: 'CHORDS', exportBtn: 'EXPORT', exportSuccess: 'SUCCESS', resetAll: 'RESET' },
      exportTarget: 'Kick',
      setExportTarget: vi.fn(),
      showExportSuccess: true,
      handleExport: vi.fn(),
      handleClearOverrides: vi.fn()
    };

    const html = renderToString(<ExportTargetPanel {...props} />);

    expect(html).toContain('SUCCESS');
  });
});
