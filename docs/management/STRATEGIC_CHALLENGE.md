# Brainstorming Stratégique & Avocat du Diable

## 1. Critique du Déroulement Actuel
- **Le Syndrome de la "Feature Creep"** : On ajoute des détails visuels (glassmorphism, animations) alors que le cœur de la gestion des données (le contrat de l'objet `fingering`) est encore instable. 
- **Dette Technique Invisible** : `App.jsx` devient un monolithe ingérable. Chaque modification ici est une roulette russe pour les régressions.
- **Manque d'Observabilité** : On répare les bugs au jugé. Il nous manque un panneau de debug interne affichant en temps réel l'état du "State" musical et les erreurs de calcul de voicing.

## 2. Mode Avocat du Diable (Challenges)
- **Le Mode Expert est-il un leurre ?** : Est-ce qu'un utilisateur veut vraiment voir toutes les positions possibles ? Ne devrait-on pas plutôt imposer le "Meilleur Voicing" calculé par l'IA et ne laisser l'expert qu'en option cachée ?
- **Web Workers ou Main Thread ?** : Le calcul des voicings devient lourd. Si on continue à tout faire sur le thread principal, l'UI va freezer dès qu'on passera sur des instruments à plus de 6 cordes.
- **L'IA doit-elle coder l'IA ?** : On demande à Aria de coder un moteur de suggestion. Est-ce qu'on ne devrait pas externaliser le calcul harmonique vers une API dédiée plutôt que de tout coder en dur en JavaScript ?

## 3. Suggestions de Rupture
- **Stop au Code, Place au Test** : Geler toute nouvelle feature tant qu'une suite de tests unitaires sur `fretboardUtils.js` n'est pas à 90% de couverture.
- **Refactoring "Coup de Hache"** : Extraire immédiatement `fretboardLogic` et `audioEngine` de `App.jsx` sans chercher à réparer de bugs visuels pendant cette phase.
- **Standardisation par le Schéma** : Créer un fichier `schema.d.ts` (même sans TypeScript actif) pour servir de contrat de confiance entre les composants.

## 4. Garde-fous contre les Régressions
- **Protocole "Double-Check"** : Pour chaque modification de fichier de plus de 200 lignes, l'agent doit lister les fonctions impactées *avant* l'edit.
- **Snapshot Visuel Manuel** : Demander systématiquement à l'utilisateur de valider un screenshot après un changement CSS majeur avant de passer à la suite.

---
