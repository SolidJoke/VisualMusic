// src/context/AppContext.jsx
//
// Lightweight React Context for cross-cutting application state.
// Provides: lang, txt, notation — values that are needed by almost every
// component but don't change frequently enough to warrant Zustand.
//
// Usage (consumer):
//   import { useAppContext } from '../../context/AppContext';
//   const { lang, txt, notation } = useAppContext();
//
// Usage (provider — in App.jsx):
//   <AppProvider lang={lang} txt={txt} notation={notation}>
//     {children}
//   </AppProvider>

import React, { createContext, useContext } from 'react';

const AppContext = createContext({
  lang: 'fr',
  txt: {},
  notation: 'eu',
});

/**
 * Provider component. Place at the top of the App render tree.
 */
export function AppProvider({ lang, txt, notation, children }) {
  return (
    <AppContext.Provider value={{ lang, txt, notation }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to consume the AppContext. Throws if used outside AppProvider.
 */
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}

export default AppContext;
