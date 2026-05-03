# Base de Connaissances Théoriques : VisualMusic Intelligence

**Contexte du document** : Ce fichier est le fruit d'une collaboration avec un expert musical visant à transformer l'agent (Antigravity/Aria) et l'application VisualMusic. L'objectif est de passer d'un simple "dictionnaire d'accords statique" à un **Assistant à la Composition Intelligente**, capable de guider l'utilisateur à travers des concepts harmoniques avancés tout en gardant une interface claire.

**Document lié** : `visualmusic_intelligence_specs.md` contient les spécifications techniques détaillées et les critères d'acceptance.

---

## Backlog des Sujets Traités (Phase Théorique — Complète)
- [x] Musique Dodécaphonique (Acquis)
- [x] Tension et Résolution (Acquis)
- [x] Structures d'Accords et Clusters (Acquis)
- [x] Gammes : Structures et Modes (Acquis)
- [x] Harmonie Tonale : Fonctions et Dominantes Secondaires (Acquis)
- [x] Musique Modale : Marqueurs et Interchange Modal (Acquis)
- [x] Composition : Formes et Orchestration (Acquis)
- [x] Atonalité : Set Theory et Sérialisme Intégral (Acquis)
- [x] Rythmique Avancée : Polyrythmie et Mesures Asymétriques (Acquis)
- [x] Micro-tonalité : Intervalles non-occidentaux (Acquis - Priorité Basse)
- [x] Physique du Son : Série Harmonique et Résonance (Acquis)
- [x] Illusions Sonores : Fondamentale Manquante et Psycho-acoustique (Acquis)

---

## Pistes d'Évolution VisualMusic — Fonctionnalités Identifiées

> Cette section rassemble les idées de fonctionnalités issues de nos discussions. Pour les specs techniques détaillées (structures de données, algorithmes, critères d'acceptance, tests), voir `visualmusic_intelligence_specs.md`.

### EPIC-01 : Refactoring Architecture (Prérequis Absolu)
`App.jsx` est actuellement monolithique. Toute la logique musicale doit migrer dans `src/core/` avant d'ajouter de nouvelles fonctionnalités. Objectif : éviter l'effet "usine à gaz".
- Créer : `src/core/harmonyEngine.js`, `src/core/voicingEngine.js`, `src/core/acousticEngine.js`
- Centraliser l'état dans un hook `useAppState.js` (Zustand ou Context+useReducer)

### EPIC-02 : Dictionnaire Harmonique Enrichi
- **Sélecteur Classique vs Moderne (Avocat du Diable)** : Toggle permettant de basculer entre une analyse stricte (V7 → I obligatoire) et une analyse moderne (Jazz/Debussy : les accords de tension peuvent être stables en soi).
- **Mode Harmoniques** : Visualiser les harmoniques naturelles d'une note sur le clavier, la guitare et la basse. Inclure une modale pédagogique expliquant l'écart en cents entre le tempérament égal et la série naturelle (Just Intonation vs Equal Temperament).
- **Palettes d'Émotions** : Traduire le jargon technique (ex: "Interchange Modal IV mineur") en suggestions émotionnelles compréhensibles (ex: "Ajouter une touche de mélancolie").

### EPIC-03 : Alertes de Voicing et Jouabilité
- **Alertes** : Analyser la jouabilité d'un accord et afficher une alerte claire avec sa cause.
- **Suggestion** : Toute alerte doit être accompagnée d'un re-voicing suggéré, calculé par un moteur de règles statique (inversions + contraintes de span). Pas besoin d'IA pour cette feature.
- **Règles encodées** : Span > 4 frettes = alerte ; intervalles serrés dans le grave (< octave 3) = "bouillie" harmonique ; > 6 notes au piano = non jouable.

### EPIC-04 : Illusions Sonores et Psycho-acoustique
- **Basse Fantôme (Missing Fundamental)** : Suggérer les harmoniques (2f, 3f, 4f) à ajouter pour simuler une basse profonde sur de petits haut-parleurs (smartphones). L'utilisateur ne voudra pas toujours cet effet — accessible sur demande. Intégration Ableton : afficher les notes/fréquences à ajouter sur une piste VST.
- **Tons de Shepard** : Séquence créant une illusion de montée infinie. Visualiser via un Piano Roll pour faciliter la mise en place sur Ableton. Utilisation : créer des "build-ups" psycho-acoustiques intenses.
- **Déclencheur UX** : Bouton contextuel visible quand une note/accord de basse est sélectionné dans le mode Dictionnaire.

### EPIC-05 : Aide à la Structure Musicale
- Templates de structures (ABA, Rondo, Sonate) pour aider l'utilisateur à architecturer son morceau.
- Alertes si la progression d'accords ne correspond pas à la tension attendue de la section (ex: Tonique placée là où la Dominante est attendue).

### EPIC-06 : Workflow Rythmique Ableton
- Aide visuelle (grille) pour les polyrythmies et mesures asymétriques (5/4, 7/8, 11/8).
- Paramètre "Humanize" pour ajouter une variation aléatoire de vélocité et de timing.
- Long terme (roadmap) : VisualMusic en VST capable de générer et transférer des séquences MIDI directement dans Ableton.

### EPIC-07 : Intelligence "Sous-Marine" (Set Theory)
- Utiliser les vecteurs d'intervalles (Set Theory d'Allen Forte) pour calculer des variations d'accords et des suggestions logiques.
- Invisible à l'utilisateur : les maths restent dans `src/core/harmonyEngine.js`. Potentiellement activable via un mode supplémentaire (à déterminer lors de l'audit UX).

### EPIC-08 : Micro-tonalité (Priorité Basse)
- Intervalles non-occidentaux (quarts de ton). Support via MPE ou fichiers .SCL/.TUN pour Ableton Live 11+.
- Référence artistique : groupe Angine de Poitrine (guitares/basses micro-tonales).
- Inclure des "aimants à justesse" (pitch quantization) pour guider l'utilisateur.

---

## Contraintes Design et UX (Non-Négociables)

1. **VisualMusic n'est PAS conversationnel** : L'interaction se fait par menus et boutons, pas par langage naturel.
2. **Objectif absolu** : Ne pas compliquer l'interface. Chaque nouvelle feature doit être optionnelle et accessible via un mode ou bouton dédié.
3. **Audit UX obligatoire avant implémentation** : L'architecture technique (moteur de règles) et le design doivent être challengés ensemble pour s'assurer de la cohérence.
4. **Menus contextuels** : Les suggestions (voicing, harmonie, acoustique) s'affichent en fonction de la note/accord sélectionné, pas en permanence.

---

## Journal d'Apprentissage (Connaissances Musicales Validées)

### 1. Musique Dodécaphonique
- **Définition** : Méthode de composition de Schoenberg avec 12 sons "qui n'ont de rapport qu'entre eux", rompant avec la hiérarchie tonale.
- **La Série** : Suite ordonnée des 12 notes chromatiques. Manipulable sous 4 formes : Originale (P), Rétrograde (R), Inversion (I), Rétrograde de l'Inversion (RI). Potentiel de 48 formes par transposition.
- **Règle d'or** : Non-répétition d'une note avant l'épuisement de la série pour éviter toute polarisation vers une tonique.
- **Nuance** : L'expérimentation (ex: Alban Berg) peut inclure des résonances tonales, créant un hybride entre rigueur sérielle et mémoire tonale.

### 2. Tension et Résolution (Musique Tonale)
- **Définition** : Moteur émotionnel passant d'un état d'instabilité (tension, dissonance, triton) à un état de repos (résolution, consonance).
- **Le Pattern Diatonique** : La gamme majeure (Do) impose le modèle : **Ton - Ton - Demi-ton - Ton - Ton - Ton - Demi-ton**.
- **Notation Harmonique (Chiffrage Romain)** :
    - **I** : Tonique (Point de repos final).
    - **V** : Dominante (Point de tension maximale).
    - **V7** : Tension accrue par l'ajout d'une septième, contenant un Triton instable.
- **Conduite des Voix (V7 → I)** :
    - La **Sensible** (tierce du V, 7ème degré de la gamme) est attirée vers le haut d'un demi-ton vers la **Tonique**.
    - La **Septième** du V7 résout naturellement vers le bas, vers la tierce du I. Ce double mouvement conjoint résout le triton.
- **Tension non-harmonique** : Retards (Suspensions) et Appoggiatures créent des tensions mélodiques résolues conjointement.
- **Nuance "Avocat du Diable"** : Dans le Jazz ou chez Debussy, les accords de 7ème ou 9ème ne sont plus systématiquement traités comme des tensions à résoudre, mais comme des "couleurs" stables en soi. Un accord très dissonant peut être sa propre résolution selon le contexte stylistique.

### 3. Définitions Fondamentales
- **Gamme (Scale)** : Succession ordonnée de notes définissant "l'alphabet" d'un morceau. Caractérisée par son pattern d'intervalles.
- **Accord (Chord)** : Émission simultanée d'au moins trois notes ("le mot"). Traditionnellement construit par empilement de tierces.

### 4. Structures d'Accords et Clusters
- **Structures par Tierces** :
    - **Triades (3 notes)** : Majeure (fondamentale, 3M, 5J), Mineure (f, 3m, 5J), Diminuée (f, 3m, 5dim), Augmentée (f, 3M, 5aug).
    - **Tétrades (4 notes)** : Ajout d'une septième à la triade.
    - **Extensions** : Ajout de 9ème, 11ème, 13ème pour enrichir la couleur (Jazz, Impressionnisme).
- **Clusters (Grappes sonores)** : Accords construits par notes adjacentes (secondes). Créent une forte densité/texture, voire un effet de "bruit" (Cowell, Ligeti).
- **Application** : Suggestion d'enrichissements "texturels" (ex: ajouter une seconde à une triade) sans perdre la fonction harmonique de base.

### 5. Gammes : Structures et Modes
- **Variantes de la Gamme Mineure** :
    - **Naturelle (Éolien)** : Pas de sensible.
    - **Harmonique** : 7ème degré haussé (Sensible), créant un saut de 1.5 ton (sonorité orientale).
    - **Mélodique** : 6ème et 7ème degrés haussés en montant (pour éviter le saut de 1.5 ton), retour au naturel en descendant.
- **Les 7 Modes Grecs** (issus de la gamme majeure) — déjà implémentés dans `src/core/theory.js` (objet `MODES`) :
    1. **Ionien** : Majeur. Intervals: [2,2,1,2,2,2,1]
    2. **Dorien** : Mineur + **6te Majeure**. Intervals: [2,1,2,2,2,1,2]
    3. **Phrygien** : Mineur + **2de Mineure** (sombre, flamenco). Intervals: [1,2,2,2,1,2,2]
    4. **Lydien** : Majeur + **4te Augmentée** (aérien, onirique). Intervals: [2,2,2,1,2,2,1]
    5. **Mixolydien** : Majeur + **7me Mineure** (blues/rock). Intervals: [2,2,1,2,2,1,2]
    6. **Éolien** : Mineur naturel. Intervals: [2,1,2,2,1,2,2]
    7. **Locrien** : Diminué (**5te diminuée**). Intervals: [1,2,2,1,2,2,2]
- **Nuance Contextuelle** : Le mode se définit par la relation entre la mélodie et la basse/pédale, pas seulement par les notes utilisées.

### 6. Harmonie Tonale : Fonctions et Dominantes Secondaires
- **Fonctions Tonales** : I (Tonique/Repos), IV (Sous-Dominante/Éloignement du repos), V (Dominante/Tension).
- **Cadences (Ponctuation)** :
    - **Parfaite (V → I)** : Point final.
    - **Plagale (IV → I)** : Fin douce, "Amen".
    - **Rompue (V → VI)** : Surprise, relance.
    - **Demi-cadence (arrêt sur V)** : Virgule, attente.
- **Dominantes Secondaires (V/X)** : Utiliser l'accord de dominante d'un *autre* degré que la tonique (ex: V7/V → V) pour créer une micro-tension directionnelle sans moduler de tonalité.

### 7. Musique Modale : Marqueurs et Interchange Modal
- **Philosophie** : Musique d'ambiance et de "couleur". On évite la cadence V → I pour ne pas revenir au tonal. Utilisation fréquente de **pédales/bourdons**.
- **Marqueurs Modaux** : Accords spécifiques contenant la "note caractéristique" du mode pour le signer (ex: accord de IV majeur en Dorien). La note caractéristique est déjà encodée via `targetInterval` et `magicNote` dans `MODES`.
- **Interchange Modal (Emprunt)** : Emprunter un accord à un mode parallèle (ex: en Do Majeur, emprunter le IVm mineur issu de Do Mineur). Outil puissant pour des changements de couleur émotionnelle soudains (Cinéma, Pop).

### 8. Composition : Formes et Orchestration
- **Formes Musicales (La structure temporelle)** :
    - **Binaire (AB)**, **Ternaire (ABA)** (ex: Couplet/Refrain/Couplet).
    - **Rondo (ABACA)** : Thème principal A revenant entre des épisodes.
    - **Sonate** : Exposition de deux thèmes, Développement (conflit), Réexposition.
- **Orchestration et Instrumentation** :
    - **Tessiture** : Étendue jouable d'un instrument de l'aigu au grave.
    - **Texture** : Monophonie (une ligne), Homophonie (mélodie + accords), Polyphonie/Contrepoint (plusieurs lignes indépendantes).
    - **Voicing** : Espacement des notes d'un accord pour l'équilibre. Règle générale : espacer les graves, resserrer les aigus (suit la série harmonique). Déjà partiellement géré par `getClosestInversion()` dans `theory.js`.

### 9. Atonalité : Set Theory et Sérialisme Intégral
- **Set Theory (Allen Forte)** : Analyse mathématique de la musique atonale. Les notes deviennent des "Pitch Classes" (0 à 11). On étudie les ensembles (Sets), leurs formes normales/primes et leurs vecteurs d'intervalles pour trouver des structures sous-jacentes.
- **Sérialisme Intégral** : Application du principe de la série à *tous* les paramètres du son : Hauteurs, Durées, Intensités, Timbres et Articulations.
- **Application VisualMusic** : Utiliser `getIntervalVector(pitchClasses)` dans `harmonyEngine.js` (à créer) pour alimenter les suggestions sans exposer les maths à l'utilisateur.

### 10. Rythmique Avancée : Polyrythmie et Mesures Asymétriques
- **Polyrythmie (X contre Y)** : Superposition de cycles rythmiques différents sur une même pulsation (ex: 3 pour 2).
- **Mesures Asymétriques (Odd Meters)** : Signatures 5/4, 7/8, 11/8. Déplace les accents naturels.
- **Nuance "Avocat du Diable"** : La rigueur mathématique peut tuer le groove. Nécessité de fonctions "Humanize" (variation aléatoire de vélocité et timing).
- **Application Workflow** : `DAWHelper.jsx` et `PianoRoll.jsx` existent déjà. Étendre `PianoRoll` pour supporter `totalSteps` variables et afficher des grilles multi-lignes (polyrythmie).

### 11. Micro-tonalité : Intervalles non-occidentaux
- **Concept** : Division de l'octave au-delà des 12 demi-tons standard (ex: quarts de ton).
- **Référence** : Groupe Angine de Poitrine (guitares/basses micro-tonales).
- **Contrainte Technique** : Ableton Live 11+ via MPE ou fichiers .SCL/.TUN. Nécessite des instruments virtuels compatibles.
- **Nuance "Avocat du Diable"** : Risque de perception de "fausseté". VisualMusic devrait inclure des "aimants à justesse" (pitch quantization).

### 12. Physique du Son : Série Harmonique et Résonance
- **Série Harmonique** : Suite naturelle de fréquences (partiels) au-dessus d'une fondamentale. Les 8 premiers partiels couvrent : Fondamentale, Octave, Quinte (+12 MIDI), Octave+, Tierce M (+28 MIDI, -14 cents vs tempéré), Quinte+, 7ème naturelle (+34 MIDI, -31 cents vs tempéré), Double Octave.
- **Résonance Sympathique** : Phénomène où une source sonore fait vibrer un autre corps partageant les mêmes harmoniques.
- **Application (Voicing)** : Plus une note est grave, plus ses harmoniques sont audibles → intervalles serrés dans le grave = "bouillie" sonore. Règle d'or : écarter les notes dans le grave, les resserrer dans l'aigu.
- **Nuance "Avocat du Diable"** : Le Tempérament Égal (notre système) fausse légèrement les intervalles naturels pour permettre la modulation. La Just Intonation est acoustiquement pure mais limite la modulation.
- **Note de développement** : Les 8 partiels avec leurs déviations en cents sont encodés dans `getHarmonicSeries()` de `acousticEngine.js` (à créer).

### 13. Illusions Sonores : Fondamentale Manquante et Psycho-acoustique
- **Fondamentale Manquante (Missing Fundamental)** : Le cerveau recrée une note de basse inexistante si ses harmoniques (2f, 3f, 4f) sont présentes. Exemple : jouer Do3 + Sol3 + Do4 → perception de Do2.
- **Tons de Shepard** : Illusion d'une mélodie qui monte à l'infini. Créée par superposition de plusieurs gammes chromatiques (séparées d'une octave) dont les volumes suivent une enveloppe en cloche. Utilisé par Hans Zimmer (Dunkerque, The Dark Knight).
- **Psycho-acoustique** : Étude de la perception sonore. L'utilisateur ne voudra pas toujours ces effets — ils sont accessibles sur demande, jamais automatiques.
- **Critères d'Acceptance (Ableton)** :
    - *Basse Fantôme* : Afficher les notes à ajouter sur une piste Ableton pour obtenir l'effet. Long terme : export VST/MIDI.
    - *Shepard* : Afficher la séquence dans `PianoRoll.jsx` avec vélocités enveloppées. Long terme : export MIDI.

---

## Synthèse Finale
L'ensemble de ces connaissances forme un socle solide, structuré et détaillé, pour transformer VisualMusic d'un simple dictionnaire d'accords en un véritable **Assistant à la Composition Intelligente**. La phase théorique est complète. La prochaine étape est l'**Audit Design/UX et l'implémentation des Epics par ordre de priorité**, en commençant obligatoirement par EPIC-01 (Refactoring Architecture).
