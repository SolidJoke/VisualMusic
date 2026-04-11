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
> **Approche technique & TDD** : 
> App.jsx contient ~50 variables d'état imbriquées. Extraire le code sans filet risque de casser le mode Séquenceur (Studio) ou le mode Dictionnaire.
> **Stratégie** : 1) Figer les comportements via des tests d'intégration. 2) Introduire un `AppContext` robuste pour la state machine globale. 3) Extraire les hooks `useDictionaryMode` et `useStudioMode` en TDD. 4) Extraire le JSX final.

- [ ] **8.1.1 — TDD : Tests d'intégration App.jsx (Le Filet de Sécurité)**
      **Action :** Créer `App.integration.test.jsx`. Simuler les flux critiques utilisateur.
      - *Test 1* : Clic sur bouton "Mode Studio" -> vérifie l'affichage du Séquenceur.
      - *Test 2* : Clic sur bouton "Mode Dictionnaire" -> sélection note "C" + "Majeur" -> vérifie que Fretboard reçoit les bonnes props.
      - *Test 3* : Toggle "Basse/Guitare" -> vérifie la propagation de la prop "instrument".

- [ ] **8.1.2 — Architecture : Création de `AppContext` & `useGlobalState`**
      **Action :** Les props comme `playbackInstrument`, `appMode` (studio/dictionary), `isAudioReady` n'ont pas à être prop-drillées.
      Créer `src/context/AppContext.jsx` avec un `useReducer` pour gérer les transactions d'état globales prop-drilling-free.

- [ ] **8.1.3 — TDD : Extraction `useDictionaryMode`**
      **Action :** Écrire `useDictionaryMode.test.js`. Tester les transitions d'état (`dictRoot`, `dictType`, `selectedRootString`).
      Extraire la logique de App.jsx vers `src/hooks/useDictionaryMode.js`.

- [ ] **8.1.4 — TDD : Extraction `useStudioMode`**
      **Action :** Écrire `useStudioMode.test.js`. Tester la logique complexe (ex: `currentBrickIndex`, `clickedChord`, `currentTheme`).
      Extraire vers `src/hooks/useStudioMode.js`.

- [ ] **8.1.5 — UX/Refactor : Extraction UI `<DictionaryPanel />`**
      **Action :** Créer `src/components/Panels/DictionaryPanel.jsx`. Lui injecter `useDictionaryMode()`.

- [ ] **8.1.6 — UX/Refactor : Extraction UI `<StudioPanel />`**
      **Action :** Créer `src/components/Panels/StudioPanel.jsx`. Lui injecter `useStudioMode()`.
      **Check final :** Lancer les tests de 8.1.1, ils doivent tous passer au vert.

### 8.2 — Fretboard.jsx : Memoization des callbacks [P2 — Performance]
- [x] **8.2 — `useCallback` sur `autoPlayNote` dans App.jsx** ✅
      **Fix :** Pattern ref (`playSingleNoteRef`) + useCallback([playbackInstrument]).
      Fretboard et PianoKeyboard ne re-renderent plus sur chaque state change de App.
      Build validé, branche `chore/quickwins-8.2-8.5`.

### 8.3 — Bundle Splitting : Tone.js en chunk séparé [P2 — Performance]
- [ ] **8.3.1 — Isoler la limite dynamique**
      **Action :** Tone.js fait ~350KB et bloque le First Contentful Paint.
      Créer un pattern de Lazy Initialization dans `AudioEngine.js` :
      `let Tone; const initAudio = async () => { if (!Tone) { Tone = await import('tone'); } }`
      **Vérification :** Le build `npm run build` doit montrer un chunk séparé pour Tone.js et le chunk principal (`index.js`) doit repasser sous la barre des 150KB gzip.

### 8.4 — fingeringLogic.js : Shapes manquantes (Accords 7ème) [P2 — Qualité musicale]
- [ ] **8.4.1 — TDD : Ajout des structures 7ème**
      **Action :** Modifier `src/core/fingeringLogic.test.js`. Ajouter les tests pour `G7`, `Cmaj7`, `Am7`, `Dm7` et `E7`.
- [ ] **8.4.2 — Données : Enrichir `GUITAR_SHAPES`**
      **Action :** Ajouter les objets d'empreintes (ex: `open_G7: { 0: {0:1}, 1:{0:'O'}, 2:{0:'O'}, 3:{0:'O'}, 4:{2:2}, 5:{3:3} }`).
- [ ] **8.4.3 — UI : Mapper les inputs dictionnaire**
      **Action :** Dans le composant de vue Dictionnaire, relier les sélecteurs de `dictType` (ex: `chord_dom7`, `chord_min7`) à la logique `isMinor` et `is7th` passée à `getGuitarFingering`.

### 8.5 — Tests : Couverture des bricks [P3 — Qualité]
- [x] **8.5 — Tests edge-case des bricks** ✅
      **Fix :** 242 tests sur tous les bricks (name, effects, examples, bpm, nnsProgression,
      theme, drumTracks, melodyTracks, + champs expert_progressions).
      Branche `chore/quickwins-8.2-8.5`.

### 8.6 — UI : Standardisation des layouts composants [P3 — Maintenabilité]
- [ ] **8.6.1 — CSS Design Tokens**
      **Action :** Extraire toutes les couleurs (`#e91e63`, `#260d00`, etc.), les espacements (gap, padding) et le z-index dans du `:root` CSS contextuel (`src/App.css` ou `index.css`).
      **Objectif :** Permettre un mode sombre/clair facile et nettoyer le code React des `style={{...}}` excessifs.

---

## Phase 9 : Accessibilité (A11y) & Internationalisation (P3)
> **Approche technique** : Viser le standard WCAG 2.1 AA. L'accessibilité clavier est primordiale pour les musiciens qui manipulent leur instrument en même temps.

- [ ] **9.1 — Audit & Sémantique (Axe-core)**
      **Action :** Remplacer les `<div onClick>` non-accessibles par des `<button>` transparents. Assurer le focus management (outline visible, tabIndex correct).
- [ ] **9.2 — Screen Readers Support**
      **Action :** Ajouter des `aria-label` descriptifs (ex: `aria-label="Accord Do Majeur, Rôle Tonique"` au lieu de juste "C").
- [ ] **9.3 — Traduction Exhaustive**
      **Action :** Parcourir les labels restants en dur dans l'UI (Dictionnaire, Paramètres, Notifications) et les router vers `translations.js`.

---

## Phase 5 : Intelligence Harmonique & NNS Avancé (P2)
> **Dépendances :** 
> - Nécessite **8.1** (App.jsx fragmenté) pour éviter d'ajouter du JSX lourd dans le God Component.
> - Nécessite **8.4** (Formes d'accords de 7ème) pour que les substitutions avancées (ex: `V7`) puissent s'afficher sur la guitare.
>
> **Approche UX/UI** : Le Séquenceur et le Dictionnaire sont déjà chargés. L'Intelligence Harmonique doit être optionnelle et non-intrusive.
> **Proposition UX** : Ajouter un Toggle "Mode Assistant Harmonique". Quand actif, le clic sur un accord dans le séquenceur n'ouvre pas le menu standard de sélection de note, mais un "Harmonic HUD" (tiroir bas ou modal transparente) suggérant des substitutions et affichant le rôle.

- [ ] **5.1 — TDD : Core Harmonic Logic (Pure JS)**
      **Action :** Créer `src/core/harmonicLogic.js` et `harmonicLogic.test.js`.
      **Tâches TDD :**
      - `getHarmonicRole(nnsStr, modeName)` -> Retourne 'Tonic', 'Subdominant', 'Dominant'.
      - `getSubstitutions(nnsStr, modeName)` -> Fonction retournant un array d'objets `[{ nns: '6-', type: 'relative_minor', tension: 'low' }, ...]`.
      - `getSecondaryDominant(nnsStr)` -> Calcul de l'accord V/x.

- [ ] **5.2 — UI : Badges de Rôles Harmoniques**
      **Action :** Modifier `<ProgressionBuilder>` / `<PianoRollBase>`.
      Si le toggle "Assistant" est actif, afficher un badge (ex: point coloré ou lettrine T/S/D) sur les blocs d'accords. Les couleurs doivent respecter l'accessibilité psychologique (Tonic = Vert/Stable, Subdominant = Bleu/Mouvement, Dominant = Rouge/Tension).

- [ ] **5.3 — UI/UX : Le "Harmonic HUD" (Substitutions)**
      **Action :** Créer un composant `<HarmonicHUD />`. Au lieu du simple sélecteur de note actuel, ce HUD propose à l'utilisateur :
      "Au lieu de jouer *Fa Majeur (IV)*, tu pourrais essayer :"
      - *Ré Mineur (ii)* : "Plus doux, garde la même fonction d'approche."
      - *Si Bémol Majeur (bVII)* : "Emprunt au mode mineur, couleur épique."
      Le composant appelle les fonctions pures créées en 5.1.

- [ ] **5.4 — Produit : "Emotion Engineering" (Le Guide Ultime)**
      **Action :** Remplacer les simples listes de "Modes" par un panel "Ingénieur Émotionnel".
      - Input : Je veux une progression "Mélancolique mais pleine d'espoir".
      - Output : L'app compile une combinaison de mode (Lydien) + une dynamique rythmique, et peuple la timeline Séquenceur.

