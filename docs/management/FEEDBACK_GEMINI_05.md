# Feedback - Jules J-07 - Fix mobile layout

## Résumé
Le problème venait du fait que le layout des instruments et du main container n'avait pas de hauteur minimale explicite, ce qui causait leur disparition sur mobile (`height: 0`). De plus, les éléments internes tentaient d'afficher toute leur largeur (toutes les octaves, toutes les frettes, tous les steps) et débordaient du cadre.

## Actions prises
1. **App.css** : Ajout de règles explicites de layout (colonne flex, `min-height: 300px`) pour les conteneurs sur mobile.
2. **PianoKeyboard** :
   - Côté CSS : Hauteur forcée (`160px` conteneur, `120px` touches) et suppression du défilement horizontal. La largeur a été calculée précisément pour 14 touches blanches (2 octaves).
   - Côté JSX : Restriction par `useMediaQuery` pour n'afficher que les octaves centrales (`startOctave=1` à `endOctave=2`, soit C3 à B4 dans la nomenclature du composant).
3. **Fretboard** :
   - Côté CSS : Suppression de `min-width: 800px` et de la boîte de défilement horizontal.
   - Côté JSX : Restriction par `useMediaQuery` pour limiter le rendu de `numFrets` à 7.
4. **PianoRoll (Séquenceur)** :
   - Ajout d'une boîte de défilement pour la grille de séquence tout en limitant les labels pour qu'ils restent visibles. Largeur stricte imposée.
5. **Modal** :
   - Utilisation de règles `!important` avec `100vw`/`100vh`/`100dvh` pour forcer le plein écran sans tenir compte du positionnement parent.

## Validation
- `npx vitest run` : Les tests passent sans aucune régression.
- `npm run build` : Le build réussit sans erreur.
- Vérification visuelle Playwright : Les captures d'écran valident la vue plein écran des modales et l'ajustement du layout global.
