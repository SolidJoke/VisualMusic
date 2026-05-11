# VisualMusic — Backlog Technique Détaillé
> **Auteur** : Claude Sonnet (Thinking) — 2026-05-10
> **Usage** : Référence d'implémentation pour Gemini Flash et Gemini Pro
> **Prérequis lecture** : `KNOWLEDGE_INDEX.md` puis ce fichier

---

## 🟢 FLASH-07 — BUG-06 : Accords invisibles en mode Dictionnaire [RESOLVED]

**Statut** : Résolu (Gemini Pro). 
- Correction de la transmission des props `guitarFingering`/`bassFingering` dans `App.jsx`.
- Ajout de la couleur manquante pour la classe `.role-extension` dans `PianoKeyboard.css` et `Fretboard.css` (correction de l'animation sans couleur).
- Correction du bug de surbrillance de tous les octaves sur le manche pour les notes uniques, en forçant une comparaison stricte de l'octave dans `fretboardUtils.js`.

---

## 🔴 FLASH-08 — BUG-07 : Notation EU/US non respectée

**Contexte** : Le CTA du spectre harmonique et le sélecteur de position dans les manches affichent toujours des notations US (C, D, E...) même quand la notation européenne (Do, Ré, Mi...) est sélectionnée.
**Objectif pour Flash** : 
1. Trouver où le sélecteur de position est généré (probablement dans `DictionaryPanel.jsx` ou un sous-composant comme `PositionSelector`).
2. Vérifier que la valeur affichée passe par la fonction/dictionnaire de conversion `notation === 'eu' ? NOTES[...].eu : NOTES[...].us`.
3. Corriger l'affichage pour qu'il respecte le paramètre `notation` de l'AppContext.

---

## 🔴 FLASH-09 — BUG-08 : Affichage des gammes masqué avant lecture

**Contexte** : En mode gamme, il faut actuellement cliquer sur "Écouter" pour voir l'animation et voir les notes de la gamme s'afficher sur le clavier/manche.
**Comportement attendu** : Les notes de la gamme doivent s'afficher immédiatement à la sélection de la gamme, SANS avoir à lancer la lecture (la lecture ne fait qu'ajouter l'animation `is-playing`).
**Objectif pour Flash** :
1. Analyser `useDictionaryMode.js` pour voir comment `activeNotes` est peuplé lors de la sélection d'une gamme.
2. Vérifier pourquoi les composants `PianoKeyboard` et `Fretboard` ne rendent pas les `activeNotes` de la gamme sans `isPlaying === true`. (Peut-être un problème d'opacité ou de classe manquante `role-scale` ?).

---

## 🔴 FLASH-10 — TWEAK-01 : Uniformiser les boutons Play/Écouter

**Contexte** : Les boutons "Écouter" et "Play" ont la même fonctionnalité mais des designs différents.
**Objectif pour Flash** :
1. Repérer le bouton "Écouter" dans `DictionaryPanel.jsx` et le bouton "Play" dans `StudioPanel.jsx` ou le `Header`.
2. Leur appliquer la même classe CSS (ex: `btn-premium active` ou autre standard) pour avoir un design identique.

---

## 🔴 FLASH-11 — FEATURE-01 : Sélecteur d'Octave & Variantes (Mode Note Unique)

**Contexte** : En mode "note unique", sélectionner une note devrait afficher cette note exacte sur le manche. Il faut pouvoir choisir l'octave (ex: La 440Hz vs La 220Hz), et pour une même octave, voir ses différentes variantes (différentes cordes/cases).
**Objectif pour Flash** :
1. Créer un sélecteur d'octave (ex: de 1 à 6) dans `DictionaryPanel.jsx` lorsque `dictType === 'single_note'`.
2. Mettre à jour `useDictionaryMode.js` pour que `activeNotes` reflète exactement l'octave choisie (valeur absolue).
3. Utiliser un sélecteur de variantes (comme pour les accords) pour permettre de filtrer quelle instance exacte sur le manche est montrée, via le moteur de doigté (`getAvailableSingleNoteFingerings`).

---

## 🔴 FLASH-12 — QA-01 : Vérification Exhaustive des Accords

**Contexte** : Le système d'accords nécessite une validation manuelle/QA contre une source de vérité visuelle.
**Consigne pour le QA** : Pour chaque note et chaque accord, vérifier la position affichée sur le manche (Guitare et Basse) par rapport à la source de vérité.
**Objectif** : Noter TOUTE anomalie dans le backlog sans faire les correctifs immédiatement. C'est une tâche de validation pure.

---

### Diagnostic complet (basé sur analyse du code source)

#### Root Cause 1 — Type mismatch dans `useMusicEngine.js`

**Localisation** : `useMusicEngine.js` lignes 184-187 et 232-235

Le §MAP confirme : `α2=selectedVoicingIndexGuitar`, `α5=selectedVoicingIndexBass`.
Ces variables sont initialisées à `null` par `useDictionaryMode`, pas à `0`.

```js
// Ligne 184-187 — PROBLÈME
if (appMode === "dictionary" && α2 !== null) {
  const avail = α8(rootVal, α1, α7);          // α8 = getAvailableGuitarFingerings
  const found = avail.find(p => p.id === α2); // α2 est null → find retourne undefined
  if (found) return toV2(found.α9, 'guitar'); // jamais atteint
}
```

**Constat** : La garde `α2 !== null` protège correctement. Le vrai problème est en amont : `α2` (selectedVoicingIndexGuitar) est passé depuis App.jsx avec le mauvais alias alpha. **Voir Root Cause 2.**

Le fallback ligne 191 appelle `getGuitarFingering(rootVal, α1, selectedRootStringGuitar, offset)` directement — **ce fallback devrait fonctionner** si les props sont correctement passées.

#### Root Cause 2 — Collision de props dans App.jsx (CAUSE PRINCIPALE)

Le §MAP de `useMusicEngine.js` montre que le hook retourne `α11=guitarFingering` et `bassFingering`.
App.jsx doit passer ces valeurs à `DictionaryPanel` sous les noms **exacts** attendus par sa signature :

```jsx
// DictionaryPanel attend (ligne 387 de DictionaryPanel.jsx) :
export function DictionaryPanel({
  guitarFingering,   // ← nom EXACT attendu
  bassFingering,     // ← nom EXACT attendu
  selectedVoicingIndexGuitar,
  setSelectedVoicingIndexGuitar,
  selectedVoicingIndexBass,
  setSelectedVoicingIndexBass,
  ...
})
```

**Si App.jsx passe ces props sous des noms alpha différents, elles arrivent `undefined`.**

#### Étape 0 — Vérification obligatoire avant tout fix

Dans App.jsx, chercher le bloc `<DictionaryPanel` et comparer chaque prop passée avec la signature de `DictionaryPanel.jsx`. Toute prop passée sous un alias alpha (`α12=`, `α14=`) au lieu du nom littéral (`guitarFingering=`) est cassée.

#### Fix App.jsx (Étape 1)

```jsx
// REMPLACER le bloc <DictionaryPanel .../> par :
{appMode === "dictionary" && (
  <DictionaryPanel
    dictRoot={dictRoot}
    setDictRoot={setDictRoot}
    dictType={dictType}
    setDictType={setDictType}
    playDictionaryAudio={playDictionaryAudio}
    guitarFingering={guitarFingering}       // ← depuis useMusicEngine (retourné comme α11)
    bassFingering={bassFingering}            // ← depuis useMusicEngine
    uiTheme={uiTheme}
    harmonicMode={harmonicMode}
    setHarmonicMode={setHarmonicMode}
    dictOctave={dictOctave}
    setDictOctave={setDictOctave}
    selectedVoicingIndexGuitar={selectedVoicingIndexGuitar}
    setSelectedVoicingIndexGuitar={setSelectedVoicingIndexGuitar}
    selectedVoicingIndexBass={selectedVoicingIndexBass}
    setSelectedVoicingIndexBass={setSelectedVoicingIndexBass}
  />
)}
```

**Note** : `guitarFingering` dans App.jsx est le résultat destructuré de `useMusicEngine()`. Le hook retourne `α11` sous le nom `guitarFingering` (vérifier la ligne de destructuration dans App.jsx — elle doit lire `const { guitarFingering, bassFingering, ... } = useMusicEngine(...)` ou `const { α11: guitarFingering }`).

#### Fix DictionaryPanel.jsx (Étape 2)

Vérifier si le composant utilise des variables `α1`/`α2` locales qui entrent en collision avec les props `guitarFingering`/`bassFingering`. Si oui, renommer les variables internes uniquement.

Le §MAP local de DictionaryPanel doit être mis à jour après tout renommage.

#### Validation

```bash
npm test  # 559/559 ✅
# Puis manuellement : mode Dictionnaire → C → Accord → Majeur → accord visible sur manche
```

---

## 🟡 QW-01 — Supprimer le double import `useAppContext` dans DictionaryPanel

**Fichier** : `src/components/Panels/DictionaryPanel.jsx`
**Risque** : Nul — suppression pure
**Test** : `npm test` suffit, plus vérifier que `npm run dev` ne lève pas d'avertissement

```js
// Trouver et supprimer la ligne dupliquée (probablement autour de la ligne 77)
import { useAppContext } from '../../context/AppContext'; // ← garder celle-ci (ligne ~8)
// ...
import { useAppContext } from '../../context/AppContext'; // ← SUPPRIMER (doublon)
```

---

## 🟡 QW-03 — Audit i18n `PositionSelector.jsx`

**Fichier** : `src/i18n/translations.js` (738L — très grand)

`PositionSelector.jsx` utilise `useAppContext()` pour accéder aux traductions via `txt`. Vérifier que ces clés existent :

```
txt.rootStringLabel   txt.fretOpen       txt.fretPrefix
txt.voicingSelector   txt.resetFocus     txt.resetVoicing
txt.voicingAllNotes   txt.rootOnString   txt.guitarLabel
txt.bassLabel
```

**Méthode** :
1. Chercher chaque clé dans `translations.js` avec grep
2. Pour chaque clé manquante, ajouter dans les deux langues avec une valeur de fallback sensée
3. **Ne pas modifier** les clés existantes — seulement ajouter

**Pattern à respecter** dans translations.js :
```js
// Format existant (à respecter) :
{ key: "voicingSelector", fr: "Sélecteur de position", en: "Voicing Selector" }
```

---

## 🟡 A.1.2 — Suppression imports inutilisés

**Source** : `docs/management/dead_code_report.md` (généré par FLASH-01)
**Méthode** : Lire le rapport, identifier les imports avec `0 référence`, les supprimer un par un
**Règle** : Ne supprimer que les `import` — ne jamais supprimer du code logique sans spec explicite
**Test** : `npm test` après chaque fichier modifié

---

## 🟡 F.2.2 — Extraire MixerPanel de App.jsx

**Contexte** : App.jsx est un monolithe (502L). MixerPanel est un bloc de JSX avec ses handlers locaux.

**Méthode** :
1. Identifier le bloc JSX `MixerPanel` dans App.jsx (chercher `MixerPanel` ou le composant de mixage)
2. Créer `src/components/Panels/MixerPanel.jsx`
3. Les props nécessaires viennent de `useAppContext()` — **ne pas passer plus de 5 props individuelles**
4. Remplacer le bloc inline dans App.jsx par `<MixerPanel />`
5. **Garde-fou** : Ne pas extraire de logique audio ou de handlers complexes — seulement le JSX + state UI

---

## 🟡 F.2.3 — React.memo sur Fretboard et PianoKeyboard

**Contexte** : Ces composants re-rendent à chaque changement d'état global, même si leurs props n'ont pas changé.

**Risque** : Faible si fait correctement. **Ne jamais utiliser avec des fonctions callback non-mémoïsées** (sinon React.memo est inutile).

**Méthode** :
```js
// AVANT (dans Fretboard.jsx) :
export default function Fretboard({ ... }) { ... }

// APRÈS :
import { memo } from 'react';
function Fretboard({ ... }) { ... }
export default memo(Fretboard);
```

**Pré-requis** : Dans App.jsx, vérifier que les callbacks passés à Fretboard sont wrappés dans `useCallback`. Si non, `React.memo` ne servira à rien (nouvelle référence de fonction à chaque render).

---

## 🟡 D.1.1 — Frettage Logarithmique

**Fichier** : `src/core/fretboardLogic.js` (118L)
**Contexte** : Actuellement les frettes sont affichées avec un espacement linéaire. Le vrai espacement est logarithmique (chaque frette = fondamentale / 17.817).

**Formule** :
```js
// Position de la frette n (en % de la longueur de la corde) :
const fretPosition = (n) => 1 - (1 / Math.pow(2, n / 12));
// Largeur de la case n :
const fretWidth = (n) => fretPosition(n + 1) - fretPosition(n);
```

**Risque** : **MOYEN** — Touche au rendu visuel du Fretboard. Faire une branche dédiée.
**Ne pas toucher** : La logique de calcul des notes (indépendante du visuel).

---

## 🟡 D.1.2 — `numFrets` Variable

**Fichier** : `src/core/fretboardLogic.js` + `src/components/Instruments/Fretboard.jsx`
**Actuellement** : 22 frettes hardcodées
**Cible** : Paramètre `numFrets` (22 pour guitare standard, 24 pour guitare électrique, 20 pour basse)

**Données disponibles** dans `expert_theory_data.json` :
```json
"instrumentRanges": {
  "guitar_standard": { "lowestNote": "E2", "highestNote": "E6" },
  "bass_standard":   { "lowestNote": "E1", "highestNote": "G3" }
}
```

---

## 🔵 Stream G — Music Intelligence : Analyse du Code Existant

### G.2.2 — Progressions communes Quick Start

**BONNE NOUVELLE** : Les données sont DÉJÀ dans `extendedTheoryData.json` !

```json
"progressions": [
  { "id": "jazz_251_maj", "name": "Majeur II-V-I", "degrees": ["ii7","V7","IMaj7"], "rootIntervals": [2,7,0] },
  { "id": "jazz_251_min", "name": "Mineur ii-V-i", "degrees": ["iim7b5","V7alt","im7"], "rootIntervals": [2,7,0] },
  { "id": "pop_1564", "name": "Pop Standard I-V-vi-IV", "degrees": ["I","V","vi","IV"], "rootIntervals": [0,7,9,5] },
  { "id": "jazz_turnaround", "name": "Turnaround Jazz I-vi-ii-V", "degrees": ["IMaj7","vi7","ii7","V7"], "rootIntervals": [0,9,2,7] },
  { "id": "rnb_436", "name": "R&B / Neo-Soul IV-iii-vi", "degrees": ["IVMaj7","iiim7","vim7"], "rootIntervals": [5,4,9] }
]
```

**Implémentation Flash** :
1. Lire `extendedTheoryData.json` dans `StudioPanel.jsx`
2. Afficher les chips de progressions
3. Au clic : calculer les accords avec `generateChordsFromNNS(activeBrick.rootValue, activeBrick.modeName, progression.degrees)`
4. Appeler le setter existant pour mettre à jour les accords du brick

**Risque** : Faible — additif pur.

### G.2.3 — Substitutions harmoniques

**BONNE NOUVELLE** : Les données sont dans `expert_theory_data.json` !

```json
"harmonicSubstitutions": {
  "tritone":  { "C7": "Gb7", "G7": "Db7", ... },      // table de substitution triton
  "relativeMinor": { "C": "Am", "G": "Em", ... },      // relatifs mineurs
  "secondaryDominants": { "ii": "VI7", "V": "II7", ... } // dominantes secondaires
}
```

**Implémentation** : Pour un accord sélectionné dans Studio, afficher un tooltip/menu avec les substitutions disponibles. **Réserver à Sonnet** : la logique de remplacement dans la progression demande une réflexion UX.

### G.1.2 — Notes de tension/résolution

**Données manquantes** : `expert_theory_data.json` et `extendedTheoryData.json` **ne contiennent pas** les avoid notes par type d'accord. C'est un gap réel.

**Ce qui est disponible** :
- `getChordIntervalLabel(index, semitone)` dans `harmonyEngine.js` retourne le label de chaque intervalle
- `getDissonanceScore(intervalVector)` calcule un score de dissonance
- `getIntervalVector(pitchClasses)` retourne le vecteur d'intervalles (Set Theory)

**Implémentation possible sans données supplémentaires** :
```js
// Classifier les notes par rôle harmonique basé sur leur intervalle :
const getTensionRole = (semitone) => {
  if ([0, 4, 7].includes(semitone % 12)) return 'stable';    // 1, 3, 5
  if ([10, 11, 14].includes(semitone % 12)) return 'tension'; // b7, 7, 9
  if ([1, 6].includes(semitone % 12)) return 'avoid';         // b2, tritone
  return 'color'; // tout le reste
};
```

**→ Pro doit valider cette approche et ajouter les avoid notes spécifiques par type d'accord.**

### G.3.1 — Camelot Wheel

**Données disponibles** dans `docs/intelligence/harmonic_mixing.md` :
```
C = 8d/5m, G = 9d/6m, D = 10d/7m, A = 11d/8m, E = 12d/9m, B = 1d/10m,
F# = 2d/11m, Db = 3d/12m, Ab = 4d/1m, Eb = 5d/2m, Bb = 6d/3m, F = 7d/4m
```

**Règles de compatibilité** : ±1 sur même anneau, relatif (changement d'anneau même chiffre), +2 pour énergie.

**Implémentation Flash** : Composant SVG statique autonome dans `components/Intelligence/CamelotWheel.jsx`.
- Input : `currentKey` (note + majeur/mineur)
- Output : Roue SVG avec highlight de la tonalité courante et glow des voisins compatibles
- **Aucune logique musicale dans le composant** — seulement du rendu

---

## 🔵 Stream H — Psychoacoustique : Analyse du Code Existant

### H.2.1 — Mode Harmoniques

**BONNE NOUVELLE** : `acousticEngine.js` contient DÉJÀ `getHarmonicSeries(baseFreq, maxHarmonics)` !

```js
// acousticEngine.js — API complète et fonctionnelle :
getHarmonicSeries(440, 16) // Retourne 16 harmoniques avec freq, noteName, centsOffset
// Exemple retour : [{ order: 1, frequency: 440, noteName: "A4", centsOffset: 0 },
//                   { order: 2, frequency: 880, noteName: "A5", centsOffset: 0 },
//                   { order: 5, frequency: 2200, noteName: "C#7", centsOffset: -14 }, ...]
```

**Ce qui manque** : L'UI pour afficher ça dans DictionaryPanel.
**`harmonicMode` est un toggle qui existe mais n'affiche rien** — c'est confirmé comme placeholder.

**Implémentation** :
1. Dans `DictionaryPanel.jsx`, quand `harmonicMode === true`
2. Appeler `getHarmonicSeries(baseFreq, 8)` avec la fréquence de la note sélectionnée
3. Afficher les 8 premiers partiels sous forme de liste/grille
4. Coloriser les notes dont `centsOffset !== 0` (écart avec le tempérament égal)

**Pré-requis** : Avoir la fréquence de `dictRoot`. Formule : `freq = 440 * Math.pow(2, (midiNote - 69) / 12)`

### H.3.1/H.3.2 — Modes de jeu / Strumming

**`bassEngine.js` contient déjà les templates** :
```js
BASS_TEMPLATES = {
  standard, rock, jazz, pop, electronic, funk, reggae
}
// suggestBassPattern(genre, chords) → { name, activeSteps, pitchSteps }
```

**Mais** : Ce moteur génère des patterns de basse, pas du strumming guitare.
Les presets de strumming (Island, Reggae, Rock) sont dans `docs/intelligence/PERFORMANCE_DYNAMICS.md` — **non encore codés**.

**Priorité** : Faible pour Flash — réserver à Pro.

---

## 🔵 Stream I — Genres : Analyse du Code Existant

**`bassEngine.js`** supporte déjà : Jazz, Rock, Pop, Funk, Electronic, Reggae + Standard.
**`getTemplateKey(genre)`** fait le mapping genre → template.

**Gap** : `suggestBassPattern` est appelé par `StudioPanel.jsx` via `handleSuggestBass()`, mais le résultat n'est pas connecté à un sélecteur de genre UI. Il utilise `currentTheme` (le thème visuel) comme proxy du genre — ce qui est incorrect.

**À faire** : Ajouter un sélecteur de genre musical (Jazz/Rock/Pop/Funk/Reggae) séparé du thème visuel.

---

## 📋 Risques et Bonnes Pratiques pour Flash

### ⚠️ Pièges spécifiques à ce codebase

| Situation | Risque | Protection |
|-----------|--------|-----------|
| Modifier `fingeringLogic.js` | Casse tous les doigtés | Ne jamais toucher |
| Renommer variable `α` dans useMusicEngine | Casse App.jsx | Lire §MAP en bas du fichier |
| Passer des props non-mémoïsées à React.memo | React.memo inutile | Vérifier useCallback dans App.jsx |
| Importer depuis `α9Logic.js` directement dans un composant | Couplage fort interdit | Passer par useMusicEngine ou un hook |
| Modifier `getAvailableGuitarFingerings` | Casse FLASH-07 | Ne pas toucher pendant la correction du bug |
| Supprimer un export de `theory.js` | Casse potentiellement 10+ fichiers | Vérifier `dead_code_report.md` |

### ✅ Patterns à suivre

```js
// BON : Props explicites avec noms lisibles
<DictionaryPanel guitarFingering={guitarFingering} bassFingering={bassFingering} />

// MAUVAIS : Props alpha opaques (cause de BUG-06)
<DictionaryPanel α12={guitarFingering} α14={bassFingering} />

// BON : Nouvelle logique musicale dans core/
// src/core/camelotWheel.js — pure JS, pas de React
export function getCompatibleKeys(noteValue, isMajor) { ... }

// MAUVAIS : Logique musicale dans un composant
function CamelotWheel({ noteValue }) {
  const compatible = [noteValue - 1, noteValue + 1]; // ← hors du core
}

// BON : Données dans JSON existant
import extendedData from '../core/extendedTheoryData.json';
const progressions = extendedData.axiomRules.progressions;

// MAUVAIS : Hardcoder des données musicales dans un composant
const PROGRESSIONS = [{ name: 'II-V-I', degrees: ['ii','V','I'] }]; // ← dupliquer la data
```

### 🔴 Règle d'or pour Flash

**Avant de toucher un fichier > 150L** :
1. Lire son §MAP (en bas du fichier)
2. Lancer `npm test` et noter le nombre de tests
3. Faire le changement minimal
4. Relancer `npm test` — doit être identique

---

## 🗂️ Index des Connaissances pour le Refinement Futur

### Données disponibles pour chaque feature

| Feature | Données existantes | Fichier source | Gap |
|---------|-------------------|----------------|-----|
| G.2.2 Progressions | `axiomRules.progressions` (5 progressions) | `extendedTheoryData.json` | Manque I-IV-V-I, Andalou |
| G.2.3 Substitutions | `harmonicSubstitutions` (Triton, Relatif, Dom. sec.) | `expert_theory_data.json` | Aucun — données complètes |
| G.1.2 Tension/Résolution | `getDissonanceScore`, `getIntervalVector` | `harmonyEngine.js` | Avoid notes par type d'accord |
| G.3.1 Camelot Wheel | Table complète 12 tonalités | `harmonic_mixing.md` | À coder en JSON/JS |
| H.2.1 Harmoniques | `getHarmonicSeries()` complète | `acousticEngine.js` | UI seulement |
| H.3.1 Strumming | Templates text | `PERFORMANCE_DYNAMICS.md` | Pas encore codé |
| I.1.1 Genre | 7 templates basse | `bassEngine.js` | Sélecteur UI genre manquant |
| G.4.3 Score jouabilité | `analyzeVoicingRules()` complet | `voicingEngine.js` | Intégration UI |
| MI-B1 Degrés romains | `toRoman()` | `theory.js` | UI seulement |

### Fonctions à connecter à l'UI (déjà codées, non utilisées)

| Fonction | Fichier | Usage prévu |
|----------|---------|-------------|
| `getHarmonicSeries(baseFreq)` | `acousticEngine.js` | Mode Harmoniques DictionaryPanel |
| `suggestBassPattern(genre, chords)` | `bassEngine.js` | Sélecteur genre StudioPanel |
| `suggestReVoicing(root, intervals, instr)` | `voicingEngine.js` | Alert VoicingAlert avec suggestion |
| `getIntervalVector(pitchClasses)` | `harmonyEngine.js` | Set Theory sous-marine EPIC-07 |
| `getDissonanceScore(intervalVector)` | `harmonyEngine.js` | Score tension accord |
| `toRoman(nnsStr)` | `theory.js` | Degrés romains StudioPanel |
| `getLeadingTone(nextChordRootValue)` | `theory.js` | Voice Leading |
| `getClosestInversion(prevNotes, ...)` | `theory.js` | Voice Leading automatique |

---

*Document créé : 2026-05-10T20:25 par Claude Sonnet (Thinking)*
*Basé sur lecture directe de : voicingEngine.js, acousticEngine.js, bassEngine.js,*
*useMusicEngine.js, theory.js, harmonyEngine.js, extendedTheoryData.json,*
*expert_theory_data.json, DictionaryPanel.jsx, StudioPanel.jsx, PositionSelector.jsx*
