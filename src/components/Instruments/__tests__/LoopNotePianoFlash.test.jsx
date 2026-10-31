// VMU-200 — the piano flashes only its own notes during the Studio loop.
//
// The loop now publishes chord notes tagged "piano" and melodic notes tagged
// "bass" (audio/playStep.js). PianoKeyboard already ignores a note tagged with
// another instrument; this pins that a bass-tagged loop note leaves every key
// quiet while a piano-tagged chord note still flashes its key.
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AppProvider } from '../../../context/AppContext';
import { MusicEngineProvider } from '../../../context/MusicEngineContext';
import PianoKeyboard from '../PianoKeyboard';

afterEach(cleanup);

function Harness({ notes }) {
  const value = {
    realizationsByInstrument: { piano: [] },
    currentRootValue: 0,
    targetValuesByInstrument: {},
    autoPlayNote: () => {},
    currentlyPlayingNotes: notes,
    contextualScaleAbsoluteValues: [],
    dictType: null,
    appMode: 'studio',
    showFingering: true,
    showFingerNumbers: false,
    fretboardZone: 'all',
    lastClickedContext: null,
    singlePlayContext: null,
    scaleAnchor: null,
  };
  return (
    <AppProvider>
      <MusicEngineProvider value={value}>
        <PianoKeyboard orientation="vertical" />
      </MusicEngineProvider>
    </AppProvider>
  );
}

const keysFlashed = (container) =>
  [...container.querySelectorAll('.piano-key.is-playing')].map((k) => Number(k.getAttribute('data-abs')));

describe('PianoKeyboard — a loop note of another instrument does not flash a key', () => {
  it('a bass-tagged melodic note (nearShape) leaves the piano quiet', () => {
    const { container } = render(<Harness notes={[{ absoluteValue: 36, instrument: 'bass', nearShape: true }]} />);
    expect(keysFlashed(container)).toEqual([]);
  });

  it('a piano-tagged chord note flashes its own key', () => {
    const { container } = render(<Harness notes={[{ absoluteValue: 60, instrument: 'piano' }]} />);
    expect(keysFlashed(container)).toEqual([60]);
  });
});
