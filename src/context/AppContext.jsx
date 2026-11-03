// @ts-check

import React, { createContext, useContext, useReducer } from 'react';
import { translations } from '../i18n/translations';
import { loadPersisted } from '../utils/persistedState';

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
  // VMU-209 — the instrument is remembered per mode: piano in both by default,
  // and choosing one in the Studio does not change the Dictionary's (nor vice
  // versa). `playbackInstrumentByMode` is what persists; `playbackInstrument`
  // is its per-mode value for the active mode, kept here so every reader of
  // `state` keeps reading one name.
  playbackInstrumentByMode: { studio: 'piano', dictionary: 'piano' },
  playbackInstrument: 'piano',
  // VMU-112: replaces layoutMode/activeTab ("Tout afficher / Mode Focus").
  // Keyed by section id ("sequencer" | "piano" | "guitar" | "bass"); a
  // missing key means expanded, so the default {} is "everything open" —
  // required behaviour (§2.3), and it needs no per-section initialisation.
  collapsedSections: {},
  showLegend: false,
  harmonicMode: false,
  // VMU-123 — replaces highlightTargetNotes (a boolean gate on a single
  // hard-coded "3rd + 5th" note). majorMinor is the default: good without
  // any setting, since a beginner will not go looking for the selector.
  targetNotesPreset: 'majorMinor',
  useShellVoicings: false
};

// VMU-050: what the app reopens on. The kept values (mode, language, notation,
// the instrument remembered per mode) replace the defaults above, read once, in
// the lazy initializer so the very first render is already right (no flash of
// the defaults). Pure: loadPersisted() only reads, and every field it returns
// is validated; with nothing stored, or storage broken, it is the defaults
// exactly as before.
function initState() {
  const { appMode, lang, notation, playbackInstrumentByMode } = loadPersisted();
  const mode = appMode !== undefined ? appMode : initialState.appMode;
  const byMode = playbackInstrumentByMode !== undefined
    ? playbackInstrumentByMode
    : initialState.playbackInstrumentByMode;
  return {
    ...initialState,
    ...(appMode !== undefined && { appMode: mode }),
    ...(lang !== undefined && { lang }),
    ...(notation !== undefined && { notation }),
    ...(playbackInstrumentByMode !== undefined && { playbackInstrumentByMode: byMode }),
    playbackInstrument: byMode[mode],
  };
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_APP_MODE': {
      // VMU-209 — switching mode restores that mode's own instrument.
      const appMode = action.payload;
      return { ...state, appMode, playbackInstrument: state.playbackInstrumentByMode[appMode] };
    }
    case 'SET_LANG':
      return { ...state, lang: action.payload };
    case 'SET_NOTATION':
      return { ...state, notation: action.payload };
    // VMU-209 — choosing an instrument writes it for the ACTIVE mode only, so
    // the Studio and the Dictionary each keep their own (decision 1).
    case 'SET_PLAYBACK_INSTRUMENT': {
      const playbackInstrument = action.payload;
      return {
        ...state,
        playbackInstrument,
        playbackInstrumentByMode: {
          ...state.playbackInstrumentByMode,
          [state.appMode]: playbackInstrument,
        },
      };
    }
    case 'SET_UI_VALUE':
      return { ...state, [action.payload.key]: action.payload.value };
    case 'SET_HARMONIC_MODE':
      return { ...state, harmonicMode: action.payload };
    default:
      return state;
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, initState);

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
