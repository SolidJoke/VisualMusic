# Dead Code Report — VisualMusic
> Généré le : 2026-05-10
> Outil : jcodemunch find_dead_code (confidence >= 0.8)

## Résumé
- **Fichiers analysés** : 87
- **Fichiers morts détectés** : 13
- **Symboles morts détectés** : 36

---

## Fichiers Morts (Zéro importateur)
| Fichier | Raison | Confiance |
|---------|--------|-----------|
| `.idx/dev.nix` | zero_importers | 1.0 |
| `eslint.config.js` | zero_importers | 1.0 |
| `netlify.toml` | zero_importers | 1.0 |
| `package.json` | zero_importers | 1.0 |
| `puppeteer_test.js` | zero_importers | 1.0 |
| `scripts/check-integrity.js` | zero_importers | 1.0 |
| `scripts/download_guitar.js` | zero_importers | 1.0 |
| `src/ErrorBoundary.jsx` | zero_importers | 1.0 |
| `src/core/extendedTheoryData.json` | zero_importers | 1.0 |
| `src/hooks/useUIState.js` | zero_importers | 1.0 |
| `src/main.jsx` | zero_importers (Entry Point) | 1.0 |
| `test.js` | zero_importers | 1.0 |
| `vite.config.js` | zero_importers | 1.0 |

## Symboles Morts (Fonctions/Classes/Méthodes)
| ID | Fichier | Kind | Raison |
|----|---------|------|--------|
| `src/hooks/useUIState.js::useUIState` | `src/hooks/useUIState.js` | function | zero_importers |
| `src/ErrorBoundary.jsx::ErrorBoundary` | `src/ErrorBoundary.jsx` | class | zero_importers |
| `scripts/check-integrity.js::scanDir` | `scripts/check-integrity.js` | function | zero_importers |
| `scripts/download_guitar.js::notesToExtract` | `scripts/download_guitar.js` | constant | zero_importers |

---

## Notes d'Analyse
1. **Entry Points** : `src/main.jsx`, `vite.config.js`, `package.json`, etc. sont marqués comme "morts" car rien ne les importe au sein du code source, mais ils sont essentiels au build/runtime.
2. **Scripts** : Les fichiers dans `scripts/` sont des outils utilitaires.
3. **ErrorBoundary** : Semble inutilisé dans la version actuelle.
4. **useUIState** : Ce hook semble avoir été remplacé par `AppContext` ou une autre logique.
