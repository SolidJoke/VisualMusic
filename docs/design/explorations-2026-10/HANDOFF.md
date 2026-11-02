# Passation design — explorations A′ et téléphone (31 oct. – 2 nov. 2026)

Compte rendu pour l’agent qui reprend le travail. Il dit ce qui a été décidé, où sont les maquettes, ce que la lecture du code a révélé, et quoi faire ensuite, dans l’ordre.

Les maquettes sont des **références de design, pas du code de production**. Ne recopiez pas leur JavaScript dans `src/`. Reprenez les valeurs (tailles, couleurs, temps, textes), les comportements et les règles.

## 1. Où trouver les designs

| Quoi | Où |
|---|---|
| Ce compte rendu | `docs/design/explorations-2026-10/HANDOFF.md` |
| Maquettes autonomes, une page par sujet (s’ouvrent hors ligne dans un navigateur) | `docs/design/explorations-2026-10/*.html` |
| Sources des maquettes (le seul endroit à modifier) | `docs/design/explorations-2026-10/_src/` |
| Feuille de style commune : jetons recopiés de `tokens.css`, traitements « note qui joue » en CSS exact | `_src/shared.css` |
| Script commun : géométrie du manche vertical, d’après `verticalNeckGeometry.js` | `_src/shared.js` |
| Captures de l’app actuelle au téléphone (avant) | `_src/img/*.txt` (JPEG en base64) |
| Version en ligne (privée, compte du propriétaire) | https://claude.ai/artifact/ST6Tom9vnjvV9W782P2yQj |
| Branche | `claude/ecstatic-ride-nsmqna` (pas encore fusionnée dans `main`) |

Les pages :

| Page | Sujet | Statut |
|---|---|---|
| `index.html` | sommaire et décisions | — |
| `e1-position-gamme.html` | choisir la position d’une gamme sur le manche | **variante B retenue** (onglets et fils) |
| `e2-math-rythmes-dock.html` | Math & Rythmes en dock | **variante B retenue** (la phrase) ; inventaire des fonctions en bas |
| `e3-note-qui-joue.html` | distinguer la note qui joue de la note dessinée | **variante B retenue** (le projecteur) |
| `e4-telephone.html` | constat mobile mesuré, 10 principes, navigations 1 et 2 | **navigation 2 retenue** |
| `e5-navigation-2.html` | navigation 2 en détail : tiroir, écrans, tablette, portable 1080p, piano, inventaire complet des fonctions | référence de construction |

### Voir ou modifier une maquette

```bash
node docs/design/explorations-2026-10/_src/build.mjs
```

`build.mjs` recopie `shared.css`, `shared.js` et les images dans chaque page. Ne modifiez jamais les `.html` du dossier parent à la main : ils sont régénérés.

En haut de chaque page, quatre commandes :
- « 100 % » affiche la 4K à sa taille réelle (2560 px CSS) ;
- « Ajusté » la réduit à la largeur de la fenêtre ;
- « Réduit » simule `prefers-reduced-motion` ;
- « Muet » coupe le son.

Pour une capture : Chromium et Playwright sont installés dans l’environnement cloud. Ouvrez le fichier en `file://`. Chaque cadre de maquette a un `id` (`#a4k`, `#bph`, `#screens`, `#laptop`…) qu’on peut capturer seul.

## 2. Décisions (dans l’ordre où elles ont été prises)

**31 octobre**
1. Variante **B** pour les trois explorations :
   - **Position de gamme (E1 B).** Un onglet de 44 × 44 px posé à la première case de chaque position. Un fil fin (4 px, 8 px pour la position choisie) va jusqu’à la dernière case, dans 4 couloirs de 12 px (rail de 98 px).
     - Position choisie : dégradé Assistant. Grand écart (5 cases) : pointillé et ⚠.
     - Ruban « Do · Ré · … · Do » logé dans la ligne X/O du manche, vide pour une gamme : aucune hauteur ajoutée.
     - Départ Do3 / Do4 / Do5 : bouton « Do3 ▾ » en tête du rail.
     - Téléphone : 7 pastilles de 44 px, une ligne ‹ « Position 2 · cases 2 à 5 » › et un seul repère mauve le long du manche.
   - **Math & Rythmes (E2 B).**
     - La roue tourne sous un repère fixe, d’un pas par double croche, avec une transition linéaire de la durée d’un pas. L’angle suit le compteur total `currentStep`, jamais `currentStep % n`.
     - Les réglages forment une phrase : « 5 coups sur 16 cases, départ décalé de 0, joués par la grosse caisse ».
     - Mots remplacés : « ▲-1 k » → « Rythme 1 · 3 coups » ; « E(6,16) » → « 6 sur 16 » ; « Écart 12.8% » → point d’équilibre dessiné et un mot (« Équilibré », « Presque équilibré », « Penché »).
     - Les rythmes empilés passent en gris et se distinguent par le trait, au lieu des couleurs de piste.
   - **Note qui joue (E3 B, le projecteur).**
     - Pendant la boucle, toutes les pastilles passent à 40 % d’opacité, **sauf les notes de gamme à 60 %**.
     - Ce qui sonne revient à 100 %, avec `scale(1.1)`, un anneau `0 0 0 2px var(--bg), 0 0 0 4px var(--select)` et l’étiquette en 800.
     - Pour la note cible, l’anneau est repoussé à 6-8 px, au-delà des tirets jaunes.
     - Fondu de 120 ms ; aucun mouvement avec `prefers-reduced-motion`. CSS exact : `_src/shared.css`, règles `.tx-b`.
2. Au téléphone, **navigation 2, « la scène et le tiroir »**.
   - En haut : Dictionnaire · Studio et Aide.
   - Au milieu : l’instrument sur toute la hauteur.
   - En bas : un tiroir à trois hauteurs.
     - replié, 150 px (200 px au Studio) : ligne du choix, Piano · Guitare · Basse, ▶ ;
     - mi-hauteur, 55 % : choisir, progression, tempo ;
     - plein, 92 % : outils.
3. Clavier et manches **dans le sens de la longueur** de l’écran : verticaux en portrait, horizontaux en paysage.
4. **Paysage automatique**.
   - Il suit l’orientation sans jamais l’exiger.
   - Le tiroir devient une colonne de 248 px à droite.
   - Bouton « Plein écran » sur Android seulement.
5. Pas d’aperçu « les trois instruments » au téléphone.
6. **Visualiseur audio masqué au téléphone.**
7. Renommages : « Mode Doigté (Expert) » → **« Montrer le doigté »** ; « Explorateur libre » → **« Toutes les notes »**. Il faut les changer dans les 4 langues de `translations.js` (`fingeringToggleOn` et voisins, `freeExplorer`).
8. **Piano au téléphone : 2 octaves dans la scène** (Do3–Do5).
   - Touches noires dessinées à 75 % d’une blanche (25 à 28 px), au lieu de 58 %.
   - ‹ › pour changer d’octave.
   - Réglage « Grandes touches » (1 octave ½) dans Affichage.

**1er novembre**

9. **Un seul instrument sous 1440p**, soit moins de 2560 px CSS de large. C’est déjà le seuil `DESKTOP` de `useBreakpoint`, et il garde la 4K à 150 % en trois colonnes.
10. On peut **toujours choisir son instrument**.

**2 novembre**

11. **Piano par défaut**, au Studio comme au Dictionnaire, avec un sélecteur Piano · Guitare · Basse. Ensuite l’app retient le dernier choix pour chaque mode.
12. **Ce qu’on choisit = ce qu’on voit = ce qu’on entend.** L’instrument choisi est celui qui est dessiné et celui qui sonne, y compris pour les accords de la boucle du Studio. En 4K (trois colonnes), le nom de chaque colonne choisit l’instrument qui sonne.

## 3. Ce que la lecture du code a révélé (à corriger)

| # | Constat | Où | Effet |
|---|---|---|---|
| C1 | L’anneau « joue » est effacé sur les pastilles de couleur : `.note-marker.role-*` (même spécificité, écrit après) remet `box-shadow` à `0 0 0 2px var(--bg)`. | `Fretboard.css` l. 207 puis l. 241 et suivantes | Une note de couleur qui sonne n’a que `scale(1.1)`. C’est la première cause du « trop discret ». À corriger **avant** le projecteur. |
| C2 | Math & Rythmes n’envoie que les pas d’indice < 16, sans répéter le motif. | `CompositionPanel.jsx` `handleExport`, l. 134-170 | Pour n ≠ 16, ce qu’on voit n’est pas ce qu’on entend : avec n = 8, une demi-mesure de coups puis du silence. La piste doit répéter le cercle. |
| C3 | La boucle du Studio envoie les accords à la voix « piano » quel que soit l’instrument choisi. | `src/audio/dispatch.js` l. 193 ; `useStudioPlayback.js` ne gère que les clics | Contredit la décision 12. |
| C4 | Sur le manche vertical, la pastille fait 48 px (`--fbv-marker`) ; 32 px, c’est le manche horizontal. | `Fretboard.css` | À garder en tête pour les tailles. |
| C5 | À 2560 px CSS (4K à 150 %), `tokens.css` donne `--hit-min` 44 px et `--fs-label` 16,5 px. Les 48 px et 18 px des commentaires ne valent qu’à 3840 px CSS. Hauteur utile ≈ 1283 px, alors que les colonnes d’instruments font ≈ 1995 px. | `tokens.css`, `PrototypeA.css` | Les instruments d’A′ doivent se caler sur la hauteur de la fenêtre. |
| C6 | `AppMobile.jsx` ne fait que réexporter `AppDesktop`. | `src/AppMobile.jsx` | Le téléphone n’a pas d’écran à lui. |
| C7 | Au téléphone (mesuré à 390 × 760) : piano à 1985 px, guitare à 2287 px ; 28 contrôles sur 52 font moins de 44 px ; 71 éléments de texte sous 14 px ; séquenceur coupé après le 8ᵉ pas. | app actuelle | Voir `e4-telephone.html`, section « Ce qu’on voit aujourd’hui ». |
| C8 | Le bandeau « Frettes 1-5 » (`.fretboard-navigator`, en position absolue) recouvre le manche horizontal et cache des pastilles. | `Fretboard.css` l. 16 | Disparaît avec le manche vertical au téléphone. |
| C9 | Le menu du téléphone affiche deux sélecteurs de langue, dont un `select` natif blanc. La barre du bas floute un fond déjà opaque (`backdrop-filter`). | `AppDesktop.jsx` (tiroir de `BottomNav`), `BottomNav.css` l. 24 | Sobriété OLED, performance. |
| C10 | Le tiroir actuel du téléphone (`BottomNav.jsx`) est un menu plein écran, ouvert ou fermé. | `src/components/Layout/BottomNav.jsx` | Il faut un composant à trois hauteurs qui gère l’historique (bouton Retour). |

## 4. Prochaines étapes, dans l’ordre

Chaque étape est livrable seule. Elles suivent les conventions du dépôt : un ticket VMU par étape, tests jsdom et sonde Playwright quand ils existent (`scripts/s1_probe.mjs`, `aPrimeAccess.js`).

1. **Corriger la cascade « joue » (C1)** et poser le **projecteur** (E3 B) sur le manche vertical.
   - Valeurs : `_src/shared.css`, `.tx-b`.
   - Le manche doit savoir que la boucle tourne : il faut une classe « en lecture » sur le conteneur, pas seulement `currentlyPlayingNotes`.
   - Tenue : la note reste allumée tant qu’elle sonne, 100 ms au minimum (arpège de basse à la double croche).
   - Re-mesurer le contraste des étiquettes à 40 % (`VerticalNeckContrast.test.js`).
2. **Ce qu’on choisit = ce qu’on voit = ce qu’on entend (C3, décisions 11 et 12).**
   - Piano par défaut, mémorisé par mode.
   - La voix des accords de la boucle suit `playbackInstrument`.
   - En 4K, le nom de chaque colonne choisit l’instrument qui sonne : c’est déjà le cas pour les clics, il faut l’étendre à la boucle.
3. **Math & Rythmes : la piste répète le cercle (C2)**, puis le **dock**, variante B (`e2-math-rythmes-dock.html`). Tableau d’inventaire en bas de page : aucune fonction ne disparaît.
4. **Position de gamme, variante B (E1)** dans l’en-tête et le rail du manche vertical.
   - Vérifier que le moteur donne les mêmes doigtés que la maquette. Seule la position 2 m’était donnée ; les autres ont été recalculées à la main (`e1`, tableau « À vérifier »).
5. **Règle du nombre d’instruments (décision 9)**.
   - Trois colonnes à 2560 px CSS et plus ; une seule en dessous, avec un sélecteur.
   - Sur ordinateur sous 1440p, la place libérée accueille le dock Rythme (maquette 1920 × 970 dans `e5`).
6. **Squelette du téléphone, navigation 2** (`e4` et `e5`).
   - `AppMobile` réel : barre du haut de 56 px, scène, tiroir à trois hauteurs avec historique.
   - Manche vertical réglé pour le téléphone : `--fbv-string` 53, `--fbv-marker` 40, rangées de 56 à 66 px.
   - Piano vertical en 2 octaves.
   - Positions et « Fondamentale sur » sur la scène.
   - Premier lancement.
   - Écrans de référence : `e5` 1 à 6 et A à C.
7. **Choisir, outils et réglages dans le tiroir.**
   - Tableau « Où va chaque fonction » de `e5` : chaque `data-fn` du registre de parité a sa place.
   - Renommages (décision 7).
   - Visualiseur masqué (décision 6).
   - Sélecteur de langue unique, segmenté FR / EN.
8. **Paysage** : instrument horizontal, colonne de droite, plein écran sur Android.
9. **Tablette** : un instrument, colonne d’outils toujours ouverte (`e5`, 820 × 1180).

## 5. Points ouverts

- Un écran 1440p réglé à 125 % fait 2048 px CSS : avec la règle de la décision 9, il aurait un seul instrument. À confirmer avec le propriétaire.
- Réglage « Grandes touches » du piano : proposé, pas encore validé explicitement.
- Math & Rythmes : les modes avancés sont rendus exclusifs dans la maquette, alors que « Décalage progressif » et « Superposer » coexistent dans le code. À trancher.
- La mélodie (isorythmie) n’est transmise qu’à la basse (`pitchSteps`) : à confirmer et à dire dans le dock.

## 6. Règles à respecter (rappel)

- Couleurs : seulement les jetons de `src/styles/tokens.css`. Fond `#000`, texte `#e8e8e8`, jamais de grande surface blanche. Le blanc est réservé aux anneaux fins.
- Cibles de 44 px au moins (`--hit-min`), 8 px entre deux cibles. Texte de 15 px au moins au téléphone (`--fs-label`).
- Aucun terme de théorie sans une phrase courte à côté. Mots entiers, pas d’abréviation, pas d’emoji en guise d’icône.
- `prefers-reduced-motion` respecté partout.
- Interface en français, version anglaise à tenir à jour dans `translations.js`.

## 7. Message à donner à l’agent

> Lis `docs/design/explorations-2026-10/HANDOFF.md` sur la branche `claude/ecstatic-ride-nsmqna` (ou sur `main` une fois fusionnée). Les maquettes HTML du même dossier sont la référence de design, à ouvrir dans Chromium ; leurs valeurs exactes sont dans `_src/shared.css` et dans le code de chaque page. Commence par l’étape 1 du § 4 (cascade « joue », puis le projecteur). Respecte les décisions du § 2 sans les rediscuter, et pose-moi les points ouverts du § 5 quand tu y arrives.
