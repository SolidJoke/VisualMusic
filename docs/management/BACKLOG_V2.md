# VisualMusic — Backlog V2 (Référence Unique)
> **Auteur** : ARIA — 2026-06-06  
> **Remplace** : `MASTER_TASK_TRACKER.md` et `DETAILED_BACKLOG_TECH.md` (archives conservées)  
> **Usage** : Ce fichier est la SEULE source de vérité du backlog. Mettre à jour à chaque tâche complétée.  
> **Format** : `[ ]` TODO · `[/]` EN COURS · `[x]` FAIT · `[!]` BLOQUÉ · `[~]` ANNULÉ

---

## 📊 ÉTAT GLOBAL

| Indicateur | Valeur |
|------------|--------|
| Tests | ✅ **795/795** passants (Vitest, happy-dom) |
| Branche principale | `main` (propre, à jour) |
| Dernier commit | `de1504e` — Merge PR #52 (Refactoring Fretboard A.1.3) |
| Architecture | Hook useFretboard + fonctions pures fretboardUtils |

---

## ✅ TOUT CE QUI EST DÉJÀ FAIT (audit 2026-06-06)

### Fonctionnalités UI
- [x] **FLASH-11** — Substitutions harmoniques (Triton, Relatif Mineur) dans DictionaryPanel
- [x] **FLASH-12** — Target Notes / Aide Impro (bouton `highlightTargetNotes`) pour les gammes
- [x] **FLASH-13** — Sélecteur de rythme manuel (`RHYTHM_PATTERNS` + `CustomSelect`) dans StudioPanel
- [x] **MI-B1 / FLASH-08** — Degrés romains sur les accords Studio (`toRoman(c.nns)`)
- [x] **G.2.2 / FLASH-09** — Quick Start Progressions (chips depuis `extendedTheoryData.json`)
- [x] **G.2.3** — Substitutions harmoniques dans DictionaryPanel (données `expert_theory_data.json`)
- [x] **H.2.1 / FLASH-10** — Mode Harmoniques UI (`HarmonicSeriesPanel` connecté)
- [x] **FEATURE-01** — Sélecteur d'octave complet (1–7) pour le mode "Note Unique"
- [x] **G.3.4** — Accords Suivants Suggérés (DictionaryPanel + StudioPanel)
- [x] **G.2.5** — Alerte Anticlimax / Tension (⚠️ icône sur dernier accord tonique)
- [x] **G.4.3** — Score de Jouabilité (`calculatePlayabilityScore` dans StudioPanel)
- [x] **MI-A3** — Modes relatifs/parallèles (chips `getRelatedScales` dans DictionaryPanel)
- [x] **D.2.1** — VoicingAlert intégré dans DictionaryPanel (Guitar + Bass)
- [x] **FLASH-14** — Crash Tab Accords : `CustomSelect` gère `null` (`value ?? ""`)
- [x] **FLASH-15** — Gammes visibles sur le manche (isSubtle corrigé, pas de suppression d'isActive)
- [x] **FLASH-09 (ancien)** — Gammes affichées sans lancer play (activeNotes via useMemo sans dépendance audio)
- [x] **FLASH-08 (i18n)** — Notation EU/US dans PositionSelector (`notation` passé à `getAvailableGuitarFingerings`)

### Architecture & Refactoring
- [x] **A.1.3** — Refactoring Fretboard : extraction vers `fretboardUtils.js` (3 fonctions pures) + hook `useFretboard.js` (PR #52)
- [x] **F.2.2** — MixerPanel extrait de App.jsx → `src/components/Panels/MixerPanel.jsx`
- [x] **F.2.3** — `React.memo` sur Fretboard ET PianoKeyboard
- [x] **D.1.1** — Frettage logarithmique (Rule of 18, diviseur 17.817 dans `getFretWidths`)
- [x] **FLASH-02/03** — `isGuitarOutOfRange` / `isBassOutOfRange` exposés dans `useMusicEngine` + CSS `fretboard--out-of-range`
- [x] **FLASH-04** — Réduction props `InstrumentView` via AppContext
- [x] **F.2.1** — InstrumentView réduite (notation, lang, txt depuis context)
- [x] **BUG-07** — Sidebar rectangle vide (CSS grid template)
- [x] **BUG-08** — Fretboard width doubling + marker offsets (position: absolute)
- [x] **BUG-09** — Scale notes highlight mask (guard condition)

### Tests & QA
- [x] **QA intégration** — 795 tests au vert (`QA_Journeys.integration.test.jsx` inclus)
- [x] **A.1.1** — Dead code scan généré (`dead_code_report.md`)
- [x] **FLASH-05** — Inventaire tokens CSS (`css_color_audit.md`)

---

## 🐛 BUGS ACTIFS

| ID | Description | Composant | Criticité | Détail |
|----|-------------|-----------|-----------|--------|
| **BUG-02** | ⚠️ Surbrillance globale des octaves en mode Studio (clic accord allume toutes les octaves du pitch class sur le manche) | Fretboard / useMusicEngine | 🟡 P1 | `fretboardActiveNotes` avec `absoluteValue` est calculé dans `useMusicEngine` mais son usage prioritaire dans `MusicEngineContext` / `useFretboard` doit être vérifié. Si le Fretboard utilise `activeNotes` (modulo 12) au lieu de `fretboardActiveNotes` (absoluteValue), toutes les octaves s'allument. |
| **BUG-10** | Notation EU/US non respectée dans le CTA spectre harmonique | DictionaryPanel / HarmonicSeriesPanel | 🟢 P2 | Vérifier que `HarmonicSeriesPanel` utilise `notation` pour afficher les noms de notes. |

---

## 📋 BACKLOG PRIORISÉ

### 🔴 P0 — Critique (à traiter en priorité)

Aucun item P0 actif.

---

### 🟠 P1 — Sprint actuel

#### BUG-02 — Fix Surbrillance Octaves Studio
- **Fichiers** : `src/context/MusicEngineContext.jsx`, `src/hooks/useFretboard.js`
- **Action** :
  1. Vérifier dans `MusicEngineContext.jsx` que `fretboardActiveNotes` est bien exposé dans le context (et pas seulement `activeNotes`)
  2. Vérifier dans `useFretboard.js` que `activeNotes = fretboardActiveNotes || rawActiveNotes` prend bien la priorité sur le fallback
  3. Tester manuellement : cliquer un accord Studio → seule l'octave jouée doit s'allumer sur le manche
- **Statut** : `[ ]` TODO

#### A.1.2 — Suppression Dead Code
- **Source** : `docs/management/dead_code_report.md`
- **Actions (ordre de priorité)** :
  - `[ ]` Supprimer `src/hooks/useUIState.js` (remplacé par AppContext, zéro importateur)
  - `[ ]` Supprimer `src/ErrorBoundary.jsx` (non utilisé nulle part)
  - `[ ]` Supprimer `puppeteer_test.js` et `test.js` à la racine (fichiers orphelins)
  - `[ ]` Passe ESLint `no-unused-vars` / `no-unused-imports` sur tout `src/`
- **Règle** : Ne supprimer que les imports et fichiers confirmés sans utilisation — jamais de logique
- **Test** : `npx vitest run` doit rester 795/795 après chaque suppression
- **Statut** : `[ ]` TODO

---

### 🟡 P2 — Sprint suivant

#### D.1.2 — `numFrets` Variable (22 → par instrument)
- **Context** : 22 frettes hardcodées dans `useFretboard.js` (constante `NUM_FRETS = 22`). Le refactoring A.1.3 l'a bien isolé en constante, ce qui rend ce changement maintenant trivial.
- **Cible** : Passer `numFrets` comme paramètre de `useFretboard(instrument)` — 22 pour guitare, 24 pour électrique, 20 pour basse
- **Données** : `expert_theory_data.json` → `instrumentRanges`
- **Fichiers** : `src/hooks/useFretboard.js`
- **Statut** : `[ ]` TODO

#### BUG-10 — Notation EU/US dans HarmonicSeriesPanel
- **Fichier** : `src/components/Panels/HarmonicSeriesPanel.jsx`
- **Action** : Vérifier que `notation` est lu depuis `useAppContext()` et appliqué aux noms de notes
- **Statut** : `[ ]` TODO

#### A.2.1 — Audit Bundle (vite-bundle-visualizer)
- **Action** : `npx vite-bundle-visualizer` → screenshot du résultat → décision sur lazy loading
- **Livrable** : Note dans `docs/management/` avec taille bundle Tone.js vs reste
- **Statut** : `[ ]` TODO

#### A.2.2 — Lazy Load Tone.js
- **Pré-requis** : A.2.1
- **Fichier** : `src/hooks/useSequencer.js` (ou `useAudioScheduler.js`)
- **Action** : `const Tone = await import('tone')` → réduire le bundle initial
- **Statut** : `[ ]` TODO

---

### 🔵 P3 — Future Phase (nécessite Sonnet/Pro)

#### SONNET-01 — Analyse Tonal.js vs theory.js
- **Livrable** : `docs/management/TONAL_MIGRATION_PLAN.md`
- **Approche** : Wrapper Pattern uniquement (NE PAS remplacer theory.js)
- **Statut** : `[ ]` TODO

#### A.1.4 — Extraire sous-composants de InstrumentView.jsx
- **Context** : `InstrumentView.jsx` conserve encore du prop drilling (15+ props)
- **Action** : Identifier les blocs JSX extractibles, créer des sous-composants légers
- **Statut** : `[ ]` TODO

#### A.1.5 — Finaliser extraction App.jsx
- **Context** : App.jsx reste un god component (~476L). Après les extractions précédentes, identifier les logiques residuelles extractibles vers hooks
- **Statut** : `[!]` BLOQUÉ sur A.1.4

#### B.1.2 / B.1.3 — Design Tokens CSS (tokens.css)
- **Pré-requis** : `css_color_audit.md` existant
- **Action** : Créer `src/styles/tokens.css` avec variables CSS unifiées, migrer composant par composant
- **Statut** : `[ ]` TODO

---

### 🎵 P4 — Composition Engine (Stream COMP)

> Plan détaillé dans la conversation `96e1f95a`. Toutes les tâches COMP sont indépendantes des streams précédents.

| ID | Tâche | Qui | Statut |
|----|-------|-----|--------|
| COMP-01 | Moteur Rythmes Euclidiens (Bjorklund) + tests TDD | Flash ✅ | `[ ]` TODO |
| COMP-02 | Visualisation Circulaire SVG (EuclideanCircle) | Flash ⚠️ | `[ ]` TODO · Pré-requis : COMP-01 |
| COMP-03 | Panneau Composition Lab | Flash ⚠️ | `[ ]` TODO · Pré-requis : COMP-01, COMP-02 |
| COMP-04 | Intégration Mode Composition dans App.jsx | Flash ✅ | `[ ]` TODO · Pré-requis : COMP-03 |
| COMP-05 | Playback Audio des Patterns (Tone.js) | Flash/Sonnet | `[ ]` TODO · Pré-requis : COMP-03 |
| COMP-06 | Module Déphasage (Phasing / Steve Reich) | Sonnet 🔴 | `[ ]` TODO · Pré-requis : COMP-01, COMP-05 |
| COMP-07 | Isorythmie + Réalignement Forcé | Flash ✅ | `[ ]` TODO · Pré-requis : COMP-01 |
| COMP-08 | Polyrythmie + Rythmes Équilibrés (Andrew Milne) | Sonnet/Pro 🔴 | `[ ]` TODO · Pré-requis : COMP-01, COMP-02 |

---

## 🚫 ANNULÉ / OBSOLÈTE

| Item | Raison |
|------|--------|
| `MASTER_TASK_TRACKER.md` (sections FLASH-01 à FLASH-13) | Remplacé par ce fichier. Archive conservée. |
| `DETAILED_BACKLOG_TECH.md` (BUG-09, QW-01, QW-03) | Tous corrigés. Archive conservée. |
| `GIT-01` / `GIT-02` — Commits thématiques | Résolu lors du nettoyage de branche (PR #51, #52) |
| `FLASH-01` — Dead code scan | ✅ FAIT (rapport existant) |
| `FLASH-05` — Inventaire tokens CSS | ✅ FAIT (audit existant) |
| `PRO-SPEC-01` — Audit data musicale | ✅ OBSOLÈTE — les specs Flash-08/09/10 ont été produites et implémentées |

---

## 🔧 COMMANDES UTILES

```powershell
# Tests
cd d:\IA\VisualMusic
npx vitest run --reporter=verbose 2>&1 | Select-Object -Last 20

# Dev server
npm run dev

# Bundle audit
npx vite-bundle-visualizer

# Git log
git log --oneline -10
```

---

## 📁 FICHIERS CLÉS À CONNAÎTRE

| Fichier | Rôle | Sensibilité |
|---------|------|-------------|
| `src/hooks/useMusicEngine.js` | Moteur musical central | 🔴 CRITIQUE |
| `src/core/fingeringLogic.js` | Calcul doigtés v2 | 🔴 CRITIQUE — NE PAS TOUCHER |
| `src/context/AppContext.jsx` | State global React | 🔴 CRITIQUE |
| `src/hooks/useFretboard.js` | Hook orchestration Fretboard [NOUVEAU] | 🟠 SENSIBLE |
| `src/core/fretboardUtils.js` | Fonctions pures + computeFretMetadata | 🟠 SENSIBLE |
| `src/components/Instruments/Fretboard.jsx` | Composant "dumb" [REFACTORÉ] | 🟡 STABLE |
| `src/core/theory.js` | Calculs théorie musicale | 🟠 SENSIBLE |

---

*Créé : 2026-06-06T11:47 par ARIA (Claude Sonnet 4.6 Thinking)*  
*Basé sur : audit code direct + sous-agent research + lecture LAST_HANDOVER.md, DETAILED_BACKLOG_TECH.md, MASTER_TASK_TRACKER.md*
