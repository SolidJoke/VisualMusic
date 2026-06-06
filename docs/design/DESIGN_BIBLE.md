# Design Bible — VisualMusic

> Cette Design Bible définit les règles strictes de hiérarchie visuelle, de responsive design et de simplification pour le projet VisualMusic. Elle sert de référence absolue pour toutes les modifications d'interface et pour la génération de maquettes via IA (ex: Google Stitch).
> **Règle absolue : on ne modifie jamais une fonctionnalité métier. On modifie uniquement la manière dont elle est présentée.**

## 1. Objectifs Principaux
- Réduire la charge cognitive globale de l'interface.
- Améliorer la lisibilité et la rapidité d'utilisation.
- Obtenir une qualité visuelle proche d'un produit professionnel premium (inspirations: Linear, Notion, Duolingo, Ableton).

## 2. Design System & Esthétique
- **Grille** : Base 8 px pour tous les espacements.
- **Typographie** : 
  - Maximum 2 polices (une pour les titres/UI, une pour les éléments spécifiques si besoin).
  - Maximum 3 tailles de texte principales pour garantir une hiérarchie claire.
- **Couleurs** : Palette limitée avec un contraste respectant au minimum la norme WCAG AA.
- **Formes & Effets** :
  - Ombres discrètes (micro-élévations).
  - Bordures homogènes.
  - Border-radius uniforme sur l'ensemble des composants.

## 3. Hiérarchie Visuelle Stricte
L'interface doit TOUJOURS respecter cet ordre d'attention :
1. **Action principale** (ex: Lecture, sélection fondamentale)
2. **Information principale** (ex: Fretboard, clavier, note courante)
3. **Informations secondaires** (ex: Progression, options de mixage)
4. **Informations avancées** (ex: Réglages complexes, statistiques, debug)

**Règles d'or de la hiérarchie :**
- Ne **jamais** mettre deux Call-to-Action (CTA) primaires côte à côte.
- Ne **jamais** avoir plus de 5 zones attirant fortement l'œil simultanément sur l'écran.
- Tout panneau secondaire doit obligatoirement pouvoir être réduit (collapsible/accordion).

## 4. Règles Responsive (Breakpoints)

Le comportement de l'interface est dicté de façon stricte par la largeur de l'écran :

- **>= 2560 px (4K / Ultra-large)**
  - Interface complète et déployée.
- **>= 1440 px (QHD / Desktop standard)**
  - Les panneaux secondaires deviennent repliables.
- **>= 1080 px (FHD / Laptop)**
  - Une seule zone principale visible à la fois au centre de l'attention.
  - La sidebar devient compressible/réductible.
  - Les statistiques et informations moins critiques deviennent des panneaux superposés ou onglets.
- **<= 768 px (Tablette / Mobile)**
  - Navigation exclusive par onglets (Tabs) ou menu bas (Bottom bar).
  - Tous les panneaux deviennent plein écran lorsqu'ils sont ouverts.
  - Interdiction stricte de la double colonne (tout passe en une colonne).
  - Les tableaux de données deviennent des listes de cartes (cards).
  - Les menus complexes deviennent des bottom sheets (tiroirs bas).
  - **Le clavier/fretboard reste toujours visible** (priorité absolue).
  - Les actions principales restent accessibles avec le pouce (ergonomie mobile).

## 5. Hiérarchie Stricte des Composants (Ordre de dégradation)

Chaque composant reçoit une priorité (P0 à P4). Lorsque la largeur de l'écran diminue, les composants disparaissent ou se replient dans cet ordre :

- **P4 : Outils développeur** (disparaît en premier)
- **P3 : Historique, Statistiques, Réglages, Debug** (disparaît en deuxième ou caché dans un menu)
- **P2 : Progression, Score, Feedback** (devient repliable ou caché derrière une icône)
- **P1 : Lecture audio, Partition, Clavier/Fretboard** (Reste toujours visible)
- **P0 : Leçon active / Composant central du mode** (Reste toujours affiché en priorité absolue)

*Cette méthode évite que l'interface n'explose sur des résolutions comme 1080p.*

## 6. Règles de Simplification (Anti-Surcharge)

L'UI doit être constamment "nettoyée" en appliquant ces heuristiques :
- **Si plusieurs contrôles sont rarement utilisés** ➡️ Les placer dans un menu "Avancé" ou un tiroir (drawer).
- **Si plusieurs informations sont purement consultatives** ➡️ Utiliser un accordéon pour les masquer par défaut.
- **Si deux panneaux parlent du même sujet** ➡️ Les fusionner dans un seul composant clair.
- **Si une action est rarement utilisée** ➡️ La déplacer dans un menu contextuel (ex: clic droit ou menu "3 petits points").
- **Si plusieurs boutons réalisent une variante d'une même action** ➡️ Regrouper en un Bouton Principal + Menu déroulant (Split button / Dropdown).

## 7. Règle absolue "Anti-Surcharge" (The 90% Rule)
Chaque écran et chaque nouveau composant doit répondre à cette question :
> *"Si je retire ce composant, est-ce que 90 % des utilisateurs remarqueront son absence et seront bloqués ?"*

- **Si la réponse est NON** : Le composant DOIT être caché par défaut derrière une interaction (hover, accordéon, menu avancé, modal).

## 8. Utilisation de l'IA Générative (Google Stitch)
Pour générer des maquettes de remplacement, utiliser ce prompt template orienté "intention" :

> **Prompt Template Stitch :**  
> Redesign cette interface existante de VisualMusic.
> 
> Objectifs :
> - Apparence d'application premium (inspiration: Linear + Notion + Duolingo + Ableton).
> - Domaine: Apprentissage musical professionnel.
> - Très faible charge cognitive, design minimal et aéré.
> - Responsive {desktop/tablette/mobile}.
> - Toutes les fonctionnalités existantes doivent rester présentes mais les actions/infos secondaires DOIVENT être repliables ou cachées dans des menus.
> - Conserver une hiérarchie visuelle très claire (max 5 points d'attention).
> - Utiliser une grille moderne (8px) avec des bordures et arrondis uniformes.
> - Générer plusieurs variantes.
