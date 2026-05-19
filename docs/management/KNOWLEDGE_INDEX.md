# VisualMusic — Knowledge Master Index
> **Rôle** : Source de vérité pour tout LLM prenant le relais sur VisualMusic.
> **Auteur** : Claude Sonnet (Thinking) — 2026-05-10
> **Instruction** : **LIRE CE FICHIER EN PREMIER** avant toute action.

---

## 🗂️ 1. Architecture des Documents

### Gestion de Projet (lecture obligatoire dans cet ordre)
| Priorité | Fichier | Contenu |
|----------|---------|---------|
| 1 | `docs/management/LAST_HANDOVER.md` | État actuel + tâches Flash immédiates |
| 2 | `docs/management/MASTER_TASK_TRACKER.md` | Backlog complet + statuts |
| 3 | `BACKLOG.md` | Vision P0→P3, streams A-F, risques techniques |
| 4 | `docs/management/MUSIC_INTELLIGENCE_ROADMAP.md` | Roadmap features composition/improvisation |
| 5 | `ARCHITECTURE.md` | Architecture générale du projet |
| 6 | `DESIGN_BRIEF.md` | Charte graphique "Liquid Glass" |

### Connaissance Musicale (lire avant toute feature musicale)
| Fichier | Contenu clé |
|---------|-------------|
| `music_theory_notes.md` | **Bible théorique** — 13 sujets complets (dodécaphonie, tension/résolution, modes, psychoacoustique, polyrythmie, micro-tonalité...) + 8 EPICs de features |
| `docs/intelligence/core_theory.md` | Modes diatoniques, Set Theory, Voice Leading, rythmes euclidiens |
| `docs/intelligence/HARMONIC_SYSTEM.md` | Formules d'accords (semitones), CAGED guitare, NNS cycles de tension |
| `docs/intelligence/axiom_rules.md` | Dictionnaire accords/gammes complet, 3 règles de substitution, 4 progressions standards |
| `docs/intelligence/psychoacoustics.md` | Missing Fundamental, Shepard Tones, Série harmonique naturelle (déviations en cents) |
| `docs/intelligence/harmonic_mixing.md` | Système Open Key / Camelot Wheel complet avec règles de compatibilité |
| `docs/intelligence/GENRE_ONTOLOGY.md` | 5 genres (Jazz, Rock, Reggae, Pop, Urban) — paramètres techniques |
| `docs/intelligence/genre_ontologies.md` | **Version détaillée** — 6 genres avec profils JSON (rythme, basse, BPM, théorie) |
| `docs/intelligence/PERFORMANCE_DYNAMICS.md` | Modes d'exécution (Block/Strum/Arpeggio), bibliothèque de strumming, humanisation |

### Analyse et Décisions Techniques
| Fichier | Contenu clé |
|---------|-------------|
| `docs/management/THEORY_KNOWLEDGE_GAP_ANALYSIS.md` | Gaps identifiés : Voice Leading algorithmique, résolution tensions, anatomie avancée |
| `docs/management/STRATEGIC_CHALLENGE.md` | Critique interne + garde-fous anti-régression |
| `docs/management/MASTER_ORCHESTRATION_REF.md` | Comparaison modèles IA, workflow hybride, Caveman compression |
| `docs/management/BACKLOG_ANALYSIS_REPORT.md` | Rapport d'analyse backlog (à lire pour historique) |
| `docs/management/LLM_STARTER_PROMPTS.md` | Prompts starter pour chaque type de modèle |
| `docs/management/EXTERNAL_EXPERT_PROMPTS.md` | Questions à poser à des experts externes |
| `docs/management/dead_code_report.md` | Rapport code mort (FLASH-01) — 89 fonctions candidates |
| `docs/management/css_color_audit.md` | Inventaire couleurs brutes → base pour tokens CSS |

### Matrices de Décision (Stream F)
| Fichier | Contenu |
|---------|---------|
| `docs/management/REF_DECISION_MATRIX_F1.md` | Navigation octaves & variantes |
| `docs/management/REF_DECISION_MATRIX_F2.md` | Architecture de sélection |
| `docs/management/REF_DECISION_MATRIX_F3.md` | Observabilité agentique |
| `docs/management/REF_DECISION_MATRIX_F4.md` | Protocole passation de modèle |
| `docs/management/REF_DECISION_MATRIX_F5.md` | (Non lu — à auditer) |

---

## 🎵 2. Connaissances Musicales Consolidées

### 2.1 Théorie de base (implémentée dans `theory.js`)
- **Modes diatoniques** : 7 modes complets avec intervalles et caractère (Ionien→Locrien)
- **Variantes mineures** : Naturelle, Harmonique (+sensible), Mélodique (+6&7 ascendant)
- **Accords** : Triades + Tétrades + Extensions (9, 11, 13) + Clusters
- **NNS** : I/vi/iii = stable, IV/ii = mouvement, V/vii° = tension → I impératif

### 2.2 Dictionnaire d'Accords (dans `axiom_rules.md`)
```
Major[0,4,7], Minor[0,3,7], dim[0,3,6], aug[0,4,8]
sus2[0,2,7], sus4[0,5,7], add9[0,4,7,14]
M7[0,4,7,11], m7[0,3,7,10], 7[0,4,7,10], m7b5[0,3,6,10], dim7[0,3,6,9]
9[0,4,7,10,14], 13[0,4,7,10,14,17,21], 7#9[0,4,7,10,15] (Hendrix)
```

### 2.3 Gammes disponibles (dans `axiom_rules.md`)
- 7 modes diatoniques + Harmonique Mineure + Mélodique Mineure
- Pentatoniques (Maj/Min) + Blues héxatonique
- Diminuée (Half-Whole + Whole-Half)

### 2.4 Règles de Substitution Harmonique
- **Triton Sub** : V7 → bII7 (ex: G7 → Db7) — distance 6 demi-tons
- **Diatonique** : I → iii ou vi (même fonction tonique)
- **Relatif** : Majeur → Mineur relatif (-3 demi-tons, ex: C → Am)

### 2.5 Progressions Standards Codifiables
| Nom | Degrés NNS | Genre |
|-----|-----------|-------|
| II-V-I | ii-V-I | Jazz universel |
| I-V-vi-IV | I-V-vi-IV | Pop universelle |
| I-IV-V-I | I-IV-V-I | Blues/Rock |
| Turnaround | I-vi-ii-V | Jazz boucle |
| IV-iii-vi | IV-iii-vi | R&B/Neo-Soul |
| Andalou | i-VII-VI-VII | Flamenco/Métal |

### 2.6 Open Key / Camelot Wheel (dans `harmonic_mixing.md`)
- **Voisins compatibles** : ±1 sur le même anneau + relatif (changement d'anneau même chiffre)
- **Saut d'énergie** : +2 (montée soudaine), +7 (dramatique)
- **Anneaux** : `d` = Majeur, `m` = Mineur
- Correspondances : C=8d/5m, G=9d/6m, F=7d/4m, A=11d/8m

### 2.7 Psychoacoustique (dans `psychoacoustics.md`)
- **Missing Fundamental** : jouer 2f+3f+4f → cerveau perçoit f (application mobile/smartphone)
- **Shepard Tones** : superposition de gammes chromatiques à une octave d'écart, enveloppe en cloche
- **Just Intonation vs Equal Temperament** : Quinte +2cents, Tierce Maj -14cents, 7ème naturelle -31cents

### 2.8 Voice Leading (gap identifié — à implémenter)
- **Économie de mouvement** : bouger chaque voix du plus petit intervalle possible
- **Éviter** : quintes/octaves parallèles
- **Shell Voicings** : priorité 3ème + 7ème pour définir la couleur
- **Règle grave** : écarter les notes dans le grave, resserrer dans l'aigu (suit série harmonique)

### 2.9 Ontologie des Genres (dans `genre_ontologies.md`)
| Genre | Harmonie | Basse | Rythme |
|-------|---------|-------|--------|
| Jazz/Bossa | 7e, 9e, 11e, 13e | Tonique+quinte+chromatiques | Swing, 70-120 BPM |
| Rock/Metal | Power chords (1-5) | Doublure guitare staccato | Straight 4/4, 100-280 BPM |
| Reggae | Triades/7e | Narrative, sub-basse | One Drop, 80-110 BPM |
| Pop/Funk | Add9, Sus + Statique | Slap, sidechain | Four-on-floor, 90-120 BPM |
| Electronic | Atonalité/parallèles | Sidechain, plucks | 4-on-floor, 120-150 BPM |
| Urban/Trap | Minor 9, Neo-Soul | 808 pitch-glides | Half-time, 80-140 BPM |

### 2.10 Performance Dynamics (dans `PERFORMANCE_DYNAMICS.md`)
- **Block** : délai 0 | **Strum** : 15-30ms cumulatif graves→aigus | **Arpeggio** : 200ms
- **Strumming presets** : Island `D-DU-_UDU`, Reggae Skank, Rock `D-D-DUDU`
- **Humanize** : jitter 2-5ms + velocity Down=100% / Up=70%

---

## 🏗️ 3. Architecture Code

### Fichiers Core (NE JAMAIS MODIFIER sans spec explicite)
| Fichier | Rôle | Sensibilité |
|---------|------|------------|
| `src/core/fingeringLogic.js` | Calcul doigtés — contrat v2 | 🔴 CRITIQUE |
| `src/core/theory.js` | NOTES, SCALES, CHORDS, MODES, fonctions | 🔴 CRITIQUE |
| `src/core/harmonyEngine.js` | Analyse voicings, inversions, intervalles | 🟠 HAUTE |
| `src/core/voicingEngine.js` | Moteur de voicings | 🟠 HAUTE — **À AUDITER** |
| `src/core/acousticEngine.js` | Psychoacoustique | 🟠 HAUTE — **À AUDITER** |
| `src/core/bassEngine.js` | Intelligence basse | 🟠 HAUTE — **À AUDITER** |
| `src/core/fretboardLogic.js` | Logique manche | 🟠 HAUTE |
| `src/core/expert_theory_data.json` | Données expertes | 🟡 **À AUDITER** |
| `src/core/extendedTheoryData.json` | Données harmoniques étendues | 🟡 **À AUDITER** |
| `src/core/bricks.js` | Format BRICK Studio | 🟡 MOYENNE |

### Convention §MAP (OBLIGATOIRE)
Chaque fichier `.js`/`.jsx` avec des variables alpha (`α1`, `α2`...) contient un **§MAP** en commentaire en bas du fichier. C'est la source de vérité pour déchiffrer les noms de variables.

**RÈGLE** : Lire le §MAP AVANT toute modification d'un fichier avec des variables alpha.

### Hooks Principaux
| Hook | Rôle |
|------|------|
| `useMusicEngine.js` | Calculs harmoniques centraux, fingerings, voicings |
| `useDictionaryMode.js` | État mode Dictionnaire |
| `useStudioMode.js` | État mode Studio |
| `useUIState.js` | État UI global |
| `usePlaybackHandlers.js` | Lecture audio |

### Context
`AppContext.jsx` — État global partagé. Utilisé via `useAppContext()`.

---

## 🗺️ 4. Features à Implémenter (Récapitulatif Complet)

### 4.1 P0 — Bugs Critiques
| ID | Feature | Propriétaire |
|----|---------|--------------|
| FLASH-07 | BUG-06 : Accords invisibles en mode Dictionnaire | Flash |

### 4.2 P1 — Quick Wins Flash
| ID | Feature | Fichier |
|----|---------|---------|
| QW-01 | Supprimer double import `useAppContext` dans DictionaryPanel | DictionaryPanel.jsx |
| QW-02 | Corriger "558/558" → "559/559" dans MASTER_TASK_TRACKER | MASTER_TASK_TRACKER.md |
| QW-03 | Audit + ajout clés i18n manquantes (PositionSelector) | translations.js |
| A.2.1 | Audit bundle `vite-bundle-visualizer` | — |
| F.2.2 | Extraire MixerPanel de App.jsx | App.jsx |
| F.2.3 | React.memo sur Fretboard et PianoKeyboard | Fretboard.jsx |
| F.3.1 | Hook `useDebugState` → localStorage | hooks/ |
| D.1.1 | Frettage logarithmique (constante 17.817) | fretboardLogic.js |
| D.1.2 | `numFrets` variable (22/24) | fretboardLogic.js |
| E.1/E.2 | Accessibilité WCAG aria-labels | composants |

### 4.3 P2 — Music Intelligence (Composition/Improvisation)
> Détails : `docs/management/MUSIC_INTELLIGENCE_ROADMAP.md`
> Pré-requis : **PRO-SPEC-01** (audit data musicale par Gemini Pro)

| ID | Feature | Données requises |
|----|---------|-----------------|
| MI-A3 | Modes relatifs/parallèles dans DictionaryPanel | `MODES` dans theory.js |
| MI-B1 | Degrés romains (I/ii/IV) sur accords Studio | `toRoman()` dans theory.js |
| MI-B2 | Progressions communes Quick Start | `generateChordsFromNNS()` + format BRICK |
| MI-A1 | Notes tension/résolution colorisées sur manche | `expert_theory_data.json` + avoid notes |
| MI-A2 | Gammes compatibles catégorisées (parfaites/couleur/évitement) | `getRecommendedScalesForChord()` étendue |
| MI-C1 | Camelot Wheel / Roue des Quintes HUD | `harmonic_mixing.md` — données complètes |
| MI-D1 | Mood Indicator étendu (tension 0-10, contexte genre) | `extendedTheoryData.json` |

### 4.4 P3 — Features Futures (Sonnet/Pro uniquement)
| ID | Feature | Complexité |
|----|---------|-----------|
| EPIC-02 | Mode Harmoniques (Just Intonation vs Equal Temperament) | Haute |
| EPIC-04 | Basse Fantôme (Missing Fundamental) HUD | Haute |
| EPIC-04b | Tons de Shepard (Piano Roll visualisation) | Haute |
| EPIC-05 | Templates de structures (ABA, Rondo, Sonate) | Haute |
| EPIC-06 | Grille polyrythmique + Humanize | Haute |
| EPIC-07 | Set Theory sous-marine (vecteurs d'intervalles) | Très haute |
| EPIC-08 | Micro-tonalité (quarts de ton, MPE) | Très haute |
| MI-B3 | Substitutions harmoniques (Triton, Relatif, Passage) | Haute |
| MI-C2 | Guide de modulation (Pivot Chord Finder) | Haute |
| C.1 | Intégration Tonal.js | Haute |
| D.2.2 | Voice Leading automatique | Haute |

---

## ⚠️ 5. Contrats et Règles Inviolables

### Contrat fingeringMap v2
```js
{
  fret: number,           // Position sur le manche (0 = corde à vide)
  status: 'played' | 'barre' | 'muted' | 'open',
  finger?: 1 | 2 | 3 | 4  // Optionnel
}
```
**JAMAIS** revenir à une Map simple. Ne jamais modifier `fingeringLogic.js` sans spec Sonnet.

### Règles de Développement
1. `npm test` avant ET après chaque tâche → **559/559** ✅ obligatoire
2. Lire le **§MAP** d'un fichier avant toute modification
3. Toute nouvelle logique musicale → `src/core/` uniquement
4. Toute nouvelle UI → composant autonome dans `components/`
5. Aucun `console.log` en production (sauf debug temporaire marqué)
6. Les fichiers `theory.js`, `fingeringLogic.js` ne sont jamais modifiés par Flash seul

### Hiérarchie des Modèles
| Modèle | Rôle autorisé |
|--------|--------------|
| **Gemini Flash** | Fixes visuels, tâches < 50L, CSS, docs, tâches atomiques spécifiées |
| **Gemini Pro** | Audit data, specs atomiques, migrations guidées |
| **Claude Sonnet** | Architecture, refactoring complexe, analyse stratégique |
| **Claude Opus** | Algorithmique avancé, sécurité, Voice Leading |

---

## 📦 6. Données JSON Disponibles (À Auditer par Pro)

Ces fichiers contiennent de la connaissance musicale encodée que les features doivent exploiter :

| Fichier | Contenu probable | Utilisé dans |
|---------|-----------------|--------------|
| `src/core/expert_theory_data.json` | Avoid notes, tensions, substitutions | **À AUDITER** |
| `src/core/extendedTheoryData.json` | Données harmoniques étendues, mood | **À AUDITER** |

**Question clé pour Pro** : Ces fichiers contiennent-ils les avoid notes par type d'accord ? Les tensions 9/11/13 classifiées ? Les règles de substitution ?

---

## 🔗 7. Connexions entre Connaissances et Features

```
music_theory_notes.md §2 (Tension/Résolution)
  → MI-A1 (Notes tension sur manche)
  → EPIC-02 (Dictionnaire harmonique enrichi)
  → D.2.2 (Voice Leading automatique)

harmonic_mixing.md (Open Key)
  → MI-C1 (Camelot Wheel HUD)
  → FUTURE-04 (déjà dans backlog)

genre_ontologies.md (6 genres)
  → EPIC-05 (Templates de structures)
  → Phase 5.2 (Assistant Genre)
  → MI-D1 (Mood Indicator genre-aware)

psychoacoustics.md
  → EPIC-04 (Missing Fundamental HUD)
  → EPIC-04b (Shepard Tones PianoRoll)
  → harmonicMode toggle (DictionaryPanel)

axiom_rules.md (Progressions standards)
  → MI-B2 (Progressions Quick Start)
  → MI-B3 (Substitutions harmoniques)

PERFORMANCE_DYNAMICS.md
  → EPIC-06 (Humanize engine)
  → Strumming patterns (audio/)
```

---

---

## 🚀 8. Fonctions Déjà Codées — À Connecter à l'UI (Quick Wins Pro/Flash)

> **Découverte critique** : Audit du code source révèle que de nombreuses features "futures" sont déjà implémentées dans les engines mais jamais exposées à l'UI.

| Fonction | Fichier | Implémentée ? | Feature débloquée |
|----------|---------|---------------|-------------------|
| `getHarmonicSeries(baseFreq, n)` | `acousticEngine.js` | ✅ Complète | H.2.1 Mode Harmoniques |
| `suggestBassPattern(genre, chords)` | `bassEngine.js` | ✅ 7 genres | I.1.1 Assistant Genre |
| `suggestReVoicing(root, intervals, instr)` | `voicingEngine.js` | ✅ Complète | VoicingAlert suggestions |
| `analyzeVoicingRules(voicing, instr)` | `voicingEngine.js` | ✅ Complète | Score jouabilité |
| `getIntervalVector(pitchClasses)` | `harmonyEngine.js` | ✅ | EPIC-07 Set Theory |
| `getDissonanceScore(intervalVector)` | `harmonyEngine.js` | ✅ | Score tension accord |
| `toRoman(nnsStr)` | `theory.js` | ✅ | MI-B1 Degrés romains |
| `getLeadingTone(nextChordRootValue)` | `theory.js` | ✅ | Voice Leading |
| `getClosestInversion(prevNotes, ...)` | `theory.js` | ✅ | Voice Leading automatique |

### Données JSON déjà structurées et prêtes à l'emploi

**`extendedTheoryData.json`** contient :
- `extendedChords` : 23 types d'accords avec intervalles (M → 7b13)
- `extendedScales` : 15 gammes avec intervalles (modes + pentatoniques + blues + diminuées)
- `axiomRules.progressions` : 5 progressions prêtes (II-V-I maj/min, I-V-vi-IV, Turnaround, IV-iii-vi)
- `axiomRules.substitutions` : 3 règles de substitution (Triton, Diatonique, Relatif)

**`expert_theory_data.json`** contient :
- `voiceLeadingRules` : `{ maxFretStretch: 4, jumpPenalty: 2.5, stringStayBonus: 1.5 }`
- `harmonicSubstitutions.tritone` : Table complète des 12 substitutions de triton
- `harmonicSubstitutions.relativeMinor` : Table des 12 relatifs mineurs
- `harmonicSubstitutions.secondaryDominants` : Map degré → dominante secondaire
- `extendedChords` : maj9, m9, dom9, 11th, 13th, 7b9, 7#9, m7b5 avec intervalles
- `instrumentRanges` : Plages MIDI pour guitar_standard, bass_standard, piano_88

### Gaps réels identifiés (données non encore codées)
- ❌ **Avoid notes par type d'accord** (pour G.1.2 tension/résolution)
- ❌ **Table Camelot Wheel** en JSON (pour G.3.1)
- ❌ **Strumming patterns guitare** en JSON (pour H.3.2)
- ❌ **Correspondances genre → modes recommandés** (pour I.1.3)

---

## 📖 9. Guide de Lecture pour le Refinement

Quand Gemini Pro va raffiner les specs, lire dans cet ordre :

1. `KNOWLEDGE_INDEX.md` (ce fichier) — vision globale
2. `DETAILED_BACKLOG_TECH.md` — analyse code + données disponibles
3. `MUSIC_INTELLIGENCE_ROADMAP.md` — features composition/improvisation
4. Les fichiers sources correspondants à la feature

**Pour chaque feature à raffiner, répondre à** :
- La logique est-elle déjà dans un `core/*.js` ? (Consulter §8 ci-dessus)
- Les données sont-elles dans `extendedTheoryData.json` ou `expert_theory_data.json` ?
- Quels gaps de données doivent être comblés avant l'implémentation ?
- La feature est-elle additive (Flash) ou modifie-t-elle une logique existante (Sonnet) ?

---

*Index mis à jour : 2026-05-10T20:28 par Claude Sonnet (Thinking)*
*Source : 28 fichiers MD + audit complet de 12 fichiers source JS/JSON*
*Prochaine mise à jour : après PRO-SPEC-01 ou après implémentation de FLASH-07*
