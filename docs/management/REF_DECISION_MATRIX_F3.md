# Matrice de Décision Technique : Observabilité Agentique (F.3)

Ce document traite de l'implémentation d'un système de feedback boucle-fermée permettant à l'agent (Aria) de valider ses modifications sans dépendre exclusivement du rendu visuel.

## 1. Analyse du Problème : Le "Black Box Effect"
Actuellement, pour vérifier si un changement de logique (ex: une inversion d'accord) fonctionne, Aria doit :
1. Lancer le navigateur (coûteux en tokens).
2. Prendre un screenshot ou analyser le DOM.
3. Déduire l'état interne.

C'est un processus lent et sujet à l'erreur. L'agent a besoin d'une **sonde directe** sur l'état Redux/Context.

## 2. Solution Proposée : Le "State Mirror" (`logs/dev.json`)
Un middleware ou un hook qui écrit l'état musical critique dans un fichier local accessible via le système de fichiers.

```javascript
// Exemple de sortie attendue dans logs/dev.json
{
  "timestamp": "2026-05-10T14:30:00Z",
  "activeNote": "C",
  "activeOctave": 0,
  "fingering": {
    "guitar": { "E": "X", "A": 3, "D": 2, "G": 0, "B": 1, "e": 0 },
    "bass": { "E": "X", "A": 3, "D": 5, "G": 5 }
  },
  "warnings": ["Bass is playing C3, close to range limit"]
}
```

## 3. Matrice d'Aide à la Décision : Mécanisme de Synchronisation

| Option | Avantages | Inconvénients | Efficacité pour l'Agent | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **A. API Endpoint local** | Très propre, pas de pollution fichier. | Nécessite un serveur Express de debug en tâche de fond. | Moyenne (besoin de `fetch`). | ❌ Non |
| **B. Écriture Fichier Directe** | **Instantatné**. Lecture via `view_file` (très peu de tokens). | Risque de conflits d'écriture si trop fréquent. | **Maximale**. | ✅ **Choix Aria** |
| **C. Debug HUD dans le DOM** | Visuel pour l'humain. | Invisible pour l'agent sans screenshot/DOM audit. | Faible. | ⚠️ Complément |

## 4. Matrice d'Aide à la Décision : Granularité des Logs

| Option | Contenu | Impact Performance | Utilité Debug | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **A. "Full State Dump"** | Tout le store React. | Élevé (plusieurs MB potentiellement). | Trop de bruit. | ❌ Non |
| **B. "Musical Delta"** | Uniquement ce qui change (notes, doigtés). | Faible. | Élevé. | ✅ **Choix Aria** |
| **C. "Action Trace"** | Liste des dernières actions dispatchées. | Faible. | Excellent pour traquer les régressions de flux. | ⚠️ Complément |

## 5. Actions de Refinement Prioritaires
1. **Création de `src/hooks/useAgentFeedback.js`** : Hook qui `useEffect` sur les changements de `MusicState` et envoie les données à un script Node de logging.
2. **Implémentation du "Log Server"** : Un simple script `scripts/log-server.js` qui écoute en local et écrit dans `logs/dev.json`.
3. **Intégration TDD** : Utiliser ce JSON pour valider automatiquement les tests de bout en bout (e2e).

---
**Note stratégique** : Ce système transforme Aria d'un "codeur aveugle" en un "ingénieur piloté par la donnée". C'est l'étape clé pour l'autonomie.
