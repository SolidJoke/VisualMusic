import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import PolyrhythmAlgebraPanel from '../PolyrhythmAlgebraPanel';

// VMU-195-B: the stacked rhythms are grey voices told apart by their stroke, and
// the balance is one word (Équilibré / Presque équilibré / Penché) rather than a
// percentage. The word is chosen by `balanceWordFor`, exported for the tests.
describe('PolyrhythmAlgebraPanel Smoke Test (VMU-195-B)', () => {
  const txt = {
    rhythmWord: 'Rythme', hitsUnit: 'coups', add: 'Ajouter', sub: 'Retirer',
    addPoly: 'Ajouter un rythme', removePoly: 'Retirer ce rythme',
    balanceEven: 'Équilibré', balanceAlmost: 'Presque équilibré', balanceTilted: 'Penché',
    balanceHint: 'le point blanc du cercle', offset: 'Écart',
  };

  it('renders nothing when showPolyrhythm is false', () => {
    const html = renderToString(
      <PolyrhythmAlgebraPanel
        showPolyrhythm={false}
        txt={txt}
        balanceInfo={null}
        polyOps={[{ k: 3, offset: 0, op: '+' }]}
        setPolyOps={vi.fn()}
        subdivisions={16}
        polyrhythmResult={null}
        activeStep={-1}
      />
    );
    expect(html).toBe('');
  });

  it('renders the grey voices with their add button when shown', () => {
    const html = renderToString(
      <PolyrhythmAlgebraPanel
        showPolyrhythm
        txt={txt}
        balanceInfo={null}
        polyOps={[{ k: 3, offset: 0, op: '+' }]}
        setPolyOps={vi.fn()}
        subdivisions={16}
        polyrhythmResult={null}
        activeStep={-1}
      />
    );

    expect(html).toContain('Rythme 1');
    expect(html).toContain('data-testid="comp-poly-add"');
    expect(html).toContain('poly-slider');
    // A regular 3-gon is the voice's signature, drawn grey.
    expect(html).toContain('poly-mini-polygon');
  });

  it('renders the balance word when the balance is known', () => {
    const html = renderToString(
      <PolyrhythmAlgebraPanel
        showPolyrhythm
        txt={txt}
        balanceInfo={{ centroid: { x: 0, y: 0 }, offset: 0 }}
        polyOps={[{ k: 3, offset: 0, op: '+' }]}
        setPolyOps={vi.fn()}
        subdivisions={16}
        polyrhythmResult={{ pattern: [1, 0, 1, 0] }}
        activeStep={-1}
      />
    );

    expect(html).toContain('data-testid="comp-balance-word"');
    expect(html).toContain('Équilibré');
  });
});
