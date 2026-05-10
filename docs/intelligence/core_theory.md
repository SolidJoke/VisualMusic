# Théorie Musicale Fondamentale

Référence pour le moteur de calcul `theory.js` et `harmonyEngine.js`.

## 1. Gammes et Modes
### Modes Diatoniques
| Nom | Structure | Caractère |
| :--- | :--- | :--- |
| **Ionien (Majeur)** | T-T-1/2-T-T-T-1/2 | Brillant, Standard |
| **Dorien** | T-1/2-T-T-T-1/2-T | Jazz, Mélancolie noble |
| **Phrygien** | 1/2-T-T-T-1/2-T-T | Espagnol, Dark Metal |
| **Lydien** | T-T-T-1/2-T-T-1/2 | Onirique, Mystérieux (#4) |
| **Mixolydien** | T-T-1/2-T-T-1/2-T | Blues, Rock (b7) |
| **Éolien (Mineur Nat)** | T-1/2-T-T-1/2-T-T | Triste, Classique |
| **Locrien** | 1/2-T-T-1/2-T-T-T | Instable, Tension (b5) |

## 2. Set Theory (Forte Numbers)
Pour l'analyse de clusters complexes, VisualMusic utilise la Set Theory pour identifier la "Prime Form" d'un ensemble de notes :
- **Interval Vector** : Pour quantifier la consonance/dissonance.
- **Normal Form** : Pour réduire tout accord à sa forme la plus compacte.

## 3. Voicings et Conduite de Voix (Voice Leading)
### Principes
1. **Économie de mouvement** : Faire bouger chaque voix du plus petit intervalle possible lors d'un changement d'accord.
2. **Éviter les Quintes/Octaves parallèles** : Règle classique pour préserver l'indépendance des voix.
3. **Shell Voicings** : Priorité à la Tierce et la Septième pour définir la couleur de l'accord.

## 4. Rythmes et Polyrythmie
- **Euclidean Rhythms** : Algorithmes de distribution uniforme des frappes (Bjorklund).
- **Polymétrie** : Différentes longueurs de boucles (ex: 4/4 contre 7/8).
- **Groove/Swing** : Micro-décalages (offsets) par rapport à la grille.
