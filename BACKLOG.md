# Project Backlog

## Stabilisation & Nettoyage (P0)
- [x] Fix crash `activeBrick.examples[lang]` — optional chaining + fallback defaults.
- [x] Fix crash `activeBrick.effects[lang]` — même traitement.
- [x] Fix crash `translations[lang]` — null-safe lookup.
- [x] Add fallback for `tuning`, `guitarStrings`, `bassStrings` on expert_progressions bricks.
- [x] Remove debug ErrorBoundary from `main.jsx` (restore clean StrictMode).
- [x] Homogenize expert_progressions bricks: add missing `tuning`, `guitarStrings`, `bassStrings`, `examples` properties.
- [ ] Verify & tune genre presets after live testing.

## Refactoring & Technical Debt
- [x] Refactor `Fretboard.jsx` for better state management/readability.
- [x] Extract translations from `App.jsx` → `src/i18n/translations.js`.
- [x] Extract audio hooks → `useSequencer.js` & `MixerStrip`.
- [x] Extract fingering logic from `App.jsx` into `src/core/fingeringLogic.js` (currently ~60 lines of inline `useMemo` in App).
- [ ] Standardize UI components layouts.

## Testing
- [x] Set up Vitest/Jest for unit testing.
- [x] Implement math-based audio tests (FFT, BPM, Spectral Flatness).
- [x] Implement tests for `PianoRoll`.
- [x] Implement unit tests for `Fretboard`.
- [x] Implement unit tests for `PianoKeyboard`.
- [x] Add unit tests for `fingeringLogic.js` (after extraction).
- [ ] Add edge-case tests for bricks (missing properties).

## Features — Completed
- [x] **Expertise Musicale** : NNS, CAGED, Doigtés dynamiques (1-4, O, X).
- [x] **Progressions Expertes** : Pop, Rock, Doo-Wop, Funk, Jazz.
- [x] **Modes & Émotions** : Adjectifs, notes magiques et rôles harmoniques.
- [x] Audio engine extraction with Hard Limiter safety.
- [x] Genre-specific instrument presets (electronic, jazz, rock, pop, urban, world).
- [x] Piano Sampler (Salamander) with PolySynth fallback.
- [x] Velocity/pitch visibility in sequencer (ghost notes, pitch labels).
- [x] DAW Helper (pattern verbalization for reproduction).
- [x] Octave drift fix (reset on first chord of progression cycle).
- [x] Per-instrument volume sliders (Kick, Snare, Hat, Bass, Piano).
- [x] Compact horizontal mixer UI strip.

## Phase 4 : Doigtés Anatomiques (P1) ✅
- [x] **4.1** Extract fingering computation from `App.jsx` → `src/core/fingeringLogic.js`.
- [x] **4.2** Support minor chords in fingering (barre E-minor, A-minor, open Em, Am, Dm).
- [x] **4.3** Add open chord shapes (C, Am, G, E, Em, D, Dm open position).
- [x] **4.4** Add anatomical finger label display (I, M, A, m) as option vs numeric (1-4).
- [x] **4.5** Adapt bass fingering: Root-Fifth-Octave patterns with proper finger assignment.

## Phase 5 : Intelligence Harmonique & NNS Avancé (P2)
- [ ] **5.1** Add harmonic role display on chord buttons (Tonic/Subdominant/Dominant badge).
- [ ] **5.2** Add common chord substitution suggestions (e.g., vi for I, ii for IV).
- [ ] **5.3** Add "Emotion Engineering" panel: select a target emotion → suggest a progression.
- [ ] **5.4** Add secondary dominants & modal interchange explanations.

## Phase 6 : Polish & Production (P3)
- [ ] Build production bundle and validate on Netlify.
- [ ] Performance audit (React profiler, unnecessary re-renders in Fretboard).
- [ ] Accessibility pass (keyboard navigation, ARIA labels).
