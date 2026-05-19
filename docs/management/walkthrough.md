# Walkthrough — Stream-E : Intelligence de Composition

## COMP-08 — Polyrythmie et Rythmes Équilibrés (Théorie d'Andrew Milne)
**Branche** : `feature/comp-08-polyrhythm-algebra` | **Status** : ✅ Implémenté & Testé

### Ce qui a été fait

**Moteur algorithmique (`compositionEngine.js`)**

Trois fonctions pures ajoutées à la fin du moteur :

1. **`primeFactors(n)`** — Décomposition en facteurs premiers (tamis d'Eratosthène partiel). Exemple : `primeFactors(12)` → `[2, 2, 3]`.

2. **`isBalanced(pattern)`** — Vérifie si le barycentre (centroïde) des pulses projetés sur le cercle unité est ≈ (0, 0). Un rythme est équilibré si ses pulses forment la somme de polygones réguliers. Retourne `{ isBalanced, centroid: {x,y}, offset }`.

3. **`generateBalancedRhythm(n, operations)`** — Construit un rythme par algèbre de polygones. Chaque opération `{ k, offset, op: '+' | '-' }` ajoute ou soustrait les k pulses d'un k-gone régulier décalé. Système de "votes" pour résoudre les collisions.

**Tests unitaires (`compositionEngine.test.js`)**

- 3 nouvelles suites (primeFactors, isBalanced, generateBalancedRhythm)
- 17 nouveaux tests couvrant : cas limites (n≤0, vide, silence), cas nominaux (triangle, carré, soustraction, superposition)
- **616/616 tests PASS — zéro régression**

**Visualisation (`EuclideanCircle.jsx`)**

- Nouvelle prop `extraPolygons: Array<{ indices, color, op }>` 
- Chaque polygone extra est dessiné en SVG avec sa couleur propre et opacité 0.65
- Les soustractions (`op: '-'`) s'affichent en pointillés (`strokeDasharray`)
- Support de 2 points (segment de ligne) ou ≥3 points (polygone)

**Interface (`CompositionPanel.jsx`)**

- Nouveau switch "POLYRHYTHM ALGEBRA" — exclusif mutuellement avec Phasing, Isorhythm, Meshuggah
- État `showPolyrhythm` + `polyOps` (liste d'opérations de polygones, max 5)
- Section UI avec : badge de statut de balance (vert = équilibré, rouge = asymétrique avec %)
- Éditeur de lignes pour chaque opération (slider k, slider offset, select +/-, bouton ×)
- Bouton "+ ADD POLYGON" limité à 5 opérations
- Grille binaire du pattern résultant
- Cercle SVG mis à jour avec `extraPolygons` colorés par index
- **Correction du bug de props** : l'EuclideanCircle passait `subdivisions/pulses/rotation/currentStep` au lieu des vrais props `pattern/n/highlightIndex` — corrigé en même temps

**Styles CSS (`CompositionPanel.css`)**

- `.polyrhythm-section` (accent violet `#a78bfa`)
- `.balance-indicator` avec états `.balanced` (vert) et `.unbalanced` (rouge)
- `.poly-op-row`, `.poly-op-field`, `.poly-slider`, `.poly-add-btn`, `.poly-remove-btn`

### Principes théoriques appliqués (Andrew Milne)

Un rythme est **parfaitement équilibré** si et seulement si ses pulses, projetés comme vecteurs unitaires sur le cercle, ont une somme vectorielle nulle. Cela correspond exactement aux rythmes exprimables comme somme de polygones réguliers (`k-gons`) uniformément distribués. Exemples :
- Triangle (3-gon) sur 12 = `[1,0,0,0,1,0,0,0,1,0,0,0]` → **BALANCED** ✦
- Carré (4-gon) sur 8 = `[1,0,1,0,1,0,1,0]` → **BALANCED** ✦
- Tresillo E(3,8) = `[1,0,0,1,0,0,1,0]` → **UNBALANCED** ⊕ (offset ~0.25)

### Validation

```
Tests:  616 passed (616)
Files:  29 passed (29)
Exit:   0
```
