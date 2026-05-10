# Ontologie Paramétrique des Genres Musicaux

Ce document sert de base de connaissances pour le moteur d'assistance à la composition de VisualMusic. Il définit les caractéristiques techniques et esthétiques de 6 grandes familles musicales.

---

## 1. Jazz & Bossa Nova
### Profil Technique
```json
{
  "genre": "Jazz_Bossa_Nova",
  "rythmique": {
    "signature_temporelle": "4/4 (souvent 2-feel)",
    "placement_kick_snare": "Kick (Surdo) sur le 2ème temps. Snare (Rim click) en 'Clave Brésilienne'.",
    "ghost_notes_syncopation": "Ganzas (shakers) simulés par des ghost notes. Sway souple.",
    "vitesse_bpm": "70 - 120 BPM"
  },
  "ligne_de_basse": {
    "intervalles_privilegies": "Tonique (1) et Quinte (5). Notes de passage chromatiques.",
    "role_rythmique": "Semi-statique, fondation non-syncopée.",
    "articulation": "Legato, chaleur acoustique (Upright Bass)."
  }
}
```
### Théorie Harmonique
- **Tétrades** : Accords de 4 voix minimum (7èmes).
- **Extensions** : 9, 11, 13, #11, b9.
- **Accords clés** : Majeur 6/9, Mineur 9.
- **Anticipation** : Accords joués sur le "et" précédant le temps fort.

---

## 2. Rock & Heavy Metal
### Profil Technique
```json
{
  "genre": "Rock_Heavy_Metal",
  "rythmique": {
    "signature_temporelle": "4/4 (ou asymétrique Djent/Mathcore).",
    "placement_kick_snare": "Snare colossal sur 2 et 4. Kick verrouillé sur le Riffing guitare.",
    "vitesse_bpm": "100 - 140 (Rock), 200 - 280+ (Metal)."
  },
  "ligne_de_basse": {
    "intervalles_privilegies": "Tonique, Quinte, Octave. Modes Phrygien et Locrien (Triton).",
    "role_rythmique": "Métronomique, double exactement la guitare.",
    "articulation": "Staccato féroce (médiator), distorsion lourde."
  }
}
```
### Théorie Harmonique
- **Power Chords** : Dyades (1-5) sans tierce pour supporter la distorsion.
- **Modes** : Éolien (Heroic), Phrygien (Dark), Locrien (Chaos).

---

## 3. Reggae & Dub
### Profil Technique
```json
{
  "genre": "Reggae_Dub",
  "rythmique": {
    "signature_temporelle": "4/4 avec ressenti 'Swing/Shuffle'.",
    "placement_kick_snare": "One Drop : Kick + Snare sur le temps 3.",
    "vitesse_bpm": "80 - 110 BPM"
  },
  "ligne_de_basse": {
    "intervalles_privilegies": "1, 5, 8, 3m, 7m.",
    "role_rythmique": "Narrateur mélodique principal, 'Call and Response' avec le vide.",
    "articulation": "Sub-basse massive, étouffé (Staccato)."
  }
}
```
### Théorie Harmonique
- **Minimalisme** : Triades simples.
- **Skank** : Frappes staccato sur 2 et 4 (Off-beat).
- **Dub** : Déconstruction par soustraction, échos (Tape Delays) et réverbes à ressort.

---

## 4. Pop & Funk
### Profil Technique
```json
{
  "genre": "Pop_Funk",
  "rythmique": {
    "signature_temporelle": "4/4 strict.",
    "placement_kick_snare": "Funk : 'The One' (emphase sur le temps 1). Pop : Four-on-the-floor.",
    "vitesse_bpm": "90 - 120 BPM"
  },
  "ligne_de_basse": {
    "intervalles_privilegies": "1, 8, 5. 7m pour le groove. Slap & Pop.",
    "role_rythmique": "Locking parfait avec le Kick. Élastique.",
    "articulation": "Agile, percussive, silence fondamental."
  }
}
```
### Théorie Harmonique
- **Funk** : Statique (Vamp sur un accord 7/9/13).
- **Pop** : Narrative (I-V-vi-IV), accords suspendus (sus2, sus4).

---

## 5. Electronic (Techno / House / Synthwave)
### Profil Technique
```json
{
  "genre": "Electronic_Techno_House_Synthwave",
  "rythmique": {
    "signature_temporelle": "4/4 immuable.",
    "placement_kick_snare": "Kick 4-on-the-floor. Hi-hats sur le 'et'.",
    "vitesse_bpm": "120 - 150 BPM"
  },
  "ligne_de_basse": {
    "intervalles_privilegies": "1 (Rumble), Octaves (Synthwave).",
    "role_rythmique": "Sidechain compression (pompage).",
    "articulation": "Synthétique (ADSR), Plucks vs Pads."
  }
}
```
### Théorie Harmonique
- **Techno** : Atonalité, Rumble (réverbe kick filtrée).
- **House** : Accords parallèles transposés (Parallel Chords).
- **Synthwave** : Nostalgie rétro-futuriste (Éolien, Arpèges).

---

## 6. Urban (Hip-Hop / Trap / Afrobeat)
### Profil Technique
```json
{
  "genre": "Urban_HipHop_Trap_Afrobeat",
  "rythmique": {
    "signature_temporelle": "4/4 (ou Cross-rhythms Afrobeat).",
    "placement_kick_snare": "Trap : Half-time feel, Snare sur le 3. Hi-hat trills (32/64th notes).",
    "vitesse_bpm": "80 - 110 (Hip-Hop), 140+ (Trap)."
  },
  "ligne_de_basse": {
    "intervalles_privilegies": "Bashe 808 (Pitch-Glides).",
    "role_rythmique": "808 est la force mélodique motrice en Trap.",
    "articulation": "Distorsion harmonique nécessaire pour les smartphones."
  }
}
```
### Théorie Harmonique
- **Hip-Hop** : Sampling (Jazz/Soul loops).
- **Trap** : Minimalisme sombre (Mineur Harmonique).
- **Afrobeat** : Polyrythmie, Call & Response, transe modale.
