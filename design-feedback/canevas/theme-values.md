# VMU-082 — valeurs relevées dans l'app (theme-modern)

Relevé le 2026-09-18 par la conversation e30e91fa, build réel `vite preview` (http://localhost:4173),
`dist` construit depuis `main` à `933eb68`, Chromium du panneau, viewport émulé 3840 × 2020 puis 390 × 844, dpr 1.
Styles **calculés** (`getComputedStyle`), jamais `tokens.css`.

## Piège confirmé

Les variables lues sur `:root` sont celles de `tokens.css` (`--role-root: hsl(0,85%,65%)`, rouge).
Le thème réel est la classe `theme-modern` du `body` ; lues sur le `body`, les mêmes variables valent
`--role-root: #00f3ff`. Toute lecture de thème doit se faire sur un élément sous `body.theme-modern`.

## Couleurs (body.theme-modern)

| Rôle | Valeur | Source |
|---|---|---|
| fond de l'app | `#050505` | `.app-container` background-color ; `--lg-bg` |
| panneau | `rgba(15,15,20,.75)` | `--lg-panel-bg` ; `.piano-roll`, `.modal-container` |
| panneau élevé | `rgba(25,25,30,.85)` | `--lg-panel-bg-elevated` ; `.vintage-module`, `.piano-wrapper`, tuile choisie |
| bordure | `1px solid rgba(255,255,255,.15)` | `--lg-border` |
| liseré de sélection | `1px solid rgba(255,255,255,.55)` + `0 8px 32px rgba(0,0,0,.5)` | `.instrument-bar__tile.is-selected` |
| texte | `#f0f0f0` | `--text-primary` |
| texte secondaire | `rgb(129,136,152)` | `.instrument-bar__name` non choisie |
| texte tertiaire | `rgb(92,99,112)` | `.instrument-bar__range` non choisie |
| fondamentale | `#00f3ff` | `--role-root` (et `--lg-accent`, `--text-secondary`) |
| tierce | `#39ff14` | `--role-third` |
| quinte | `#0044ff` | `--role-fifth` |
| extension | `#b829ea` | `--role-extension` |
| note visée | `#fdfd96` | `--role-target` |
| accent de marque | `#a486ea` | `h1.app-title` color (= `--accent` hsl(258,70%,72%)) |
| pas actifs | kick `rgb(247,144,9)` · snare `rgb(46,144,250)` · hat `rgb(189,199,222)` · chords `rgb(255,183,130)` · bass `rgb(50,213,131)` | `.step-lamp.active.bg-*` |
| pas vide | `rgb(32,31,31)` + bordure `rgba(255,255,255,.15)`, rayon 4px | `.step-lamp` |
| boutons d'en-tête | fond `rgb(42,42,42)`, texte `#ccc`, 14px/600, 160 × 42, rayon 4 | `.btn-header-action` |

## Typo

- Corps : Hanken Grotesk 16px (`body`). Chiffres et pas : JetBrains Mono (`.bpm-badge`, `.track-name`, `.step-density-btn`).
- Barre d'instrument : Orbitron 14px/600 (nom), 18px/500 (registre).
- Étiquettes de la popup : 12,8px, majuscules, interlettrage .64px, **cyan** (`label.field-label`).
- Boutons segmentés et d'en-tête : **Arial** (ne reprennent pas la police du corps).
- Titre : « Vmu: VisualMusic Coach », 32px/700, `#a486ea`.

## Dimensions à 3840 × 2020

- Contenu central : x 615 → 3570 (2955 px) ; `.app-container` 4005 px de large (débordement de 165 px) ; page 2665 px de haut en Studio (défile).
- Séquenceur (Studio) : **1083 px** de haut ; 3 blocs (Boîte à Rythmes, Harmonic Sequencer, Séquenceur Mélodique), chacun avec sa densité 16/32/64, ses pages, son « Zoom » et son « ⬇️ MIDI ».
- Case de pas : **84 × 34 px**, écart 2 px ; conteneur 2739 px pour 16 cases.
- Clavier : 49 touches blanches de 50 × 200, noires 32 × 120.
- Manche guitare : pastilles 34 px (fondamentale 38 px, bordure 3px blanche, halo cyan).
- Barre d'instrument : tuiles 977 × 86.
- Popup Studio & Harmonie (Dictionnaire) : 1413 px de large ; 455 (Note) · 1025 (Accords) · 611 (Gammes) de haut.

## Téléphone 390 × 844

- Page de 3246 px de haut ; séquenceur 1608 px ; barre du bas 64 px (Studio, Dictionnaire, Play, Menu) ; tiroir « Menu ».

## Contenu réel repris sur le canevas

- Style « Pop Moderne (4 Accords) », Ionian, accordage Standard ; « La boucle d'accords la plus célèbre du monde. Évoque un voyage résilient. » ; Variation A / B.
- Progression : Do (I) · Sol (V) · Lam (vi) · Fa (IV). Score de jouabilité **98/100**, « Facile / Pop », « 1 saut(s) harmonique(s) brusque(s) ».
- Quick Start : Majeur II-V-I · Mineur ii-V-i · Pop Standard I-V-vi-IV · Turnaround Jazz I-vi-ii-V · R&B / Neo-Soul IV-iii-vi.
- Pas du style : Kick 0,8 · Snare 4,12 · Hat 0,2,…,14 · Chords 0,4,8,12 · Bass 0,8,14.
- Dictionnaire, Do majeur : « Stable, Joyeux » ; gammes Majeure (Ionian), Lydian, Pentatonique Majeure ; substitution « REL. MINOR:Am » ; suivants Fa, Do7.
- Notes à viser : Aucune · Ce qui dit majeur ou mineur · Les notes de couleur · Le squelette.
- Registres Do majeur (VMU-136, mesure du 2026-09-16) : piano Do4–Sol4 · guitare Do3–Mi4 (5 notes) · basse Do2–Do3 (sans tierce).
