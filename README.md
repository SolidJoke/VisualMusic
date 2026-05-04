# 🎛️ Vmu: VisualMusic Coach

🌍 **[Jouer à Vmu en ligne (Live Demo)](https://visualmusiccoach.netlify.app)**

Vmu est une application web interactive conçue pour aider les musiciens (guitaristes, bassistes, pianistes et producteurs) à maîtriser la théorie musicale de manière visuelle et auditive. Apprenez l'improvisation, maîtrisez le manche de votre instrument, et composez sur des séquences intelligentes générées en temps réel.

---

## 🚀 Fonctionnalités Clés

### 🎹 Intelligence Harmonique & NNS
Vmu utilise le **Nashville Number System (NNS)** pour décoder la structure des progressions d'accords. Basculez instantanément entre notation standard (A, B, C) et analyse fonctionnelle (I, IV, vi) pour comprendre le rôle de chaque accord.

### 🌊 Séquenceur Avancé (64 Steps)
Le séquenceur supporte désormais des cycles de **64 pas**, permettant des progressions d'accords riches et évolutives (ex: loops de 4 mesures). Le rendu visuel adaptatif affiche les blocs de durée réelle pour chaque accord.

### 🎸 Doigtés Anatomiques & Voicings
Visualisez vos gammes et accords sur Piano, Guitare (6 cordes) et Basse (4 cordes).
*   **Guitare** : Support des formes ouvertes (CAGED) et des barrés avec visualisation du doigté (1-4 ou I-M-A-m).
*   **Basse** : Patterns optimisés (Fondamentale-Quinte-Octave) adaptés aux genres musicaux.
*   **Ancrage** : Choisissez la corde de départ de vos accords pour explorer différentes positions sur le manche.

### 🧠 Psychologie des Modes & Genres
Plus de 20 genres musicaux (Psytrance, Jazz, Metal, Lo-Fi, etc.) avec des presets audio dédiés. La logique mélodique gère désormais les **intervalles relatifs** (ex: basse Psytrance alternant octave et quinte) pour un rendu professionnel.

### 💻 Export & Intégration DAW
Le **DAW Helper** intégré fournit un glossaire complet et des instructions pour reproduire les séquences dans votre logiciel favori (Ableton, FL Studio, Logic). Supporte les notations de hauteur (Pitches) et de vélocité.

---

## 🛠️ Stack Technique

*   **Core :** React 18 (Vite)
*   **Audio :** Tone.js (Moteur d'échantillonnage + Synthèse soustractive)
*   **Qualité :** Vitest (Tests unitaires), Puppeteer (Stress tests E2E)
*   **Stabilité :** Script d'intégrité custom contre la corruption de code.

## 👨‍💻 Pour les Développeurs

```bash
# Installation
npm install

# Lancer en mode dev
npm run dev

# Vérifier l'intégrité du code (détection de caractères corrompus)
npm run check

# Lancer les tests unitaires
npm test

# Build de production
npm run build
```

---

## 🤝 Crédits & Contribution

Créé et développé par **Gabriel Resende**.  
Ce projet est open-source. N'hésitez pas à forker, ouvrir une PR ou soumettre une *issue* !

☕ **[Soutenir le projet sur Ko-fi](https://ko-fi.com/gabrielgsdresende)**