
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { AppProvider, useAppContext } from '../AppContext';

// Dummy component to test context consumption
const ConsumerComponent = () => {
  const { state, dispatch } = useAppContext();
  return (
    <div>
      <span data-testid="mode-display">{state.appMode}</span>
      <button 
        data-testid="btn-set-dictionary" 
        onClick={() => dispatch({ type: 'SET_APP_MODE', payload: 'dictionary' })}
      >
        Set Dictionary
      </button>
    </div>
  );
};

describe('AppContext', () => {
  it('provides default appMode and updates it via dispatch', () => {
    render(
      <AppProvider>
        <ConsumerComponent />
      </AppProvider>
    );

    const display = screen.getByTestId('mode-display');
    expect(display.textContent).toBe('studio');

    const btn = screen.getByTestId('btn-set-dictionary');
    fireEvent.click(btn);

    expect(display.textContent).toBe('dictionary');
  });
});
