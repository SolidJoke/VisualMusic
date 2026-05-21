# TODO — Pour Gemini Pro (prochaine session)

## BUG : Traduction manquante dans CompositionPanel

Le bloc "Math Composition Assistant" (`src/components/Intelligence/CompositionPanel.jsx`)
contient des chaînes hardcodées en anglais, non connectées au système i18n (`txt.*`).

**Tâche** :
1. Identifier toutes les chaînes hardcodées dans `CompositionPanel.jsx`
2. Ajouter les clés correspondantes dans `src/i18n/translations.js` pour `fr`, `en` (et `es` si applicable)
3. Remplacer les strings hardcodées par `txt.clé || "fallback EN"`
4. Vérifier que `CompositionPanel.test.jsx` ne régresse pas
