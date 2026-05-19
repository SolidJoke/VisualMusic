import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EuclideanCircle } from '../Intelligence/EuclideanCircle';

describe('EuclideanCircle Component', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<EuclideanCircle />);
    
    // Check main container
    expect(container.querySelector('.euclidean-circle-container')).toBeTruthy();
    
    // Check SVG exists
    const svg = container.querySelector('.euclidean-svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('viewBox')).toBe('0 0 220 220');
    
    // Check background ring
    expect(container.querySelector('.euclidean-bg-ring')).toBeTruthy();
    
    // Default n is 8, so there should be 8 node groups
    const nodeGroups = container.querySelectorAll('.euclidean-node-group');
    expect(nodeGroups.length).toBe(8);
    
    // Default pattern is empty/all 0s, so E(0,8)
    const centerInfo = container.querySelector('.center-formula');
    expect(centerInfo.textContent).toBe('E(0,8)');
  });

  it('renders custom labels and formulas', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0]; // Tresillo
    render(
      <EuclideanCircle 
        pattern={pattern} 
        n={8} 
        label="Tresillo Rhythm" 
      />
    );

    // Label should be visible
    const header = screen.getByText('Tresillo Rhythm');
    expect(header).toBeTruthy();
    expect(header.classList.contains('accent-text')).toBe(true);

    // Formula should display E(3,8)
    const formula = screen.getByText('E(3,8)');
    expect(formula).toBeTruthy();
    
    const pulseText = screen.getByText('3 Pulses');
    expect(pulseText).toBeTruthy();
  });

  it('renders primary active polygon when active pulses >= 3', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0]; // 3 pulses
    const { container } = render(
      <EuclideanCircle pattern={pattern} n={8} />
    );

    // polygon active should exist
    const polygon = container.querySelector('.euclidean-polygon-active');
    expect(polygon).toBeTruthy();
    expect(polygon.tagName.toLowerCase()).toBe('polygon');
    
    // should not have active lines
    expect(container.querySelector('.euclidean-line.euclidean-polygon-active')).toBeFalsy();
  });

  it('renders line instead of polygon when active pulses is exactly 2', () => {
    const pattern = [1, 0, 0, 0, 1, 0, 0, 0]; // 2 pulses
    const { container } = render(
      <EuclideanCircle pattern={pattern} n={8} />
    );

    // should have line active, not polygon active
    const activeLine = container.querySelector('.euclidean-line.euclidean-polygon-active');
    expect(activeLine).toBeTruthy();
    expect(activeLine.tagName.toLowerCase()).toBe('line');
    
    const polygon = container.querySelector('polygon.euclidean-polygon-active');
    expect(polygon).toBeFalsy();
  });

  it('renders complement polygon when showComplement is true and complement pulses >= 3', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0]; // 3 pulses, 5 complements
    const { container } = render(
      <EuclideanCircle pattern={pattern} n={8} showComplement={true} />
    );

    const complementPolygon = container.querySelector('.euclidean-polygon-complement');
    expect(complementPolygon).toBeTruthy();
    expect(complementPolygon.tagName.toLowerCase()).toBe('polygon');
  });

  it('does not render complement polygon when showComplement is false', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0];
    const { container } = render(
      <EuclideanCircle pattern={pattern} n={8} showComplement={false} />
    );

    const complementPolygon = container.querySelector('.euclidean-polygon-complement');
    expect(complementPolygon).toBeFalsy();
  });

  it('highlights current playing node correctly', () => {
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0];
    const { container } = render(
      <EuclideanCircle pattern={pattern} n={8} highlightIndex={3} />
    );

    // Node at index 3 is active in pattern, and highlighted
    const nodes = container.querySelectorAll('.euclidean-node');
    const highlightedNode = nodes[3];
    expect(highlightedNode.classList.contains('is-current')).toBe(true);
    expect(highlightedNode.classList.contains('is-active')).toBe(true);

    // Halo should be present for the current playing node
    const halo = container.querySelector('.euclidean-node-halo');
    expect(halo).toBeTruthy();
  });
});
