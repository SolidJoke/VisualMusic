# Getting Started — VisualMusic Coach (Vmu)

## Prerequisites
- Node.js 20 or higher
- npm 10 or higher
- A modern browser with Web Audio API support (Chrome 90+, Firefox 88+, Safari 15+)

## Installation

```bash
git clone https://github.com/SolidJoke/VisualMusic.git
cd VisualMusic
npm install
```

## Available Scripts

- `npm run dev`: `vite` - Lancer l'application en mode développement.
- `npm run build`: `vite build` - Compiler l'application pour la production.
- `npm run lint`: `eslint .` - Vérifier la qualité du code avec ESLint.
- `npm run preview`: `vite preview` - Prévisualiser le build de production localement.
- `npm test`: `vitest run` - Lancer tous les tests unitaires une seule fois.
- `npm run test:watch`: `vitest` - Lancer les tests en mode watch.
- `npm run test:coverage`: `vitest run --coverage` - Générer un rapport de couverture de code HTML dans `coverage/`.
- `npm run screenshots`: `node scripts/take_screenshots.js` - Prendre des captures d'écran de l'application.

## Project Structure

- `src/`: Code source principal de l'application (composants React, contexte, hooks, logique métier et moteur audio).
- `public/`: Fichiers statiques (images, polices, etc.) accessibles publiquement.
- `scripts/`: Scripts utilitaires pour le projet, comme la génération de captures d'écran.
- `docs/`: Documentation du projet.

## Key Source Folders

| Folder | Purpose |
|--------|---------|
| `src/components/` | React UI components |
| `src/context/` | React Contexts (AppContext, MusicEngineContext, PlaybackContext) |
| `src/hooks/` | Custom React hooks (useMusicEngine, useSequencer, etc.) |
| `src/audio/` | Tone.js audio engine and scheduling |
| `src/core/` | Pure business logic: music theory, fingering, composition engine |
| `src/i18n/` | Translations (French/English) |
| `src/styles/` | Theme CSS files (vintage, modern) |

## Running in Development

```bash
npm run dev
```

Opens at http://localhost:5173

## Running Tests

```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
npm run test:coverage  # Coverage report in coverage/
```

The test suite contains 828 tests. All tests must pass before submitting a PR.

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. This folder is deployed manually to Netlify.

## Architecture Overview

Vmu est construit sur une stack moderne utilisant React 19 et Vite, offrant des performances élevées et un développement rapide. L'architecture sépare clairement l'interface utilisateur, la logique métier et l'état global. L'application est un environnement hybride proposant deux modes principaux : "Studio" pour la composition et l'harmonie, et "Dictionary" pour l'exploration des accords et des gammes.

Le moteur audio repose sur Tone.js, permettant une synthèse en temps réel et un séquençage précis. Cela permet de jouer des progressions d'accords et des rythmes de manière interactive. La logique musicale (Nashville Number System, Voice Leading) est séparée dans `src/core/` pour être testable indépendamment.

L'état global est géré de manière optimisée grâce à trois contextes React distincts : `AppContext` pour l'état général de l'interface (langue, thèmes, navigation), `MusicEngineContext` pour la théorie musicale (notes, doigtés, gammes), et `PlaybackContext` pour l'état du séquenceur (lecture, BPM). Cette séparation garantit que les changements rapides du séquenceur ne provoquent pas de re-rendus inutiles des composants visuels lourds.

## Adding a New Feature — Checklist

- [ ] Create a feature branch from `main` (never commit directly to `main`)
- [ ] Write or update tests for any new business logic in `src/core/`
- [ ] Run `npm test` to verify all tests pass
- [ ] Run `npm run build` to verify the build succeeds
- [ ] Open a Pull Request targeting `main`

## Deployment

Deployment is manual:
1. Run `npm run build`
2. Upload the `dist/` folder to Netlify
3. The live app is at https://visualmusiccoach.netlify.app
