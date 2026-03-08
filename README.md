# 🎛️ VisualMusic DAW

VisualMusic est une station de travail éducative interactive (DAW) conçue pour démystifier la théorie musicale, l'harmonie et la production rythmique à travers de multiples genres (Psytrance, Metal, Reggae, Techno, Berlin School, etc.). 

Ce projet permet de comprendre d'un coup d'œil comment improviser une progression musicale, comprendre les gammes, et visualiser les rythmes.

## 🧠 Le Moteur Théorique
L'application repose sur des concepts de théorie musicale avancés, traduits visuellement :
* **Nashville Number System (NNS) :** Utilisation du système de Nashville pour représenter les progressions d'accords par des numéros (ex: 1, 4, 5) plutôt que par des lettres, permettant une transposition instantanée dans n'importe quelle tonalité [1, 2].
* **Harmonie Modale :** Le moteur calcule les intervalles pour les 7 modes majeurs (Ionien, Dorien, Phrygien, Lydien, Mixolydien, Éolien, Locrien), chacun apportant une nuance émotionnelle unique (ex: la tristesse de l'Éolien ou la tension du Phrygien) [3, 4].
* **Notes Magiques (Target Tones) :** Sur les instruments, la note caractéristique de chaque mode (comme la quarte augmentée #4 pour le mode Lydien, ou la seconde mineure b2 pour le Phrygien) s'illumine en doré pour guider l'improvisation [5].

## 🎸 Les Instruments Interactifs
* **Code Couleur Pédagogique :** Les notes sont colorées selon leur rôle dans l'accord (Rouge = Fondamentale, Bleu = Tierce, Vert = Quinte) pour éviter la surcharge visuelle [6].
* **Manches Intelligents :** Les manches de guitare et de basse s'adaptent dynamiquement aux accordages alternatifs (Drop D, Drop C) indispensables pour le Metal ou la Drum & Bass [7, 8].
* **Vues Modulables :** Une interface adaptative (écrans 4K) permettant de tout afficher ou de se concentrer via un système d'onglets (Séquenceurs, Piano, Guitares).

## 🥁 Les Séquenceurs (Rythme et Mélodie)
L'outil intègre des boîtes à rythmes fidèles aux règles d'or de la production de chaque genre :
* **Psytrance :** Motif KBBB (Kick, Bass, Bass, Bass) en 16èmes de notes, avec une vélocité réduite sur la première note de basse pour simuler l'effet de sidechain et laisser percer le Kick [9, 10].
* **Techno :** Implémentation du "Rumble" industriel via des kicks dupliqués et filtrés [11, 12].
* **Reggae :** Rythmique "One Drop" (Kick et Snare sur le 3ème temps) et technique du "Bubble" à l'orgue sur les contre-temps [13, 14].
* **Metal :** Double pédale de grosse caisse rapide et "Chug" (Palm Mute) à la guitare [15, 16].

---

## 📋 BACKLOG DU PROJET (V2.0)

**Tâches Complétées :**
- [x] Moteur NNS et Modes musicaux.
- [x] Instruments interactifs (Piano, Guitare, Basse) avec code couleur (Fondamentale, Tierce, Quinte).
- [x] Séparation Séquenceur Rythmique / Mélodique (gestion 16 ou 32 pas).
- [x] Matrice des genres (BPM, Accordage, Couleurs CSS dynamiques).
- [x] Accords de progression cliquables.
- [x] Mise en évidence de la "Note Magique" (Target Tone) en Doré.
- [x] Interface 4K avec système d'onglets (Mode Focus).
- [x] Variations rythmiques par genre.

**Prochains Chantiers (À développer) :**
- [ ] **Voice Leading (Inversions d'accords au Piano) :** Coder un algorithme pour que le piano calcule le chemin le plus court entre deux accords cliqués (ex: utiliser la 1ère ou 2ème inversion) afin de créer des transitions fluides sans "sauts" sur le clavier [17, 18].
- [ ] **Moteur Audio (Saint Graal) :** Intégrer l'API Web Audio (ou Tone.js) avec un bouton Play/Stop et un contrôle de volume pour faire résonner les séquences et les accords cliqués.

Étape 2 : Envoyer le code sur GitHub (Les commandes magiques)