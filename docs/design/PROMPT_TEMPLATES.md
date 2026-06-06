# Templates de Prompts Vibe Design (Stitch / IA)

Ce fichier liste les prompts testés et validés pour générer des maquettes et composants compatibles avec l'ADN de VisualMusic. À utiliser systématiquement avec Google Stitch ou d'autres IA de génération de design.

## 1. Prompt Global - Refonte d'Écran Principal (Desktop) - Style "Pro DAW"
**Objectif** : Générer l'interface principale (Studio) avec une approche DAW Professionnelle (Ableton Live), conservant une densité fonctionnelle élevée tout en étant structurée.

```text
Strict redesign of the VisualMusic Studio interface. You MUST NOT invent features (no compressors, EQs, or random audio effects). You MUST include the exact functionalities listed below. 

Left Sidebar (Control Panel):
1. Top Section: Mode switch (Studio / Dictionary). Large 'PLAY' button.
2. Section 'Style Musical': MUST include a dropdown for 'Genre' (e.g., Pop, Jazz, Rock) and a dropdown for 'Theme' (e.g., Epic, Sad). Do not omit these!
3. Section 'Paramètres d'Accords': Include a dropdown for 'Renversement' (Inversion).
4. Section 'Assistant Mathématique' (Collapsible): Sliders for 'Complexité Rythmique' and 'Densité'.

Main Area (Top) - Sequencer (PianoRoll):
- A grid matrix showing time horizontally.
- Must contain exactly 3 tracks visually distinct: 'Boîte à rythmes' (Drums), 'Séquenceur Harmonique' (Chords), 'Séquenceur Mélodique' (Bass).
- Show note cells in the grid. Active notes are solid Primary Blue. Ghost notes (low velocity) MUST be shown as dim/hollow squares with a blue border. 

Main Area (Bottom) - Instrument Tabs:
- A tab bar to select the visible instrument: [Piano] [Guitare] [Basse]. 
- Show the 'Guitare' tab active. 
- Technical constraint for Guitar: It MUST look like a guitar fretboard. 6 horizontal lines representing strings. Vertical lines representing 22 frets. Dots/circles on the fretboard to indicate active notes (e.g., C#, Eb), glowing in Primary Blue. Do not draw a literal wooden guitar, draw a precise technical fretboard diagram.
- Bottom Bar: Global BPM input/display, Master Volume slider.

Style: Dark Mode, Strict 8px grid, Pro DAW aesthetic (Ableton/FL Studio), borders #262626, surface #131313. Zero hallucinations.
```

## 2. Prompt "Reskin 4K" (Basé sur Screenshots)
**Objectif** : Demander à Stitch de re-designer l'interface exacte de VisualMusic en se basant sur des captures d'écran uploadées, sans modifier la structure 4K.

```text
CRITICAL INSTRUCTION: Base your design STRICTLY on the screenshots recently uploaded to this project. We are doing a 1-to-1 RESKIN of the 4K Desktop view. DO NOT hallucinate any new structural layouts.

1. Layout Preservation (4K View): Keep the exact structural arrangement shown in the screenshots. The main area must stack the Piano Keyboard, Guitar Fretboard, and Bass Fretboard exactly as they appear in the references. The sequencers must also remain where they are. 

2. Simplification via CTAs (Left Sidebar): Clean up the left Control Panel. Keep the primary controls visible (Play button, Mode Switch, Tempo, Genre). However, group the heavy/complex settings (like 'Math Composition Assistant' sliders or detailed chord inversions) behind clean CTA buttons (e.g. "⚙️ Advanced Settings" or "Edit Math Parameters") that represent popups. Do not delete the features, just hide them behind elegant buttons.

3. Aesthetic Upgrade (Pro DAW): Apply a premium dark mode (Ableton Live / FL Studio vibe). Use the Design System: #131313 background, #262626 subtle borders. Remove the old "neon" or "vintage" styling from the screenshots and replace it with clean, sharp 8px grid alignments, using Primary Blue (#2e90fa) for active elements and ghosted styling for low-velocity notes in the sequencer.
```

## 3. Prompt Variante Mobile
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

## 4. Prompt de Composant Spécifique (Ex: Fretboard)
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
