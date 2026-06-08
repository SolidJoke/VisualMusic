# Audit UX/UI - VisualMusic Coach (par Agent Stitch)

En tant que Lead Product Designer (inspiré par Duolingo, Ableton Live, et Notion), j'ai analysé les captures d'écran multi-résolutions de VisualMusic Coach. Le produit est fonctionnellement très riche, mais souffre de plusieurs problèmes d'utilisabilité qui augmentent la charge cognitive.

Voici l'audit classé par niveau de priorité (P0 à P3).

## P0 : Bloquants UX & Responsive (Immédiat)

1. **Chevauchement critique sur Mobile (Header)**
   - **Problème :** Sur `Studio_Mobile.png`, le titre "Vmu: VisualMusic Coach" (en rose vif) chevauche complètement les boutons d'action du header ("Zen Studio", "Guide d'utilisation").
   - **Impact :** Les actions principales sont inaccessibles au toucher et l'interface semble cassée.
   - **Recommandation :** Masquer le titre textuel sur mobile (ou utiliser un logo minimal) et intégrer les boutons d'action dans un menu "hamburger" ou un "overflow menu" (points de suspension) pour dégager l'en-tête.

2. **Débordement horizontal du Séquenceur (Mobile)**
   - **Problème :** Les grilles du séquenceur (Boîte à Rythmes) débordent de l'écran en largeur sur mobile, forçant un scroll horizontal laborieux ou coupant les informations.
   - **Impact :** Frustration majeure. Ableton gère cela en adaptant les vues à la taille de l'écran.
   - **Recommandation :** Remplacer les carrés du séquenceur par des versions plus compactes sur mobile, réduire le padding interne, ou basculer l'affichage par défaut de 16 à 8 pas (steps) sur les petits écrans.

## P1 : Hiérarchie Visuelle & Accessibilité (WCAG AA)

1. **Surcharge cognitive globale (Trop d'informations affichées)**
   - **Problème :** Sur QHD/Desktop, toutes les sections (Rythme, Harmonique, Mélodique) sont ouvertes en même temps avec la même importance visuelle. Le texte explicatif en rouge ("Aide DAW - Reproduire ce pattern") ressemble à une erreur système.
   - **Impact :** L'utilisateur (surtout débutant) ne sait pas où regarder. L'œil n'est pas guidé (contrairement à l'approche progressive de Duolingo).
   - **Recommandation :** Introduire un système de "Disclosure" (accordéons) inspiré de Notion. Seule la piste active devrait être pleinement déployée, les autres pourraient être réduites. Changer la couleur du texte d'aide (le rouge évoque le danger/erreur, utiliser un gris clair ou bleu pastel pour l'information).

2. **Accessibilité des contrastes (Typographie et Boutons)**
   - **Problème :** Le contraste entre le fond noir profond (#000000 ou #131313) et certains textes gris foncé (ex: les labels de notes sur le piano, ou les textes "32", "64" désactivés dans les blocs de pagination) est insuffisant pour la norme WCAG AA.
   - **Impact :** Difficile à lire dans environnements lumineux.
   - **Recommandation :** Relever la luminosité des gris inactifs (utiliser une nuance `gray-500` minimum). Le rose fluo du titre principal manque aussi d'harmonie avec les bleus/oranges du séquenceur.

## P2 : Espacement & Alignement (Grille 8px)

1. **Marges incohérentes et "Respiration" (Sidebar)**
   - **Problème :** Sur `Dictionary_Tablet.png`, la barre latérale occupe presque 30% de l'écran, compressant l'espace principal de travail. De plus, les boutons ("Studio & Harmonie", etc.) manquent d'espace respiratoire (padding) entre eux.
   - **Impact :** L'interface semble "étouffée" ou "écrasée" sur les résolutions intermédiaires.
   - **Recommandation :** Appliquer strictement une grille de 8px. Sur tablette, la barre latérale devrait se comporter soit en surcouche (overlay/drawer) temporaire, soit être réduite à de simples icônes (comme dans la vue de gauche de Notion ou Ableton).

2. **Alignement des contrôles du Header**
   - **Problème :** Les boutons du haut ont des tailles disparates et des icônes mal équilibrées visuellement.
   - **Recommandation :** Standardiser la hauteur des boutons (ex: 40px ou 32px), harmoniser la taille des icônes SVG, et utiliser un système de composants bouton unifié (Primaire, Secondaire, Tertiaire).

## P3 : Finitions & "Delight" (Micro-interactions)

1. **Manque d'états clairs (Hover/Active)**
   - **Problème :** Les états actifs des boutons (ex: le bouton "1" bleu fluo) sont très agressifs visuellement par rapport au reste de l'interface qui est assez sombre.
   - **Recommandation :** Utiliser des indicateurs d'état plus subtils (ex: fond légèrement éclairci + ligne sous le bouton pour l'état actif, typique des interfaces premium).

2. **Esthétique du Piano Virtuel**
   - **Problème :** Le dégradé violet/rose sur les touches de piano ("C") fait un peu "jeu flash" et casse le côté "pro" du reste de l'interface.
   - **Recommandation :** Remplacer par un halo doux (glow) depuis le haut de la touche, ou une simple pastille colorée de bon goût (à la Ableton).

---
**Conclusion :** 
Pour préparer la génération des 3 variantes (UX-03), nous devons nous concentrer sur l'épuration du header (particulièrement sur mobile), l'implémentation de composants repliables pour réduire la surcharge cognitive, et l'harmonisation de la palette de couleurs/contrastes. Toutes les fonctionnalités actuelles seront conservées mais mieux rangées !
