import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import PolyrhythmAlgebraPanel from '../PolyrhythmAlgebraPanel';

describe('PolyrhythmAlgebraPanel Smoke Test', () => {
  it('renders nothing when showPolyrhythm is false', () => {
    const props = {
      showPolyrhythm: false,
      txt: { polyEngine: 'POLYRHYTHM', polyOps: 'OPS', algResult: 'RESULT', add: 'ADD', sub: 'SUB', addPoly: 'ADD POLY', barycenter: 'BAR', perfectBal: 'BALANCED', offset: 'OFFSET' },
      balanceInfo: null,
      polyOps: [{ k: 3, offset: 0, op: '+' }],
      setPolyOps: vi.fn(),
      subdivisions: 16,
      polyrhythmResult: null,
      activeStep: -1
    };

    const html = renderToString(<PolyrhythmAlgebraPanel {...props} />);

    expect(html).toBe('');
  });

  it('renders polyrhythm section when showPolyrhythm is true', () => {
    const props = {
      showPolyrhythm: true,
      txt: { polyEngine: 'POLYRHYTHM', polyOps: 'OPS', algResult: 'RESULT', add: 'ADD', sub: 'SUB', addPoly: 'ADD POLY', barycenter: 'BAR', perfectBal: 'BALANCED', offset: 'OFFSET' },
      balanceInfo: null,
      polyOps: [{ k: 3, offset: 0, op: '+' }],
      setPolyOps: vi.fn(),
      subdivisions: 16,
      polyrhythmResult: null,
      activeStep: -1
    };

    const html = renderToString(<PolyrhythmAlgebraPanel {...props} />);

    expect(html).toContain('POLYRHYTHM');
    expect(html).toContain('OPS');
  });
});
