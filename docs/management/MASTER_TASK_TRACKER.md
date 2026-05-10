# VisualMusic — Master Task Tracker
> **Fichier de suivi multi-LLM** · Mis à jour à chaque action · Priorité de lecture pour tout nouveau modèle
> 
> **Instructions** : Lire ce fichier AVANT toute action. Mettre à jour le statut à chaque tâche complétée.
> **Format statut** : `[ ]` TODO · `[/]` EN COURS · `[x]` FAIT · `[!]` BLOQUÉ · `[~]` ANNULÉ

---

## 🗓️ SESSION EN COURS : 2026-05-10

**Modèle actif** : Claude Sonnet (Thinking)  
**Objectif session** : Analyse critique backlog + préparation tâches Flash

---

## 📊 ÉTAT GLOBAL DU PROJET

| Indicateur | Valeur |
|------------|--------|
| Tests | ✅ 558/558 passants |
| Branche VisualMusic | `feature/vintage-ui` (40+ fichiers non commités) |
| Branche Aria | `main` (propre sauf App.jsx.dump + docs/) |
| Architecture | useMusicEngine extrait, AppContext en place |
| Dernier commit VM | `22f05a4` - "Final production polish" |

---

## 🚨 CONTEXTE CRITIQUE (lire en priorité)

### Contrat de données `fingeringMap` v2 (NE PAS RÉGRESSER)
```js
// Corde muette : { 'X': true }
// Corde ouverte : { 0: 'O' }
// Corde jouée : { fret: number, status: 'played'|'barre', finger?: 1-4 }
```
⚠️ Toute modification de fingeringLogic.js doit conserver ce format — c'est le contrat central.

### Tests critiques à ne jamais casser
- `src/core/__tests__/fingeringLogic.test.js` — 16 tests
- `src/__tests__/App.integration.test.jsx` — 3 tests
- `src/components/__tests__/AppRoot.test.jsx` — doit avoir `<AppProvider>`

---

## ✅ TÂCHES COMPLÉTÉES (cette session)

### Session 2026-05-10
- [x] **SESS-01** — Analyse critique du backlog complet (Streams A→F + Aria)
- [x] **SESS-02** — Création BACKLOG_ANALYSIS_REPORT.md dans docs/management/
- [x] **SESS-03** — Correction PianoRoll.test.jsx (👻 → step__dim-overlay)
- [x] **SESS-04** — Correction AppRoot.test.jsx (ajout AppProvider wrapper)
- [x] **SESS-05** — Fix PianoRoll.jsx safety filter (tracks.filter(Boolean))
- [x] **SESS-06** — Suite tests 558/558 ✅
- [x] **SESS-07** — Déplacement expert_theory_data.json → `src/core/`
- [x] **SESS-08** — Décision App.jsx.dump → OBSOLÈTE (dump 04/04, 3230L vs actuel 476L)

---

## 📋 BACKLOG PRIORITAIRE (ordonné)

### 🔴 P0 — URGENT (Déblocage)

#### GIT-01 — Commits thématiques VisualMusic [EN COURS cette session]
- **Qui** : Claude Sonnet ou Gemini Pro
- **Branche source** : `feature/vintage-ui`
- **Action** : 4 commits thématiques puis PR vers main
- Commit 1 : `feat(arch): extract hooks, AppContext, useMusicEngine stabilization`
  - Fichiers : src/hooks/*, src/context/*, src/App.jsx
- Commit 2 : `test: stabilize full test suite (558 passing)`
  - Fichiers : src/**/__tests__/*, src/core/__tests__/*
- Commit 3 : `feat(ui): sequencer, position selector, liquid glass components`
  - Fichiers : src/components/*, src/styles/*, src/assets/*
- Commit 4 : `docs: add management docs, refined backlog, expert theory data`
  - Fichiers : docs/*, REFINED_BACKLOG.md, src/core/expert_theory_data.json
- **Statut** : `[ ]` TODO

#### GIT-02 — Nettoyage Aria (App.jsx.dump + gitignore)
- **Qui** : Flash (simple)
- **Branche** : `chore/cleanup-aria-workspace`
- Actions :
  - Archiver App.jsx.dump → `docs/archive/App.jsx.2026-04-04.dump` puis supprimer original
  - Commiter `.gitignore` modifié
  - Commiter `docs/` nouvellement créé
- **Statut** : `[ ]` TODO

#### BACKLOG-01 — Merge BACKLOG.md + REFINED_BACKLOG.md [EN COURS cette session]
- **Qui** : Claude Sonnet
- **Action** : Créer `BACKLOG.md` unifié (garder BACKLOG.md comme nom référence)
- **Statut** : `[/]` EN COURS

---

### 🟠 P1 — Sprint suivant (Assignables à Flash avec specs ci-dessous)

#### FLASH-01 — Dead code scan + rapport CSV
- **Complexité** : Basse ✅ Flash
- **Branche** : `chore/dead-code-audit`
- **Commandes à exécuter** :
  ```bash
  cd d:\IA\VisualMusic
  # Utiliser jcodemunch find_dead_code via MCP
  # Sortie : docs/management/dead_code_report.md
  ```
- **Prompt Flash** : "Lance jcodemunch find_dead_code sur le repo VisualMusic. Génère un rapport markdown dans docs/management/dead_code_report.md avec : ID, fichier, fonction, raison. Ne supprime RIEN, rapport seulement."
- **Critère d'acceptation** : Fichier créé, no code changes
- **Statut** : `[ ]` TODO

#### FLASH-02 — Ajouter `isOutOfRange` dans useMusicEngine
- **Complexité** : Basse ✅ Flash
- **Branche** : `feat/out-of-range-feedback`
- **Fichier cible** : `src/hooks/useMusicEngine.js`
- **Spec exacte** :
  ```js
  // Dans l'objet retourné par useMusicEngine, ajouter :
  isGuitarOutOfRange: boolean,  // true si aucune frette valide trouvée pour guitar
  isBassOutOfRange: boolean,    // true si aucune frette valide trouvée pour bass
  // Règle : si guitarFingering est null/vide → isGuitarOutOfRange = true
  ```
- **Test à créer** : `src/hooks/__tests__/useMusicEngine.test.js` → cas "C5 sur bass = outOfRange"
- **Critère d'acceptation** : Tests verts, valeur exposée
- **Statut** : `[ ]` TODO

#### FLASH-03 — Ghost feedback CSS si hors-tessiture
- **Complexité** : Basse ✅ Flash
- **Branche** : `feat/out-of-range-feedback` (même branche que FLASH-02)
- **Fichier cible** : `src/components/Instruments/Fretboard.jsx` et `Fretboard.css`
- **Spec exacte** :
  ```jsx
  // Si prop isOutOfRange=true → ajouter classe CSS 'fretboard--out-of-range'
  // CSS : .fretboard--out-of-range { opacity: 0.3; pointer-events: none; }
  // Afficher un message : <div className="range-warning">🚫 Out of Range</div>
  ```
- **Critère d'acceptation** : Visible visuellement en testant C5 sur bass en mode Dictionary
- **Statut** : `[ ]` TODO

#### FLASH-04 — Réduire props de InstrumentView via context
- **Complexité** : Moyenne ⚠️ Flash avec précautions
- **Branche** : `refactor/instrument-view-context`
- **Spec** :
  - `notation`, `lang`, `txt` → déjà dans AppContext, retirer des props
  - `harmonicMode`, `dictType` → peuvent aller dans AppContext si pas déjà
  - **NE PAS TOUCHER** : `guitarFingering`, `bassFingering`, `activeNotes` (données calculées, pas de context)
  - Après : relancer `npm test` — doit rester 558 ✅
- **Risque** : Peut casser InstrumentView.test.jsx → mettre à jour les mocks si nécessaire
- **Critère d'acceptation** : Props réduits d'au moins 5, tests verts
- **Statut** : `[ ]` TODO

#### FLASH-05 — Inventaire tokens CSS
- **Complexité** : Basse ✅ Flash
- **Branche** : `chore/design-tokens-audit`
- **Commande** :
  ```bash
  grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.css" > docs/management/css_color_audit.txt
  grep -rn "rgba\|hsl\|rgb(" src/ --include="*.css" >> docs/management/css_color_audit.txt
  ```
- **Livrable** : `docs/management/css_color_audit.md` — tableau des couleurs brutes avec fréquence d'usage
- **Critère d'acceptation** : Rapport créé, no code changes
- **Statut** : `[ ]` TODO

#### FLASH-06 — VoicingAlert dans DictionaryPanel
- **Complexité** : Basse ✅ Flash
- **Branche** : `feat/voicing-alert-dict`
- **Spec** :
  ```jsx
  // Dans DictionaryPanel.jsx, importer VoicingAlert et l'afficher sous le sélecteur d'accord
  // Props nécessaires : rootValue, chordType, fingeringMode
  // Condition : afficher seulement si fingeringMode === 'anatomic'
  ```
- **Fichiers** : `src/components/Panels/DictionaryPanel.jsx`, `src/components/Intelligence/VoicingAlert.jsx`
- **Critère d'acceptation** : L'alerte apparaît en mode anatomique pour un accord non-jouable
- **Statut** : `[ ]` TODO

---

### 🟡 P2 — Sprint futur (Nécessite Sonnet/Pro)

#### SONNET-01 — Analyse Tonal.js vs theory.js (Décision architecture)
- **Qui** : Claude Sonnet
- **Livrable** : `docs/management/TONAL_MIGRATION_PLAN.md`
- **Actions** :
  1. Lister toutes les fonctions de theory.js (272L)
  2. Mapper vers Tonal.js API équivalente
  3. Identifier les fonctions sans équivalent (custom = garder)
  4. Décision : wrapper adapter vs migration directe
  5. Plan TDD avec tests de non-régression avant migration
- **Statut** : `[ ]` TODO

#### SONNET-02 — Refactoring Fretboard (complexité 99)
- **Qui** : Claude Sonnet (trop risqué pour Flash)
- **Pré-requis** : FLASH-01 (dead code scan) + tests fretboard à 90%+
- **Actions** : Extraire `FretboardCalculator.js` (algo activePath, calcul positions)
- **Statut** : `[ ]` TODO · **BLOQUÉ sur** : FLASH-01

#### SONNET-03 — F.3 Observabilité (architecture révisée)
- **Qui** : Claude Sonnet
- **Plan révisé** (localStorage au lieu de file system) :
  1. Hook `useDebugState` → écrit state dans localStorage.setItem('vm_debug_state', JSON.stringify(state))
  2. Script Playwright `scripts/dump-state.js` pour extraire vers `logs/dev.json`
  3. npm script `check:state`
- **Statut** : `[ ]` TODO

#### PRO-01 — Bundle splitting Tone.js
- **Qui** : Gemini Pro
- **Spec** : Dynamic import de Tone dans useSequencer.js
- **Statut** : `[ ]` TODO

---

### 🔵 P3 — Future Phase

#### FUTURE-01 — Tonal.js wrapper adapter (après SONNET-01)
#### FUTURE-02 — Canvas Fretboard rendering
#### FUTURE-03 — Emotional Mapping / Mood interface
#### FUTURE-04 — Open Key / Camelot Wheel HUD

---

## 🐛 BUGS CONNUS (à corriger en priorité si rencontré)

| ID | Composant | Description | Criticité |
|----|-----------|-------------|-----------|
| BUG-01 | Fretboard | Crash dict en changement note/type | P0 (signalé dans BACKLOG.md Phase14.1) |
| BUG-02 | Studio | Notes inaudibles/trop aiguës | P0 (Phase14.2) |
| BUG-03 | Header | Overflow sélecteur Langue sur grands écrans | P1 (Phase14.5) |
| BUG-04 | Notes Menu | Z-index menu notes passe derrière notation | P1 (Phase14.6) |
| BUG-05 | UI | Animation dictionnaire gamme/accord désync | P2 (Phase12.6) |

---

## 📁 FICHIERS CLÉS À CONNAÎTRE

| Fichier | Rôle | Sensibilité |
|---------|------|-------------|
| `src/hooks/useMusicEngine.js` | Moteur musical central | 🔴 CRITIQUE |
| `src/core/fingeringLogic.js` | Calcul doigtés v2 | 🔴 CRITIQUE |
| `src/context/AppContext.jsx` | State global React | 🔴 CRITIQUE |
| `src/App.jsx` | Composition UI (476L, toujours trop gros) | 🟠 SENSIBLE |
| `src/components/Instruments/Fretboard.jsx` | Affichage manche | 🟠 SENSIBLE |
| `src/core/theory.js` | Calculs théorie musicale | 🟠 SENSIBLE |
| `src/core/expert_theory_data.json` | Données harmoniques (nouvellement ajouté) | 🟡 STABLE |

---

## 🔧 COMMANDES UTILES

```bash
# Tests
cd d:\IA\VisualMusic && npm test

# Dev server
npm run dev

# Lancer analyse dead code
# (via MCP jcodemunch find_dead_code)

# Git status
git status
git log --oneline -10
```

---

## 📝 LOG DES ERREURS RENCONTRÉES

| Date | Erreur | Fix | Fichier |
|------|--------|-----|---------|
| 2026-05-10 | PianoRoll crash - track.name undefined | tracks.filter(Boolean) | PianoRoll.jsx |
| 2026-05-10 | AppRoot test - useAppContext error | Wrap in AppProvider | AppRoot.test.jsx |
| 2026-05-10 | PianoRoll.test.jsx - expect👻 | Replace with step__dim-overlay | PianoRoll.test.jsx |
| 2026-05-10 | App.jsx - ReferenceError availableGuitarFingerings | Destructure from musicState | App.jsx |

---

*Dernière mise à jour : 2026-05-10T14:57 par Claude Sonnet*
