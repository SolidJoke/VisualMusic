> Claude Design's feedback of 2026-09-23, relayed by Gabriel and copied here verbatim by the coordinator. Adopted as
> **direction**, with the arbitration recorded in `decisions.md`. Written from the code at `d277303`, without rendering.

# VisualMusic — Feedback UX/UI (4K + mobile)

> Destinataire : agent Claude Code travaillant sur `SolidJoke/VisualMusic` (branche `main`, commit `d277303`).
> Source : lecture du code (`src/`). Le site déployé (visualmusiccoach.netlify.app) est une SPA, il n'a pas été rendu : **vérifier chaque point en navigateur avant de corriger**.
> Cibles : desktop 3840px CSS (LibreWolf, DPR 1) et mobile (Brave). Utilisateur débutant en musique. Écran OLED : noir pur, peu de surfaces claires.
> L'ergonomie prime ; des changements structurels sont acceptés.
> Des captures du site ont été fournies mais étaient illisibles ; ce document reste basé sur le code.

---

## Règles transverses (s'appliquent à tous les tickets)

1. **Aucun terme technique sans explication à un clic.** Tout mot du glossaire (§ Glossaire) est rendu via un composant `<Term id="…">` : soulignement pointillé, clic/tap → panneau d'explication avec un bouton « Écouter un exemple ». Le survol seul ne suffit pas.
2. **Tokens uniquement.** Aucune couleur hex en dur dans les composants. Tout passe par `tokens.css` + `modern-theme.css` / `vintage-theme.css`.
3. **Noir OLED.** `--lg-bg: #000` dans les deux thèmes. Les panneaux se distinguent par une bordure fine, pas par un fond gris plein.
4. **Une action = un seul endroit.** Play, BPM et le choix d'instrument ne doivent pas exister en 2 ou 3 exemplaires qui divergent.
5. **Taille minimale à 3840px CSS** : texte courant ≥ 18px, libellés ≥ 15px, cibles cliquables ≥ 40px. Sur mobile : cibles ≥ 44px, texte ≥ 15px.

---

## P0 — Bloquant (ergonomie / lisibilité / compréhension)

### P0-1 · Le workspace 4K est une seule colonne
- **Constat** : `.main-layout-grid { display: block }` (`styles/layout.css`). À 3840px, tout est empilé verticalement (visualiseur → séquenceur → légende → piano → guitare → basse). L'utilisateur scrolle alors que ~2/3 de la largeur est vide ou étirée.
- **Action** : implémenter les layouts de la section « Layout — décision validée » (A-vertical ≥ 3840px, C en dessous). Utiliser `grid-template-areas`.
- **Critère d'acceptation** : à 3840×2160, transport, séquenceur, les 3 instruments et l'assistant sont visibles **sans scroll**. À 1920×1080, le héros et toutes les miniatures sont visibles sans scroll.

### P0-2 · Chevauchement sidebar / contenu
- **Constat** : la sidebar ouverte fait `340px` (`Sidebar.css`), mais le contenu est décalé de seulement `180px` (`body.sidebar-open .app-container-inner { padding-left: 180px }`). 160px de contenu sont masqués. De plus, `.sidebar-backdrop` est rendu sur desktop quand la sidebar est ouverte : un clic sur le contenu ferme la sidebar.
- **Action** : faire de la sidebar une colonne de la grille (pas `position: fixed` + padding manuel). Supprimer le backdrop hors mobile.
- **Critère** : aucun élément interactif ne se trouve sous la sidebar, quel que soit son état.

### P0-3 · Les outils « Math & Rythmes » sont cachés derrière une modale
- **Constat** : `CompositionPanel` n'est accessible que via le bouton sidebar « Math & Rythmes », qui ouvre une `Modal` (max-width 1440px) avec overlay. Le panneau **exporte en direct** vers le séquenceur (`exportSignature` → `handleExport`), mais la modale cache le séquenceur : l'utilisateur ne voit pas l'effet de ses réglages. Même chose pour « Studio & Harmonie » et « Instruments & Audio ».
- **Action** : sur desktop, ces trois panneaux deviennent des **panneaux ancrés** dans la grille (onglets dans une colonne « Assistant »), jamais des modales. La modale reste réservée au plein écran mobile.
- **Critère** : à 3840px, on modifie le cercle euclidien et on voit la piste du séquenceur changer dans la même vue.

### P0-4 · L'export automatique écrase une piste sans prévenir
- **Constat** : `exportTarget` vaut `"Kick"` par défaut. Dès le premier réglage, la grosse caisse du style est remplacée. Aucune annulation, seulement un flash de succès de 2 s.
- **Action** :
  - Afficher en permanence « Ce rythme remplace : [Kick ▾] » à côté du cercle.
  - Ajouter un état « Aperçu » (on entend le rythme sans modifier la piste) par défaut, et un bouton explicite « Appliquer à la piste ».
  - Ajouter « Annuler » (restaure la piste précédente) et garder « Tout réinitialiser ».
- **Critère** : ouvrir le panneau et toucher un curseur ne modifie aucune piste tant que l'utilisateur n'a pas appliqué.

### P0-5 · Jargon non expliqué dans l'assistant de composition
- **Constat** (`CompositionPanel.jsx`, `PolyrhythmAlgebraPanel.jsx`, `PhasingVisualizer.jsx`) : libellés en capitales comme `SUBDIVISIONS (n)`, `PULSES / BEATS (k)`, `ROTATION / SHIFT (r)`, `SELF-COMPLEMENTARY`, `ASYMMETRICAL`, `Mode M`, `TALEA PLS`, `COLOR LEN`, `BARYCENTER`, `⊕ OFFSET`, `VOICE 1 (STATIC)`. Aucun `InfoTooltip`. Le titre est rendu deux fois (`panel__title` + `<h3>`).
- **Action** :
  - Renommer par intention, avec la notation mathématique en second plan. Exemples : « Cases dans la boucle (n) », « Coups joués (k) », « Décalage du départ (r) », « Se complète lui-même », « Rythme en boucle de notes (isorythmie) », « Recaler sur la mesure » (au lieu de « Mode M »), « Équilibre du rythme » (au lieu de « Barycenter »).
  - Chaque libellé → `<Term>`.
  - Casse normale partout (pas de `text-transform: uppercase` sur les libellés longs).
  - Supprimer le titre en double et les vis décoratives `eurorack-screw`.
- **Critère** : aucun libellé du panneau n'est incompréhensible sans ouvrir le glossaire, et chacun y mène en un clic.

### P0-6 · Les bulles d'aide ne marchent qu'au survol
- **Constat** : `InfoTooltip` s'ouvre sur `onMouseEnter` uniquement. Sur mobile (Brave), elles sont inaccessibles. Au clavier aussi (pas de focus, pas de `button`).
- **Action** : transformer en `<button aria-expanded>` : ouverture au clic/tap/Entrée, fermeture sur Échap/clic extérieur. Contenu : 1 phrase simple + « En savoir plus » (ouvre l'entrée du glossaire) + « Écouter ».
- **Critère** : chaque aide s'ouvre au tap sur mobile et au clavier.

### P0-7 · Contraste et tailles à 4K
- **Constat** :
  - Thème modern : bouton actif `background: #00f3ff; color: #fff` → contraste ≈ 1,3:1 (illisible). Même chose pour `.note-marker.active`.
  - Tailles minuscules à DPR 1 : `.note-marker` 10px, `HarmonicSeriesPanel` 0.6rem (9,6px), boutons MIDI 10px, `.grid-index`, `field-label` 0.8rem.
  - `modern-theme.css` définit `--font-body: 'Orbitron'` puis force `font-family: 'Hanken Grotesk'` sur `.theme-modern` : la police réelle est incohérente.
- **Action** :
  - Texte sur accent néon = `#000`. Contraste ≥ 4.5:1 partout.
  - Ajouter une échelle typographique en tokens (`--fs-xs … --fs-xl`) et la multiplier au breakpoint desktop (ex. `:root { --ui-scale: 1 }` puis `@media (min-width: 2560px) { --ui-scale: 1.25 }`, `@media (min-width: 3840px) { --ui-scale: 1.5 }`). Toutes les tailles fixes en px → `calc(var(--fs-*) * var(--ui-scale))`.
  - Orbitron réservé aux titres et à l'afficheur BPM ; Hanken Grotesk pour tout le reste.
- **Critère** : aucun texte < 15px à 3840px, aucun couple texte/fond < 4.5:1.

### P0-8 · Thèmes pas adaptés à l'OLED
- **Constat** : `--lg-bg` vaut `#050505` (modern) et `#151515` (vintage, gris allumé sur toute la dalle). Les panneaux sont des `rgba()` gris translucides empilés → de grandes zones grises allumées. `Sidebar.css` code en dur `#1c1b1b`, `#262626`, `#a6c8ff`, donc la sidebar ignore le thème.
- **Action** :
  - `--lg-bg: #000` dans les deux thèmes. `--lg-panel-bg: transparent`, `--lg-panel-bg-elevated: #0a0a0a` (max) ; séparation par `--lg-border`.
  - États actifs en **contour + texte coloré** plutôt qu'en fond néon plein (moins de lumière, moins de marquage).
  - Remplacer toutes les valeurs en dur de `Sidebar.css`, `HarmonicSeriesPanel.jsx` (`#ff9999`, `#ccc`, `#888`), `PolyrhythmAlgebraPanel`/`CompositionPanel` (`polyColors`) par des tokens.
  - Anti-marquage : les éléments statiques (sidebar, header, titre) utilisent `--text-secondary`, pas le blanc pur. Option « Atténuer l'interface après 60 s sans action » (réduit l'opacité du chrome, pas des instruments).
- **Critère** : capture à 3840px en thème modern → > 85 % des pixels sont `#000`.

---

## P1 — Important

### P1-1 · Modes : le vocabulaire ne correspond pas à l'usage
- **Constat** : l'app a deux modes, « Studio » et « Dictionnaire » (libellés en dur en français dans `Sidebar.jsx` et `BottomNav.jsx`, hors i18n). Pour un débutant, l'usage est « Jouer / Composer-improviser / Son ».
- **Action** : proposer à l'utilisateur la carte suivante, puis l'appliquer si validée :
  - **Explorer** (ex-Dictionnaire) : choisir un accord ou une gamme, le voir sur les instruments, l'écouter.
  - **Composer** (ex-Studio) : style, grille d'accords, séquenceur, assistant math.
  - **Son** : volumes, instruments, métronome (aujourd'hui dans « Instruments & Audio »).
  - Libellés via `translations.js`. Chaque mode a une phrase d'aide d'une ligne sous son nom.

### P1-2 · Transport en triple exemplaire
- **Constat** : Play existe dans la sidebar (« ▶ Play / ■ Stop »), dans `SequencerPanel` (« ▶ Play / ⏸ Pause », + un 2e contrôle BPM en curseur) et dans `BottomNav`. Le même bouton s'appelle Stop à un endroit et Pause à l'autre. Le métronome est un glyphe `●/○` sans texte.
- **Action** : une seule barre de transport (Play/Stop, BPM, métronome, position dans la mesure) placée selon la direction de layout. Supprimer `sequencer-mobile-controls` sur desktop. Métronome : icône + libellé « Métronome ». BPM : `<Term id="bpm">` + boutons −/+ et saisie directe.

### P1-3 · Header surchargé
- **Constat** : thème, notation, Guide, Théorie, langue, À propos (et Debug) dans une rangée qui déborde dès 1280px (commentaire VMU-134). Le bouton thème affiche le nom du thème **cible**, ce qui porte à confusion.
- **Action** : garder dans le header : titre, notation US/EU (utile en permanence), bouton « Aide ». Déplacer thème, langue, À propos dans un menu « Réglages ». Le sélecteur de thème affiche le thème **actuel** avec un contrôle segmenté.

### P1-4 · Couleurs de rôle ambiguës (thème modern)
- **Constat** : `--role-root: #00f3ff` = même couleur que l'accent de sélection `--lg-accent`. On ne distingue plus « note fondamentale » et « note active ». `--role-scale: #ff007f` (rose vif) rend les notes de gamme, les moins importantes, plus visibles que la tierce ou la quinte.
- **Action** : accent de sélection ≠ couleurs de rôle. Notes de gamme = contour neutre discret. Tester la palette en simulation daltonisme (deutéranopie : root rouge vs third vert dans `tokens.css`).

### P1-5 · Alertes de voicing peu utiles
- **Constat** (`VoicingAlert.jsx`) : repliée par défaut, fermable définitivement, suggestions affichées en `<span>` non cliquables.
- **Action** : titre explicite (« Cet accord est difficile à jouer : les doigts sont trop écartés »), suggestions en boutons qui **appliquent et jouent** le voicing proposé, « Masquer pour cet accord » au lieu d'un masquage global. « Voicing » et « renversement » → `<Term>`.

### P1-6 · Série harmonique repliée et peu lisible
- **Constat** (`HarmonicSeriesPanel.jsx`) : dépliée seulement ≥ 2560px ; grille fixe 4 colonnes ; « cents » non expliqué ; code couleur rouge/jaune/gris non légendé.
- **Action** : légende en clair (« proche de la note du piano », « légèrement faux », « nettement faux ») ; clic sur une harmonique = la jouer ; `<Term>` sur « harmonique », « cents », « tempérament égal ». À 4K : 16 colonnes sur une ligne, hauteur de barre proportionnelle à l'écart en cents.

### P1-7 · Notes cibles : bon principe, mal placé
- **Constat** : `TargetNotesSelector` nomme les presets par intention (bien). Mais il est enfoui dans les modales Studio/Dictionnaire, loin des instruments où les notes s'allument.
- **Action** : placer le sélecteur juste au-dessus des instruments, à côté de la légende. Quand un preset est actif, la légende affiche une phrase dynamique (« En doré : les notes qui disent si c'est majeur ou mineur »).

### P1-8 · Légende déconnectée
- **Constat** : `TheoryLegend` est un panneau pliable séparé (max-width 800px), plié ou non indépendamment des instruments.
- **Action** : légende compacte en une ligne, collée en haut du bloc instruments, toujours visible. Chaque pastille est cliquable : met en évidence les notes de ce rôle sur tous les instruments.

### P1-9 · Modes de l'assistant présentés comme des interrupteurs indépendants
- **Constat** : Phasing, Isorythmie, Mode M, Polyrythmes sont des switchs, mais s'excluent mutuellement dans le code. « Afficher les compléments » est lui un vrai switch.
- **Action** : contrôle segmenté « Outil : Euclidien · Déphasage · Isorythmie · Recalage · Polyrythmes », chaque segment avec `<Term>`. Chaque outil affiche une phrase « Ce que ça fait » + un préréglage « Essayer un exemple » (ex. Déphasage → Clapping Music).

---

## P2 — Amélioration

- **P2-1** · `mousemove` global met à jour `--mouse-x/y` sur `documentElement` à chaque mouvement (`AppDesktop.jsx`) → recalcul de style sur toute la page 4K. Throttle avec `requestAnimationFrame` ou supprimer si l'effet « Liquid Glass » n'est plus utilisé.
- **P2-2** · `--theme-primary` est réécrit en inline par le style actif (Studio) ou en `#ffd700` (Dictionnaire), ce qui écrase le thème. Unifier `--accent`, `--lg-accent`, `--theme-primary` en un seul token d'accent ; la couleur du style devient un token secondaire (`--style-tint`) limité à un filet.
- **P2-3** · `backdrop-filter: blur(12px)` sur `.glass-panel` et la légende : inutile sur fond noir pur, coûteux à 4K. Supprimer.
- **P2-4** · Emojis dans les titres de modales et boutons (🎭 📐 🎛️ 🎹 ❓ 💡) : rendu variable selon l'OS, pas thémables. Remplacer par un jeu d'icônes monochromes cohérent.
- **P2-5** · Piano roll : bouton « Zoom » par piste. À 4K, afficher directement en taille zoomée (cases 32×24 définies dans les thèmes).
- **P2-6** · Raccourcis clavier (`useKeyboardShortcuts`) : les afficher dans l'Aide et en infobulle des boutons (ex. « Play (Espace) »).
- **P2-7** · Premier lancement : un parcours de 3 étapes (écouter un accord → le voir sur les instruments → le mettre dans un rythme), désactivable.

---

## Layout — décision validée par l'utilisateur

| Largeur CSS | Layout | Breakpoint (`useBreakpoint.js`) |
|---|---|---|
| ≥ 3840px (4K) | **A « Établi », instruments à la verticale** (repli : B si la verticale échoue) | nouveau `WIDE` ≥ 3840 |
| 768 – 3839px | **C « Focus + contexte »** | `DESKTOP`/`TABLET` |
| < 768px | **C mobile** (héros = écran, miniatures en carrousel) | `PHONE` |

Contrainte de l'utilisateur : **piano, manche de guitare et manche de basse ne doivent jamais être rétrécis en colonne à l'horizontale.** Soit pleine largeur à l'horizontale, soit à la verticale.

### A-vertical — 4K (≥ 3840px)

```
┌──────┬─────────────────────────────────────────┬──────┬──────┬──────┬───────────────┐
│ RAIL │ TRANSPORT ▶ ♩120 Métronome  Mesure 2/4  │PIANO │GUIT. │BASSE │ ASSISTANT     │
│ 96px ├─────────────────────────────────────────┤vert. │vert. │vert. │ 880px         │
│      │ SÉQUENCEUR (64 pas, pleine largeur)     │      │      │      │ [Harmonie |   │
│ Expl.│                                         │grave │sillet│sillet│  Math | Son]  │
│ Comp.├─────────────────────────────────────────┤ en   │ en   │ en   │               │
│ Son  │ Légende · Notes cibles                  │ bas  │ haut │ haut │ Cercle, poly… │
│      ├─────────────────────────────────────────┤      │      │      │               │
│ Aide │ Grille d'accords / progression          │~300px│~320px│~240px│ Glossaire     │
└──────┴─────────────────────────────────────────┴──────┴──────┴──────┴───────────────┘
grid-template-columns: 96px minmax(0,1fr) 300px 320px 240px 880px
Les 3 instruments occupent toute la hauteur utile (~1950px).
```

Spécifications instruments verticaux :
- **Guitare/basse** : sillet en haut, frettes vers le bas (même sens qu'un diagramme d'accord, déjà familier aux débutants). À ~1950px de haut, 24 frettes ≈ 80px/frette. Cordes graves à gauche.
- **Piano** : aigus en haut, graves en bas. 4 octaves = 28 touches blanches ≈ 68px chacune. Touches noires vers la droite.
- **Textes toujours horizontaux** (noms de notes, numéros de frettes, doigtés) : on tourne la géométrie, jamais le texte. Ne pas faire un `transform: rotate(90deg)` sur les composants existants : ajouter une prop `orientation="vertical"` à `Fretboard.jsx` et `PianoKeyboard.jsx` et recalculer la mise en page (CSS grid inversée).
- Chaque instrument peut être replié en une bande de 48px (titre vertical) pour rendre de la place au séquenceur. Repli = état existant `collapsedSections`.
- `PositionSelector` passe au-dessus de chaque colonne d'instrument.
- **Test de validation** : afficher un accord et une gamme sur les 3 instruments et vérifier en 3840×2160 que les étiquettes (mode doigté et mode degré) restent lisibles (≥ 15px) sans chevauchement. Si le test échoue → basculer sur B.

### Repli B — « Console » (4K, si la verticale ne passe pas)

```
┌────────────────────────────────────────────────────────────────────┐
│ Explorer · Composer · Son       ▶  ♩120  Métronome        Aide ⚙   │
├────────────────────────────────────────────────────────────────────┤
│ SÉQUENCEUR pleine largeur                                          │
├──────────────────────────────┬─────────────────────────────────────┤
│ OUTIL MATH ACTIF             │ HARMONIE (accords, notes cibles)    │
├──────────────────────────────┴─────────────────────────────────────┤
│ Légende                                                            │
│ PIANO  pleine largeur, horizontal                                  │
│ GUITARE pleine largeur, horizontal                                 │
│ BASSE  pleine largeur, horizontal (chacun repliable)               │
└────────────────────────────────────────────────────────────────────┘
```
Instruments empilés mais **toujours en pleine largeur** ; seuls les panneaux non-instruments partagent une ligne.

### C — « Focus + contexte » (768 – 3839px, et mobile)

```
┌────────────────────────────────────────────────────┬───────────────┐
│ ▶ ♩120 ·  Explorer · Composer · Son                │ POURQUOI ÇA   │
├────────────────────────────────────────────────────┤ SONNE COMME ÇA│
│        ZONE HÉROS (un instrument OU un outil math) │ (repliable)   │
│        pleine largeur de la zone, horizontal       │               │
├──────────┬──────────┬──────────┬──────────┬────────┤               │
│ Piano    │ Guitare  │ Basse    │ Séquenc. │ Cercle │               │
│ mini     │ mini     │ mini     │ mini     │ mini   │               │
└──────────┴──────────┴──────────┴──────────┴────────┴───────────────┘
```
- Clic sur une miniature = elle devient le héros ; l'ancien héros devient miniature.
- Les miniatures restent synchronisées (notes allumées, curseur du séquenceur) : ce sont des rendus réduits en lecture seule, cliquables pour promouvoir.
- Nouvel état global `heroPanel` (`piano | guitar | bass | sequencer | math | harmony`) dans `AppContext`, persisté.
- < 1440px : le panneau « Pourquoi » passe en tiroir à droite.
- Mobile : héros plein écran, miniatures en carrousel horizontal au-dessus de la barre du bas, « Pourquoi » en feuille repliable.

---

## Mobile (Brave) — spécifique

- **M-1 (P0)** · `AppMobile.jsx` et `AppTablet.jsx` réexportent `AppDesktop`. Le mobile est le desktop avec une barre du bas ajoutée. Créer un vrai `AppMobile` : un instrument à la fois (sélecteur en haut), transport fixe en bas, assistant en feuille coulissante.
- **M-2 (P0)** · Cibles tactiles : boutons MIDI 10px avec `padding: 2px 6px`, pastilles de manche, `.grid-led` → minimum 44×44px de zone de tap (la zone peut dépasser le visuel).
- **M-3 (P1)** · Manche guitare/basse : scroll horizontal avec position de départ calée sur la zone jouée (`fretboardZone`) et indicateur de frettes hors écran. Proposer l'orientation paysage.
- **M-4 (P1)** · Libellés `BottomNav` : « Dict » est tronqué et opaque → noms complets des modes (P1-1).
- **M-5 (P1)** · Le tiroir « Menu » mélange les 3 panneaux métier et les réglages. Séparer : les outils dans la feuille assistant, les réglages dans « Réglages ».
- **M-6 (P2)** · `safe-area-inset-bottom` sur la barre du bas ; tester avec la barre d'adresse de Brave en bas.

---

## Par élément — résumé rapide

| Élément | Fichier(s) | Priorité | Action principale |
|---|---|---|---|
| Grille principale | `styles/layout.css`, `AppDesktop.jsx` | P0 | Grille CSS 4K (A/B/C) |
| Sidebar | `Layout/Sidebar.jsx/.css` | P0 | Colonne de grille, tokens, pas de backdrop desktop |
| Modales métier | `AppDesktop.jsx`, `Common/Modal.jsx` | P0 | Panneaux ancrés sur desktop |
| Assistant compo | `Intelligence/CompositionPanel.jsx` | P0 | Aperçu/Appliquer/Annuler, renommage, `<Term>` |
| InfoTooltip | `Common/InfoTooltip.jsx` | P0 | Clic/tap/clavier |
| Thèmes | `styles/*-theme.css`, `tokens.css` | P0 | `#000`, contraste, échelle typo 4K |
| Transport | Sidebar, `SequencerPanel`, `BottomNav` | P1 | Un seul exemplaire |
| Header | `Layout/AppHeader.jsx` | P1 | Réduire, menu Réglages |
| Couleurs de rôle | `modern-theme.css` | P1 | Distinguer rôle et sélection |
| VoicingAlert | `Intelligence/VoicingAlert.jsx` | P1 | Suggestions cliquables |
| Série harmonique | `Panels/HarmonicSeriesPanel.jsx` | P1 | Légende, jouable, tokens |
| Notes cibles | `Common/TargetNotesSelector.jsx` | P1 | Au-dessus des instruments |
| Légende | `Panels/TheoryLegend.jsx` | P1 | Une ligne, cliquable |
| Polyrythmes | `Intelligence/PolyrhythmAlgebraPanel.jsx` | P1 | Couleurs en tokens, libellés |
| Phasing | `Intelligence/PhasingVisualizer.jsx` | P1 | « Voix fixe / Voix décalée », exemple |
| Piano roll | `Sequencer/PianoRoll.jsx` | P2 | Zoom par défaut à 4K |

---

## Glossaire à implémenter (`<Term>`)

Définitions courtes pour débutant. À mettre dans `i18n/translations.js` (clé `glossary.<id>`), avec pour chacune un exemple sonore.

- **fondamentale** : la note qui donne son nom à l'accord (le « Do » de Do majeur).
- **tierce** : la note qui dit si l'accord est joyeux (majeur) ou triste (mineur).
- **quinte** : la note qui renforce l'accord ; elle sonne stable et neutre.
- **gamme** : l'ensemble des notes qui « vont bien » ensemble dans un morceau.
- **renversement** : le même accord, en changeant la note jouée en bas.
- **voicing** : la façon précise de répartir les notes d'un accord sur l'instrument.
- **shell voicing** : version allégée d'un accord qui ne garde que les notes essentielles.
- **BPM** : battements par minute, la vitesse du morceau.
- **métronome** : un clic régulier qui marque le tempo.
- **subdivision (n)** : le nombre de cases dans une boucle rythmique.
- **pulsation (k)** : le nombre de cases où un coup est joué.
- **rotation (r)** : décaler le point de départ de la boucle.
- **rythme euclidien** : répartir k coups le plus régulièrement possible dans n cases ; beaucoup de rythmes traditionnels suivent ce principe.
- **complément** : les cases vides du rythme, qui forment elles-mêmes un autre rythme.
- **déphasage (phasing)** : deux copies du même rythme, l'une décalée progressivement par rapport à l'autre.
- **isorythmie** : un rythme qui se répète avec une suite de notes de longueur différente, si bien que les combinaisons changent à chaque tour.
- **recalage sur la mesure** : forcer un rythme à recommencer au début de chaque mesure.
- **polyrythme** : plusieurs rythmes réguliers superposés (ex. 3 contre 4).
- **équilibre (barycentre)** : un rythme équilibré répartit ses coups de façon à ne pas « pencher » d'un côté du cycle.
- **série harmonique** : les notes plus aiguës qui résonnent naturellement quand on joue une note.
- **cents** : unité très fine pour mesurer un écart de hauteur (100 cents = un demi-ton).
- **tempérament égal** : l'accord du piano moderne, où tous les demi-tons ont la même taille.
- **notation US / EU** : C D E F G A B = Do Ré Mi Fa Sol La Si.

---

## Ordre d'implémentation suggéré

1. P0-8 + P0-7 (tokens, noir, contraste, échelle) : base visuelle commune.
2. Prop `orientation` sur `Fretboard`/`PianoKeyboard` + test de validation A-vertical, puis P0-1 + P0-2 + P0-3 (C d'abord si plus rapide : il couvre toutes les largeurs < 3840).
3. P0-4, P0-5, P0-6 + composant `<Term>` + glossaire.
4. M-1, M-2 (vrai layout mobile).
5. P1 dans l'ordre, puis P2.

Chaque étape : ajouter ou mettre à jour les tests existants (`PhoneLayoutOverflow.test.js`, `InlineStyleOverflow.test.js`, `CompositionPanel.test.jsx`) et vérifier en navigateur à 3840px et 390px.
