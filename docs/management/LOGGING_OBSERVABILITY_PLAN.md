# Plan d'Observabilité et de Feedback Agentique

## 1. Besoin de Feedback Interne
Aria a besoin de "voir" l'effet de son code au-delà de la compilation réussie. Actuellement, l'agent est aveugle aux états internes de l'application en cours d'exécution.

## 2. Implémentation du "DevMode Logging"
**Objectif** : Créer un pont d'information entre le runtime de VisualMusic et l'agent Aria.

**Composants prévus** :
- **Logger Centralisé** : Un hook ou une classe JS qui enregistre les transitions d'état (ex: `Scale Changed: C Major`, `Voicing Calculated: [0, 2, 2, 1, 0, 0]`).
- **Export de Logs** : Possibilité pour l'agent de lire un fichier `runtime_logs.json` ou de voir les logs via une commande terminal dédiée.
- **Visualiseur d'État** : Un composant UI discret (invisible en prod) affichant les métadonnées de calcul que l'agent pourra inspecter via des captures d'écran.

## 3. Métriques d'Efficacité de l'Agent
Pour analyser la qualité de mon propre travail, nous suivrons :
- **Taux de Régression** : Nombre de bugs introduits vs fonctionnalités livrées.
- **Densité de Code par Tâche** : Évaluer si les solutions sont trop complexes par rapport au besoin.
- **Temps de Résolution par Bug** : Identifier les types de fichiers (ex: CSS vs Logic) qui causent le plus de frictions.

---
*Ce plan sera soumis à Claude Sonnet pour optimisation lors de la prochaine phase.*
