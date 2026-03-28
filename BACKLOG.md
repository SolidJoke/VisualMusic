# Project Backlog

## Refactoring & Technical Debt
- [ ] Refactor `Fretboard.jsx` for better state management/readability.
- [ ] Standardize UI components layouts.

## Testing
- [x] Set up Vitest/Jest for unit testing.
- [x] Implement math-based audio tests (FFT, BPM, Spectral Flatness).
- [x] Implement tests for `PianoRoll`.
- [ ] Implement unit tests for `Fretboard`.
- [ ] Implement unit tests for `PianoKeyboard`.

## Features — Completed
- [x] Audio engine extraction with Hard Limiter safety.
- [x] Genre-specific instrument presets (electronic, jazz, rock, pop, urban, world).
- [x] Piano Sampler (Salamander) with PolySynth fallback.
- [x] Velocity/pitch visibility in sequencer (ghost notes, pitch labels).
- [x] DAW Helper (pattern verbalization for reproduction).
- [x] Octave drift fix (reset on first chord of progression cycle).

## Features — Next Session (P0)
- [ ] Per-instrument volume sliders (Kick, Snare, Hat, Bass, Piano).
- [ ] Compact horizontal mixer UI strip.
- [ ] Verify & tune genre presets after live testing.

## Refactoring — Next Session
- [ ] Extract translations from `App.jsx` → `src/i18n/translations.js`.
- [ ] Extract audio hooks → `useAudioEngine.js`.
- [ ] Clean up legacy files (`test_layout*.jsx`, `inject*.cjs`).
