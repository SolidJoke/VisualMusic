import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EuclideanCircle } from '../Intelligence/EuclideanCircle';

// VMU-195-B: the circle is now a WHEEL that turns under a fixed marker. The
// wheel's angle follows the loop's TOTAL step counter (never `currentStep % n`),
// the centre shows "k coups sur n" instead of "E(k,n)", and the empty cases are
// drawn as dots (Ø 12) rather than a complement polygon.
describe('EuclideanCircle Component (VMU-195-B)', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<EuclideanCircle />);

    expect(container.querySelector('.euclidean-circle-container')).toBeTruthy();

    const svg = container.querySelector('.euclidean-svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('viewBox')).toBe('0 0 420 420');

    expect(container.querySelector('.euclidean-bg-ring')).toBeTruthy();

    // Default n is 8, so there should be 8 node groups.
    const nodeGroups = container.querySelectorAll('.euclidean-node-group');
    expect(nodeGroups.length).toBe(8);

    // The centre shows "0" above "coups sur 8" (the notation no longer says E(0,8)).
    expect(container.querySelector('.euclidean-center-big').textContent).toBe('0');
    expect(container.querySelector('[data-testid="center-formula"]').textContent).toBe('coups sur 8');
  });

  it('renders custom hit count and formula', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0]; // Tresillo
    const { container } = render(<EuclideanCircle pattern={pattern} n={8} />);

    // 3 hits above "coups sur 8".
    expect(container.querySelector('.euclidean-center-big').textContent).toBe('3');
    expect(screen.getByTestId('center-formula').textContent).toBe('coups sur 8');
  });

  it('renders a primary active polygon when there are 3 or more hits', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0]; // 3 pulses
    const { container } = render(<EuclideanCircle pattern={pattern} n={8} />);

    const polygon = container.querySelector('polygon.euclidean-polygon-active');
    expect(polygon).toBeTruthy();
    expect(container.querySelector('.euclidean-line.euclidean-polygon-active')).toBeFalsy();
  });

  it('renders a line instead of a polygon when there are exactly 2 hits', () => {
    const pattern = [1, 0, 0, 0, 1, 0, 0, 0]; // 2 pulses
    const { container } = render(<EuclideanCircle pattern={pattern} n={8} />);

    const activeLine = container.querySelector('.euclidean-line.euclidean-polygon-active');
    expect(activeLine).toBeTruthy();
    expect(activeLine.tagName.toLowerCase()).toBe('line');
    expect(container.querySelector('polygon.euclidean-polygon-active')).toBeFalsy();
  });

  it('draws the empty cases at Ø 12 only when showEmpty is on', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0];
    const { container, rerender } = render(<EuclideanCircle pattern={pattern} n={8} showEmpty={false} />);
    let empty = container.querySelector('.euclidean-node.is-empty');
    expect(empty).toBeTruthy();
    expect(empty.getAttribute('r')).toBe('2');

    rerender(<EuclideanCircle pattern={pattern} n={8} showEmpty />);
    empty = container.querySelector('.euclidean-node.is-empty');
    expect(empty.getAttribute('r')).toBe('6');
  });

  it('haloes the step that is under the marker', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0];
    const { container } = render(<EuclideanCircle pattern={pattern} n={8} currentStep={3} />);

    const groups = container.querySelectorAll('.euclidean-node-group');
    expect(groups[3].querySelector('.euclidean-node-halo')).toBeTruthy();
    expect(groups[0].querySelector('.euclidean-node-halo')).toBeFalsy();
  });

  it('turns the wheel by the TOTAL step counter, never its modulo', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0];
    const { container, rerender } = render(<EuclideanCircle pattern={pattern} n={8} currentStep={5} />);

    let wheel = container.querySelector('.euclidean-wheel');
    // angle = 5 * 360 / 8 = 225, so the wheel is drawn rotated by −225°.
    expect(wheel.getAttribute('data-rotation')).toBe('225');
    expect(wheel.getAttribute('data-step')).toBe('5');
    expect(wheel.style.transform).toBe('rotate(-225deg)');

    // One full turn later (9 = 8 + 1) the wheel must NOT snap back to step 1:
    // angle = 9 * 360 / 8 = 405.
    rerender(<EuclideanCircle pattern={pattern} n={8} currentStep={9} />);
    wheel = container.querySelector('.euclidean-wheel');
    expect(wheel.getAttribute('data-rotation')).toBe('405');
    expect(wheel.getAttribute('data-step')).toBe('9');
    expect(wheel.style.transform).toBe('rotate(-405deg)');
  });

  it('shows the balance word in the centre when in stack mode', () => {
    const { container } = render(
      <EuclideanCircle
        pattern={[1, 0, 1, 0]}
        n={4}
        balanceInfo={{ centroid: { x: 0, y: 0 }, offset: 0 }}
        balanceWord="Équilibré"
      />
    );
    expect(container.querySelector('[data-testid="wheel-balance-word"]').textContent).toBe('Équilibré');
    expect(container.querySelector('.euclidean-plumb')).toBeTruthy();
  });

  it('draws stacked rhythms grey with distinct strokes', () => {
    const { container } = render(
      <EuclideanCircle
        pattern={[1, 0, 0, 1]}
        n={4}
        extraPolygons={[
          { indices: [0, 2], dash: '2 6' },
          { indices: [1, 3], dash: '10 6' },
        ]}
      />
    );
    const stacked = container.querySelectorAll('.euclidean-polygon-stacked');
    expect(stacked).toHaveLength(2);
    expect(stacked[0].style.strokeDasharray).toBe('2 6');
    expect(stacked[1].style.strokeDasharray).toBe('10 6');
    // Grey, never a track colour: the class is the only stroke source.
    expect(stacked[0].getAttribute('class')).toBe('euclidean-polygon-stacked');
  });
});
