# 🎛️ Vmu: VisualMusic Coach

🌍 **[Jouer à Vmu en ligne (Live Demo)](https://visualmusiccoach.netlify.app)**

Vmu est une application web interactive innovante conçue pour aider les musiciens (guitaristes, bassistes, pianistes et producteurs) à comprendre la théorie musicale de manière visuelle et auditive. Apprenez l'improvisation, maîtrisez le manche de votre instrument, et entraînez-vous sur des rythmes générés en temps réel !

---

## 🚀 Fonctionnalités Principales

### 🎹 Moteur Harmonique & NNS (Nashville Number System)
Vmu décode la matrice des tubes mondiaux ! L'application utilise le **Nashville Number System (NNS)** pour afficher la structure des progressions d'accords (ex: la fameuse boucle `1 - 5 - 6- - 4` de la Pop moderne). D'un simple clic, basculez entre la notation standard (A, B, C) ou l'analyse en chiffres romains (I, IV, vi) pour comprendre la fonction de chaque accord dans son contexte.

### 🧠 Psychologie des Modes (Topographie des Émotions)
La musique est une affaire de couleurs émotionnelles. Vmu catégorise et vous enseigne la psychologie derrière chaque Mode Musical :
* **Ionian (Majeur) :** Joyeux, Triomphant (Pop Moderne, Techno)
* **Dorian :** Nostalgique, Jazzy (Funk, Disco, Psytrance)
* **Phrygian :** Sombre, Exotique (Trap, Metal)
* **Mixolydian :** Bluesy, Entraînant (Classic Rock)
* **Aeolian (Mineur) :** Mélancolique, Épique (House, Boom Bap)

### 🎼 Voice Leading Automatique
Ne sautez plus brutalement d'un accord à l'autre ! Le moteur algorithmique de Vmu gère automatiquement le **Voice Leading**. Lorsque vous naviguez dans une progression, l'application calcule le renversement (Inversion) le plus proche mathématiquement pour assurer une transition fluide et professionnelle, et vous indique quel renversement est actuellement joué (ex: *1er renversement, Tierce à la basse*).

### 🥁 Séquenceur & Boîte à Rythmes Temps Réel (Tone.js)
Plus de 15 styles musicaux authentiques intégrés (Hip-hop, House, Rock, Metal, Reggae, Oriental, etc.). Manipulez le BPM en direct et entraînez-vous au rythme d'une vraie section basse/batterie qui suit vos changements d'accords !

### 🎸 Instruments Interactifs (Cliquables)
Visualisez vos gammes et vos accords simultanément sur un Piano, une Guitare (6 cordes) et une Basse (4 cordes). Les composants sont 100% interactifs : cliquez sur une touche ou une case pour jouer la note exacte à la bonne octave !

---

## 🛠️ Stack Technique

* **Framework :** React.js (Vite)
* **Audio Engine :** Tone.js
* **Architecture :** Composants modulaires (PianoKeyboard, Fretboard, PianoRoll)
* **CSS :** Variables dynamiques injectées selon le genre musical sélectionné.

## 🤝 Contribuer

Créé et développé par Gabriel Resende.  
N'hésitez pas à forker ce projet, ouvrir une PR ou soumettre une *issue* !

☕ **[M'offrir un café sur Ko-fi](https://ko-fi.com/gabrielgsdresende)**