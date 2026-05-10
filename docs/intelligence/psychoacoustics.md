# Guide de Psycho-acoustique et Illusions Sonores

Ce document définit les concepts de physique du son et de perception auditive intégrés à VisualMusic.

## 1. Fondamentale Manquante (Missing Fundamental)
### Concept
Le cerveau humain perçoit une note fondamentale même si elle est physiquement absente du signal, à condition que ses harmoniques supérieures (2f, 3f, 4f...) soient présentes et cohérentes.

### Application (Aide à la Basse)
- **Cible** : Mixage pour petits haut-parleurs (smartphones, laptops).
- **Aide Visuelle** : Quand une note de basse (ex: E1) est sélectionnée, le HUD suggère d'ajouter E2, B2 et E3 avec des vélocités dégressives.
- **Visualisation** : Afficher ces "harmoniques fantômes" en couleur atténuée sur le clavier.

## 2. Tons de Shepard (Shepard Tones)
### Concept
Une illusion sonore créant une sensation de montée ou de descente infinie de la hauteur, sans jamais sortir d'une certaine plage fréquentielle.

### Application (Build-ups)
- **Mise en place** : Superposition de plusieurs gammes chromatiques séparées d'une octave.
- **Contrôle Dynamique** : Les octaves extrêmes (très aigu / très grave) ont un volume nul, tandis que l'octave centrale est au maximum.
- **Visualisation** : Afficher la "cascade" dans le Piano Roll.

## 3. Série Harmonique Naturelle
### Intervalles vs Tempérament Égal
VisualMusic doit informer l'utilisateur des écarts entre les harmoniques pures et les notes du clavier standard :
- **Quinte (Partiel 3)** : Presque identique (+2 cents).
- **Tierce Majeure (Partiel 5)** : Significativement plus basse (-14 cents) dans la nature.
- **7ème Naturelle (Partiel 7)** : Très basse (-31 cents).

> [!TIP]
> Utiliser ces informations pour suggérer des voicings "acoustiquement purs" ou, au contraire, pour expliquer pourquoi certains clusters sonnent "faux" ou "boueux" dans les graves.
