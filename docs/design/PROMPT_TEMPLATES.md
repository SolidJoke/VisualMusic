# Templates de Prompts Vibe Design (Stitch / IA)

Ce fichier liste les prompts testés et validés pour générer des maquettes et composants compatibles avec l'ADN de VisualMusic. À utiliser systématiquement avec Google Stitch ou d'autres IA de génération de design.

## 1. Prompt Global - Refonte d'Écran Principal (Desktop)
**Objectif** : Générer l'interface principale (Studio) en réduisant drastiquement la charge cognitive.

```text
Redesign l'interface principale de l'application web 'VisualMusic'.
L'interface est décomposée en deux zones majeures :
1. Une Sidebar latérale (panneau de contrôle) contenant :
   - Un sélecteur de mode ("Studio" ou "Dictionnaire") en haut.
   - Un gros bouton d'action principale "PLAY" pour lire la séquence musicale.
   - Un panneau d'information éducative (collapsible).
   - Des contrôles de style musical (menus déroulants) et paramètres d'accords.
   - Un panneau "Assistant de composition mathématique" avec des sliders (collapsible).
2. Une zone de contenu principale très large (actuellement surchargée) avec :
   - Un séquenceur musical (Boîte à rythmes, Accords, Basse) : une série de grilles avec des cases activables.
   - Un clavier de piano complet affichant les notes jouées.
   - Un manche de guitare (6 cordes) affichant les accords.
   - Un manche de basse (4 cordes).

Objectifs stricts pour cette refonte (Vibe Design) :
- **Apparence d'application premium** (inspirations: Linear, Notion, Ableton Live).
- **Très faible charge cognitive** : l'interface doit paraître claire, minimale et aérée malgré la complexité métier.
- **Réduction de la superposition** : les informations secondaires doivent être repliables, masquées par défaut ou reléguées derrière des menus/tabs. Au lieu d'empiler tous les séquenceurs et manches d'instruments, proposer un design où l'utilisateur peut se focaliser sur l'essentiel (par exemple, un seul instrument principal visible, ou des tabs pour alterner).
- **Hiérarchie visuelle stricte** : max 5 points d'attention majeurs à l'écran. Ne pas abuser des couleurs néon, utiliser la couleur de manière chirurgicale (pour le bouton Play ou la note en cours de lecture).
- **Design System** : Utiliser le design system fraîchement configuré (grille 8px, bordures homogènes, couleurs sobres WCAG AA, ombres discrètes).

Génère la version "Desktop" idéale de cet écran principal (Mode Studio).
```

## 2. Prompt Variante Mobile (Prochaine Étape)
**Objectif** : Adapter le layout au format mobile (max 768px).

```text
À partir de l'interface Desktop générée précédemment, crée la version Mobile (largeur max 375px) pour l'application VisualMusic.

Contraintes Mobiles :
1. **Zéro Barre Latérale** : La sidebar devient une Bottom Navigation Bar (Tab Bar) contenant les modes (Studio, Dictionnaire) et un bouton central "PLAY" (P0).
2. **Panneaux de contrôle** : Les réglages (Style, Accords, Assistant Mathématique) doivent être déplacés dans une Modale (Bottom Sheet) qui s'ouvre via une icône "Réglages" en haut à droite.
3. **Zone Instrument (P1)** : Le manche de guitare ou le clavier de piano DOIT occuper la largeur complète de l'écran. Ajouter un scroll horizontal (`overflow-x: auto`) pour parcourir les notes. L'instrument est l'élément le plus important à l'écran.
4. **Séquenceur** : Afficher uniquement une version très condensée ou permettre de le masquer complètement pour laisser la place à l'instrument.
5. **Aesthetics** : Conserver le design system sombre, premium, inspiré de Linear/Ableton.
```

## 3. Prompt de Composant Spécifique (Ex: Fretboard)
**Objectif** : Redesigner un composant très spécifique sans toucher au reste de l'écran.

```text
Redesign le composant "Fretboard de Guitare" (manche à 6 cordes) pour VisualMusic.
- Il doit afficher 22 frettes.
- Style minimaliste sombre, type "outil pro".
- Les cordes sont de fines lignes gris clair (#404753).
- Les repères de frettes (points) sont des cercles subtils (#273143).
- Les notes activées doivent briller légèrement avec la couleur primaire (#2e90fa) et un léger drop shadow.
- Le nom de la note (ex: C#, Eb) doit être affiché au centre de la case activée, en police JetBrains Mono, taille 12px.
- Pas de gradients lourds ni d'effets 3D. Tout doit être flat et précis.
```
