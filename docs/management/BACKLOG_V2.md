# VisualMusic — Backlog Unifié (Source de Vérité)
> **Auteur** : ARIA — 2026-06-06 (fusion BACKLOG.md racine + BACKLOG_V2.md)  
> **Remplace définitivement** : `BACKLOG.md` (racine), `BACKLOG_V2.md` (docs/management), `MASTER_TASK_TRACKER.md`, `DETAILED_BACKLOG_TECH.md`  
> **Règle** : Ce fichier est la SEULE source de vérité. Mettre à jour après chaque tâche.  
> **Format** : `[ ]` TODO · `[/]` EN COURS · `[x]` FAIT · `[!]` BLOQUÉ · `[~]` GELÉ

---

## 📊 ÉTAT GLOBAL

| Indicateur | Valeur |
|------------|--------|
| Tests | ✅ **797/797** passants (Vitest) |
| Branche principale | `main` — propre, commit `72a6557` |
| Dernier commit | `72a6557` — fix(responsive): CSS zoom piano+fretboard (PR #67) |
| Architecture | Hook `useFretboard` + fonctions pures `fretboardUtils` |
| Design | Scrubber minimap ✅ (PR #65) · Zoom responsive partiel ⚠️ (PR #66+#67) |

---

## ⚠️ RÈGLES ABSOLUES (lire avant toute action)

| Fichier | Règle |
|---------|-------|
| `src/core/fingeringLogic.js` | 🔴 NE JAMAIS TOUCHER sans spec Sonnet validée + TDD |
| `src/hooks/useMusicEngine.js` | 🔴 Modifications uniquement si spec explicite + tests verts |
| `src/context/AppContext.jsx` | 🔴 State global — toute modification impacte toute l'app |
| `src/core/theory.js` | 🟠 Vérifier dead_code_report avant suppression d'export |
| Tests | 795/795 maintenus après chaque commit |
| Branches | Jamais de commit direct sur `main` |

---

## 🗺️ PLAN — 3 CONVERSATIONS

```
Conv 1 (maintenant) : UX/Design Refonte
    ├─ Quick wins : BUG-10, D.1.2
    ├─ Phase A : Audit Stitch → maquettes
    ├─ Phase B : Design Bible
    └─ Phase C : Responsive + composants adaptatifs

Conv 2 (après Conv 1) : Corrections Musicales
    ├─ SCALE : Audit + fix gammes / CAGED
    └─ THEORY : Base de connaissances IA

Conv 3 (après Conv 2) : Stream COMP (gelé)
    └─ Moteurs rythmiques + composition lab
```

---

## ✅ TOUT CE QUI EST DÉJÀ FAIT

### Fonctionnalités UI
- [x] **FLASH-11** — Substitutions harmoniques dans DictionaryPanel (Triton, Relatif Mineur)
- [x] **FLASH-12 / G.1.2** — Target Notes / Aide Impro (`highlightTargetNotes`)
- [x] **FLASH-13** — Sélecteur de rythme manuel (`RHYTHM_PATTERNS` + `CustomSelect`)
- [x] **MI-B1 / G.2.1** — Degrés romains sur accords Studio (`toRoman`)
- [x] **G.2.2** — Quick Start Progressions (chips depuis `extendedTheoryData.json`)
- [x] **G.2.3** — Substitutions harmoniques contextuelles
- [x] **G.2.5** — Alertes tension (⚠️ anticlimax si tonique en fin de section)
- [x] **G.3.4** — Accords Suivants Suggérés (DictionaryPanel + StudioPanel)
- [x] **G.4.2** — Shell Voicings (toggle dans ControlPanel)
- [x] **G.4.3** — Score de Jouabilité (`calculatePlayabilityScore`)
- [x] **MI-A3 / G.1.1** — Modes relatifs/parallèles (chips `getRelatedScales`)
- [x] **H.2.1** — Mode Harmoniques UI (`HarmonicSeriesPanel` connecté)
- [x] **FEATURE-01** — Sélecteur d'octave (1–7) pour mode "Note Unique"
- [x] **D.2.1** — VoicingAlert intégré DictionaryPanel (Guitar + Bass)
- [x] **FLASH-14** — Crash CustomSelect null (`value ?? ""`)
- [x] **FLASH-15** — Gammes visibles sur le manche (isSubtle corrigé)
- [x] **FLASH-08 (i18n)** — Notation EU/US dans PositionSelector
- [x] **FLASH-09** — Gammes affichées sans lancer play

### Architecture & Refactoring
- [x] **A.1.1** — Dead code scan → `dead_code_report.md`
- [x] **A.1.2** — Dead code cleanup (PR #53) : 4 fichiers supprimés, ~20 vars
- [x] **A.1.3** — Refactoring Fretboard : `fretboardUtils.js` + `useFretboard.js` (PR #52)
- [x] **A.1.4 / F.2.1** — Réduction props InstrumentView via AppContext
- [x] **F.2.2** — MixerPanel extrait de App.jsx
- [x] **F.2.3** — `React.memo` sur Fretboard ET PianoKeyboard
- [x] **C.1.1/C.1.2/C.1.3** — tonal-adapter.js + migration functions
- [x] **D.1.1** — Frettage logarithmique (Rule of 18, diviseur 17.817)
- [x] **D.2.A / D.2.1** — VoicingAlert.jsx créé + intégré
- [x] **F.1.A / F.1.B** — Contrat fingeringMap v2 + PositionSelector.jsx
- [x] **F.1.1 / FLASH-02** — `isGuitarOutOfRange` / `isBassOutOfRange` dans useMusicEngine
- [x] **F.1.2 / FLASH-03** — Ghost feedback CSS hors-tessiture
- [x] **B.1.1 / FLASH-05** — Inventaire tokens CSS (`css_color_audit.md`)
- [x] **F.4.A / F.4.B** — Template passation + LAST_HANDOVER.md

### Bugs résolus
- [x] **BUG-01** — Crash Fretboard mode Dictionnaire (gardes sécurité)
- [x] **BUG-03** — Header buttons width (110px)
- [x] **BUG-04 / 14.6** — Z-index Sidebar
- [x] **BUG-07** — Sidebar rectangle vide (CSS grid)
- [x] **BUG-08** — Fretboard width doubling + marker offsets
- [x] **BUG-09** — Scale notes highlight mask (guard condition)
- [x] **14.2** — Notes inaudibles Studio : vérifié manuellement OK (2026-06-07)
- [x] **14.3** — Z-index tooltips Studio : vérifié manuellement OK (2026-06-07)
- [x] **14.5** — Header overflow
- [x] **14.7** — Toggle Mode Premium Blue
- [x] **FIX-01** — Wording MODE M + overflow CSS `.retro-switch-container` (Jules J-01, PR #54)

### QA & Tests
- [x] **QA** — 797 tests Vitest au vert (797/797 après PR #54 + #55)

---

## 🐛 BUGS ACTIFS

| ID | Description | Fichier | Criticité | Qui |
|----|-------------|---------|-----------|-----|
| **BUG-02** | Surbrillance octaves Studio — à confirmer manuellement | `useFretboard.js` | 🟡 P1 | Vérif manuelle Gabriel |
| **BUG-10** | Notation EU/US non respectée dans HarmonicSeriesPanel | `HarmonicSeriesPanel.jsx` | 🟢 P2 | Jules quick win |

### Bugs résolus (session 2026-06-07)
- [x] **BUG-11** — Double DOM Sidebar+BottomNav → `useMediaQuery` (Jules J-04, PR #57)
- [x] **BUG-12** — BottomNav drawer toggle fix → `transform: translateY` (Jules J-05, PR #58)
- [x] **BUG-13** — Vite MIME error BottomNav.css → résolu par correction CSS (Jules J-05, PR #58)
- [x] **PR #63** — Séquenceur paginé [16][32][64] + Viewport navigator fretboard (Jules J-09)
- [x] **PR #64** — Fretboard proportions : STRING_HEIGHT=36, 5 frettes, grid uniforme (ARIA)
- [x] **PR #65** — Minimap scrubber fretboard style Ableton (ARIA)
- [x] **PR #66** — Responsive scaling clamp() CSS (Jules J-11) — ⚠️ résultat insuffisant, voir UX-SCALE
- [x] **PR #67** — Zoom CSS paliers 0.55/0.68/0.82 (ARIA) — ⚠️ insuffisant à <900px viewport, voir UX-SCALE

---

## 📋 BACKLOG PRIORISÉ

---

### 🟠 CONV 1 — UX/Design Refonte

> **Workflow** : Sonnet dans Antigravity + délégation Stitch via MCP  
> **Règle** : Aucune nouvelle feature musicale — focus UX uniquement  
> **Branche** : `refonte/ux-design` ou par phase

#### ⚡ Quick Wins pré-MEP (~2h total Jules — à traiter en PRIORITÉ avant build Netlify)

| ID | Tâche | Fichier | Statut |
|----|-------|---------|--------|
| **BUG-10** | Notation EU/US dans HarmonicSeriesPanel — appliquer `notation` à `getHarmonicSeries` | `HarmonicSeriesPanel.jsx` | `[ ]` TODO |
| **HEADER-MOB** | Header mobile cassé : "Vmu: VisualMusic Coach" overflow/rose sur mobile | `App.css` ou `AppDesktop.jsx` | `[ ]` TODO Jules |
| **D.1.2** | `numFrets` par instrument : `bass → 20`, `guitar → 22` (actuellement les deux à 22) | `useFretboard.js` | `[ ]` TODO Jules |

#### 🔴 UX-SCALE — Scaling responsive instruments (PROBLÈME OUVERT — à résoudre prochaine session)

> **Contexte** : PRs #66 et #67 ont tenté deux approches (clamp sur éléments individuels, puis zoom CSS par paliers). Les deux sont insuffisantes à des viewports étroits (~1024px ou moins). Le problème racine : le piano (7 octaves × 2450px) et les fretboards restent trop grands même avec zoom 0.55.

**Analyse du problème :**
- À 1024px fenêtre, sidebar 210px → zone contenu 814px
- Piano à zoom 0.55 = 2450 × 0.55 = **1347px** → déborde encore de ~530px
- Pour tenir dans 814px : zoom requis ≈ **0.33** → lisibilité des notes très compromise
- Conclusion : le zoom CSS pur **ne peut pas** résoudre ce cas sans rendre les instruments illisibles

**Vraie solution requise — 3 options à évaluer (prochaine session ARIA) :**

| ID | Option | Complexité | Approche |
|----|--------|------------|----------|
| **UX-SCALE-01** | 🥇 Piano : `visibleOctaveCount` + scrubber (miroir du fretboard) | Moyenne — JSX PianoKeyboard.jsx | Afficher 2 octaves (<1440px) avec scrubber pour naviguer. Identique à ce qu'on a fait pour le fretboard avec `visibleFretCount=5`. **Vraie solution long terme.** |
| **UX-SCALE-02** | Zoom plus agressif + lisibilité minimale garantie | Faible — CSS only | Descendre à `zoom: 0.35` à <900px. Risque : notes illisibles. Acceptable comme fix temporaire. |
| **UX-SCALE-03** | Layout en onglets à <1200px (Piano / Guitare séparés) | Faible — CSS + InstrumentView.jsx | Activer `layoutMode: tabs` automatiquement quand viewport < 1200px. Évite le problème de place en n'affichant qu'un instrument à la fois. |

**Recommandation ARIA :** Implémenter **UX-SCALE-01** (visibleOctaveCount piano + scrubber) comme solution pérenne. C'est la même logique que le fretboard — déjà validée et appréciée. En attendant, **UX-SCALE-03** (layout tabs auto) est le fix le plus rapide et le plus propre.

**Périmètre d'impact UX-SCALE-01 :**
- `PianoKeyboard.jsx` : ajouter `is4K`, `visibleOctaveCount = is4K ? 7 : 2`, `octaveOffset` state, `scrubberRef`, drag handler
- `PianoKeyboard.css` : ajouter `.piano-scrubber`, `.piano-scrubber-thumb`, `.piano-scrubber-note`
- Protections : `fingeringLogic.js` = interdit · `Fretboard.jsx` = interdit

**⚠️ ARIA prendra la main directement sur UX-SCALE-01** (fichier sensible, logique musicale).

#### Phase A — Audit Stitch (captures → maquettes, zéro code)

| ID | Tâche | Livrable | Statut |
|----|-------|----------|--------|
| **UX-01** | Captures multi-résolution (4K / 1440p / 1080p / 768px / 375px) × 2 modes × 3 états | `docs/design/screenshots/` | `[ ]` TODO (Gabriel) |
| **UX-02** | Analyse Stitch : audit UX complet → problèmes hiérarchie, surcharge, responsive | `docs/design/STITCH_AUDIT_REPORT.md` | `[ ]` TODO · Pré-req : UX-01 |
| **UX-03** | Génération 3 variantes design Stitch → validation Gabriel | Maquettes Stitch | `[ ]` TODO · Pré-req : UX-02 |

**Prompt Stitch pour UX-02 :**
> *"Analyse cette interface comme un Lead Product Designer ayant travaillé sur Duolingo, Ableton Live et Notion. Identifie tous les problèmes de hiérarchie visuelle, surcharge cognitive, espacement, alignement, accessibilité WCAG AA et responsive. Classe par priorité P0→P3. Ne propose que des améliorations conservant toutes les fonctionnalités existantes."*

**Prompt Stitch pour UX-03 :**
> *"Redesign cette interface d'apprentissage musical. Inspirations : Linear + Notion + Duolingo + Ableton. Objectifs : premium, faible charge cognitive, minimal, responsive 4K→mobile, fonctionnalités conservées, informations secondaires repliables, hiérarchie claire, grille 8px. 3 variantes."*

#### Phase B — Design Bible (documentation avant tout code)

| ID | Tâche | Livrable | Statut |
|----|-------|----------|--------|
| **UX-04** | Design Bible : grille 8px, typo (max 2 polices / 3 tailles), palette WCAG AA, hiérarchie P0–P4, règles UX | `docs/design/DESIGN_BIBLE.md` | `[ ]` TODO · Pré-req : UX-03 |
| **UX-05** | Template prompts Stitch validés (audit / variantes / review feature / check responsive) | `docs/design/STITCH_PROMPTS.md` | `[ ]` TODO |

**Hiérarchie composants VisualMusic (P0→P4) :**
| Niveau | Composants | Comportement résolution réduite |
|--------|-----------|--------------------------------|
| P0 | Mode actif (Studio / Dictionary) | Toujours visible |
| P1 | Piano + Fretboard + Audio | Compressible en tablet |
| P2 | Séquenceur / DictionaryPanel | Onglet en mobile |
| P3 | Stats, Score jouabilité, Substitutions, Harmoniques | Panneau repliable |
| P4 | Outils debug, métadonnées avancées | Masqué par défaut |

#### Phase C — Responsive Implementation

| ID | Tâche | Fichiers | Statut |
|----|-------|----------|--------|
| **UX-06** | Breakpoints CSS 1440p — collapse panels P2/P3 | `App.css`, panels | `[x]` FAIT ✅ PR #55 |
| **UX-07** | Sidebar toggle button `‹`/`›` | `Sidebar.jsx` | `[x]` FAIT ✅ PR #55 |
| **UX-06b** | Breakpoints CSS 1080p (colonne unique, sidebar compressible) | `App.css`, `Sidebar.css` | `[x]` FAIT ✅ PR #56 |
| **UX-07b** | BottomNav mobile + drawer | `BottomNav.jsx/.css`, `AppMobile.jsx` | `[x]` FAIT ✅ PR #56 |
| **UX-08** | Audit anti-surcharge : test 90% sur chaque composant | `DESIGN_BIBLE.md` | `[ ]` TODO |
| **UX-09** | Checklist design nouvelles features (6 critères) | `docs/design/DESIGN_CHECKLIST.md` | `[ ]` TODO |
| **UX-11** | Piano scrollable + tactile mobile | `PianoKeyboard.css` | `[x]` FAIT ✅ PR #59 |
| **UX-12** | Fretboard scrollable + tactile mobile | `Fretboard.css` | `[x]` FAIT ✅ PR #59 |
| **UX-13** | Séquenceur compact mobile | `SequencerPanel.jsx`, `PianoRoll.css` | `[x]` FAIT ✅ PR #59 |
| **UX-14** | `@media (hover: none)` touch states | `App.css`, `Sidebar.css`, `BottomNav.css` | `[x]` FAIT ✅ PR #58 |
| **UX-15** | BottomNav drawer fix | `BottomNav.jsx/.css` | `[x]` FAIT ✅ PR #58 |
| **UX-16** | Modales fullscreen + sticky ← Retour | `Modal.jsx/.css` | `[x]` FAIT ✅ PR #59 |

≥ 2560px — 4K       : interface complète, scaling possible
1440–2559px — QHD   : panneaux P3 repliables par défaut
1080–1439px — FHD   : colonne unique, sidebar compressible
768–1079px  — Tablet : sidebars → drawers, navigation onglets
< 768px     — Mobile : panneaux plein écran, tables → cartes,
                       menus → bottom sheets, piano scroll horizontal,
                       actions principales accessibles au pouce
```

#### En parallèle (indépendant du design)

| ID | Tâche | Statut |
|----|-------|--------|
| **A.2.1** | Audit bundle `npx vite-bundle-visualizer` → décision lazy load | `[ ]` TODO |
| **A.2.2** | Lazy load Tone.js (`dynamic import` dans `useSequencer.js`) | `[ ]` TODO · Pré-req : A.2.1 |
| **E.1/E.2** | Audit accessibilité WCAG 2.1 (axe DevTools) + `aria-labels` instruments | `[ ]` TODO · Lié à UX-07 |

---

### 🔵 CONV 2 — Corrections Musicales (après Conv 1)

> Démarrage : *"Continue le backlog VisualMusic — Stream SCALE et THEORY"*  
> Respecter la Design Bible créée en Conv 1 pour toute UI ajoutée.

#### Stream SCALE — Gammes / Système CAGED

**Règle fondamentale :** Une gamme = toujours 7 pitch classes distincts. Le système CAGED ne crée pas de nouvelles notes, il propose différentes positions de jeu.

| ID | Tâche | Criticité | Statut |
|----|-------|-----------|--------|
| **SCALE-01** | Audit affichage gammes guitare — compter les pitch classes allumés (attendu : 7). Localiser dans `resolveScaleAnchorMask` / `resolveActiveState` | 🟠 P1 | `[ ]` TODO |
| **SCALE-02** | Fix si SCALE-01 confirme le bug — correction `fretboardUtils.js` uniquement, NE PAS toucher `fingeringLogic.js` | 🟠 P1 | `[ ]` TODO · Conditionnel |
| **SCALE-03** | Feature : sélecteur positions CAGED pour gammes (équivalent PositionSelector pour accords). ⚠️ Sonnet requis | 🔵 P3 | `[ ]` TODO · Pré-req : SCALE-01 |
| **SCALE-04** | Feature : piano multi-octave pour gammes (1 / 2 / 3 octaves dans DictionaryPanel) | 🔵 P3 | `[ ]` TODO |

#### Stream THEORY — Base de Connaissances

| ID | Tâche | Livrable | Statut |
|----|-------|----------|--------|
| **THEORY-01** | Créer `docs/music_theory/COMPOSITION_PRINCIPLES.md` (25 principes) | Référence IA | `[ ]` TODO |
| **THEORY-02** | Feature : indicateur fonctions tonales sur manche (I=stabilité / IV=préparation / V=tension) — extension de `highlightTargetNotes` | DictionaryPanel + Fretboard | `[ ]` TODO |
| **THEORY-03** | Mode "notes hors-gamme bienveillant" (chromatismes non pénalisés) | Non MVP | `[ ]` P4 FUTUR |

#### Stream STITCH (process qualité)

| ID | Tâche | Statut |
|----|-------|--------|
| **STITCH-03** | Intégrer étape "revue Stitch" dans checklist UX-09 pour toute feature à impact visuel majeur | `[ ]` TODO · Pré-req : UX-09 |

---

### 🟢 P3 — Future Phase (dans une Conv dédiée)

#### Architecture

| ID | Tâche | Statut |
|----|-------|--------|
| **A.1.5** | Finaliser extraction App.jsx (logiques résiduelles → hooks). A.1.4 est maintenant ✅ FAIT → débloqué | `[ ]` TODO |
| **SONNET-01** | Analyse Tonal.js vs theory.js → `TONAL_MIGRATION_PLAN.md` (Wrapper Pattern uniquement) | `[ ]` TODO |
| **A.2.3** | Canvas Fretboard 4K (si performances insuffisantes après UX-06) | `[ ]` TODO · Pré-req : UX-06 |
| **F.3.1/F.3.2/F.3.3** | Observabilité debug : hook `useDebugState` → localStorage + script Playwright `scripts/dump-state.js` | `[ ]` TODO |
| **F.1.3** | Sélecteur Mode Global (Note / Accord / Gamme) dans l'UI | `[ ]` TODO · Nécessite spec UX |

#### Intelligence Musicale

| ID | Tâche | Statut |
|----|-------|--------|
| **G.1.3** | Gammes compatibles catégorisées (Parfaites / Couleur / Évitement) dans DictionaryPanel | `[ ]` TODO |
| **G.1.4** | Mood Indicator étendu : tension 0–10, contextes genre, tempo suggéré | `[ ]` TODO |
| **G.2.4** | "Next Chord" HUD : 3 alternatives harmoniques au step suivant | `[ ]` TODO |
| **G.3.1** | Camelot Wheel SVG : tonalité courante surlignée, voisins compatibles (composant autonome) | `[ ]` TODO |
| **G.3.2** | Guide de modulation : Pivot Chord Finder entre deux tonalités | `[ ]` TODO · Sonnet |
| **G.3.3** | Interchange Modal : suggestion accords empruntés au mode parallèle | `[ ]` TODO · Sonnet |
| **D.2.2 / G.4.1** | Voice Leading automatique : inversions/positions minimisant les sauts entre accords | `[ ]` TODO · Sonnet |
| **I.1.1/I.1.2** | Sélecteur genre musical (Jazz/Rock/Pop/Funk/Reggae) séparé du thème visuel — connecte `suggestBassPattern` | `[ ]` TODO |
| **I.1.3** | Suggestions modes par genre (Dorien → Jazz, Phrygien → Metal, Mixolydien → Blues) | `[ ]` TODO · Pré-req : I.1.1 |

#### Performance & Production

| ID | Tâche | Statut |
|----|-------|--------|
| **E.3** | Export MIDI multi-pistes avec noms de pistes corrects | `[ ]` TODO |
| **H.3.1/H.3.2** | Modes de jeu : Block / Strum (15-30ms) / Arpeggio + bibliothèque presets (Island, Reggae, Rock) | `[ ]` TODO · Sonnet/Pro |

---

### 🟣 P4 — Vision Future (long terme, aucun engagement)

| ID | Tâche | Notes |
|----|-------|-------|
| **G.1.5** | Toggle Classique/Moderne (analyse stricte V7→I vs Jazz/Debussy) | Complexe UX |
| **H.1.1/H.1.2** | Basse Fantôme (Missing Fundamental) + visualisation harmoniques fantômes | Pro |
| **H.2.2** | Indicateur Just Intonation vs Equal Temperament | Future |
| **H.3.3/H.3.4** | Moteur Humanize (jitter 2-5ms) + marqueurs direction strumming | Future |
| **I.2.1/I.2.2/I.2.3** | Emotional Mapping + Templates structures + Palettes émotions | Vision future |
| **THEORY-03** | Mode "notes hors-gamme bienveillant" | Non MVP actuel |
| **5.4** | Set Theory sous-marine : `getIntervalVector()` dans harmonyEngine | Recherche |
| **5.5** | Micro-tonalité (MPE / .SCL/.TUN) | Long terme |
| **E.4/E.5** | Export MIDI Basse Fantôme + Shepard Tones | Long terme |
| **E.6** | VST / Export Ableton Live | Vision |
| **F.4.1** | Automatiser génération handover (template script) | QoL outil |
| **C.2.1/C.2.2/C.2.3** | "Next Chord" HUD avancé, Melodic Guide Overlay, Emotional Mapping | Vision |
| **J.1.1/J.1.2** | Grille polyrythmique PianoRoll (5/4, 7/8) + `totalSteps` variable | Conv 3+ |

---

### 🎵 CONV 3 — Stream COMP (Gelé jusqu'après Conv 1)

> **Décision 2026-06-06** : gelé pour stabiliser l'UX avant d'ajouter des features.

| ID | Tâche | Qui | Statut |
|----|-------|-----|--------|
| COMP-01 / J.1.3 | Moteur Rythmes Euclidiens (Bjorklund) + TDD | Flash | `[~]` GELÉ |
| COMP-02 | Visualisation Circulaire SVG (EuclideanCircle) | Flash | `[~]` GELÉ |
| COMP-03 | Panneau Composition Lab | Flash | `[~]` GELÉ |
| COMP-04 | Intégration Mode Composition dans App.jsx | Flash | `[~]` GELÉ |
| COMP-05 | Playback Audio des Patterns (Tone.js) | Flash/Sonnet | `[~]` GELÉ |
| COMP-06 | Module Déphasage (Phasing / Steve Reich) | Sonnet | `[~]` GELÉ |
| COMP-07 | Isorythmie + Réalignement Forcé | Flash | `[~]` GELÉ |
| COMP-08 | Polyrythmie + Rythmes Équilibrés (Andrew Milne) | Sonnet/Pro | `[~]` GELÉ |

---

## 🚫 ANNULÉ / OBSOLÈTE

| Item | Raison |
|------|--------|
| `BACKLOG.md` racine | **Fusionné dans ce fichier** — remplacer par notice de redirection |
| `MASTER_TASK_TRACKER.md` | Archive — remplacé par ce fichier |
| `DETAILED_BACKLOG_TECH.md` | Archive — remplacé par ce fichier |
| `B.1.2 / B.1.3` standalone | **Fusionné dans UX-04** (Design Bible englobe les tokens) |
| `12.7 / 12.8` bordures CTA | **Absorbé par UX-04** (Design Bible) |
| `GIT-01 / GIT-02` | Résolu (PR #51, #52, #53) |

---

## 🔧 COMMANDES UTILES

```powershell
cd d:\IA\VisualMusic

# Tests
npx vitest run --reporter=verbose 2>&1 | Select-Object -Last 20

# Dev server
npm run dev

# Bundle audit
npx vite-bundle-visualizer

# Git log
git log --oneline -10

# ESLint
npx eslint "src/**/*.{js,jsx}" --ignore-pattern "**/__tests__/**"
```

---

## 📁 FICHIERS CLÉS

| Fichier | Rôle | Sensibilité |
|---------|------|-------------|
| `src/hooks/useMusicEngine.js` | Moteur musical central | 🔴 CRITIQUE |
| `src/core/fingeringLogic.js` | Calcul doigtés v2 | 🔴 NE PAS TOUCHER |
| `src/context/AppContext.jsx` | State global React | 🔴 CRITIQUE |
| `src/hooks/useFretboard.js` | Hook orchestration Fretboard | 🟠 SENSIBLE |
| `src/core/fretboardUtils.js` | Fonctions pures + computeFretMetadata | 🟠 SENSIBLE |
| `src/App.css` | Design tokens + layout global | 🟠 SENSIBLE |
| `src/AppDesktop.jsx` | Layout principal | 🟠 SENSIBLE |
| `src/core/theory.js` | Calculs théorie musicale | 🟠 SENSIBLE |
| `src/components/Instruments/Fretboard.jsx` | Composant "dumb" [REFACTORÉ] | 🟡 STABLE |
| `docs/design/DESIGN_BIBLE.md` | ⚠️ À créer en Conv 1 — référence design obligatoire | — |

---

*Créé : 2026-06-06T11:47 par ARIA*  
*Créé : 2026-06-06T11:47 par ARIA*  
*Mis à jour : 2026-06-07T17:49 — PR #59 (UX-11/12/13/16 GEMINI-04), Phase D Mobile complète. Jules J-06 en cours : BUG-10 + unused imports + console.log cleanup.*
