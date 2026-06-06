# Rapport d'Audit UX/UI — VisualMusic
*Réalisé par ARIA (Lead Product Designer IA) suite à l'analyse des captures multi-résolutions.*

## 1. Vue d'ensemble
L'interface actuelle de VisualMusic présente une richesse fonctionnelle impressionnante, mais souffre d'un phénomène massif de **surcharge cognitive**. L'œil ne sait pas où se poser. En 4K, l'espace est mal exploité (composants très larges et étirés), tandis qu'en Tablet/Mobile (1024px et moins), l'interface est complètement inutilisable car la Sidebar occupe presque tout l'écran et la zone principale (séquenceur/fretboards) est tronquée.

## 2. Problèmes identifiés (Classés par priorité)

### P0 : Problèmes Bloquants (Responsive & Ergonomie de base)
- **Coupure de l'interface en Tablette/Mobile** : La structure actuelle ne s'adapte pas aux écrans plus petits. La barre latérale (Sidebar) conserve une largeur fixe trop importante, ce qui repousse et coupe le contenu principal.
- **Absence de scroll horizontal sur les séquenceurs/fretboards** : Les manches de guitare et les grilles du séquenceur sont étirés ou compressés de manière non contrôlée, ce qui casse la lisibilité des notes.

### P1 : Hiérarchie Visuelle et Surcharge Cognitive
- **Trop de points d'attention simultanés** : Le séquenceur (Boîte à rythmes, Accords, Basse), le clavier de piano, le manche de guitare ET le manche de basse sont tous affichés **en même temps**. Cela crée un mur d'information écrasant pour un apprenant.
- **Conflit des couleurs** : L'utilisation de couleurs très vives (néon) dans le séquenceur attire trop l'œil par rapport aux informations musicales fondamentales (le manche ou le clavier).
- **CTA Play (Action Principale)** : Le gros bouton "PLAY" orange dans la sidebar est bien visible, mais il est visuellement en concurrence avec les en-têtes jaunes vifs ("VMU : VISUALMUSIC COACH", "Mode Studio").

### P2 : Densité d'information, Espacement et Alignement
- **Densité du texte dans la Sidebar** : Les encarts explicatifs ("Comprendre le Mode Harmonique") sont très denses. Le texte gris sur fond sombre manque légèrement de contraste (Accessibilité WCAG).
- **Problème d'alignement** : Les grilles du séquenceur et les fretboards ne sont pas alignés sur une même grille de lecture verticale, rendant difficile la correspondance visuelle entre le temps (séquenceur) et la note jouée (manche).
- **Manque de respiration (Whitespace)** : Les composants sont empilés les uns sur les autres avec très peu d'espace (margin/padding) entre eux, ce qui donne une sensation d'étouffement.

## 3. Améliorations Proposées (compatibles avec le code existant)

*Conformément à la Design Bible, aucune fonctionnalité n'est supprimée, seule la présentation change.*

**1. Refonte de la hiérarchie de l'écran principal**
- **Mode Focus** : Permettre à l'utilisateur de choisir son instrument principal (Piano, Guitare ou Basse). Seul l'instrument sélectionné (P0/P1) reste déployé en grand. Les autres sont réduits dans un accordéon ou cachés derrière des onglets.
- **Séquenceur collapsable** : La "Boîte à rythmes" et le "Séquenceur mélodique" doivent pouvoir être réduits (collapsed) pour ne laisser qu'une vue condensée, libérant de l'espace pour l'instrument.

**2. Résolution du problème Responsive (Tablet/Mobile)**
- **>= 1080px (Laptop/Tablet Landscape)** : La sidebar doit devenir un panneau rétractable (Drawer/Offcanvas) déclenché par un bouton menu.
- **<= 768px (Mobile)** : Passer la navigation en Bottom Tabs (Studio / Dictionnaire). Les séquenceurs et fretboards doivent devenir scrollables horizontalement (overflow-x: auto) ou adapter leur affichage (ex: afficher uniquement la portion du manche active).

**3. Simplification Visuelle et Accessibilité**
- **Palette de couleurs harmonisée** : Réduire la saturation des couleurs secondaires. Réserver le orange/jaune vif uniquement aux actions principales (Play) et aux notes jouées à l'instant T.
- **Typographie et Contraste** : Aérer les textes explicatifs (augmenter le `line-height`), utiliser un gris plus clair pour les textes secondaires, et implémenter une grille stricte de 8px pour les marges entre les panneaux.
- **Cacher les infos "avancées"** : Le module "Math Composition Assistant" devrait être relégué dans un panneau "Avancé" ou une modale (The 90% Rule).

## Conclusion
Le produit est fonctionnellement puissant mais visuellement intimidant. En appliquant la règle "anti-surcharge" et en utilisant des panneaux repliables, l'expérience utilisateur passera d'un "tableau de bord technique" à une application d'apprentissage premium, aérée et focalisée.
