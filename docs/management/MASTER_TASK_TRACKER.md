# VisualMusic — Master Task Tracker
> **Fichier de suivi multi-LLM** · Mis à jour à chaque action · Priorité de lecture pour tout nouveau modèle
> 
> **Instructions** : Lire ce fichier AVANT toute action. Mettre à jour le statut à chaque tâche complétée.
> **Format statut** : `[ ]` TODO · `[/]` EN COURS · `[x]` FAIT · `[!]` BLOQUÉ · `[~]` ANNULÉ

---

## 🗓️ PROCHAINE SESSION : 2026-05-11 (Session 4 — Expansion Intelligence)

**Modèle pressenti** : Gemini Flash
**Objectif** : Implémenter les substitutions harmoniques (FLASH-11) et l'aide à l'improvisation (FLASH-12/13)
**Référence** : Lire `docs/management/MASTER_TASK_TRACKER.md` (ce fichier) et `docs/management/LAST_HANDOVER.md`

---

## 📊 ÉTAT GLOBAL DU PROJET

| Indicateur | Valeur |
|------------|--------|
| Tests | ✅ 559/559 passants |
| Branche VisualMusic | `feature/vintage-ui` (40+ fichiers non commités) |
| Branche Aria | `main` (propre sauf App.jsx.dump + docs/) |
| Architecture | useMusicEngine extrait, AppContext en place |
| Dernier commit VM | `22f05a4` - "Final production polish" |
| BUG-06 | ✅ RÉSOLU — FLASH-07 |

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

- [x] **FLASH-07** — BUG Critique Dictionnaire (type-cast) ✅
- [x] **QW-01** — Nettoyage imports DictionaryPanel ✅
- [x] **QW-02** — Mise à jour compteurs tests doc ✅
- [x] **QW-03** — Audit i18n complet ✅
- [x] **FLASH-08** — Degrés romains Studio ✅
- [x] **FLASH-09** — Quick Start Progressions ✅
- [x] **FLASH-10** — Mode Harmoniques UI ✅
- [x] **SESS-01** — Analyse critique du backlog complet (Streams A→F + Aria)
- [x] **SESS-02** — Création BACKLOG_ANALYSIS_REPORT.md dans docs/management/
- [x] **SESS-03** — Correction PianoRoll.test.jsx (👻 → step__dim-overlay)
- [x] **SESS-04** — Correction AppRoot.test.jsx (ajout AppProvider wrapper)
- [x] **SESS-05** — Fix PianoRoll.jsx safety filter (tracks.filter(Boolean))
- [x] **SESS-06** — Suite tests 559/559 ✅
- [x] **SESS-07** — Déplacement expert_theory_data.json → `src/core/`
- [x] **SESS-08** — Décision App.jsx.dump → OBSOLÈTE (dump 04/04, 3230L vs actuel 476L)
- [x] **SESS-09** — Fix BUG-03 (Header buttons width 110px)
- [x] **SESS-10** — Fix BUG-04 (Z-index stacking Sidebar)
- [x] **SESS-11** — Fix BUG-01 (Fretboard crash safety)
- [x] **SESS-12** — Style App Mode Toggle (Blue theme)
- [x] **SESS-13** — Analyse BUG-06 (accords non affichés en mode dictionnaire) + spec FLASH-07

---

## 📋 BACKLOG PRIORITAIRE (ordonné)

### 🔴 P0 — URGENT (Déblocage & Maintenance)

#### GIT-01 — Commits thématiques VisualMusic
- **Objectif** : Commiter les 40+ fichiers modifiés en 4 commits atomiques (`feat(arch)`, `test`, `feat(ui)`, `docs`).
- **Statut** : `[ ]` TODO

#### GIT-02 — Nettoyage Aria Workspace
- **Objectif** : Archiver les dumps, nettoyer `.gitignore` et commiter les nouveaux documents de management.
- **Statut** : `[ ]` TODO

### 🟡 P1 — NOUVELLES TÂCHES FLASH (Intelligence Harmonique)

#### FLASH-11 — Substitutions Harmoniques (Dictionary Panel)
- **Objectif** : Afficher les substitutions suggérées pour l'accord sélectionné (Triton, Relative mineure).
- **Source** : `src/core/expert_theory_data.json` -> `harmonicSubstitutions`
- **UI** : Ajouter une section "Substitutions suggérées" avec des boutons "Quick Load".
- **Statut** : `[x]` FAIT (Session 4)


#### FLASH-12 — Indicateur de Cibles d'Improvisation (Target Notes)
- **Objectif** : Mettre en évidence les notes cibles (tierces/quintes) sur le manche en mode dictionnaire (gammes).
- **Action** : Utiliser la classe CSS `.fret-target-note` (à créer) sur les frettes correspondantes.
- **Statut** : `[x]` FAIT (Session 4)

#### FLASH-13 — Sélecteur de Rythme Manuel (Studio Mode)
- **Objectif** : Permettre de changer le pattern rythmique manuellement dans le `StudioPanel`.
- **Action** : Connecter un dropdown au `activeBrick.patternId`.
- **Statut** : `[x]` FAIT (Session 4)

### 🟢 P2 — AMÉLIORATIONS UI & QoL

#### QW-04 — Feedback visuel sur les chord-chips (Studio)
- **Objectif** : Ajouter un état `:active` plus prononcé sur les boutons de progression.
- **Statut** : `[ ]` TODO

---

## ✅ HISTORIQUE DES TÂCHES (Session 3)

- [x] **FLASH-07** — BUG Critique Dictionnaire (type-cast)
- [x] **FLASH-08** — Degrés romains Studio
- [x] **FLASH-09** — Quick Start Progressions
- [x] **FLASH-10** — Mode Harmoniques UI
- [x] **QW-01** — Nettoyage imports
- [x] **QW-02** — Compteurs tests doc
- [x] **QW-03** — Audit i18n
- [x] **BUG-01** — Fretboard crash safety
- [x] **BUG-03** — Header buttons width
- [x] **BUG-04** — Z-index stacking Sidebar
- [x] **SESS-03** — Fix PianoRoll tests
- [x] **SESS-04** — AppRoot wrapper test
- [x] **SESS-05** — PianoRoll safety filter
- [x] **SESS-07** — Move expert_theory_data.json

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
- **Statut** : `[x]` FAIT

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
- **Test à créer :** `src/hooks/__tests__/useMusicEngine.test.js` → cas "C5 sur bass = outOfRange"
- **Critère d'acceptation :** Tests verts, valeur exposée
- **Statut :** `[x]` FAIT (isGuitarOutOfRange, isBassOutOfRange + tests)
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
- **Statut** : `[x]` FAIT

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
- **Statut** : `[x]` FAIT

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
- **Statut** : `[x]` FAIT

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
- **Statut** : `[x]` FAIT

#### FLASH-07 — BUG-06 : Correction affichage accords en mode Dictionnaire 🔴
- **Complexité** : Moyenne ⚠️ — nécessite rigueur sur les noms de props
- **Branche** : `fix/dictionary-chord-display`
- **Priorité** : P0 — régression critique (feature principale inopérante)

##### 🔬 Diagnostic (analyse Claude Sonnet Thinking — 2026-05-10)

Deux bugs imbriqués introduits lors de FLASH-04 (refactoring props InstrumentView) :

**Bug #1 — Collision de noms de props dans App.jsx → DictionaryPanel** (ROOT CAUSE)

Dans `src/App.jsx` (lignes 358-377), le composant `DictionaryPanel` est appelé avec :
```jsx
// Ce qui est PASSÉ depuis App.jsx :
α12={α12}   // guitarFingering (objet)  → IGNORÉ car DictionaryPanel n'a pas de prop "α12"
α14={α14}   // bassFingering  (objet)  → IGNORÉ car DictionaryPanel n'a pas de prop "α14"
α1={α1}     // selectedVoicingIndexGuitar (number) → reçu comme prop "α1" = guitarFingering !
α2={α2}     // setSelectedVoicingIndexGuitar (fn)  → reçu comme prop "α2" = bassFingering !
α3={α3}     // selectedVoicingIndexBass (number)   → IGNORÉ
α5={α5}     // setSelectedVoicingIndexBass (fn)     → IGNORÉ
```

`DictionaryPanel.jsx` attend (§MAP en fin de fichier) :
- `α1` = `guitarFingering` (objet `{fingeringMap, outOfRange, …}`)
- `α2` = `bassFingering` (objet)
- `selectedVoicingIndexGuitar` (number) — reçoit `undefined`
- `setSelectedVoicingIndexGuitar` (fn) — reçoit `undefined`
- `selectedVoicingIndexBass` (number) — reçoit `undefined`
- `setSelectedVoicingIndexBass` (fn) — reçoit `undefined`

Conséquence : les `CustomSelect` de position ont `value=undefined` et `onChange=undefined` → l'UI est cassée, l'utilisateur ne peut pas changer de position.

**Bug #2 — Mismatch de type dans useMusicEngine : `selectedVoicingIndexGuitar === 0` (int) vs `p.id` (string)**

Dans `src/hooks/useMusicEngine.js` (ligne 182-184) :
```js
const avail = getAvailableGuitarFingerings(rootVal, chordType, dictOctave);
const found = avail.find(p => p.id === selectedVoicingIndexGuitar);
// selectedVoicingIndexGuitar = 0 (integer initialisé par useDictionaryMode)
// p.id est probablement une string (ex: "voicing_0", "string_5", ...)
// → found = undefined → fallback ligne 187-188
```
Le fallback appelle `getGuitarFingering(rootVal, chordType, selectedRootStringGuitar, offset)` où `selectedRootStringGuitar = null` (pas de corde sélectionnée), ce qui peut retourner `null` si la logique interne exige un anchor string en mode dictionnaire.

##### 🛠️ Actions à réaliser (dans l'ordre)

**Étape 0 — Diagnostic console.log (obligatoire avant tout fix)**
```js
// Dans useMusicEngine.js, ligne ~182, ajouter TEMPORAIREMENT :
console.log('[DEBUG-BUG06] avail:', avail.map(p => ({id: p.id, typeof: typeof p.id})));
console.log('[DEBUG-BUG06] selectedVoicingIndexGuitar:', selectedVoicingIndexGuitar, typeof selectedVoicingIndexGuitar);
// Vérifier dans la console du navigateur ce que retourne getAvailableGuitarFingerings
// → Confirmer le type de p.id avant d'écrire le fix
```

**Étape 1 — Corriger l'appel DictionaryPanel dans App.jsx**
```jsx
// AVANT (bugué) :
<DictionaryPanel
  α12={α12}   // guitarFingering
  α14={α14}   // bassFingering
  α1={α1}     // selectedVoicingIndexGuitar
  α2={α2}     // setSelectedVoicingIndexGuitar
  α3={α3}     // selectedVoicingIndexBass
  α5={α5}     // setSelectedVoicingIndexBass
/>

// APRÈS (correct) — utiliser les noms de props attendus par DictionaryPanel :
<DictionaryPanel
  guitarFingering={α12}               // ← α12 = guitarFingering dans §MAP App.jsx
  bassFingering={α14}                 // ← α14 = bassFingering
  selectedVoicingIndexGuitar={α1}     // ← α1  = selectedVoicingIndexGuitar
  setSelectedVoicingIndexGuitar={α2}  // ← α2  = setSelectedVoicingIndexGuitar
  selectedVoicingIndexBass={α3}       // ← α3  = selectedVoicingIndexBass
  setSelectedVoicingIndexBass={α5}    // ← α5  = setSelectedVoicingIndexBass
/>
```

Attention : vérifier le §MAP en bas de App.jsx pour confirmer les correspondances alpha avant de modifier.

**Étape 2 — Corriger DictionaryPanel.jsx pour utiliser les nouveaux noms**

Le fichier `DictionaryPanel.jsx` utilise déjà `α1` et `α2` comme alias de `guitarFingering`/`bassFingering` dans sa signature. Il faut renommer les props destructurées pour qu'elles correspondent :
```jsx
// AVANT :
export default function DictionaryPanel({
  α1,   // guitarFingering
  α2,   // bassFingering
  selectedVoicingIndexGuitar,
  setSelectedVoicingIndexGuitar,
  selectedVoicingIndexBass,
  setSelectedVoicingIndexBass,
  ...
})

// APRÈS :
export default function DictionaryPanel({
  guitarFingering,    // renommé
  bassFingering,      // renommé
  selectedVoicingIndexGuitar,
  setSelectedVoicingIndexGuitar,
  selectedVoicingIndexBass,
  setSelectedVoicingIndexBass,
  ...
})
// Et remplacer toutes les occurrences de α1/α2 dans le corps par guitarFingering/bassFingering
```

**Étape 3 — Corriger le mismatch de type dans useMusicEngine.js**

Après confirmation via console.log (Étape 0) du type réel de `p.id` :
```js
// Option A : si p.id est un string, caster selectedVoicingIndexGuitar :
const found = avail.find(p => p.id === String(selectedVoicingIndexGuitar));

// Option B : si p.id est un number, s'assurer que useDictionaryMode initialise avec le bon type
// (probablement null → 0 au lieu de null → avail[0].id)

// Option C (plus robuste) : initialiser avec l'ID réel du premier élément :
// Dans useDictionaryMode.js ligne 29 :
// α1(isChord ? avail[0]?.id ?? 0 : null);  // ← MAIS avail n'est pas accessible ici
// → Préférer l'Option A (cast String)
```

**Étape 4 — Vérifier InstrumentView ne régresse pas**

Après le fix, vérifier dans `InstrumentView.jsx` et `Fretboard.jsx` que `guitarFingering` reçu depuis App.jsx (via `α12`) est bien passé et utilisé pour afficher les notes sur le manche.

##### ✅ Critères d'acceptation
1. En mode Dictionnaire, sélectionner `Do` (C) + `Accords` + `Majeur` → un accord doit apparaître sur le Fretboard et le Piano
2. Le `CustomSelect` Guitar Position et Bass Position doit être non-vide et navigable
3. Changer de position (suivant/précédent) doit mettre à jour l'affichage du manche
4. `npm test` → **toujours 559/559 ✅** (aucune régression)
5. Les tests `useDictionaryMode.test.jsx` et `InstrumentView.test.jsx` passent

##### ⚠️ Points de vigilance
- **NE PAS** modifier `fingeringLogic.js` ni le contrat fingeringMap v2
- **NE PAS** renommer les variables alpha dans `useMusicEngine.js` (elles sont correctes là)
- Le §MAP en bas de chaque fichier est la source de vérité pour les correspondances alpha
- Supprimer les `console.log` de debug après validation

- **Statut** : `[ ]` TODO

---

#### FLASH-08 — Degrés romains sur les accords (Studio Mode)
- **Complexité** : Basse ✅ Flash
- **Branche** : `feat/roman-numerals-studio`
- **Fichier cible** : `src/components/Panels/StudioPanel.jsx`
- **Pré-requis** : FLASH-07 terminé et tests verts
- **Logique existante** : `toRoman(nnsStr)` dans `src/core/theory.js` — DÉJÀ CODÉE ✅
- **Spec** :
  ```js
  // 1. Ajouter l'import :
  import { toRoman } from '../../core/theory';

  // 2. Dans le rendu de chaque accord de la progression :
  // Trouver le JSX qui affiche chord.nns ou le nom de l'accord
  // Ajouter juste au-dessus du nom d'accord :
  <span className="chord-roman">{toRoman(chord.nns)}</span>
  ```
- **CSS à ajouter** dans `StudioPanel.css` ou le CSS associé :
  ```css
  .chord-roman {
    font-size: 0.7rem;
    color: var(--color-gold, #c9a84c);
    opacity: 0.85;
    display: block;
    text-align: center;
    letter-spacing: 0.05em;
  }
  ```
- **Critère d'acceptation** : En Studio, brick C Majeur → les accords affichent I, ii, iii, IV, V, vi, vii°
- **Test** : `npm test` → 559/559 ✅ + vérification visuelle
- **Statut** : `[ ]` TODO

#### FLASH-09 — Progressions communes Quick Start (Studio Mode)
- **Complexité** : Moyenne ⚠️ — vérifier le setter avant d'implémenter
- **Branche** : `feat/quick-progressions`
- **Fichier cible** : `src/components/Panels/StudioPanel.jsx`
- **Pré-requis** : FLASH-07 terminé
- **Données disponibles** : `src/core/extendedTheoryData.json` → `axiomRules.progressions` — DÉJÀ EN JSON ✅
  - II-V-I Majeur : `["ii7","V7","IMaj7"]`
  - ii-V-i Mineur : `["iim7b5","V7alt","im7"]`
  - Pop I-V-vi-IV : `["I","V","vi","IV"]`
  - Turnaround I-vi-ii-V : `["IMaj7","vi7","ii7","V7"]`
  - R&B IV-iii-vi : `["IVMaj7","iiim7","vim7"]`
- **Spec** :
  ```js
  import extendedData from '../../core/extendedTheoryData.json';
  import { generateChordsFromNNS } from '../../core/theory';

  // Bandeau "Progressions rapides" avec chips cliquables
  // Au clic sur une progression :
  const chords = generateChordsFromNNS(
    activeBrick.rootValue,
    activeBrick.modeName,
    progression.degrees
  );
  // Identifier dans StudioPanel comment modifier les accords du brick actif
  // Si le setter est complexe → stopper et reporter à Sonnet
  ```
- **⚠️ CONDITION DE STOP** : Si le setter d'accords n'est pas évident en moins de 5 min de lecture → reporter à Sonnet, ne pas inventer
- **Critère d'acceptation** : Cliquer "II-V-I Maj" avec brick en C → accords Dm7, G7, CMaj7 apparaissent
- **Test** : `npm test` → 559/559 ✅
- **Statut** : `[ ]` TODO

#### FLASH-10 — Mode Harmoniques dans DictionaryPanel
- **Complexité** : Basse ✅ Flash
- **Branche** : `feat/harmonic-mode-ui`
- **Fichier cible** : `src/components/Panels/DictionaryPanel.jsx`
- **Pré-requis** : FLASH-07 terminé
- **Logique existante** : `getHarmonicSeries(baseFreq, n)` dans `src/core/acousticEngine.js` — DÉJÀ CODÉE ✅
  - Retourne : `[{ order, frequency, noteName, centsOffset }, ...]`
- **Spec** :
  ```js
  import { getHarmonicSeries } from '../../core/acousticEngine';

  // Le toggle harmonicMode EXISTE déjà dans l'UI — NE PAS MODIFIER le toggle
  // Ajouter uniquement le panneau d'affichage quand harmonicMode === true :

  // Calcul de la fréquence de base :
  const dictRootMidi = Number(dictRoot) + 60; // C4 = MIDI 60, dictRoot=0
  const baseFreq = 440 * Math.pow(2, (dictRootMidi - 69) / 12);

  // Données à afficher :
  const harmonics = getHarmonicSeries(baseFreq, 8);
  // Format de chaque harmonique : { order: 3, frequency: 1320, noteName: "E6", centsOffset: 2 }

  // UI à créer :
  {harmonicMode && (
    <div className="harmonic-series">
      <h4>Série harmonique</h4>
      {harmonics.map(h => (
        <div key={h.order} className={`harmonic ${Math.abs(h.centsOffset) > 10 ? 'harmonic--off' : ''}`}>
          <span className="harmonic-order">H{h.order}</span>
          <span className="harmonic-note">{h.noteName}</span>
          <span className="harmonic-cents">{h.centsOffset !== 0 ? `${h.centsOffset > 0 ? '+' : ''}${h.centsOffset}¢` : '±0'}</span>
        </div>
      ))}
    </div>
  )}
  ```
- **CSS** : `.harmonic--off { color: var(--color-warning, #f59e0b); }` — orange pour les notes qui dévient du tempérament
- **Critère d'acceptation** : Sélectionner A (La), activer harmonicMode → affiche A4, A5, E6(+2¢), A6, C#7(-14¢), E7(+2¢), G7(-31¢), A7
- **Test** : `npm test` → 559/559 ✅
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

### 🎵 P4 — Music Intelligence (Composition & Improvisation)
> **Document de référence** : `docs/management/MUSIC_INTELLIGENCE_ROADMAP.md`
> **Workflow** : Gemini Pro finalise les specs → Gemini Flash implémente tâches atomiques

#### PRO-SPEC-01 — Audit data musicale + specs atomiques (DOIT ÊTRE FAIT EN PREMIER)
- **Qui** : Gemini Pro
- **Actions** :
  1. Lire `extendedTheoryData.json`, `expert_theory_data.json`, `voicingEngine.js`, `acousticEngine.js`, `bassEngine.js`
  2. Auditer `toRoman()`, `harmonicMode`, `getRecommendedScalesForChord()` dans theory.js
  3. Produire specs atomiques Flash pour les features P1 (A3, B1, B2) dans ce fichier
- **Livrable** : Sections FLASH-08, FLASH-09, FLASH-10 ajoutées ici avec specs complètes
- **Statut** : `[ ]` TODO

#### MI-A3 — Modes relatifs/parallèles dans DictionaryPanel
- **Qui** : Flash (après spec Pro)
- **Concept** : Pour une gamme sélectionnée, afficher chips cliquables des modes relatifs et la gamme parallèle
- **Données** : `MODES` dans theory.js (existant)
- **Statut** : `[ ]` BLOQUÉ sur PRO-SPEC-01

#### MI-B1 — Degrés romains sur les accords (Studio Mode)
- **Qui** : Flash (après spec Pro)
- **Concept** : Badge I/ii/iii/IV/V/vi/vii° sur chaque accord du StudioPanel
- **Données** : `toRoman()` dans theory.js (existant ?)
- **Statut** : `[ ]` BLOQUÉ sur PRO-SPEC-01

#### MI-B2 — Progressions communes Quick Start (Studio Mode)
- **Qui** : Flash (après spec Pro)
- **Concept** : Chips I-IV-V-I, ii-V-I, I-V-vi-IV, etc. dans StudioPanel
- **Données** : `generateChordsFromNNS()` + format BRICK (existants)
- **Statut** : `[ ]` BLOQUÉ sur PRO-SPEC-01

#### MI-A1 — Notes de tension/résolution sur le manche (P2)
- **Qui** : Flash (après spec Pro + audit avoid notes)
- **Concept** : Colorisation vert/jaune/rouge des notes selon leur rôle sur l'accord
- **Statut** : `[ ]` BLOQUÉ sur PRO-SPEC-01

#### MI-C1 — Camelot Wheel / Roue des Quintes (P2)
- **Qui** : Flash (composant SVG autonome)
- **Concept** : Visualisation circulaire tonalités voisines
- **Statut** : `[ ]` BLOQUÉ sur PRO-SPEC-01

---

## 🐛 BUGS CONNUS (à corriger en priorité si rencontré)

| ID | Composant | Description | Criticité |
|----|-----------|-------------|-----------|
| BUG-01 | Fretboard | Fix safety check for noteInfo | ✅ FIXÉ |
| BUG-02 | Studio | Notes inaudibles/trop aiguës | P0 (Phase14.2) |
| BUG-03 | Header | Reduce button width to 110px | ✅ FIXÉ |
| BUG-04 | Notes Menu | Stacking context Sidebar fixed | ✅ FIXÉ |
| BUG-05 | UI | Animation dictionnaire gamme/accord désync | P2 (Phase12.6) |
| BUG-06 | DictionaryPanel | **CRITIQUE** Aucun accord affiché en mode Dictionnaire. Double bug : (1) collision noms props App.jsx→DictionaryPanel (guitarFingering passé comme α12, non lu) ; (2) mismatch type selectedVoicingIndexGuitar (int 0) vs p.id (probablement string). → FLASH-07 | 🔴 P0 |

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
| 2026-05-10 | BUG-06 — Collision props App.jsx→DictionaryPanel : guitarFingering passé sous nom α12 (inconnu du composant). selectedVoicingIndexGuitar/Bass = undefined dans DictionaryPanel → CustomSelect cassé. Analysé par Claude Sonnet, fix assigné FLASH-07 | Voir FLASH-07 | App.jsx + DictionaryPanel.jsx |

---

*Dernière mise à jour : 2026-05-10T19:44 par Claude Sonnet (Thinking)*
