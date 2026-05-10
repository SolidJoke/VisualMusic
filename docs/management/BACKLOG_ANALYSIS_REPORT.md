# Analyse Critique du Backlog VisualMusic + Aria
> Session : 2026-05-10 | Modèle : Claude Sonnet (Thinking)  
> Objectif : Enrichissement du backlog, découpe Flash-compatible, corrections dette technique

---

## 🚨 ALERTES IMMÉDIATES (à traiter avant tout)

### ALERTE ROUGE 1 — Crise Git Critique
**Problème** : VisualMusic est sur la branche `feature/vintage-ui` avec ~40 fichiers non commités (staged + unstaged + untracked). Certains sont des fichiers majeurs (App.jsx, fingeringLogic.js, AppContext.jsx, nouveaux hooks, etc.).  
**Risque** : Perte de tout le travail de stabilisation si crash, ou pollution de commits futurs.  
**Action requise** : Décision sur la stratégie de commit avant tout nouveau travail.

### ALERTE ORANGE 1 — Aria a des fichiers non versionnés
**Problème** : `d:\IA\Aria` contient `App.jsx.dump` et `docs/` non trackés, et `.gitignore` modifié.  
**Risque** : Contamination cross-projets si on commite sans discriminer.

### ALERTE ORANGE 2 — Divergence Backlog
**Problème** : Il existe `BACKLOG.md` ET `REFINED_BACKLOG.md` dans VisualMusic. Lequel fait foi ?  
Le `REFINED_BACKLOG.md` est plus complet mais pas committé (untracked).  

---

## 🏗️ ÉTAT DE L'ARCHITECTURE RÉELLE (vs. Backlog)

### Ce qui EST implémenté (non reflété dans le backlog)
- ✅ `useMusicEngine.js` — FAIT (hook central extrait, 264L)  
- ✅ `AppContext.jsx` — FAIT (Context + Reducer en place)  
- ✅ `useDictionaryMode.js` / `useStudioMode.js` — FAITS  
- ✅ Tests : 558/558 passants (24 fichiers)  
- ✅ `fingeringMap` v2 avec `{'X': true}` et `{0: 'O'}` — IMPLÉMENTÉ  
- ✅ `VoicingAlert.jsx` — Composant créé  
- ✅ `PositionSelector.jsx` — Composant créé  
- ✅ `SequencerPanel.jsx`, `TheoryLegend.jsx`, `DAWHelper.jsx` — Créés  

### Ce qui RESTE à faire (dette réelle)
- ❌ App.jsx toujours « God Component » (~476L) — F.2 partiellement fait  
- ❌ Fretboard.jsx non refactoré (complexité 99 toujours dans composant)  
- ❌ InstrumentView.jsx — 25+ props en prop drilling (voir code ligne 16-61)  
- ❌ `expert_theory_data.json` — Référencé mais chemin `SAS/` introuvable dans VisualMusic  
- ❌ Tonal.js — Pas intégré  
- ❌ Design Tokens CSS — Non standardisés  
- ❌ Bundle splitting Tone.js — Non fait  
- ❌ État F3 (Observabilité) — Non implémenté  

---

## 📋 ANALYSE ITEM PAR ITEM

### STREAM A — Hygiène & Fiabilité

#### A.1 — Audit de Qualité & Purge

**PROBLÈME** : Le backlog dit "identifier 89 fonctions likely-dead via jcodemunch" mais ce travail n'est PAS quantifié. Le `TechDebt_Backlog.md` dans Aria est quasi vide (TD-01 = "initialized").

**Découpe Flash-compatible** :
| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| A.1.1 — Lancer jcodemunch dead code scan et produire liste CSV | Basse | ✅ OUI |
| A.1.2 — Supprimer imports inutilisés (identifiés par scan) | Basse | ✅ OUI |
| A.1.3 — Extraire `FretboardCalculator.js` de `Fretboard.jsx` | **Élevée** | ❌ NON (Sonnet+) |
| A.1.4 — Extraire sous-composants de `InstrumentView.jsx` | Moyenne | ⚠️ PARTIEL (avec specs) |
| A.1.5 — Finaliser extraction logique vers hooks (App.jsx restant) | **Élevée** | ❌ NON |

**Alerte Avocat du Diable** : Le refactoring de Fretboard (complexité 99) risque de casser l'algo `activePath` qui est déjà fragile. TDD obligatoire avant tout edit.

#### A.2 — Performance & Bundle

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| A.2.1 — Audit bundle actuel avec `vite-bundle-visualizer` | Basse | ✅ OUI |
| A.2.2 — Lazy load de Tone.js (`import()` dynamique) | Moyenne | ✅ OUI (avec exemple) |
| A.2.3 — Prototyper Canvas Fretboard | **Très Élevée** | ❌ NON |

---

### STREAM B — Design System

#### B.1 — Design Tokens

**PROBLÈME** : Deux thèmes CSS existent déjà (`vintage-theme.css`, `modern-theme.css`) mais sans tokens unifiés. La migration risque de casser le "Liquid Glass effect" qui est CSS-heavy.

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| B.1.1 — Inventaire des valeurs HEX/HSL brutes (grep) | Basse | ✅ OUI |
| B.1.2 — Définir le fichier `tokens.css` (variables CSS uniquement) | Basse | ✅ OUI |
| B.1.3 — Migration progressive composant par composant | Moyenne | ✅ OUI (atomique) |

**Recommandation** : Commencer par les composants les plus stables (PianoRoll, Sidebar) avant les composants complexes (Fretboard).

---

### STREAM C — Aide à la Composition

#### C.1 — Intelligence Harmonique

**ALERTE AVOCAT DU DIABLE** : L'item dit "Remplacer theory.js par Tonal". C'est une **rupture majeure**. theory.js est importé dans ~10 fichiers dont App.jsx, useMusicEngine, useStudioMode, useDictionaryMode. Tout casser d'un coup = risque critique.

**Reformulation recommandée** : Wrapper Pattern (Tonal comme backend de theory.js) au lieu de remplacement direct.

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| C.1.1 — Audit des fonctions theory.js utilisées (liste exhaustive) | Basse | ✅ OUI |
| C.1.2 — Évaluation Tonal.js : mapping theory.js → Tonal API | Moyenne | ⚠️ PARTIEL |
| C.1.3 — Créer `tonal-adapter.js` wrapper (ne pas toucher theory.js) | Moyenne | ✅ OUI (avec contrat) |
| C.1.4 — Migrer function par function avec tests | Élevée | ❌ NON |

#### C.2 — Assistant Proactif

**Non découpable pour Flash** — Vision trop floue. Besoin de spécification UX d'abord.

---

### STREAM D — Expertise Instrumentale

#### D.1 — Anatomie 4K

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| D.1.1 — Calculer positions de frettes (formule 17.817) | Basse | ✅ OUI |
| D.1.2 — Paramètre `numFrets` prop dans Fretboard | Basse | ✅ OUI (si Fretboard refactoré) |

#### D.2 — Voicing Intelligence

`VoicingAlert.jsx` existe déjà ! Le backlog ne reflète pas cela.

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| D.2.1 — Intégrer VoicingAlert dans DictionaryPanel | Basse | ✅ OUI |
| D.2.2 — Voice Leading : algo de score inversion | **Élevée** | ❌ NON |

---

### STREAM E — Production

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| E.1 — Audit accessibilité (axe DevTools) | Basse | ✅ OUI |
| E.2 — aria-labels sur instruments | Basse | ✅ OUI |
| E.3 — Export MIDI multi-pistes nommées | Moyenne | ✅ OUI |

---

### STREAM F — Interaction & Navigation (Focus Actuel)

#### F.1 — Navigation Octaves (AFFINÉ)
**État réel** : Le contrat `fingeringMap` v2 est IMPLÉMENTÉ dans fingeringLogic.js. `PositionSelector.jsx` existe.  
**Ce qui manque** : 
- L'état `isOutOfRange` n'est pas exposé dans l'UI (Ghost visual feedback)  
- Le sélecteur de "Mode" global (Note / Accord / Gamme) n'est pas implémenté

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| F.1.1 — Ajouter `isOutOfRange` dans MusicState (useMusicEngine) | Basse | ✅ OUI (avec contrat) |
| F.1.2 — UI Ghost Feedback (opacity CSS si out of range) | Basse | ✅ OUI |
| F.1.3 — Sélecteur Mode Global (Note/Chord/Scale) | Moyenne | ✅ OUI (avec specs) |

#### F.2 — Refactoring (AFFINÉ)
**État réel** : `useMusicEngine` est extrait. Mais `InstrumentView.jsx` a encore 25+ props.  

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| F.2.1 — Passer InstrumentView à useAppContext (réduire props) | Moyenne | ✅ OUI |
| F.2.2 — Extraire MixerPanel de App.jsx | Basse | ✅ OUI |
| F.2.3 — React.memo sur Fretboard et PianoKeyboard | Basse | ✅ OUI |

#### F.3 — Observabilité (AFFINÉ)
**État réel** : RIEN d'implémenté.  

**Challenge Avocat du Diable** : Le "State Mirror" (écriture dans `logs/dev.json`) nécessite une API Node côté serveur ou un filesystem access API qui n'existe pas dans un browser SPA React/Vite. Ce n'est pas trivial.  
**Alternative recommandée** : Utiliser `localStorage` + un script de dump CLI (`scripts/dump-state.js` qui lit le localStorage via Playwright).

| Tâche | Complexité | Assignable Flash ? |
|-------|-----------|-------------------|
| F.3.1 — Hook `useDebugState` qui écrit dans localStorage | Basse | ✅ OUI |
| F.3.2 — Script Playwright dump-state.js | Moyenne | ✅ OUI |
| F.3.3 — npm script `check:state` | Basse | ✅ OUI |

#### F.4 — Protocole Passation (AFFINÉ)
**État réel** : `LAST_HANDOVER.md` existe et est utilisé.  
**Amélioration** : Automatiser le rituel avec un template.  
→ **Intégrer dans Aria Backlog** (ARIA-14) plutôt que VisualMusic.

#### F.5 — Enrichissement Théorique
**Problème critique** : Le fichier `SAS/expert_theory_data.json` est référencé mais le dossier `SAS/` n'existe PAS dans `d:\IA\VisualMusic`. Il est peut-être dans `d:\IA\Aria`. À vérifier.

---

## 📊 ANALYSE DU BACKLOG ARIA

### Items en retard critique

**ARIA-13** (IN PROGRESS) : Adoption lean-ctx/jcodemunch dans les lectures  
→ La session actuelle prouve que c'est en cours mais pas encore systématique (des `view_file` directs encore utilisés)

**ARIA-04** (α1) : Refonte Architecture de Contexte  
→ Aucun progrès visible. Le CorePrompt est toujours monolithique.

### Items manquants (à créer)

**ARIA-14** — Séparation Git Strict Aria/VisualMusic  
- Problème : Pas de règle explicite sur la gestion des branches dual-repo  
- Livrable : Section dans Git_Workflow.md + Ritual de vérification  
- Priorité : P0 (bloquant)  

**ARIA-15** — Template de Handover Automatisé  
- Problème : Le handover est fait manuellement et parfois oublié  
- Livrable : Script `scripts/create-handover.js` ou template LAST_HANDOVER.md enrichi  
- Priorité : P1  

**ARIA-16** — Mise à jour TechDebt_Backlog.md systématique  
- Problème : Le fichier est quasi vide alors qu'on a identifié des dizaines de dettes  
- Livrable : Processus Boy Scout formalisé dans les Rituals  
- Priorité : P2  

---

## 🔄 QUESTIONS OUVERTES (pour toi)

1. **Git VisualMusic** : La branche `feature/vintage-ui` contient ~40 fichiers modifiés non commités. Stratégie : 
   - Option A : Commit atomique global "feat: architecture stabilization"  
   - Option B : Découper en 3-4 commits thématiques (hooks, tests, UI)  
   - Option C : Créer une nouvelle branche propre depuis main et cherry-pick  
   → **Ta décision est requise avant de continuer.**

2. **Fichier `SAS/expert_theory_data.json`** : Ce fichier référencé dans F.5 et LAST_HANDOVER — où est-il exactement ? Dans Aria ? Dans VisualMusic ?

3. **Tonal.js** : Remplacement total vs wrapper ? Je recommande wrapper mais c'est ta décision architecturale.

4. **App.jsx.dump dans Aria** : Ce fichier non tracké dans `d:\IA\Aria` — à supprimer ou à versionner ?

---

## ✅ PROCHAIN SPRINT RECOMMANDÉ (Items Flash-ready)

Basé sur l'analyse, voici les 5 tâches les plus "Flash-assignables" en priorité :

1. **A.1.1** — Dead code scan (jcodemunch) → Rapport CSV  
2. **F.1.1** — Ajouter `isOutOfRange` dans useMusicEngine  
3. **F.1.2** — Ghost feedback CSS si hors-tessiture  
4. **F.2.1** — Réduire props InstrumentView via context  
5. **B.1.1** — Inventaire tokens CSS  

---

*Mis à jour : 2026-05-10 | Continuer l'analyse sur ce fichier*
