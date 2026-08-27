import React, { createContext, useContext } from 'react';

export const PlaybackContext = createContext(null);

export function PlaybackProvider({ children, value }) {
  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export const usePlaybackContext = () => {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlaybackContext must be used within PlaybackContext.Provider');
  }
  return ctx;
};
