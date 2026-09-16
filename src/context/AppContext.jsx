// @ts-check

import React, { createContext, useContext, useReducer } from 'react';
import { translations } from '../i18n/translations';

const AppContext = createContext(null);

const initialState = {
  appMode: 'studio',
  lang: 'fr',
  // VMU-100: latin (do, ré, mi) notation by default, at the product owner's
  // request. US (A, B, C) stays available through the existing US/EU
  // selector (DictionaryPanel.jsx, dispatches SET_NOTATION). Safe to flip
  // because every path that feeds the synth (midiToNoteName, Fretboard.jsx
  // and PianoKeyboard.jsx's click handlers) builds its name from `.us`
  // unconditionally, never from this value — see PitchConsistency.test.js
  // and EuNotationDefault.test.jsx for the audibility guards this relies on.
  notation: 'eu',
  showAbout: false,
  showTheory: false,
  showFingering: true,
  // VMU-111 §5: separate from showFingering (which still gates the voicing
  // mask and the position selector, unchanged). This one only decides
  // whether a fretted note's label shows a finger number (1-4) instead of
  // its degree. Off by default — degree is the default label. The old
  // anatomic/classical label set (I/M/A/m) is removed entirely.
  showFingerNumbers: false,
  playbackInstrument: 'piano',
  // VMU-112: replaces layoutMode/activeTab ("Tout afficher / Mode Focus").
  // Keyed by section id ("sequencer" | "piano" | "guitar" | "bass"); a
  // missing key means expanded, so the default {} is "everything open" —
  // required behaviour (§2.3), and it needs no per-section initialisation.
  collapsedSections: {},
  uiTheme: 'modern',
  showLegend: false,
  harmonicMode: false,
  // VMU-123 — replaces highlightTargetNotes (a boolean gate on a single
  // hard-coded "3rd + 5th" note). majorMinor is the default: good without
  // any setting, since a beginner will not go looking for the selector.
  targetNotesPreset: 'majorMinor',
  useShellVoicings: false
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
