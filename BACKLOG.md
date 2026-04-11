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

## Phase 6 : Chord Voicing View — Guitare (P2)
> Objectif : Quand un accord est sélectionné dans la Progression Magique, afficher sur le manche
> de guitare uniquement le voicing choisi (cordes jouées, à vide, ou muettes), sans polluer
> l'affichage avec toutes les autres occurrences possibles.
> **Périmètre : Guitare uniquement.** La basse garde son mode actuel (root + quinte).

- [x] **6.1 — String-Root Selector** : Widget compact (pills horizontales) au-dessus du manche guitare,
      affiché uniquement quand `showFingering=true` et qu'un accord est sélectionné.
      Chaque pill = une corde + la frette où la fondamentale de l'accord existe (ou "à vide").
      Cliquer sur une pill ancre le voicing sur cette corde.
      Pills grisées si la note dépasse la frette 14 (cas de figure rare mais possible).

- [x] **6.2 — Voicing "rootString" dans fingeringLogic** : Étendre `getGuitarFingering(rootValue, isMinor, rootString)`
      pour calculer un voicing centré sur la corde demandée.
      Couvrir au minimum les cas : root sur E grave, A, D (les 3 plus courants).
      Ajouter les formes correspondantes dans `GUITAR_SHAPES` (D-shape, G-shape positionnelles).

- [x] **6.3 — Masquage des notes hors-voicing** : Quand un voicing est actif (pill sélectionnée),
      neutraliser l'affichage des autres occurrences des mêmes notes sur le manche
      (opacity 0 ou suppression de `isActive`). Seules les cases du voicing restent illuminées.

- [x] **6.4 — En-tête X / O par corde** : Afficher une rangée d'indicateurs au-dessus du manche :
      `X` = corde muette (ne pas jouer), `O` = corde à vide (jouer sans presser).
      Ces indicateurs proviennent directement de l'objet `fingering` existant.

- [x] **6.5 — Message "hors portée"** : Afficher un avertissement discret dans deux cas :
      - Cas A : Une note du voicing dépasse la frette 14 (note physiquement inaccessible).
      - Cas B : L'écart entre la frette la plus basse et la plus haute du voicing est > 4
        (prise physiquement difficile — suggérer une autre pill).
      Message style : "⚠️ Ce voicing est difficile — essaie une autre position".

- [x] **6.6 — Tests unitaires** : Couvrir `getGuitarFingering` avec le paramètre `rootString`,
      les cas "out of range" (frette > 14), et les cas de spanning > 4 frettes.

## Phase 7 : Polish & Production (P3)
- [ ] Build production bundle and validate on Netlify.
- [ ] Performance audit (React profiler, unnecessary re-renders in Fretboard).
- [ ] Accessibility pass (keyboard navigation, ARIA labels).
