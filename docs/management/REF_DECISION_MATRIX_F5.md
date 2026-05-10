# Matrice de Décision Technique : Enrichissement Théorique (F.5)

Ce document traite de l'exploitation des données de "Musique Experte" pour transformer le moteur de calcul en un système de recommandation harmonique.

## 1. Analyse du Problème : Le Savoir Statique
Actuellement, VisualMusic "sait" calculer les notes d'un accord de Do Majeur (C, E, G). Mais il ne "comprend" pas pourquoi on choisirait une extension (add9, 13) plutôt qu'une autre selon le contexte émotionnel ou le genre musical.
Le savoir est actuellement **codé en dur** (Hard-coded), ce qui limite l'évolution.

## 2. Solution Proposée : L'Ontologie Harmonique Découplée
Utiliser des fichiers de connaissance (`SAS/expert_theory_data.json`) comme source de vérité pour le moteur de calcul.

## 3. Matrice d'Aide à la Décision : Intégration des Données

| Option | Flexibilité | Performance | Maintenabilité | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Switch/Case Géant (JS)** | Nulle. | Maximale. | Horrible. | ❌ Non |
| **B. JSON Load & Filter** | **Haute**. | Très Bonne. | **Excellente**. | ✅ **Choix Aria** |
| **C. Base de Données (SQLite)** | Maximale. | Moyenne (latence IO). | overkill pour V1. | ❌ Non |

## 4. Matrice d'Aide à la Décision : Priorités d'Enrichissement (Gaps)

| Domaine | État actuel | Impact sur VisualMusic | Urgence | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **Accords Étendus** | Partiel (7th). | Permet des sonorités Jazz/Néo-Soul. | Haute. | ✅ À faire (Item F.5.1) |
| **Substitution de Triton** | Absent. | Indispensable pour l'Assistant Proactif. | Haute. | ✅ À faire (Item F.5.2) |
| **Poids Émotionnel** | Absent. | Permet la recherche par "Mood". | Moyenne. | ⚠️ Future Phase |
| **Voice Leading Rules** | Algorithmes de base. | Évite les sauts de main injouables. | **Critique**. | ✅ À faire (Item F.5.3) |

## 5. Actions de Refinement Prioritaires
1. **Normalisation du format JSON** : Assurer que `expert_theory_data.json` est directement consommable par `theory.js`.
2. **Prompt "Expert Substitution"** : Demander à une IA externe un mapping des substitutions harmoniques les plus communes pour le dictionnaire.
3. **Moteur de Scoring** : Créer une fonction qui note chaque variante de doigté selon les règles de Voice Leading (ex: -10 points si on doit sauter 5 frettes).

---
**Note stratégique** : L'intelligence de VisualMusic ne réside pas dans le code React, mais dans la qualité de ces données. Plus le JSON est riche, plus l'application est "musicale".
