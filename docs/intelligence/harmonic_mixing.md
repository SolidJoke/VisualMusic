# Guide de Mixage et Composition Harmonique (Open Key)

Ce document détaille les règles de compatibilité basées sur le système **Open Key** (ou Camelot Wheel) utilisé pour les transitions harmoniques.

## 1. Le Système Open Key
Le système divise les tonalités en un cercle de 1 à 12, avec deux anneaux :
- **Ring d (Outer)** : Gammes Majeures.
- **Ring m (Inner)** : Gammes Mineures.

### Correspondance (Exemple)
| Note | Majeur (d) | Mineur (m) |
| :--- | :--- | :--- |
| **C (Do)** | 8d | 5m |
| **G (Sol)** | 9d | 6m |
| **F (Fa)** | 7d | 4m |
| **A (La)** | 11d | 8m |

## 2. Règles de Compatibilité
Pour une assistance à la composition sans automatisme, VisualMusic doit suggérer les zones suivantes :

### A. Transition Diatonique (Stable)
- **Même Clé** : (ex: 8d -> 8d).
- **Voisins Directs** : +/- 1 sur le même anneau (ex: 8d -> 7d ou 9d).
- **Relatif Majeur/Mineur** : Changement d'anneau sur le même chiffre (ex: 8d <-> 8m).

### B. Changement d'Humeur (Sauts)
- **Modulation par Quarte/Quinte** : Identique aux voisins directs dans ce système.
- **Interchange Modal** : Utiliser les accords du relatif mineur (ex: en 8d, suggérer des accords de 8m).

### C. Boost d'Énergie (Power Mix)
- **Saut de +2** : (ex: 8d -> 10d). Crée une montée d'énergie soudaine, utile pour les refrains ou build-ups.
- **Saut de +7** : (ex: 8d -> 3d). Transition dramatique.

## 3. Implémentation UI (VisualMusic)
- **HUD Harmonique** : Un indicateur discret (ex: "Key: 8d") avec des pastilles de couleur pour les tonalités voisines.
- **Highlighting** : Dans la liste des accords/gammes, marquer d'un symbole (ex: une étoile ou un glow) ceux qui respectent les règles de compatibilité avec la sélection actuelle.
