import React, { createContext, useContext } from 'react';

/**
 * Context to hold the state of the music engine and avoid prop drilling
 * across the app (especially down to InstrumentView and Fretboard).
 */
const MusicEngineContext = createContext(null);

export function MusicEngineProvider({ children, value }) {
  return (
    <MusicEngineContext.Provider value={value}>
      {children}
    </MusicEngineContext.Provider>
  );
}

export function useMusicEngineContext() {
  const context = useContext(MusicEngineContext);
  if (!context) {
    throw new Error('useMusicEngineContext must be used within a MusicEngineProvider');
  }
  return context;
}
