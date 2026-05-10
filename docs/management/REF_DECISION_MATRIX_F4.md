# Matrice de Décision Technique : Protocole de Passation (F.4)

Ce document définit la méthode de transfert de contexte entre les différents modèles d'IA (Gemini, Claude) intervenant sur VisualMusic pour éviter l'érosion de la vision technique.

## 1. Analyse du Problème : La "Dérive Sémantique"
Lorsqu'un nouveau modèle prend le relais, il a tendance à :
- Ignorer les raisons de choix passés (ex: pourquoi cette structure de données ?).
- Vouloir "tout réécrire" pour simplifier, brisant souvent des cas particuliers (edge cases) musicaux.
- Perdre le fil des priorités du backlog.

## 2. Solution Proposée : Le "Technical Handover"
Un document de passation vivant qui résume l'intention, l'état des tests et les pièges identifiés.

## 3. Matrice d'Aide à la Décision : Format de Sortie

| Option | Richesse Contextuelle | Coût en Tokens | Fiabilité | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Chat Summary (Inline)** | Faible. | Élevé (se perd dans l'historique). | Faible. | ❌ Non |
| **B. `LAST_HANDOVER.md`** | **Moyenne/Haute**. | Faible (fichier dédié). | **Haute** (persistant). | ✅ **Choix Aria** |
| **C. Metadata JSON** | Très Haute (structuré). | Très Faible. | Moyenne (manque de "récit"). | ⚠️ Complément |

## 4. Matrice d'Aide à la Décision : Déclencheur (Trigger)

| Option | Moment de génération | Avantages | Inconvénients | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **A. À chaque message** | Trop fréquent, génère du bruit. | Toujours à jour. | Inutilisable. | ❌ Non |
| **B. Fin de Session / Checkpoint** | **Idéal**. | Synthèse claire des progrès. | Risque d'oubli si crash agent. | ✅ **Choix Aria** |
| **C. À chaque modification Backlog** | Cohérent. | Lie la passation aux tâches. | Partiel. | ⚠️ Complément |

## 5. Structure Type de la Passation (Template)
Pour être efficace, le fichier `LAST_HANDOVER.md` doit contenir :
1. **État de la Mission** : "On essayait de fixer X, on en est à l'étape Y".
2. **Point Critique** : "Attention au fichier `theory.js`, la fonction `Z` a une régression connue".
3. **Validation** : "Les tests `npm test` passent à 95%, il reste le bug `W`".
4. **Prochain Move Suggéré** : "Ne pas toucher au CSS tant que le Hook `useMusicEngine` n'est pas fini".

## 6. Actions de Refinement Prioritaires
1. **Normalisation du dossier `docs/management`** : Centraliser tous les rapports de passation.
2. **Rituel d'Auto-Correction** : L'agent doit vérifier son propre handover contre le backlog avant de clore sa session.
3. **Indexation forcée** : Consigne système demandant au nouveau modèle de lire le `LAST_HANDOVER.md` avant toute action.

---
**Note stratégique** : Ce protocole assure la continuité de l'expertise. C'est l'assurance-vie du projet contre les hallucinations des modèles plus petits.
