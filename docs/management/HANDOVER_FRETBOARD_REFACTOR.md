# Rapport de Passation : Refactoring Fretboard (A.1.3)
> **Date :** 2026-06-06
> **Agent sortant :** ARIA (Gemini Pro)
> **Branche de travail actuelle :** `main` (prête à brancher pour le refacto)

## 1. État des lieux (Ce qui a été fait)
- Les tests d'intégration QA rédigés par Flash (Session 1) ont été validés avec succès (795 tests au vert via `happy-dom` et Vitest).
- La branche `qa/flash-session-1` a été mergée dans `main` localement, suite à ton merge de la PR #51.
- Le Fretboard actuel est stable, les marqueurs O/X sont bien alignés (BUG-08 fixé), et l'application ne crashe pas.
- L'analyse pour la tâche du Backlog **A.1.3 (Refactoring Fretboard - Complexité 99)** a été réalisée et approuvée par Claude.

## 2. Le Chantier à réaliser (Ce qui reste à faire)
Nous devons extraire le "cerveau calculatoire" du composant massif `Fretboard.jsx` (actuellement plus de 300 lignes).

**Décision Architecturale (Validée par Claude) : Approche Hybride**
Il a été décidé de ne pas tout mettre dans un Hook géant, mais d'utiliser une approche hybride pour garantir la testabilité unitaire parfaite et optimiser les re-renders (critique pour l'UI Liquid Glass) :
1. **Les algorithmes complexes dans des fonctions JS pures** (`fretboardUtils.js` ou `FretboardCalculations.js`).
2. **La glu contextuelle dans un Hook très fin** (`useFretboard.js`).
3. **Le rendu déclaratif dans un composant "Dumb"** (`Fretboard.jsx`).

## 3. Plan d'Implémentation Détaillé (À exécuter par le nouvel agent)

### A. Fonctions Pures (ex: `src/core/fretboardUtils.js`)
Déplacer et refactoriser la logique mathématique lourde :
- `extractBarreData(fingeringMap, dictType)` : Détection du "Finger 1" et formatage visuel (actuellement lignes 82-120 de Fretboard.jsx).
- `getFretboardGridTemplate(fretWidths)` : Génération de la string CSS `minmax(...)` logarithmique.
- `getStringTuning(instrument, activeBrick)` : Déduction de l'accordage.

### B. Hook d'Orchestration (`src/hooks/useFretboard.js`)
Créer un Thin Hook qui :
- Lit `useMusicEngineContext`.
- Appelle les fonctions pures avec les bonnes props.
- Wrappe intelligemment les résultats dans des `useMemo` avec des dépendances propres.
- Expose l'interface suivante :
  ```javascript
  const { strings, fretWidths, fretboardGridTemplate, activePath, barreData, activeNotes, fingering, isOutOfRange, dictType } = useFretboard(instrument);
  ```

### C. Refactoring Composant (`src/components/Instruments/Fretboard.jsx`)
- Nettoyer le composant de tous ses calculs métiers.
- Importer `useFretboard`.
- Conserver uniquement le mapping JSX (`renderDots`, `renderStatusRow`, `renderBarres`, `strings.map`).

## 4. Précautions & Tests
- **CRITIQUE :** Ce refactoring ne doit absolument pas casser les tests QA `QA_Journeys.integration.test.jsx` mis en place par Flash.
- **Vérifications :** Le composant devra toujours correctement gérer l'affichage de l'état (out-of-range, barrés, Open strings).

---
*Fin du rapport de passation.*
