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

## Phase 6b : Correction Doigtés Guitare (P2b) 🚨 ACTIF — Prêt pour Fix

> **Contexte :** Une passe QA (Gemini Flash, 2026-04-11) a identifié plusieurs bugs critiques dans
> la logique de doigtés et son rendu. Les tâches suivantes sont documentées pour qu'un autre
> modèle (ou une nouvelle session) puisse les prendre en charge sans perdre de contexte.
>
> **Fichiers concernés :**
> - `src/core/fingeringLogic.js` (logique de calcul)
> - `src/components/Instruments/Fretboard.jsx` (rendu visuel)

- [x] **6b.1 — BUG CRITIQUE : La Majeur retourne un La Mineur (open_Am)**
      **Fichier :** `fingeringLogic.js`, ligne ~206
      **Problème :** `if (rootValue === 9 && !isMinor)` retourne `open_Am` au lieu d'un accord majeur.
      **Fix :** Ajout de la forme `open_A` (X-0-2-2-2-0) et correction de la condition de retour.

- [x] **6b.2 — Doigts affichés sur cordes à vide (fret 0 = "O")**
      **Fichier :** `fingeringLogic.js`
      **Problème :** Certaines cordes marquées `fret: 0, finger: 1` recevaient un numéro de doigt.
      **Fix :** Toutes les formes `open_*` utilisent désormais `finger: 'O'` pour les frettes 0.

- [x] **6b.3 — Visualisation barré** (illusion des "5 doigts")
      **Fichier :** `Fretboard.jsx`
      **Fix :** Pill bleue (barré indicator) positionnée sur la frette barrée, reliant les cordes couvertes par le doigt 1. Tooltip au survol. Mergé dans `feat/barre-visualization`.

- [x] **6b.4 — Mode Expert sur Gammes affiche "1" sur toutes les notes**
      **Fichier :** `Fretboard.jsx`
      **Problème :** Les gammes affichaient un label de doigt "1" sur chaque note.
      **Fix :** Les labels de doigts sont désormais masqués en mode Scale.

- [x] **6b.5 — Priorité aux formes ouvertes insuffisante dans getGuitarFingering**
      **Fichier :** `fingeringLogic.js`
      **Problème :** Do Majeur privilégiait un barré au lieu de la forme ouverte standard.
      **Fix :** Complétion du dictionnaire `openChords` et priorité forcée aux formes ouvertes.

- [x] **6b.6 — Tests unitaires mis à jour**
      **Fichier :** `fingeringLogic.test.js` + `AppRoot.test.jsx`
      **Fix :** 17 tests passent (A major, Dm, open string 'O' labels). AppRoot mock corrigé pour Tone.js.


## Phase 7 : Polish & Production (P3) ✅ COMPLÉTÉ

- [x] **7.0** Barre visualization coordinate fix (guitarIdx → visualIdx)
- [x] **7.1** Build prod validé : exit 0, 157KB gzip, samples présents dans dist/
- [x] **7.2** Samples audio (`dist/samples/guitar/*.mp3`) confirmés dans le build
- [x] **7.3** Routing SPA validé
- [x] **7.4** `netlify.toml` créé (SPA redirect + cache headers audio/assets)
- [x] **7.5** PR mergée, branche feat/phase7-prod-and-barre-fix → main ✅
- [ ] **7.6** Performance audit (Fretboard re-renders) — reporté Phase 8
- [ ] **7.7** Accessibility pass (aria-labels, contraste) — reporté Phase 8

---

## Phase 8 : Dette Technique & Qualité (P2-P3)

> **Principe de sélection** : Ces items ne sont retenus que s'ils apportent un avantage
> concret : meilleure maintenabilité, performances mesurables, ou réduction du risque de bugs.
> Items purement cosmétiques ou "on pourrait faire mieux" sans impact réel exclus.
>
> **Priorité globale dans la backlog :**
> - Phase 5 (Intelligence Harmonique) > Phase 8 Tech Debt > Phase 9 Accessibilité
> - Exception : Tech Debt P1 (items critiques) doivent passer avant Phase 5 si ils bloquent le dev

### 8.1 — App.jsx : Fragmentation du Dieu-Composant [P1 — Critique]
- [ ] **8.1 — Découper App.jsx (2054 lignes) en composants/hooks dédiés**
      **Problème :** App.jsx fait 2054 lignes. C'est un "God Component" : impossible à lire,
      difficile à tester, et chaque feature nouvelle aggrave le problème.
      **Avantage réel :** Réduction du risque de bugs en cascade, onboarding des IA
      plus efficace (contexte moins chargé), tests unitaires ciblés possibles.
      **Plan de découpage (par ordre de dépendances) :**
      1. Extraire `useDictionaryMode()` hook (état dictRoot, dictType, selectedRootString, fretboardZone)
      2. Extraire `useStudioMode()` hook (clickedChord, currentBrickIndex, currentTheme, activeBrick...)
      3. Extraire `<DictionaryPanel />` composant (tout le JSX du mode Dictionnaire)
      4. Extraire `<StudioPanel />` composant (tout le JSX du mode Studio)
      **Effort :** Large (semaine prochaine). **Dépend de :** rien. **Bloque :** Phase 5 (qui ajoutera encore du JSX).

### 8.2 — Fretboard.jsx : Memoization des callbacks [P2 — Performance]
- [ ] **8.2 — Ajouter `useCallback` sur `onNoteClick` dans App.jsx**
      **Problème :** `onNoteClick` est recréé à chaque render de App.jsx, forçant
      Fretboard (et tous ses enfants) à re-render même sans changement pertinent.
      **Avantage réel :** Réduit les re-renders du composant le plus lourd de l'app.
      **Fix :** Entourer la définition de `onNoteClick` dans App.jsx d'un `useCallback`.
      **Effort :** Petit (1h). **Dépend de :** rien.

### 8.3 — Bundle Splitting : Tone.js en chunk séparé [P2 — Performance]
- [ ] **8.3 — Code-split Tone.js via dynamic import**
      **Problème :** Vite avertit que le bundle fait 561KB (non-gzip). Tone.js (~350KB)
      est la principale cause. Il n'est utilisé qu'après interaction utilisateur (clic "Activer Audio").
      **Avantage réel :** Améliore le First Contentful Paint (FCP) — la page s'affiche
      plus vite avant que l'utilisateur active l'audio.
      **Fix :** `const Tone = await import('tone')` dans `AudioEngine.js` + lazy init.
      **Effort :** Moyen (2-3h, à tester soigneusement). **Dépend de :** 8.1 (plus simple avec App découpé).

### 8.4 — fingeringLogic.js : Shapes manquantes [P2 — Qualité musicale]
- [ ] **8.4 — Compléter les GUITAR_SHAPES avec les accords de 7ème courants**
      **Problème :** L'app ne gère que les triades (majeur/mineur). Pas de G7, Cmaj7, Am7, Dm7...
      Les accords de 7ème sont omniprésents en jazz/pop. L'app les "ignore" silencieusement.
      **Avantage réel :** Cohérence musicale — les utilisateurs avancés attendent ces formes.
      **Fix :** Ajouter `open_G7`, `open_Em7`, `open_Am7`, `open_Dmaj7` dans GUITAR_SHAPES
      + gérer le cas `dictType === 'chord_dom7'` dans App.jsx.
      **Effort :** Moyen (3-4h). **Dépend de :** 8.1 idéalement. **Bloque :** Phase 5.4.

### 8.5 — Tests : Couverture des bricks [P3 — Qualité]
- [ ] **8.5 — Add edge-case tests for bricks (missing properties)**
      **Problème :** Bricks avec propriétés manquantes ont causé des crashs en prod (P0).
      Des tests auraient détecté en amont.
      **Avantage réel :** Filet de sécurité pour les futures modifications de bricks.
      **Fix :** Itérer sur tous les bricks dans un test, vérifier les propriétés critiques.
      **Effort :** Petit (1-2h). **Dépend de :** rien.

### 8.6 — UI : Standardisation des layouts composants [P3 — Maintenabilité]
- [ ] **8.6 — Créer un système de design tokens CSS**
      **Problème :** Les couleurs, espacements et tailles sont définis en inline style partout.
      Modifier un thème demande de chasser chaque occurrence.
      **Avantage réel :** Un seul fichier à modifier pour changer le thème. Pas de bénéfice
      perf direct, mais très utile si on envisage un mode clair ou un thème custom.
      **Fix :** Consolider dans `index.css` via variables CSS (déjà partiellement fait avec
      `--theme-primary`). Étendre à spacing, radii, font sizes.
      **Effort :** Moyen (3-4h). **Dépend de :** 8.1.

---

## Phase 9 : Accessibilité & Internationalisation (P3)
- [ ] **9.1** Accessibility pass : `aria-label` boutons sans texte, contraste, navigation clavier.
- [ ] **9.2** i18n complet : vérifier toutes les chaînes manquantes EN/FR.

---

## Phase 5 : Intelligence Harmonique & NNS Avancé (P2) — Semaine prochaine
> **Dépend de :** 8.1 (App.jsx fragmenté) pour éviter d'ajouter du code dans le God Component.

- [ ] **5.1** Harmonic role display on chord buttons (Tonic/Subdominant/Dominant badge).
- [ ] **5.2** Common chord substitution suggestions (e.g., vi for I, ii for IV).
- [ ] **5.3** "Emotion Engineering" panel: select target emotion → suggest a progression.
- [ ] **5.4** Secondary dominants & modal interchange explanations.

