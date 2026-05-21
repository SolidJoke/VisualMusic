# VisualMusic â€” Master Backlog

> **Vision** : VisualMusic est un assistant de composition premium combinant esthÃ©tique "Liquid Glass" et intelligence harmonique de haut niveau.
>
> **Source de vÃ©ritÃ©** : Ce fichier remplace `BACKLOG.md` (initial) et `REFINED_BACKLOG.md` (Flash). Conflits rÃ©solus par Claude Sonnet le 2026-05-10.
>
> **Processus** : Lire `docs/management/MASTER_TASK_TRACKER.md` pour les tÃ¢ches atomiques Flash-ready.

---

## ðŸ”´ P0 â€” Hygiene & StabilitÃ© (URGENT)

### ðŸ§¹ Phase 14 â€” DÃ©bogage Critique [URGENT]

> Des bugs critiques ont Ã©tÃ© identifiÃ©s lors de sessions prÃ©cÃ©dentes. Ã€ corriger en prioritÃ© absolue.

- [x] **14.1** â€” **Crash Fretboard en mode Dictionnaire** : âœ… FixÃ© avec gardes de sÃ©curitÃ© (SESS-11).
- [x] **14.4** â€” ObservabilitÃ© : `src/utils/debug.js` en place. âœ…
- [x] **14.5** â€” **Header overflow** : âœ… FixÃ© (SESS-09).
- [x] **14.6** â€” **Z-index menu Notes** : âœ… FixÃ© via Sidebar.css (SESS-10).
- [x] **14.7** â€” **Toggle Mode** : âœ… Style Premium Blue implÃ©mentÃ© (SESS-12).
- [ ] **BUG-07** â€” **Studio Sidebar Empty space** : Remove empty useless spacer in Studio Mode sidebar.
- [ ] **BUG-08** â€” **Dictionary Fretboard Width & Marker Shift** : Resolve doubled width and vertically shifted string markers.
- [ ] **BUG-09** â€” **Dictionary Scale Notes & Highlight Sync** : Fix incorrect notes showing on selected scale and sync highlights.

> **Note** : 14.2 (notes inaudibles Studio) et 14.3 (Crash Z-index Studio) sont Ã  vÃ©rifier â€” peuvent avoir Ã©tÃ© corrigÃ©s avec la refonte architecture.

---

## ðŸŸ  P1 â€” Architecture & QualitÃ© de Code

### Stream A â€” Hygiene & Reliability

#### A.1 â€” Audit de QualitÃ© & Purge
- [x] **A.1.1** â€” Dead code scan via jcodemunch â†’ rapport `docs/management/dead_code_report.md`. âœ…
- [ ] **A.1.2** â€” Suppression imports inutilisÃ©s (aprÃ¨s A.1.1). *â†’ Flash*
- [ ] **A.1.3** â€” **Refactoring Fretboard** (complexitÃ© 99) : Extraire `FretboardCalculator.js`. *â†’ Sonnet/Pro, bloquÃ© sur A.1.1 + tests 90%+*
- [x] **A.1.4** â€” **Refactoring InstrumentView** (25+ props) : RÃ©duire via AppContext. âœ… (FLASH-04)
- [ ] **A.1.5** â€” Finaliser extraction App.jsx restant (Layout props). *â†’ Pro*

#### A.2 â€” Performance & Bundle
- [ ] **A.2.1** â€” Audit bundle avec `vite-bundle-visualizer`. *â†’ Flash*
- [ ] **A.2.2** â€” **Lazy load Tone.js** (dynamic import dans useSequencer). *â†’ Pro*
- [ ] **A.2.3** â€” Canvas Fretboard 4K. *â†’ Future*

### Stream B â€” Design System

#### B.1 â€” Design Tokens (CSS)
- [x] **B.1.1** â€” Inventaire couleurs HEX/HSL brutes dans CSS. âœ… (FLASH-05)
- [ ] **B.1.2** â€” CrÃ©er `src/styles/tokens.css` avec palette standardisÃ©e :
  - `--color-primary` (Gold)
  - `--color-role-root` (Stable)
  - `--color-role-third` (Color)
  - `--color-role-fifth` (Tension)
  - `--color-role-extension` (Flavor)
  - 3 Ã©tats par token : `base`, `glow`, `subtle`
- [ ] **B.1.3** â€” Migration CSS composant par composant (PianoRoll â†’ Sidebar â†’ Fretboard). *â†’ Flash par composant*

### Phase 8 â€” Refactoring Historique
- [x] **8.2** â€” Extraction hooks mÃ©tiers + AppContext. âœ… (useMusicEngine, AppContext, useStudioMode, useDictionaryMode)
- [ ] **8.1** â€” Audit nettoyage (voir A.1.1). *â†’ Flash*
- [ ] **8.3** â€” Optimisation Bundle Tone.js (voir A.2.2). *â†’ Pro*

### Phase 12 â€” Finitions UI
- [x] **12.1** â€” Proportions anatomiques (22 cases). âœ…
- [x] **12.2** â€” BarrÃ©s via Grid. âœ…
- [x] **12.3** â€” Clavier restreint C3-C5 dict. âœ…
- [x] **12.4** â€” EsthÃ©tique premium glow. âœ…
- [x] **12.5** â€” Mode anatomique/expert par dÃ©faut. âœ…
- [ ] **12.6** â€” Animation Dictionnaire (sync gamme/accord). *â†’ Flash*
- [ ] **12.7** â€” Bordures CTA cohÃ©rentes. *â†’ Flash*
- [ ] **12.8** â€” Dynamisme couleur bordure CTA. *â†’ Flash*

---

## ðŸŸ¡ P2 â€” Intelligence & Navigation Musicale

### Stream F â€” Interaction & Navigation (Focus Actuel)

#### F.1 â€” Navigation par Octaves & Variantes [AFFINÃ‰ + PARTIELLEMENT IMPLÃ‰MENTÃ‰]
*Voir `docs/management/REF_DECISION_MATRIX_F1.md`*

- [x] **F.1.A** â€” Contrat `fingeringMap` v2 implÃ©mentÃ©. âœ…
- [x] **F.1.B** â€” `PositionSelector.jsx` crÃ©Ã©. âœ…
- [x] **F.1.1** â€” Ajouter `isOutOfRange` dans useMusicEngine. âœ… (FLASH-02)
- [x] **F.1.2** â€” Ghost feedback CSS pour hors-tessiture. âœ… (FLASH-03)
- [ ] **F.1.3** â€” SÃ©lecteur Mode Global (Note / Accord / Gamme). *â†’ Sonnet (UX spec needed)*

#### F.2 â€” Architecture de SÃ©lection [AFFINÃ‰ + PARTIELLEMENT IMPLÃ‰MENTÃ‰]
*Voir `docs/management/REF_DECISION_MATRIX_F2.md`*

- [x] **F.2.A** â€” `useMusicEngine.js` extrait (264L). âœ…
- [x] **F.2.B** â€” `AppContext` en place. âœ…
- [x] **F.2.1** â€” RÃ©duire props InstrumentView via context. âœ… (FLASH-04)
- [ ] **F.2.2** â€” Extraire MixerPanel de App.jsx. *â†’ Flash*
- [ ] **F.2.3** â€” React.memo sur Fretboard et PianoKeyboard. *â†’ Flash*

#### F.3 â€” ObservabilitÃ© Agentique [AFFINÃ‰, NON IMPLÃ‰MENTÃ‰]
*Voir `docs/management/REF_DECISION_MATRIX_F3.md`*

> âš ï¸ **Architecture rÃ©visÃ©e** : L'Ã©criture fichier via browser SPA est impossible. Solution : localStorage + Playwright dump.

- [ ] **F.3.1** â€” Hook `useDebugState` â†’ localStorage. *â†’ Flash*
- [ ] **F.3.2** â€” Script Playwright `scripts/dump-state.js`. *â†’ Flash*
- [ ] **F.3.3** â€” npm script `npm run check:state`. *â†’ Flash*

#### F.4 â€” Protocole Passation [IMPLÃ‰MENTÃ‰ via LAST_HANDOVER.md]
- [x] **F.4.A** â€” Template passation en place. âœ…
- [x] **F.4.B** â€” MASTER_TASK_TRACKER.md crÃ©Ã© (2026-05-10). âœ…
- [ ] **F.4.1** â€” Automatiser gÃ©nÃ©ration handover (template script). *â†’ Aria Backlog ARIA-15*

### Stream C â€” Intelligence Harmonique

#### C.1 â€” IntÃ©gration Tonal.js [ANALYSE REQUISE]
- [ ] **C.1.1** â€” Audit fonctions theory.js â†’ mapping Tonal API. *â†’ Sonnet (SONNET-01)*
- [ ] **C.1.2** â€” CrÃ©er `tonal-adapter.js` wrapper. *â†’ Flash (aprÃ¨s SONNET-01)*
- [ ] **C.1.3** â€” Migration function par function avec tests. *â†’ Pro*

#### C.2 â€” Assistant Proactif [VISION FUTURE]
- [ ] **C.2.1** â€” "Next Chord" HUD : 3 alternatives harmoniques au step suivant. *â†’ Future*
- [ ] **C.2.2** â€” Melodic Guide Overlay : Target Notes vs notes de passage. *â†’ Future*
- [ ] **C.2.3** â€” Emotional Mapping : sÃ©lection par sentiment. *â†’ Future*

### Stream D â€” Expertise Instrumentale

#### D.1 â€” Anatomie
- [ ] **D.1.1** â€” Frettage logarithmique (constante 17.817). *â†’ Flash*
- [ ] **D.1.2** â€” ParamÃ¨tre `numFrets` (22/24 selon instrument). *â†’ Flash*

#### D.2 â€” Voicing Intelligence
- [x] **D.2.A** â€” `VoicingAlert.jsx` crÃ©Ã©. âœ…
- [x] **D.2.1** â€” IntÃ©grer VoicingAlert dans DictionaryPanel. âœ… (FLASH-06)
- [ ] **D.2.2** â€” Voice Leading automatique (algo scoring inversion). *â†’ Sonnet*

---

## ðŸŸ¡ P2 â€” Stream G : Music Intelligence (Composition & Improvisation)
> Source : `docs/management/MUSIC_INTELLIGENCE_ROADMAP.md` + `music_theory_notes.md`
> PrÃ©-requis : PRO-SPEC-01 (audit data musicale) avant implÃ©mentation Flash

### G.1 â€” Dictionary Mode Enrichi
- [ ] **G.1.1** â€” Modes relatifs/parallÃ¨les : chips cliquables des 7 modes d'une gamme + gamme parallÃ¨le. *â†’ Flash (aprÃ¨s Pro spec)*
- [ ] **G.1.2** â€” Notes de tension/rÃ©solution colorisÃ©es sur le manche (vert=stable, jaune=tension, rouge=avoid). *â†’ Flash (aprÃ¨s Pro spec)*
- [ ] **G.1.3** â€” Gammes compatibles catÃ©gorisÃ©es : Parfaites / Couleur / Ã‰vitement. *â†’ Flash (aprÃ¨s Pro spec)*
- [ ] **G.1.4** â€” Mood Indicator Ã©tendu : tension 0-10, contextes de genre, tempo suggÃ©rÃ©. *â†’ Pro*
- [ ] **G.1.5** â€” Toggle Classique/Moderne : analyse stricte (V7â†’I) vs Jazz/Debussy (tension=couleur stable). *â†’ Sonnet*

### G.2 â€” Studio Mode Enrichi
- [ ] **G.2.1** â€” DegrÃ©s romains (I/ii/IV/V) affichÃ©s sur chaque accord de la progression. *â†’ Flash (aprÃ¨s Pro spec)*
- [ ] **G.2.2** â€” Progressions communes Quick Start : chips II-V-I, I-V-vi-IV, I-IV-V-I, Turnaround, Andalou. *â†’ Flash (aprÃ¨s Pro spec)*
- [ ] **G.2.3** â€” Substitutions harmoniques contextuelles : Triton Sub, Relatif, Diatonique. *â†’ Sonnet*
- [ ] **G.2.4** â€” "Next Chord" HUD : 3 alternatives harmoniques au step suivant. *â†’ Future*
- [ ] **G.2.5** â€” Alertes tension de section : si tonique placÃ©e lÃ  oÃ¹ dominante attendue. *â†’ Pro*

### G.3 â€” Navigation Harmonique
- [ ] **G.3.1** â€” Camelot Wheel / Roue des Quintes HUD : affichage SVG, tonalitÃ© courante surlignÃ©e, voisins compatibles. *â†’ Flash (composant autonome)*
- [ ] **G.3.2** â€” Guide de modulation : Pivot Chord Finder entre deux tonalitÃ©s. *â†’ Sonnet*
- [ ] **G.3.3** â€” Interchange Modal : suggestion accords empruntÃ©s au mode parallÃ¨le. *â†’ Sonnet*
- [ ] **G.3.4** â€” Dominantes secondaires : V/X suggÃ©rÃ©es pour micro-tensions directionnelles. *â†’ Pro*

### G.4 â€” Intelligence de Voicing
- [ ] **G.4.1** â€” Voice Leading automatique : inversions/positions minimisant les sauts entre accords. *â†’ Sonnet*
- [ ] **G.4.2** â€” Shell Voicings suggÃ©rÃ©s : prioritÃ© 3e+7e pour Jazz. *â†’ Pro*
- [ ] **G.4.3** â€” Score de jouabilitÃ© : -10pts par saut > 4 frettes, pÃ©nalitÃ© tierces serrÃ©es dans le grave. *â†’ Pro*

---

## ðŸŸ¡ P2 â€” Stream H : Psychoacoustique & Performance
> Source : `docs/intelligence/psychoacoustics.md` + `docs/intelligence/PERFORMANCE_DYNAMICS.md`

### H.1 â€” Illusions Sonores
- [ ] **H.1.1** â€” Basse FantÃ´me (Missing Fundamental) : HUD suggÃ©rant harmoniques 2f/3f/4f Ã  ajouter pour simuler basses profondes sur smartphones. *â†’ Pro*
- [ ] **H.1.2** â€” Visualisation harmoniques fantÃ´mes en couleur attÃ©nuÃ©e sur le clavier. *â†’ Flash (aprÃ¨s H.1.1)*
- [ ] **H.1.3** â€” Tons de Shepard : visualisation cascade dans PianoRoll + export MIDI. *â†’ Future*

### H.2 â€” SÃ©rie Harmonique Naturelle
- [ ] **H.2.1** â€” Mode Harmoniques dans DictionaryPanel : afficher les 8 premiers partiels d'une note avec dÃ©viations en cents (Quinte+2c, Tierce-14c, 7e naturelle-31c). *â†’ Pro*
- [ ] **H.2.2** â€” Indicateur Just Intonation vs Equal Temperament sur le clavier. *â†’ Future*

### H.3 â€” Performance & Humanisation
- [ ] **H.3.1** â€” Modes de jeu : Block (0ms) / Strum (15-30ms graveâ†’aigu) / Arpeggio (200ms). *â†’ Pro*
- [ ] **H.3.2** â€” BibliothÃ¨que de strumming : presets Island `D-DU-_UDU`, Reggae Skank, Rock `D-D-DUDU`. *â†’ Pro*
- [ ] **H.3.3** â€” Moteur Humanize : jitter 2-5ms + velocity Down=100%/Up=70%. *â†’ Pro*
- [ ] **H.3.4** â€” Marqueurs visuels direction strumming : `âŠ“` (Down) / `âˆ¨` (Up) animÃ©s en sync audio. *â†’ Future*

---

## ðŸŸ¡ P2 â€” Stream I : Genres & Ã‰motions
> Source : `docs/intelligence/genre_ontologies.md` + `docs/intelligence/GENRE_ONTOLOGY.md`

### I.1 â€” Assistant Genre
- [ ] **I.1.1** â€” SÃ©lecteur de genre (Jazz, Rock, Reggae, Pop, Electronic, Urban) filtrant les suggestions harmoniques et voicings. *â†’ Pro*
- [ ] **I.1.2** â€” ParamÃ¨tres genre auto-appliquÃ©s : densitÃ© harmonique, comportement basse, fourchette BPM. *â†’ Pro*
- [ ] **I.1.3** â€” Suggestions de modes par genre : Dorien pour Jazz, Phrygien pour Metal, Mixolydien pour Blues. *â†’ Flash (aprÃ¨s I.1.1)*

### I.2 â€” Ã‰motions & Structures
- [ ] **I.2.1** â€” Emotional Mapping : sÃ©lection par sentiment (Dark/Epic, Sunny/Relax, Melancholy...) â†’ progression cohÃ©rente. *â†’ Future*
- [ ] **I.2.2** â€” Templates de structures musicales : ABA (Ternaire), Rondo (ABACA), Sonate (Expo/Dev/RÃ©expo). *â†’ Future*
- [ ] **I.2.3** â€” Palettes d'Ã©motions : traduction technique â†’ suggestion lisible (ex: "IV mineur = touche de mÃ©lancolie"). *â†’ Pro*

---

## ðŸŸ¡ P2 â€” Stream J : Rythmique AvancÃ©e
> Source : `docs/intelligence/core_theory.md` (Euclidean Rhythms)

### J.1 â€” Polyrythmie & Mesures AsymÃ©triques
- [ ] **J.1.1** â€” Grille visuelle polyrythmique dans PianoRoll (5/4, 7/8, 11/8). *â†’ Future*
- [ ] **J.1.2** â€” `totalSteps` variable dans le sÃ©quenceur. *â†’ Pro*
- [ ] **J.1.3** â€” Euclidean Rhythm generator (algorithme Bjorklund) pour patterns de basse/guitare. *â†’ Future*

---

## ðŸ”µ P3 â€” Production & Futur

### Stream E â€” Production & Ã‰cosystÃ¨me
- [ ] **E.1** â€” Audit accessibilitÃ© WCAG 2.1 (axe DevTools). *â†’ Flash*
- [ ] **E.2** â€” aria-labels sur instruments. *â†’ Flash*
- [ ] **E.3** â€” Export MIDI multi-pistes avec noms corrects. *â†’ Flash*
- [ ] **E.4** â€” Export MIDI Basse FantÃ´me (harmoniques 2f/3f/4f sur piste dÃ©diÃ©e). *â†’ Future*
- [ ] **E.5** â€” Export MIDI Shepard Tones (vÃ©locitÃ©s enveloppÃ©es). *â†’ Future*
- [ ] **E.6** â€” VST / Export direct Ableton Live (roadmap long terme). *â†’ Future*

### Phase 5 â€” Intelligence Harmonique AvancÃ©e
- [ ] **5.1** â€” Camelot Wheel HUD (voir G.3.1). *â†’ Flash*
- [ ] **5.2** â€” Assistant Genre (voir Stream I). *â†’ Pro*
- [ ] **5.3** â€” IngÃ©nierie des Ã‰motions (voir I.2.1). *â†’ Future*
- [ ] **5.4** â€” Set Theory sous-marine : `getIntervalVector()` dans harmonyEngine pour suggestions invisibles. *â†’ Future*
- [ ] **5.5** â€” Micro-tonalitÃ© : quarts de ton via MPE / fichiers .SCL/.TUN Ableton 11+. *â†’ Future*

### Phase 9 â€” AccessibilitÃ©
- [ ] **9.0** â€” Audit WCAG complet + navigation clavier. *â†’ Flash*

### Phase 13 â€” Export
- [ ] **13.0** â€” Export MIDI multi-pistes optimisÃ©. *â†’ Flash*

---

## âš ï¸ Alertes & Risques Techniques

### Risque 1 â€” RÃ©gression fingeringMap
> **âš ï¸ CRITIQUE** : La structure `fingeringMap` v2 (`{'X': true}`, `{0: 'O'}`) est le contrat central. Ne jamais revenir Ã  une Map simple.

### Risque 2 â€” Conflits CSS Rendering (Clipping & Z-index)
- `overflow: hidden` sur le manche bloque les marqueurs O/X externes
- BarrÃ©s via Grid nÃ©cessitent `gridRow: "1 / -1"` explicite
- Isoler les couches : Dots / Strings / Markers / Overlays

### Risque 3 â€” Mode Expert vs Mode Scale
- Logiques de filtrage diffÃ©rentes â†’ peuvent entrer en conflit
- Solution : `fretboardUtils.js` comme unique juge de visibilitÃ©

### Risque 4 â€” Saturation Contexte Agent
- Gemini Flash peut manquer de contexte sur les fichiers > 200L
- **RÃ¨gle** : Flash ne touche jamais App.jsx, Fretboard.jsx, fingeringLogic.js sans specs explicites

---

## ðŸ“‹ Orchestration Agentique (HiÃ©rarchie)

| ModÃ¨le | RÃ´le | TÃ¢ches types |
|--------|------|-------------|
| **Claude Sonnet** | StratÃ¨ge, Architecture | Analyse, specs, refactoring complexe |
| **Gemini Pro** | Architecte | DÃ©coupage atomique, TDD setup, migrations |
| **Gemini Flash** | ExÃ©cuteur | Fixes visuels, tÃ¢ches < 50L, CSS, rapports |

> Voir `docs/management/MASTER_TASK_TRACKER.md` pour les specs Flash-ready dÃ©taillÃ©es.

---

*DerniÃ¨re mise Ã  jour : 2026-05-10 â€” Claude Sonnet Â· Merge BACKLOG.md + REFINED_BACKLOG.md*

## 🟢 P2 — Phase 15 : Refactoring & Ergonomie Responsive (Prêt pour Flash)

### Stream K — Architecture & Découpage UI
- [x] **K.1.1** — **(DEV-1.1)** Créer src/hooks/useAudioScheduler.js pour isoler playTokenRef et timeouts. *→ Flash (TDD prioritaire)*
- [x] **K.1.2** — **(DEV-1.2)** Extraire useDictionaryPlayback.js de usePlaybackHandlers. *→ Flash*
- [x] **K.1.3** — **(DEV-1.3)** Extraire useStudioPlayback.js de usePlaybackHandlers. *→ Flash*
- [x] **K.1.4** — **(DEV-1.4)** Extraire useFretboardPlayback.js de usePlaybackHandlers. *→ Flash*
- [x] **K.1.5** — **(DEV-1.5)** Transformer usePlaybackHandlers.js en Façade Hook. *→ Pro*
- [ ] **K.2.1** — **(DEV-2.1)** Créer DictFamilySelector.jsx depuis DictionaryPanel. *→ Flash*
- [ ] **K.2.2** — **(DEV-2.2)** Créer DictChordSubPanel.jsx depuis DictionaryPanel. *→ Flash*
- [ ] **K.2.3** — **(DEV-2.3)** Créer DictScaleSubPanel.jsx depuis DictionaryPanel. *→ Flash*
- [ ] **K.2.4** — **(DEV-2.4)** Créer DictPositionSelectors.jsx depuis DictionaryPanel. *→ Flash*
- [ ] **K.2.5** — **(DEV-2.5)** Intégrer les sous-composants dans DictionaryPanel.jsx. *→ Pro*

### Stream L — Responsive Design & Mobile-First
- [ ] **L.1.1** — **(DES-3.1)** Fretboard Mobile : Ajouter .fretboard-scroll-container (overflow-x: auto). *→ Flash*
- [ ] **L.1.2** — **(DES-3.2)** Layout Principal : Passer .app-container en Flex Column (Mobile-first) + Grid @media (min-width: 1024px). *→ Flash*
- [ ] **L.1.3** — **(DES-3.3)** Sidebar Mobile : Ajouter bouton Hamburger et transformer Sidebar en Bottom Sheet (<1024px). *→ Sonnet*
- [ ] **L.1.4** — **(DES-3.4)** Cibles Tactiles : Assurer min-height: 44px sur tous les utton et select. *→ Flash*
