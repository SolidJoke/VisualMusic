# Implementation Plan: VisualMusic Fretboard & Layout Refactoring

L'objectif de ce plan est de corriger les 3 bugs (BUG-07, BUG-08, BUG-09) signalés tout en améliorant l'architecture du code pour éviter les régressions fréquentes causées par la complexité actuelle.

## User Review Required

> [!WARNING]
> **Changement Architectural Proposé (Fretboard & `computeFretMetadata`)**
> Actuellement, `computeFretMetadata` est une "fonction Dieu" massive qui calcule l'état de chaque case (actif, joué, rôle, doigté) en mélangeant la logique du Mode Studio, Mode Dictionnaire, Accords, et Gammes. Cette complexité est la source des régressions (comme BUG-09). 
> 
> **Proposition :** 
> 1. Simplifier la logique de `isVoicingMaskActive` dans `fretboardUtils.js` pour qu'elle s'applique strictement aux doigtés (gammes et accords). Une "Scale Box" ne doit pas activer un rectangle entier de cases, mais uniquement les notes explicitement définies dans son `fingeringMap`.
> 2. Séparer proprement le calque des statuts (O/X) dans `Fretboard.jsx` pour qu'il ne détruise plus la grille CSS principale (ce qui causait le BUG-08).

## Open Questions

Aucune question ouverte majeure. L'architecture proposée est locale au composant Fretboard et à ses utilitaires, ce qui limite le risque sur le reste de l'application.

## Proposed Changes

---

### Layout & CSS (BUG-07 & BUG-08)

#### [MODIFY] [App.css](file:///d:/IA/VisualMusic/src/App.css)
- **Modification :** Corriger `.magic-progression-container`.
- **Raison :** Retirer `grid-template-rows: repeat(2, auto)` pour utiliser `grid-template-rows: auto` afin que la grille ne réserve pas d'espace vide (rectangle rouge) si la progression n'a qu'une seule ligne.

#### [MODIFY] [Fretboard.css](file:///d:/IA/VisualMusic/src/components/Instruments/Fretboard.css)
- **Modification :** Ajustement des classes `.α1-status-row` et `.status-overlay-layer` (ou leurs équivalents locaux).
- **Raison :** Sécuriser leur placement dans la grille principale pour ne pas étendre les colonnes.

#### [MODIFY] [Fretboard.jsx](file:///d:/IA/VisualMusic/src/components/Instruments/Fretboard.jsx)
- **Modification :** Refactorisation de `renderStatusRow()`.
- **Raison :** Actuellement, ce div est inséré dans la grille sans `grid-column: 1 / -1`, ce qui double la largeur du manche. De plus, les marqueurs O/X se décalent car ils tombent sur la ligne 2. Nous allons imposer `grid-column: 1 / -1` et `grid-row: 1 / -1` sur le conteneur du statut, et `grid-row: 1` sur le calque des symboles.

---

### Fretboard Logic & Animation (BUG-09)

#### [MODIFY] [fretboardUtils.js](file:///d:/IA/VisualMusic/src/core/fretboardUtils.js)
- **Modification :** Refactorisation de la section "3. Voicing Masking" dans `computeFretMetadata`.
- **Raison :** Actuellement, si `α2.isScaleBox` est vrai, le code fait `α3 = fret >= α2.startFret && fret <= α2.endFret;` et active aveuglément toutes les cases du bloc, peu importe si les notes appartiennent à la gamme. 
- **Action :** Nous allons forcer la lecture de la map de doigté (fingering map) *même pour les Scale Boxes*. Ainsi, l'état "actif" et l'autorisation d'animation de lecture ne seront vrais que pour les notes exactes du doigté. Cela corrigera les notes hors-gamme qui s'affichent et les mauvaises cases qui s'illuminent pendant la lecture audio.

## Verification Plan

### Automated Tests
- Exécuter la suite de tests existante (`npm test`) pour s'assurer qu'aucune régression fonctionnelle n'a été introduite sur l'engin musical ou les utilitaires de fretboard.

### Manual Verification
1. **BUG-07 (Studio Mode) :** Ouvrir le mode Studio, sélectionner une progression de 4 accords, vérifier que le rectangle vide en bas a disparu et que l'espacement est compact.
2. **BUG-08 (Dictionnaire - Largeur & O/X) :** Ouvrir le mode Dictionnaire, choisir un accord (ex: C Major) ou une gamme, sélectionner une position. Vérifier que la largeur du manche reste normale et que les `O` / `X` (notes à vide/étouffées) sont bien alignés en haut à gauche des cordes correspondantes.
3. **BUG-09 (Dictionnaire - Notes de Gammes & Audio) :** Ouvrir le mode Dictionnaire, sélectionner "Scale", choisir une gamme majeure, puis sélectionner une "Position" (Scale Box).
   - Vérifier visuellement qu'il n'y a **pas de notes intruses** affichées hors de la gamme choisie.
   - Lancer la lecture audio (Play) de la gamme et s'assurer que **les animations s'illuminent exactement sur les bonnes cases**, au rythme de l'audio, sans activer toutes les notes de la même hauteur partout sur le manche.
