# VisualMusic — Master Backlog

> **Vision** : VisualMusic est un assistant de composition premium combinant esthétique "Liquid Glass" et intelligence harmonique de haut niveau.
>
> **Source de vérité** : Ce fichier remplace `BACKLOG.md` (initial) et `REFINED_BACKLOG.md` (Flash). Conflits résolus par Claude Sonnet le 2026-05-10.
>
> **Processus** : Lire `docs/management/MASTER_TASK_TRACKER.md` pour les tâches atomiques Flash-ready.

---

## 🔴 P0 — Hygiene & Stabilité (URGENT)

### 🧹 Phase 14 — Débogage Critique [URGENT]

> Des bugs critiques ont été identifiés lors de sessions précédentes. À corriger en priorité absolue.

- [x] **14.1** — **Crash Fretboard en mode Dictionnaire** : ✅ Fixé avec gardes de sécurité (SESS-11).
- [x] **14.4** — Observabilité : `src/utils/debug.js` en place. ✅
- [x] **14.5** — **Header overflow** : ✅ Fixé (SESS-09).
- [x] **14.6** — **Z-index menu Notes** : ✅ Fixé via Sidebar.css (SESS-10).
- [x] **14.7** — **Toggle Mode** : ✅ Style Premium Blue implémenté (SESS-12).
- [ ] **BUG-07** — **Studio Sidebar Empty space** : Remove empty useless spacer in Studio Mode sidebar.
- [ ] **BUG-08** — **Dictionary Fretboard Width & Marker Shift** : Resolve doubled width and vertically shifted string markers.
- [ ] **BUG-09** — **Dictionary Scale Notes & Highlight Sync** : Fix incorrect notes showing on selected scale and sync highlights.

> **Note** : 14.2 (notes inaudibles Studio) et 14.3 (Crash Z-index Studio) sont à vérifier — peuvent avoir été corrigés avec la refonte architecture.

---

## 🟠 P1 — Architecture & Qualité de Code

### Stream A — Hygiene & Reliability

#### A.1 — Audit de Qualité & Purge
- [x] **A.1.1** — Dead code scan via jcodemunch → rapport `docs/management/dead_code_report.md`. ✅
- [ ] **A.1.2** — Suppression imports inutilisés (après A.1.1). *→ Flash*
- [ ] **A.1.3** — **Refactoring Fretboard** (complexité 99) : Extraire `FretboardCalculator.js`. *→ Sonnet/Pro, bloqué sur A.1.1 + tests 90%+*
- [x] **A.1.4** — **Refactoring InstrumentView** (25+ props) : Réduire via AppContext. ✅ (FLASH-04)
- [ ] **A.1.5** — Finaliser extraction App.jsx restant (Layout props). *→ Pro*

#### A.2 — Performance & Bundle
- [ ] **A.2.1** — Audit bundle avec `vite-bundle-visualizer`. *→ Flash*
- [ ] **A.2.2** — **Lazy load Tone.js** (dynamic import dans useSequencer). *→ Pro*
- [ ] **A.2.3** — Canvas Fretboard 4K. *→ Future*

### Stream B — Design System

#### B.1 — Design Tokens (CSS)
- [x] **B.1.1** — Inventaire couleurs HEX/HSL brutes dans CSS. ✅ (FLASH-05)
- [ ] **B.1.2** — Créer `src/styles/tokens.css` avec palette standardisée :
  - `--color-primary` (Gold)
  - `--color-role-root` (Stable)
  - `--color-role-third` (Color)
  - `--color-role-fifth` (Tension)
  - `--color-role-extension` (Flavor)
  - 3 états par token : `base`, `glow`, `subtle`
- [ ] **B.1.3** — Migration CSS composant par composant (PianoRoll → Sidebar → Fretboard). *→ Flash par composant*

### Phase 8 — Refactoring Historique
- [x] **8.2** — Extraction hooks métiers + AppContext. ✅ (useMusicEngine, AppContext, useStudioMode, useDictionaryMode)
- [ ] **8.1** — Audit nettoyage (voir A.1.1). *→ Flash*
- [ ] **8.3** — Optimisation Bundle Tone.js (voir A.2.2). *→ Pro*

### Phase 12 — Finitions UI
- [x] **12.1** — Proportions anatomiques (22 cases). ✅
- [x] **12.2** — Barrés via Grid. ✅
- [x] **12.3** — Clavier restreint C3-C5 dict. ✅
- [x] **12.4** — Esthétique premium glow. ✅
- [x] **12.5** — Mode anatomique/expert par défaut. ✅
- [ ] **12.6** — Animation Dictionnaire (sync gamme/accord). *→ Flash*
- [ ] **12.7** — Bordures CTA cohérentes. *→ Flash*
- [ ] **12.8** — Dynamisme couleur bordure CTA. *→ Flash*

---

## 🟡 P2 — Intelligence & Navigation Musicale

### Stream F — Interaction & Navigation (Focus Actuel)

#### F.1 — Navigation par Octaves & Variantes [AFFINÉ + PARTIELLEMENT IMPLÉMENTÉ]
*Voir `docs/management/REF_DECISION_MATRIX_F1.md`*

- [x] **F.1.A** — Contrat `fingeringMap` v2 implémenté. ✅
- [x] **F.1.B** — `PositionSelector.jsx` créé. ✅
- [x] **F.1.1** — Ajouter `isOutOfRange` dans useMusicEngine. ✅ (FLASH-02)
- [x] **F.1.2** — Ghost feedback CSS pour hors-tessiture. ✅ (FLASH-03)
- [ ] **F.1.3** — Sélecteur Mode Global (Note / Accord / Gamme). *→ Sonnet (UX spec needed)*

#### F.2 — Architecture de Sélection [AFFINÉ + PARTIELLEMENT IMPLÉMENTÉ]
*Voir `docs/management/REF_DECISION_MATRIX_F2.md`*

- [x] **F.2.A** — `useMusicEngine.js` extrait (264L). ✅
- [x] **F.2.B** — `AppContext` en place. ✅
- [x] **F.2.1** — Réduire props InstrumentView via context. ✅ (FLASH-04)
- [ ] **F.2.2** — Extraire MixerPanel de App.jsx. *→ Flash*
- [ ] **F.2.3** — React.memo sur Fretboard et PianoKeyboard. *→ Flash*

#### F.3 — Observabilité Agentique [AFFINÉ, NON IMPLÉMENTÉ]
*Voir `docs/management/REF_DECISION_MATRIX_F3.md`*

> ⚠️ **Architecture révisée** : L'écriture fichier via browser SPA est impossible. Solution : localStorage + Playwright dump.

- [ ] **F.3.1** — Hook `useDebugState` → localStorage. *→ Flash*
- [ ] **F.3.2** — Script Playwright `scripts/dump-state.js`. *→ Flash*
- [ ] **F.3.3** — npm script `npm run check:state`. *→ Flash*

#### F.4 — Protocole Passation [IMPLÉMENTÉ via LAST_HANDOVER.md]
- [x] **F.4.A** — Template passation en place. ✅
- [x] **F.4.B** — MASTER_TASK_TRACKER.md créé (2026-05-10). ✅
- [ ] **F.4.1** — Automatiser génération handover (template script). *→ Aria Backlog ARIA-15*

### Stream C — Intelligence Harmonique

#### C.1 — Intégration Tonal.js [ANALYSE REQUISE]
- [ ] **C.1.1** — Audit fonctions theory.js → mapping Tonal API. *→ Sonnet (SONNET-01)*
- [ ] **C.1.2** — Créer `tonal-adapter.js` wrapper. *→ Flash (après SONNET-01)*
- [ ] **C.1.3** — Migration function par function avec tests. *→ Pro*

#### C.2 — Assistant Proactif [VISION FUTURE]
- [ ] **C.2.1** — "Next Chord" HUD : 3 alternatives harmoniques au step suivant. *→ Future*
- [ ] **C.2.2** — Melodic Guide Overlay : Target Notes vs notes de passage. *→ Future*
- [ ] **C.2.3** — Emotional Mapping : sélection par sentiment. *→ Future*

### Stream D — Expertise Instrumentale

#### D.1 — Anatomie
- [ ] **D.1.1** — Frettage logarithmique (constante 17.817). *→ Flash*
- [ ] **D.1.2** — Paramètre `numFrets` (22/24 selon instrument). *→ Flash*

#### D.2 — Voicing Intelligence
- [x] **D.2.A** — `VoicingAlert.jsx` créé. ✅
- [x] **D.2.1** — Intégrer VoicingAlert dans DictionaryPanel. ✅ (FLASH-06)
- [ ] **D.2.2** — Voice Leading automatique (algo scoring inversion). *→ Sonnet*

---

## 🟡 P2 — Stream G : Music Intelligence (Composition & Improvisation)
> Source : `docs/management/MUSIC_INTELLIGENCE_ROADMAP.md` + `music_theory_notes.md`
> Pré-requis : PRO-SPEC-01 (audit data musicale) avant implémentation Flash

### G.1 — Dictionary Mode Enrichi
- [ ] **G.1.1** — Modes relatifs/parallèles : chips cliquables des 7 modes d'une gamme + gamme parallèle. *→ Flash (après Pro spec)*
- [ ] **G.1.2** — Notes de tension/résolution colorisées sur le manche (vert=stable, jaune=tension, rouge=avoid). *→ Flash (après Pro spec)*
- [ ] **G.1.3** — Gammes compatibles catégorisées : Parfaites / Couleur / Évitement. *→ Flash (après Pro spec)*
- [ ] **G.1.4** — Mood Indicator étendu : tension 0-10, contextes de genre, tempo suggéré. *→ Pro*
- [ ] **G.1.5** — Toggle Classique/Moderne : analyse stricte (V7→I) vs Jazz/Debussy (tension=couleur stable). *→ Sonnet*

### G.2 — Studio Mode Enrichi
- [ ] **G.2.1** — Degrés romains (I/ii/IV/V) affichés sur chaque accord de la progression. *→ Flash (après Pro spec)*
- [ ] **G.2.2** — Progressions communes Quick Start : chips II-V-I, I-V-vi-IV, I-IV-V-I, Turnaround, Andalou. *→ Flash (après Pro spec)*
- [ ] **G.2.3** — Substitutions harmoniques contextuelles : Triton Sub, Relatif, Diatonique. *→ Sonnet*
- [ ] **G.2.4** — "Next Chord" HUD : 3 alternatives harmoniques au step suivant. *→ Future*
- [ ] **G.2.5** — Alertes tension de section : si tonique placée là où dominante attendue. *→ Pro*

### G.3 — Navigation Harmonique
- [ ] **G.3.1** — Camelot Wheel / Roue des Quintes HUD : affichage SVG, tonalité courante surlignée, voisins compatibles. *→ Flash (composant autonome)*
- [ ] **G.3.2** — Guide de modulation : Pivot Chord Finder entre deux tonalités. *→ Sonnet*
- [ ] **G.3.3** — Interchange Modal : suggestion accords empruntés au mode parallèle. *→ Sonnet*
- [ ] **G.3.4** — Dominantes secondaires : V/X suggérées pour micro-tensions directionnelles. *→ Pro*

### G.4 — Intelligence de Voicing
- [ ] **G.4.1** — Voice Leading automatique : inversions/positions minimisant les sauts entre accords. *→ Sonnet*
- [ ] **G.4.2** — Shell Voicings suggérés : priorité 3e+7e pour Jazz. *→ Pro*
- [ ] **G.4.3** — Score de jouabilité : -10pts par saut > 4 frettes, pénalité tierces serrées dans le grave. *→ Pro*

---

## 🟡 P2 — Stream H : Psychoacoustique & Performance
> Source : `docs/intelligence/psychoacoustics.md` + `docs/intelligence/PERFORMANCE_DYNAMICS.md`

### H.1 — Illusions Sonores
- [ ] **H.1.1** — Basse Fantôme (Missing Fundamental) : HUD suggérant harmoniques 2f/3f/4f à ajouter pour simuler basses profondes sur smartphones. *→ Pro*
- [ ] **H.1.2** — Visualisation harmoniques fantômes en couleur atténuée sur le clavier. *→ Flash (après H.1.1)*
- [ ] **H.1.3** — Tons de Shepard : visualisation cascade dans PianoRoll + export MIDI. *→ Future*

### H.2 — Série Harmonique Naturelle
- [ ] **H.2.1** — Mode Harmoniques dans DictionaryPanel : afficher les 8 premiers partiels d'une note avec déviations en cents (Quinte+2c, Tierce-14c, 7e naturelle-31c). *→ Pro*
- [ ] **H.2.2** — Indicateur Just Intonation vs Equal Temperament sur le clavier. *→ Future*

### H.3 — Performance & Humanisation
- [ ] **H.3.1** — Modes de jeu : Block (0ms) / Strum (15-30ms grave→aigu) / Arpeggio (200ms). *→ Pro*
- [ ] **H.3.2** — Bibliothèque de strumming : presets Island `D-DU-_UDU`, Reggae Skank, Rock `D-D-DUDU`. *→ Pro*
- [ ] **H.3.3** — Moteur Humanize : jitter 2-5ms + velocity Down=100%/Up=70%. *→ Pro*
- [ ] **H.3.4** — Marqueurs visuels direction strumming : `⊓` (Down) / `∨` (Up) animés en sync audio. *→ Future*

---

## 🟡 P2 — Stream I : Genres & Émotions
> Source : `docs/intelligence/genre_ontologies.md` + `docs/intelligence/GENRE_ONTOLOGY.md`

### I.1 — Assistant Genre
- [ ] **I.1.1** — Sélecteur de genre (Jazz, Rock, Reggae, Pop, Electronic, Urban) filtrant les suggestions harmoniques et voicings. *→ Pro*
- [ ] **I.1.2** — Paramètres genre auto-appliqués : densité harmonique, comportement basse, fourchette BPM. *→ Pro*
- [ ] **I.1.3** — Suggestions de modes par genre : Dorien pour Jazz, Phrygien pour Metal, Mixolydien pour Blues. *→ Flash (après I.1.1)*

### I.2 — Émotions & Structures
- [ ] **I.2.1** — Emotional Mapping : sélection par sentiment (Dark/Epic, Sunny/Relax, Melancholy...) → progression cohérente. *→ Future*
- [ ] **I.2.2** — Templates de structures musicales : ABA (Ternaire), Rondo (ABACA), Sonate (Expo/Dev/Réexpo). *→ Future*
- [ ] **I.2.3** — Palettes d'émotions : traduction technique → suggestion lisible (ex: "IV mineur = touche de mélancolie"). *→ Pro*

---

## 🟡 P2 — Stream J : Rythmique Avancée
> Source : `docs/intelligence/core_theory.md` (Euclidean Rhythms)

### J.1 — Polyrythmie & Mesures Asymétriques
- [ ] **J.1.1** — Grille visuelle polyrythmique dans PianoRoll (5/4, 7/8, 11/8). *→ Future*
- [ ] **J.1.2** — `totalSteps` variable dans le séquenceur. *→ Pro*
- [ ] **J.1.3** — Euclidean Rhythm generator (algorithme Bjorklund) pour patterns de basse/guitare. *→ Future*

---

## 🔵 P3 — Production & Futur

### Stream E — Production & Écosystème
- [ ] **E.1** — Audit accessibilité WCAG 2.1 (axe DevTools). *→ Flash*
- [ ] **E.2** — aria-labels sur instruments. *→ Flash*
- [ ] **E.3** — Export MIDI multi-pistes avec noms corrects. *→ Flash*
- [ ] **E.4** — Export MIDI Basse Fantôme (harmoniques 2f/3f/4f sur piste dédiée). *→ Future*
- [ ] **E.5** — Export MIDI Shepard Tones (vélocités enveloppées). *→ Future*
- [ ] **E.6** — VST / Export direct Ableton Live (roadmap long terme). *→ Future*

### Phase 5 — Intelligence Harmonique Avancée
- [ ] **5.1** — Camelot Wheel HUD (voir G.3.1). *→ Flash*
- [ ] **5.2** — Assistant Genre (voir Stream I). *→ Pro*
- [ ] **5.3** — Ingénierie des Émotions (voir I.2.1). *→ Future*
- [ ] **5.4** — Set Theory sous-marine : `getIntervalVector()` dans harmonyEngine pour suggestions invisibles. *→ Future*
- [ ] **5.5** — Micro-tonalité : quarts de ton via MPE / fichiers .SCL/.TUN Ableton 11+. *→ Future*

### Phase 9 — Accessibilité
- [ ] **9.0** — Audit WCAG complet + navigation clavier. *→ Flash*

### Phase 13 — Export
- [ ] **13.0** — Export MIDI multi-pistes optimisé. *→ Flash*

---

## ⚠️ Alertes & Risques Techniques

### Risque 1 — Régression fingeringMap
> **⚠️ CRITIQUE** : La structure `fingeringMap` v2 (`{'X': true}`, `{0: 'O'}`) est le contrat central. Ne jamais revenir à une Map simple.

### Risque 2 — Conflits CSS Rendering (Clipping & Z-index)
- `overflow: hidden` sur le manche bloque les marqueurs O/X externes
- Barrés via Grid nécessitent `gridRow: "1 / -1"` explicite
- Isoler les couches : Dots / Strings / Markers / Overlays

### Risque 3 — Mode Expert vs Mode Scale
- Logiques de filtrage différentes → peuvent entrer en conflit
- Solution : `fretboardUtils.js` comme unique juge de visibilité

### Risque 4 — Saturation Contexte Agent
- Gemini Flash peut manquer de contexte sur les fichiers > 200L
- **Règle** : Flash ne touche jamais App.jsx, Fretboard.jsx, fingeringLogic.js sans specs explicites

---

## 📋 Orchestration Agentique (Hiérarchie)

| Modèle | Rôle | Tâches types |
|--------|------|-------------|
| **Claude Sonnet** | Stratège, Architecture | Analyse, specs, refactoring complexe |
| **Gemini Pro** | Architecte | Découpage atomique, TDD setup, migrations |
| **Gemini Flash** | Exécuteur | Fixes visuels, tâches < 50L, CSS, rapports |

> Voir `docs/management/MASTER_TASK_TRACKER.md` pour les specs Flash-ready détaillées.

---

*Dernière mise à jour : 2026-05-10 — Claude Sonnet · Merge BACKLOG.md + REFINED_BACKLOG.md*
