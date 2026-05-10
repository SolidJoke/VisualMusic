# Audit Théorique et Technique : VisualMusic

## 1. État des Connaissances Exploitables (Prêts à l'emploi)
- **Théorie des Gammes & Accords** : Les définitions d'intervalles, les modes de la gamme majeure/mineure mélodique et les structures d'accords (7th, 9th, sus) sont solides et bien intégrés dans `musicLogic.js`.
- **Rendu Anatomique Basique** : La logique de "portée" (span) des doigts sur le manche est fonctionnelle.
- **Synthèse Audio** : Le moteur basé sur des échantillons est prêt pour une utilisation de production.

## 2. Zones Nécessitant des Informations Complémentaires (Gaps)
- **Conduite des Voix (Voice Leading)** : Nous manquons de règles algorithmiques pour passer d'un accord à un autre de manière fluide (mouvements contraires, économie de déplacement). 
    - *Besoin* : Demander à un modèle externe (Claude Opus) de générer un set de règles heuristiques pour le "Smooth Voicing Transition".
- **Résolution des Tensions Harmoniques** : Pas de logique actuelle pour suggérer des résolutions (ex: V -> I, tensions sur accords de dominante).
    - *Besoin* : Définir une matrice de "Tension/Resolution" exploitable par le moteur de suggestion.
- **Anatomie Avancée du Manche** : Les contraintes de barrés complexes (ex: barré partiel avec note plus basse sur une corde aiguë) sont gérées de manière simpliste.
    - *Besoin* : Données sur les limites réelles de flexion et d'extension pour les "doigtés impossibles".

## 3. Analyse de la Backlog
- **Phases 8 & 9 (Nettoyage & Refactoring)** : Priorité absolue. La fragmentation de `App.jsx` est nécessaire pour éviter la saturation du contexte.
- **Phase 14 (Stabilisation)** : Nécessite l'implémentation de tests de régression visuelle (snapshots) pour figer le rendu du Fretboard.

## 4. Questions pour le Modèle "Relais" (External Brain)
1. "Peux-tu formaliser une grammaire JSON pour les règles de Voice Leading applicables à une guitare 6 cordes ?"
2. "Quels sont les algorithmes de recherche de chemin (pathfinding) les plus adaptés pour trouver le doigté optimal minimisant la fatigue musculaire ?"

---
