# Templates de Prompts Vibe Design (Stitch / IA)

Ce fichier liste les prompts testés et validés pour générer des maquettes et composants compatibles avec l'ADN de VisualMusic. À utiliser systématiquement avec Google Stitch ou d'autres IA de génération de design.

## 1. Prompt Global - Refonte d'Écran Principal (Desktop) - Style "Pro DAW"
**Objectif** : Générer l'interface principale (Studio) avec une approche DAW Professionnelle (Ableton Live), conservant une densité fonctionnelle élevée tout en étant structurée.

```text
Create a professional "Pro DAW" main studio interface for VisualMusic. 

Layout Structure:
- Sidebar (Left): Professional dark sidebar with a large 'PLAY' primary button. Below it, collapsible accordions for 'Style Controls' (Key, Mode, Tempo) and 'Math Composition Assistant' (Complexity, Density sliders). Use 1px borders and tight spacing (8px grid).
- Header: Minimal TopAppBar with navigation (Studio, Dictionary, Library, Academy) and user profile.
- Main Content (Top): High-density Multi-track Sequencer. Rows for Drums, Chords, and Bass. Grid-based layout. CRITICAL: Visualize velocity/intensity. High-velocity notes are solid Primary Blue (#2e90fa); low-velocity 'ghost' notes are semi-transparent/faded with a thin blue border. 
- Main Content (Bottom): Modular Instrument View with Tabs (Piano, Guitar, Bass). Piano tab is active. The Piano Roll should feature detailed keys with subtle glowing active states on specific notes to match the sequencer data.
- Detail: Use a strict 8px grid, #131313 surface, #262626 borders, and professional typography (Hanken Grotesk). The vibe is 'Linear meets Ableton'—premium, dark, and highly functional. Preserve all existing sliders and controls from the reference studio.
```

## 2. Prompt Variante Mobile
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
