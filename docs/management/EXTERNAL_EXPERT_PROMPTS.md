# Prompt pour Agent Expert : Intelligence Harmonique & Voice Leading

**Rôle** : Tu es un expert en théorie musicale appliquée (Piano, Guitare, Basse) et en algorithmique de composition.

**Objectif** : Générer un jeu de données JSON structuré pour alimenter le moteur d'un assistant de composition (VisualMusic).

**Livrables attendus** :
Fournis un bloc de code JSON unique contenant les sections suivantes :

### 1. `voiceLeadingRules`
Définit les règles de pondération pour choisir le meilleur doigté ou la meilleure inversion.
- `maxFretStretch`: (ex: 4) nombre max de frettes entre la note la plus basse et la plus haute.
- `jumpPenalty`: score de malus par frette de déplacement lors d'un changement d'accord.
- `stringStayBonus`: bonus de score si une note reste sur la même corde entre deux accords.

### 2. `harmonicSubstitutions`
Mapping des substitutions pour enrichir les progressions.
- `tritone`: Liste des substitutions de triton par type d'accord (ex: G7 -> Db7).
- `relativeMinor`: Liste des substitutions par mineur relatif (ex: C -> Am).
- `secondaryDominants`: Liste des dominantes secondaires pour chaque degré.

### 3. `extendedChords` (Compléments)
Fournis les intervalles (demi-tons) pour les suffixes suivants :
- `maj9`, `m9`, `dom9`
- `11th`, `13th`
- `7b9`, `7#9`
- `m7b5` (demi-diminué)

### 4. `instrumentRanges` (MIDI)
- `guitar_standard`: (ex: E2 to E6)
- `bass_standard`: (ex: E1 to G3)
- `piano_88`: (ex: A0 to C8)

**Contrainte Technique** : Le JSON doit être valide, sans commentaires, et prêt à être injecté dans une constante Javascript.
