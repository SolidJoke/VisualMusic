# VisualMusic — Backlog V2 (Référence Unique)
> **Auteur** : ARIA — 2026-06-06  
> **Remplace** : `MASTER_TASK_TRACKER.md` et `DETAILED_BACKLOG_TECH.md` (archives conservées)  
> **Usage** : Ce fichier est la SEULE source de vérité du backlog. Mettre à jour à chaque tâche complétée.  
> **Format** : `[ ]` TODO · `[/]` EN COURS · `[x]` FAIT · `[!]` BLOQUÉ · `[~]` ANNULÉ/GELÉ

---

## 📊 ÉTAT GLOBAL

| Indicateur | Valeur |
|------------|--------|
| Tests | ✅ **795/795** passants (Vitest, happy-dom) |
| Branche principale | `main` (propre, à jour) |
| Dernier commit | `2b82cce` — chore(cleanup): dead code + unused vars (PR #53) |
| Architecture | Hook useFretboard + fonctions pures fretboardUtils |
| Design | Glassmorphism Phase 9 implémenté — refonte responsive en cours de planification |

---

## 🗺️ PLAN CONVERSATIONS FUTURES

```
Conv 1 (prête à démarrer) : UX/Design Refonte
    ├─ Quick wins : BUG-10, D.1.2
    ├─ Phase A : Audit Stitch (captures → maquettes)
    ├─ Phase B : Design Bible
    └─ Phase C : Responsive (breakpoints, drawers)

Conv 2 (après Conv 1) : Corrections Musicales
    ├─ SCALE : Gammes / CAGED
    └─ THEORY : Base de connaissances

Conv 3 (après Conv 2) : Stream COMP (gelé)
    └─ COMP-01 à COMP-08
```

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
- [x] **FLASH-15** — Gammes visibles sur le manche (isSubtle corrigé)
- [x] **FLASH-09 (ancien)** — Gammes affichées sans lancer play
- [x] **FLASH-08 (i18n)** — Notation EU/US dans PositionSelector

### Architecture & Refactoring
- [x] **A.1.3** — Refactoring Fretboard : `fretboardUtils.js` + hook `useFretboard.js` (PR #52)
- [x] **A.1.2** — Dead code cleanup : 4 fichiers supprimés, ~20 vars inutilisées (PR #53)
- [x] **F.2.2** — MixerPanel extrait de App.jsx
- [x] **F.2.3** — `React.memo` sur Fretboard ET PianoKeyboard
- [x] **D.1.1** — Frettage logarithmique (Rule of 18)
- [x] **FLASH-02/03** — `isGuitarOutOfRange` / `isBassOutOfRange` + CSS
- [x] **FLASH-04** — Réduction props `InstrumentView` via AppContext
- [x] **BUG-07/08/09** — Sidebar, Fretboard width, Scale highlight

### Tests & QA
- [x] **QA intégration** — 795 tests au vert
- [x] **A.1.1** — Dead code scan (`dead_code_report.md`)
- [x] **FLASH-05** — Inventaire tokens CSS (`css_color_audit.md`)

---

## 🐛 BUGS ACTIFS

| ID | Description | Criticité | Conv |
|----|-------------|-----------|------|
| **BUG-02** | Surbrillance octaves Studio (diagnostic : probablement déjà corrigé — à confirmer manuellement) | 🟡 P1 | Conv 1 si confirmé |
| **BUG-10** | Notation EU/US non respectée dans HarmonicSeriesPanel | 🟢 P2 | Conv 1 — Quick win |

---

## 📋 BACKLOG PRIORISÉ

---

### 🟠 CONV 1 — UX/Design Refonte (à démarrer maintenant)

> Workflow : Sonnet dans Antigravity + délégation Stitch via MCP  
> Règle : aucune nouvelle feature musicale — focus UX uniquement  
> Branche : `refonte/ux-design` (ou par phase)

#### ⚡ Quick Wins (traiter en premier, ~1h)

| ID | Tâche | Fichier | Statut |
|----|-------|---------|--------|
| **BUG-10** | Notation EU/US dans HarmonicSeriesPanel | `HarmonicSeriesPanel.jsx` | `[ ]` TODO |
| **D.1.2** | `numFrets` variable (22→20 basse, 22 guitare) | `useFretboard.js` | `[ ]` TODO |

#### Phase A — Audit Stitch (captures → maquettes)

| ID | Tâche | Statut |
|----|-------|--------|
| **UX-01** | Captures multi-résolution (4K/1440p/1080p/tablet/mobile) → `docs/design/screenshots/` | `[ ]` TODO (Gabriel) |
| **UX-02** | Analyse Stitch : audit UX complet → `docs/design/STITCH_AUDIT_REPORT.md` | `[ ]` TODO · Pré-req : UX-01 |
| **UX-03** | Génération 3 variantes design Stitch → validation Gabriel | `[ ]` TODO · Pré-req : UX-02 |

#### Phase B — Design Bible (doc avant code)

| ID | Tâche | Livrable | Statut |
|----|-------|----------|--------|
| **UX-04** | Design Bible (grille 8px, typo, palette, hiérarchie P0-P4) | `docs/design/DESIGN_BIBLE.md` | `[ ]` TODO · Pré-req : UX-03 |
| **UX-05** | Template prompts Stitch validés | `docs/design/STITCH_PROMPTS.md` | `[ ]` TODO |

**Hiérarchie composants (P0→P4) :**
| Niveau | Composants | Comportement basse résolution |
|--------|-----------|-------------------------------|
| P0 | Mode actif (Studio/Dictionary) | Toujours visible |
| P1 | Piano + Fretboard + Audio | Compressible en tablet |
| P2 | Séquenceur / DictionaryPanel | Onglet en mobile |
| P3 | Stats, Score, Substitutions, Harmoniques | Panneau repliable |
| P4 | Outils avancés | Masqué par défaut |

#### Phase C — Responsive Implementation

| ID | Tâche | Statut |
|----|-------|--------|
| **UX-06** | Breakpoints CSS (4K → mobile, 5 paliers) | `[ ]` TODO · Pré-req : UX-04 |
| **UX-07** | Composants adaptatifs : `CollapsiblePanel.jsx`, `Drawer.jsx` | `[ ]` TODO · Pré-req : UX-06 |
| **UX-08** | Audit anti-surcharge (test 90%) sur composants existants | `[ ]` TODO · Pré-req : UX-04 |
| **UX-09** | Checklist design nouvelles features | `docs/design/DESIGN_CHECKLIST.md` | `[ ]` TODO |

**Breakpoints cibles :**
```
≥ 2560px — 4K : interface complète
1440–2559px — QHD : panneaux P3 repliables
1080–1439px — FHD : colonne unique, sidebar compressible
768–1079px — Tablet : drawers, onglets
< 768px — Mobile : plein écran, bottom sheets, scroll horizontal piano
```

#### En parallèle (indépendant du design)

| ID | Tâche | Statut |
|----|-------|--------|
| **A.2.1** | Audit bundle vite-bundle-visualizer | `[ ]` TODO |
| **A.2.2** | Lazy Load Tone.js | `[ ]` TODO · Pré-req : A.2.1 |

---

### 🔵 CONV 2 — Corrections Musicales (après Conv 1)

> Démarrage : *"Continue le backlog VisualMusic — Stream SCALE et THEORY"*

#### Stream SCALE — Gammes / Système CAGED

**Contexte :** Possible confusion conceptuelle entre "7 degrés distincts d'une gamme" et "notes jouées dans une position CAGED". Une gamme de Do Majeur = toujours 7 pitch classes distincts, peu importe l'instrument ou la position.

| ID | Tâche | Criticité | Statut |
|----|-------|-----------|--------|
| **SCALE-01** | Audit affichage gammes guitare — vérifier nombre de pitch classes affichés | 🟠 P1 | `[ ]` TODO (diagnostic d'abord) |
| **SCALE-02** | Fix si SCALE-01 confirme le bug (correction `fretboardUtils.js` uniquement) | 🟠 P1 | `[ ]` TODO · Conditionnel |
| **SCALE-03** | Feature : sélecteur positions CAGED pour gammes (⚠️ Sonnet requis, peut toucher `fingeringLogic.js`) | 🔵 P3 | `[ ]` TODO · Pré-req : SCALE-01 |
| **SCALE-04** | Feature : piano multi-octave pour gammes (1/2/3 octaves) | 🔵 P3 | `[ ]` TODO |

#### Stream THEORY — Base de Connaissances

| ID | Tâche | Livrable | Statut |
|----|-------|----------|--------|
| **THEORY-01** | Créer `docs/music_theory/COMPOSITION_PRINCIPLES.md` (25 principes composition/impro) | Référence IA | `[ ]` TODO |
| **THEORY-02** | Feature : indicateur fonctions tonales sur manche (I=stabilité, IV=préparation, V=tension) | Extension `highlightTargetNotes` | `[ ]` TODO |
| **THEORY-03** | Mode "notes hors-gamme bienveillant" (chromatismes non pénalisés) | Non MVP | `[ ]` P4 FUTUR |

#### Stream STITCH (process)

| ID | Tâche | Statut |
|----|-------|--------|
| **STITCH-03** | Intégrer revue Stitch dans checklist nouvelles features (UX-09) | `[ ]` TODO · Pré-req : UX-09 |

---

### 🟢 P3 — Future Phase (indépendant)

| ID | Tâche | Statut |
|----|-------|--------|
| **SONNET-01** | Analyse Tonal.js vs theory.js → `TONAL_MIGRATION_PLAN.md` | `[ ]` TODO |
| **A.1.4** | Extraire sous-composants InstrumentView.jsx | `[ ]` TODO |
| **A.1.5** | Finaliser extraction App.jsx | `[!]` BLOQUÉ sur A.1.4 |

---

### 🎵 CONV 3 — Stream COMP (Gelé)

> **Décision 2026-06-06** : gelé jusqu'après fin Conv 1 UX/Design.  
> Raison : ajouter des features sur une UI non stabilisée complexifie le travail de refonte.

| ID | Tâche | Qui | Statut |
|----|-------|-----|--------|
| COMP-01 | Moteur Rythmes Euclidiens (Bjorklund) + TDD | Flash | `[~]` GELÉ |
| COMP-02 | Visualisation Circulaire SVG | Flash | `[~]` GELÉ |
| COMP-03 | Panneau Composition Lab | Flash | `[~]` GELÉ |
| COMP-04 | Intégration Mode Composition dans App.jsx | Flash | `[~]` GELÉ |
| COMP-05 | Playback Audio des Patterns (Tone.js) | Flash/Sonnet | `[~]` GELÉ |
| COMP-06 | Module Déphasage (Phasing / Steve Reich) | Sonnet | `[~]` GELÉ |
| COMP-07 | Isorythmie + Réalignement Forcé | Flash | `[~]` GELÉ |
| COMP-08 | Polyrythmie + Rythmes Équilibrés | Sonnet/Pro | `[~]` GELÉ |

---

## 🚫 ANNULÉ / OBSOLÈTE / FUSIONNÉ

| Item | Raison |
|------|--------|
| `B.1.2 / B.1.3` — Design Tokens CSS standalone | **Fusionné dans UX-04** (Design Bible englobe les tokens) |
| `MASTER_TASK_TRACKER.md` (FLASH-01 à FLASH-13) | Remplacé par ce fichier. Archive conservée. |
| `DETAILED_BACKLOG_TECH.md` (BUG-09, QW-01, QW-03) | Tous corrigés. Archive conservée. |
| `GIT-01 / GIT-02` — Commits thématiques | Résolu (PR #51, #52, #53) |
| `FLASH-01` — Dead code scan | ✅ FAIT |
| `FLASH-05` — Inventaire tokens CSS | ✅ FAIT |
| `A.1.2` — Suppression dead code | ✅ FAIT (PR #53) |

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

## 📁 FICHIERS CLÉS

| Fichier | Rôle | Sensibilité |
|---------|------|-------------|
| `src/hooks/useMusicEngine.js` | Moteur musical central | 🔴 CRITIQUE |
| `src/core/fingeringLogic.js` | Calcul doigtés v2 | 🔴 CRITIQUE — NE PAS TOUCHER |
| `src/context/AppContext.jsx` | State global React | 🔴 CRITIQUE |
| `src/hooks/useFretboard.js` | Hook orchestration Fretboard | 🟠 SENSIBLE |
| `src/core/fretboardUtils.js` | Fonctions pures + computeFretMetadata | 🟠 SENSIBLE |
| `src/App.css` | Design tokens + layout global | 🟠 SENSIBLE |
| `src/AppDesktop.jsx` | Layout principal | 🟠 SENSIBLE |
| `src/components/Instruments/Fretboard.jsx` | Composant "dumb" [REFACTORÉ] | 🟡 STABLE |
| `src/core/theory.js` | Calculs théorie musicale | 🟠 SENSIBLE |
| `docs/design/DESIGN_BIBLE.md` | ⚠️ À créer en Conv 1 — référence design | — |

---

*Créé : 2026-06-06T11:47 par ARIA*  
*Mis à jour : 2026-06-06T22:50 — Intégration brainstorms UX/SCALE/THEORY, gel COMP, plan 3 conversations*
