
import React, { createContext, useContext, useReducer } from 'react';
import { translations } from '../i18n/translations';

const AppContext = createContext();

const initialState = {
  appMode: 'studio',
  lang: 'fr',
  notation: 'us',
  chordDisplayMode: 'standard',
  showAbout: false,
  showTheory: false,
  showFingering: true,
  fingeringMode: 'anatomic',
  playbackInstrument: 'piano',
  layoutMode: 'all',
  activeTab: 'sequencer',
  uiTheme: 'vintage',
  showLegend: false,
  harmonicMode: false,
  highlightTargetNotes: false
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_APP_MODE':
      return { ...state, appMode: action.payload };
    case 'SET_LANG':
      return { ...state, lang: action.payload };
    case 'SET_NOTATION':
      return { ...state, notation: action.payload };
    case 'SET_UI_VALUE':
      return { ...state, [action.payload.key]: action.payload.value };
    case 'SET_HARMONIC_MODE':
      return { ...state, harmonicMode: action.payload };
    default:
      return state;
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const txt = (translations && translations[state.lang]) || {};

  const value = {
    state,
    dispatch,
    lang: state.lang,
    txt,
    notation: state.notation
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
