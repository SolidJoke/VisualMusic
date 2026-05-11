# VisualMusic — Music Intelligence Roadmap
> **Statut** : Ébauche — À compléter par Gemini Pro (specs atomiques pour Flash)
> **Auteur** : Claude Sonnet (Thinking) — 2026-05-10
> **Objectif** : Définir les features d'aide à la composition et à l'improvisation

---

## 🗺️ Ce qui existe DÉJÀ dans le code

Avant d'ajouter quoi que ce soit, Gemini Pro doit auditer ces fichiers :

| Fichier | Contenu musical exploitable |
|---------|----------------------------|
| `src/core/theory.js` | NOTES, SCALES, CHORDS, MODES, getRecommendedScalesForChord, getScaleNotes, resolveChordSemitones, generateChordsFromNNS, getClosestInversion, toRoman |
| `src/core/harmonyEngine.js` | getInversionType, getChordIntervalLabel, analyzeVoicing |
| `src/core/extendedTheoryData.json` | Données harmoniques étendues — **contenu exact à auditer par Pro** |
| `src/core/expert_theory_data.json` | Données expertes — **contenu exact à auditer par Pro** |
| `src/core/voicingEngine.js` | Moteur de voicings — **API à auditer** |
| `src/core/acousticEngine.js` | Psychoacoustique — **API à auditer** |
| `src/core/bassEngine.js` | Intelligence basse — **API à auditer** |

> ⚠️ **INSTRUCTION POUR GEMINI PRO** : Lire ces 7 fichiers AVANT de finaliser les specs ci-dessous.
> Beaucoup de logique est peut-être déjà là, non exposée à l'UI.

---

## 🎯 Streams de Features Identifiés

### STREAM-A : Aide à l'Improvisation (Dictionary Mode)

**Concept** : Quand l'utilisateur sélectionne une gamme ou un accord en mode Dictionnaire, l'app suggère des outils pour improviser dessus.

#### A1 — "Notes de tension et résolution"
**Idée** : Pour un accord donné (ex: G7), indiquer visuellement sur le manche/clavier :
- 🟢 Notes stables (1, 3, 5)
- 🟡 Notes de tension (b7, 9, 11, 13)
- 🔴 Notes à éviter (avoid notes — ex: la 4 sur un accord majeur)

**Data existante** : `getChordIntervalLabel` dans harmonyEngine retourne déjà les intervalles. `expert_theory_data.json` contient probablement les avoid notes.
**UI** : Légende colorée sous le manche. Classe CSS sur les notes actives.
**Complexité Flash** : Basse si la data existe déjà — ajouter un `colorMode="tension"` dans Fretboard.

#### A2 — "Gammes compatibles étendues"
**Idée** : Au lieu d'une seule liste de gammes recommandées (déjà dans DictionaryPanel via `getRecommendedScalesForChord`), montrer une hiérarchie :
- ✅ Parfaites (toutes les notes de l'accord dans la gamme)
- ⚡ Avec couleur (une note de tension intéressante)  
- ⚠️ Avec évitement (avoid note présente)

**Data existante** : `getRecommendedScalesForChord` retourne déjà une liste — **Pro doit auditer son contenu**.
**UI** : Remplacer les tags plats par des tags avec icône/couleur de catégorie.
**Complexité Flash** : Moyenne — dépend de si la catégorisation existe déjà dans la data.

#### A3 — "Modes relatifs et parallèles"
**Idée** : Pour une gamme sélectionnée (ex: Do Majeur), afficher :
- Les 7 modes relatifs (Do Ionien, Ré Dorien, Mi Phrygien...)
- La gamme parallèle mineure (Do mineur)

**Data existante** : `MODES` dans theory.js. Les modes sont déjà calculables.
**UI** : Section dépliable dans DictionaryPanel, chips cliquables qui changent `dictType`.
**Complexité Flash** : Basse — calcul pur, UI additive.

---

### STREAM-B : Aide à la Composition (Studio Mode)

**Concept** : Guider l'utilisateur pour construire des progressions musicalement cohérentes.

#### B1 — "Degré des accords" (Roman Numeral Display)
**Idée** : Dans Studio Mode, afficher le degré romain (I, ii, iii, IV, V, vi, vii°) de chaque accord de la progression par rapport à la tonalité du Brick.

**Data existante** : `toRoman` existe dans theory.js. `generateChordsFromNNS` génère les accords depuis le NNS.
**UI** : Badge romain sur chaque accord dans StudioPanel.
**Complexité Flash** : Basse — `toRoman` existe peut-être déjà, juste l'afficher.

#### B2 — "Progressions communes" (Quick Start)
**Idée** : Boutons de progressions prédéfinies dans Studio Mode :
- I-IV-V-I (Blues/Rock)
- I-V-vi-IV (Pop)
- ii-V-I (Jazz)
- I-vi-IV-V (50s)
- i-VII-VI-VII (Andalou)

**Data existante** : `generateChordsFromNNS` + `BRICKS` structure déjà présente.
**UI** : Section "Quick Progressions" dans StudioPanel avec chips cliquables.
**Complexité Flash** : Basse — hardcoder les progressions NNS + appeler les setters existants.
**⚠️ Pro doit valider** : Comment modifier un brick existant vs en créer un nouveau.

#### B3 — "Substitutions harmoniques"
**Idée** : Pour un accord cliqué dans la progression, suggérer des substitutions :
- Substitution tritonique (V7 → bII7)
- Accord relatif (I → vi, IV → ii)
- Accord de passage chromatique

**Data existante** : `expert_theory_data.json` contient probablement ces règles.
**Complexité** : Moyenne-haute — **réserver à Sonnet, pas Flash**.

---

### STREAM-C : Navigation harmonique (Circle of 5ths HUD)

**C1 — Camelot Wheel / Roue des Quintes**
> Déjà dans FUTURE-04 du MASTER_TASK_TRACKER.

**Idée** : Un composant visuel circulaire montrant :
- La tonalité actuelle mise en surbrillance
- Les tonalités voisines (dominante, sous-dominante, relative)
- La distance harmonique entre deux tonalités (pour modulation)

**Complexité** : Moyenne — composant SVG/Canvas autonome, pas de logique musicale complexe.
**Atomique Flash** : OUI si limité à affichage statique + highlight de la tonalité courante.

**C2 — Guide de Modulation**
**Idée** : "Pivot chord finder" — étant donné deux tonalités A et B, lister les accords communs aux deux pour faciliter la modulation.

**Complexité** : Haute — **Sonnet uniquement**.

---

### STREAM-D : Psychoacoustique & Ressenti

> Basé sur les documents de théorie musicale fournis précédemment.

#### D1 — "Mood Indicator" amélioré
**Ce qui existe** : `emotion` et `description` sur chaque accord/gamme dans SCALES/CHORDS (déjà affiché dans DictionaryPanel via emotion card).

**Idée** : Étendre avec :
- Intensité (0-10) de la tension harmonique
- Contextes musicaux (Jazz, Classique, Rock, World...)
- Tempo suggéré (lent/rapide)

**Data existante** : `extendedTheoryData.json` — **Pro doit auditer**.
**Complexité Flash** : Basse si la data existe, Haute si elle est à créer.

#### D2 — "Série harmonique naturelle"
> Déjà dans DictionaryPanel via le bouton "Harmonic Mode" (`harmonicMode`).
> **État actuel** : Le toggle existe mais **que fait-il exactement ?** Pro doit auditer `useMusicEngine` et `DictionaryPanel` pour voir si c'est implémenté ou juste un placeholder.

---

## 📋 Priorisation proposée (ordre d'implémentation)

| Priorité | ID | Feature | Complexité Flash | Pré-requis Pro |
|----------|----|---------|-----------------|----------------|
| 🟢 P1 | A3 | Modes relatifs/parallèles | Basse | Auditer MODES dans theory.js |
| 🟢 P1 | B1 | Degrés romains en Studio | Basse | Valider `toRoman` + UI StudioPanel |
| 🟢 P1 | B2 | Progressions communes | Basse | Valider contrat BRICK + NNS |
| 🟡 P2 | A1 | Notes tension/résolution | Moyenne | Auditer expert_theory_data.json + avoid notes |
| 🟡 P2 | A2 | Gammes compatibles étendues | Moyenne | Auditer getRecommendedScalesForChord retour |
| 🟡 P2 | C1 | Camelot Wheel (affichage seul) | Moyenne | Design SVG à valider |
| 🔴 P3 | D1 | Mood Indicator étendu | Haute | Créer/étendre data JSON |
| 🔴 P3 | B3 | Substitutions harmoniques | Haute | Réserver à Sonnet |
| 🔴 P3 | C2 | Guide de modulation | Haute | Réserver à Sonnet |
| 🔴 P3 | D2 | Harmonic Mode réel | Haute | Auditer + implémenter |

---

## 📝 Instructions pour Gemini Pro

**Avant de finaliser les specs :**

1. **Auditer** `extendedTheoryData.json` et `expert_theory_data.json` — lister exactement ce qui est disponible (avoid notes ? tensions ? substitutions ?)
2. **Auditer** `voicingEngine.js`, `acousticEngine.js`, `bassEngine.js` — signatures + summaires
3. **Vérifier** `toRoman` dans theory.js — est-ce qu'elle prend un degré et retourne "I", "ii", etc. ?
4. **Vérifier** `harmonicMode` dans useMusicEngine + DictionaryPanel — placeholder ou implémenté ?
5. **Pour chaque feature P1** : produire une spec atomique Flash au format FLASH-07 (étapes numérotées, code avant/après, critères d'acceptation, fichiers précis)

**Format de spec attendu pour Flash :**
```
#### FLASH-XX — [Nom feature]
- Fichiers : [liste exacte]
- Branche : feat/[slug]
- Étape 1 : [action précise avec code]
- Étape 2 : ...
- Critères d'acceptation : [testables manuellement + npm test 559/559]
- NE PAS toucher : [liste explicite]
```

---

## 🔑 Contraintes architecturales à respecter

1. Toute nouvelle donnée musicale → dans les fichiers `core/` existants ou `extendedTheoryData.json`
2. Toute nouvelle UI → composant autonome dans `components/Intelligence/` ou `components/Common/`
3. Aucune logique musicale dans les composants React (tout dans `core/` ou hooks)
4. Chaque feature doit avoir un test unitaire associé avant merge
5. Pas de dépendances npm nouvelles sans décision Sonnet/Pro

---

*Document créé : 2026-05-10T19:55 par Claude Sonnet (Thinking)*
*À compléter par : Gemini Pro*
*À implémenter par : Gemini Flash (tâches atomiques P1)*
