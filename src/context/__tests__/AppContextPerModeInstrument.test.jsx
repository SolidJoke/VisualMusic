// VMU-209 — the instrument is remembered per mode: piano by default in both,
// and choosing one in the Studio does not change the Dictionary's (nor vice
// versa). This pins the AppContext half of that (the persistence half is
// persistedState.test.js): the reducer writes only the active mode, switching
// mode restores that mode's instrument, and initState migrates the legacy
// single instrument to both modes.
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { AppProvider, useAppContext } from '../AppContext';
import { STORAGE_KEY } from '../../utils/persistedState';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function Probe() {
  const { state, dispatch } = useAppContext();
  return (
    <div>
      <span data-testid="instrument">{state.playbackInstrument}</span>
      <span data-testid="mode">{state.appMode}</span>
      <span data-testid="by-mode">{JSON.stringify(state.playbackInstrumentByMode)}</span>
      <button data-testid="set-guitar" onClick={() => dispatch({ type: 'SET_PLAYBACK_INSTRUMENT', payload: 'guitar' })} />
      <button data-testid="set-bass" onClick={() => dispatch({ type: 'SET_PLAYBACK_INSTRUMENT', payload: 'bass' })} />
      <button data-testid="to-dict" onClick={() => dispatch({ type: 'SET_APP_MODE', payload: 'dictionary' })} />
      <button data-testid="to-studio" onClick={() => dispatch({ type: 'SET_APP_MODE', payload: 'studio' })} />
    </div>
  );
}

const renderProbe = () => render(<AppProvider><Probe /></AppProvider>);

const plant = (value) => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));

describe('VMU-209 — per-mode instrument in AppContext', () => {
  it('defaults to piano in both modes', () => {
    renderProbe();
    expect(screen.getByTestId('instrument').textContent).toBe('piano');
    expect(screen.getByTestId('by-mode').textContent).toBe('{"studio":"piano","dictionary":"piano"}');
  });

  it('a Studio choice does not change the Dictionary, and vice versa', () => {
    renderProbe();
    // Default mode is studio: choose guitar there.
    fireEvent.click(screen.getByTestId('set-guitar'));
    expect(screen.getByTestId('by-mode').textContent).toBe('{"studio":"guitar","dictionary":"piano"}');
    expect(screen.getByTestId('instrument').textContent).toBe('guitar');

    // Switching to the Dictionary restores ITS instrument (piano).
    fireEvent.click(screen.getByTestId('to-dict'));
    expect(screen.getByTestId('mode').textContent).toBe('dictionary');
    expect(screen.getByTestId('instrument').textContent).toBe('piano');

    // A Dictionary choice writes only the Dictionary's.
    fireEvent.click(screen.getByTestId('set-bass'));
    expect(screen.getByTestId('by-mode').textContent).toBe('{"studio":"guitar","dictionary":"bass"}');
    expect(screen.getByTestId('instrument').textContent).toBe('bass');

    // And back in the Studio, its guitar is still there.
    fireEvent.click(screen.getByTestId('to-studio'));
    expect(screen.getByTestId('instrument').textContent).toBe('guitar');
  });

  it('migrates the legacy single instrument to both modes', () => {
    plant({ v: 1, playbackInstrument: 'bass' });
    renderProbe();
    expect(screen.getByTestId('instrument').textContent).toBe('bass');
    expect(screen.getByTestId('by-mode').textContent).toBe('{"studio":"bass","dictionary":"bass"}');
  });

  it('reads the per-mode shape when it is stored', () => {
    plant({ v: 1, appMode: 'dictionary', playbackInstrumentByMode: { studio: 'guitar', dictionary: 'bass' } });
    renderProbe();
    expect(screen.getByTestId('mode').textContent).toBe('dictionary');
    expect(screen.getByTestId('instrument').textContent).toBe('bass');
  });

  it('ignores an invalid legacy instrument and opens on the defaults', () => {
    plant({ v: 1, playbackInstrument: 'kazoo' });
    renderProbe();
    expect(screen.getByTestId('instrument').textContent).toBe('piano');
    expect(screen.getByTestId('by-mode').textContent).toBe('{"studio":"piano","dictionary":"piano"}');
  });
});
