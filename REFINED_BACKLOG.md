# VisualMusic Master Backlog (Refined)

> **Vision Statement**: VisualMusic is a premium composition assistant that combines "Liquid Glass" aesthetics with high-level harmonic intelligence.

---

## 🧹 Stream A: Hygiene & Reliability (P0-P1)
*Objectif : Stabiliser les fondations avant d'ajouter de nouvelles couches d'intelligence.*

### A.1 — Audit de Qualité & Purge [P1]
- [ ] **TDD: Purge du code mort** : Identifier et supprimer les 89 fonctions "likely-dead" (via `jcodemunch`).
- [ ] **Refactoring Fretboard (Complexité 99)** : Extraire la logique de calcul des cases (`FretboardLogic.js`) du composant de rendu.
- [ ] **Refactoring InstrumentView (Complexité 97)** : Découper le panneau en sous-composants fonctionnels (Settings, PositionSelector, DisplayOptions).
- [ ] **App.jsx State Machine** : Finaliser l'extraction vers `AppContext` et les hooks `useDictionaryMode` / `useStudioMode`.

### A.2 — Performance & Bundle [P2]
- [ ] **Bundle Splitting (Tone.js)** : Charger Tone.js de manière asynchrone pour passer sous les 150KB gzip au chargement initial.
- [ ] **Canvas Rendering** : Prototyper un rendu `<canvas>` pour le Fretboard afin de garantir 60 FPS en résolution 4K.

---

## 🎨 Stream B: Design System & Tokens (P1)
*Objectif : Simplifier la maintenance visuelle et permettre des changements d'identité instantanés.*

### B.1 — Architecture des Design Tokens
- [ ] **Définition de la Palette Réduite** :
    - `Primary` (Gold/Lead)
    - `Role-Root` (Stable)
    - `Role-Third` (Color)
    - `Role-Fifth` (Tension)
    - `Role-Extension` (Flavor)
- [ ] **Implémentation des Variantes** : Chaque token doit avoir 3 états : `base`, `glow` (vibrant), `subtle` (semi-transparent).
- [ ] **Migration CSS** : Remplacer toutes les valeurs HEX/HSL brutes par ces tokens dans tous les composants.

---

## 🧠 Stream C: Aide à la Composition (P2)
*Objectif : Transformer l'outil de visualisation en un véritable partenaire de création.*

### C.1 — Intelligence Harmonique (Pure Logic)
- [ ] **TDD: Intégration Tonal.js** : Remplacer `theory.js` par Tonal pour une gestion robuste des gammes, accords et inversions.
- [ ] **Harmonic Context Engine** : Développer une fonction qui analyse la progression actuelle et retourne le "poids" harmonique de chaque step.

### C.2 — Assistant Proactif (UI/UX)
- [ ] **The "Next Chord" HUD** : Au-dessus de la timeline, suggérer 3 alternatives pour le step suivant (ex: Substitution de Triton, Accord d'emprunt).
- [ ] **Melodic Guide Overlay** : Sur les instruments, différencier visuellement les "Notes Cibles" (Target Notes) des notes de passage selon la fonction harmonique.
- [ ] **Emotional Mapping** : Interface de sélection par "Sentiment" (ex: "Dark/Epic", "Sunny/Relax") qui peuple automatiquement une progression cohérente.

---

## 🛠️ Stream D: Expertise Instrumentale (P2)
*Objectif : Précision anatomique et pédagogique.*

### D.1 — Anatomie 4K
- [ ] **Frettage Logarithmique** : Appliquer le calcul réel des frettes (constante 17.817) pour un rendu visuel pro.
- [ ] **Nombre de frettes variable** : Permettre 22/24 frettes selon l'instrument sélectionné.

### D.2 — Voicing Intelligence
- [ ] **Voice Leading Automatique** : Option pour ajuster automatiquement les inversions (Piano) ou positions (Guitare) afin de minimiser les sauts de main entre deux accords.
- [ ] **VoicingAlert Integration** : Afficher proactivement les alertes de "Muddy Bass" ou "Unplayable Stretch" directement sur les boutons d'accords.

---

## 🚀 Stream E: Production & Écosystème (P3)
- [ ] **Accessibilité (WCAG 2.1)** : Focus management et aria-labels pour les musiciens utilisant des lecteurs d'écran.
- [ ] **Export Multi-Pistes Avancé** : Export MIDI avec tracks séparées pour Mélodie, Accords et Basse avec noms de tracks corrects.

---

## 🔥 Stream F: Interaction & Navigation Musicale (Focus Actuel)
*Objectif : Offrir une navigation fluide entre les octaves et les positions physiques sans noyer l'utilisateur sous la complexité.*

### F.1 — Navigation par Octaves & Variantes [Item 1] - **ÉTAT : AFFINÉ**
> *Voir [REF_DECISION_MATRIX_F1.md](file:///D:/IA/VisualMusic/docs/management/REF_DECISION_MATRIX_F1.md)*

- [ ] **Contrat de Données `MusicState`** : Implémenter le schéma JSON unifié incluant :
    - `fingeringMap` : `{ string: { fret, status: 'played'|'open'|'muted' } }`.
    - `isOutOfRange` : **Règle Stricte** : Si la note/octave n'existe pas, l'instrument ne joue rien et n'affiche rien (pas de transposition automatique).
    - `positionIndex` : Indice de la variante de position sélectionnée par l'utilisateur.
- [ ] **Sélecteur de Mode & Position** :
    - **Sélecteur Global** : Basculer entre l'affichage d'une Note seule, d'un Accord ou d'une Gamme complète.
    - **Sélecteur Local (Instrument)** : Pour un même pitch, permettre de choisir la variante physique (ex: C3 sur corde 5 vs corde 6).
    - *UI* : Ne jamais afficher toutes les combinaisons possibles simultanément pour éviter la pollution visuelle.
- [ ] **Example Mapping (Validation)** :
    - *Exemple* : C5 sélectionné -> Piano (OK), Guitare (OK, frette 8), Basse (Totalement invisible/muette).
    - *Exemple* : E3 sélectionné -> Sélecteur propose "Pos 1" (Corde 6/Fret 0) ou "Pos 2" (Corde 5/Fret 7).

### F.2 — Refactoring & Architecture de Sélection [Item 2] - **ÉTAT : AFFINÉ**
> *Voir [REF_DECISION_MATRIX_F2.md](file:///D:/IA/VisualMusic/docs/management/REF_DECISION_MATRIX_F2.md)*

#### Actions Structurantes :
1. **Extraction de `useMusicalSelection`** : Un hook personnalisé qui encapsule la logique d'octave et de variante.
2. **Standardisation via Interface TS** : Définir `interface Fingering` pour que `Fretboard` et `Piano` aient un langage commun.
3. **Isolation de `InstrumentPanel.jsx`** : Séparer visuellement et logiquement les instruments de la Timeline de `App.jsx`.

### F.3 — Système d'Observabilité Agentique [Item 3] - **ÉTAT : AFFINÉ**
> *Voir [REF_DECISION_MATRIX_F3.md](file:///D:/IA/VisualMusic/docs/management/REF_DECISION_MATRIX_F3.md)*

#### Actions Structurantes :
1. **Implémentation d'un `useAgentFeedback` Hook** : Un hook qui surveille le store (Zustand/Context) et synchronise l'état avec un fichier local en mode développement.
2. **Standardisation du Log** : Inclure les "Warnings Harmoniques" (ex: "Note out of range for Bass") dans le log pour que l'agent puisse s'auto-corriger.
3. **Commande `npm run check:state`** : Un script simple qui affiche le dernier état JSON dans le terminal.

### F.4 — Protocole de Transition de Modèle (Passation) [Item 4] - **ÉTAT : AFFINÉ**
> *Voir [REF_DECISION_MATRIX_F4.md](file:///D:/IA/VisualMusic/docs/management/REF_DECISION_MATRIX_F4.md)*

#### Actions Structurantes :
1. **Template de Passation** : Créer un canevas (État des fichiers, Tests en cours, Prochaine action critique, Doutes techniques).
2. **Rituel de Clôture** : L'agent doit s'auto-imposer la rédaction de ce snapshot avant de rendre la main.
3. **Indexation Initiale** : Le nouveau modèle doit lire ce fichier en priorité absolue avant d'analyser le code.


#### État des Lieux des Connaissances :
- **Prêt à l'emploi** : Formules d'accords (1, 3, 5, 7), Intervalles de gammes, Logique de frette de base.
- **À enrichir via Expert Externe** :
    - **Règles de Voice Leading** : Critères pour choisir l'inversion qui minimise les déplacements de doigts.
    - **Ontologies de Genres** : Quelles gammes utiliser sur quel accord pour le Blues, le Jazz, le Metal.
    - **Pattens Rythmiques** : Motifs de base pour la basse et la guitare selon la signature rythmique.

#### Matrice d'Aide à la Décision : Stockage de la Connaissance

| Solution | Avantages | Inconvénients | Forces | Faiblesses |
| :--- | :--- | :--- | :--- | :--- |
| **A. Code-driven Logic** | Performance maximale. | Très rigide, difficile à modifier sans casser le moteur. | Déterministe. | Manque de "musicalité" (trop mathématique). |
| **B. Fichiers JSON de Savoir** | **Facile à enrichir par l'IA**, découplé du code, versionnable. | Demande une structuration initiale rigoureuse. | **Évolutif et transportable d'un modèle à l'autre**. | Peut devenir volumineux. |
| **C. Requête IA en temps réel** | Savoir "infini" et créatif. | Lent, coûteux, non-déterministe (casse les tests). | Créativité. | Impossible à valider via TDD. |

**Recommandation Aria :** **Solution B**. Utiliser des fichiers JSON dans `docs/intelligence/` comme une "base de données de sagesse musicale" que le moteur de calcul consulte.

#### Actions Structurantes :
1. **Prompt Expert Externe** : Préparer une requête structurée pour obtenir les 10 règles d'or du Voice Leading à la guitare.
2. **Schéma `MusicalIntelligence`** : Définir comment ces règles pondèrent le calcul des positions (ex: -10 points de score pour un saut de plus de 4 frettes).

---


