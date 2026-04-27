# VisualMusic — DESIGN BRIEF Phase 9 : Refonte Glassmorphism Premium

> **Pour l'agent d'exécution (Gemini Flash) :** Ce document est un guide d'exécution direct. Ne pas interpréter. Appliquer les valeurs exactes fournies dans cet ordre. Chaque tâche est atomique et testable. La priorité absolue est la non-régression fonctionnelle.

---

## Identité Visuelle Cible

**Style :** Glassmorphism Premium Sombre — Compatible Jazz, Classique, Rock, Électronique.

**Référence esthétique :** Couverture d'album Daft Punk "Random Access Memories" + UI d'Ableton Live + Interface Logic Pro sombre. Élégance minimaliste, profondeur perçue, pas d'effets kitch.

**Principes :**
- Fond sombre profond (pas noir absolu, mais un quasi-noir bleuté)
- Panneaux en "verre dépoli" (backdrop-filter + opacité)
- Bordures lumineuses très fines et subtiles (pas de néon criard)
- Typographie moderne via Google Fonts (`Inter` ou `DM Sans`)
- Transitions fluides (150–250ms)
- **Aucune couleur vive saturée à 100%** — tout passe par des HSL calibrés

---

## Étape 1 — Mise à jour des Design Tokens (`:root` dans `App.css`)

**Action :** Remplacer INTÉGRALEMENT le bloc `:root` existant par le suivant. Ne pas supprimer les blocs CSS situés après `:root`.

```css
/* Google Font — ajouter dans index.html <head> AVANT tout autre style */
/* <link rel="preconnect" href="https://fonts.googleapis.com"> */
/* <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"> */

:root {
  /* ─── PALETTE FONDATRICE ─────────────────────────────────── */
  /* Arrière-plan : quasi-noir avec teinture bleue profonde */
  --bg-deep:    hsl(226, 25%, 6%);
  --bg-base:    hsl(226, 22%, 9%);
  --bg-panel:   hsl(226, 20%, 12%);
  --bg-surface: hsl(226, 18%, 15%);
  --bg-raised:  hsl(226, 16%, 19%);
  --bg-overlay: hsl(226, 30%, 5%);

  /* Verre dépoli (glass panels) */
  --glass-bg:       hsla(226, 20%, 100%, 0.04);
  --glass-bg-hover: hsla(226, 20%, 100%, 0.07);
  --glass-border:   hsla(226, 40%, 100%, 0.10);
  --glass-border-hover: hsla(226, 40%, 100%, 0.18);
  --glass-blur:     blur(16px);
  --glass-shadow:   0 4px 32px hsla(226, 50%, 2%, 0.6);

  /* ─── ACCENT PRINCIPAL ───────────────────────────────────── */
  /* Lavande électrique : neutre, musical, premium */
  --accent-hue: 258;
  --accent:     hsl(258, 70%, 72%);
  --accent-dim: hsla(258, 70%, 72%, 0.15);
  --accent-glow:hsla(258, 70%, 72%, 0.25);

  /* Rétro-compatibilité avec l'ancien --theme-primary */
  --theme-primary:     var(--accent);
  --theme-primary-dim: var(--accent-dim);

  /* ─── BORDURES ───────────────────────────────────────────── */
  --border-subtle:  hsla(226, 20%, 100%, 0.05);
  --border-default: hsla(226, 20%, 100%, 0.10);
  --border-muted:   hsla(226, 20%, 100%, 0.15);
  --border-dim:     hsla(226, 20%, 100%, 0.20);

  /* ─── TEXTE ──────────────────────────────────────────────── */
  --text-primary:   hsl(220, 20%, 90%);
  --text-secondary: hsl(220, 15%, 75%);
  --text-muted:     hsl(220, 10%, 55%);
  --text-faint:     hsl(220, 10%, 40%);
  --text-dim:       hsl(220, 10%, 30%);
  --text-bright:    hsl(0, 0%, 100%);

  /* ─── COULEURS RÔLES MUSICAUX (inchangées) ───────────────── */
  --role-root:   hsl(350, 65%, 65%);
  --role-third:  hsl(210, 75%, 68%);
  --role-fifth:  hsl(140, 50%, 60%);
  --role-scale:  hsl(200, 20%, 55%);
  --role-target: hsl(47, 100%, 58%);

  /* ─── COULEURS D'ÉTAT ────────────────────────────────────── */
  --color-error:   hsl(4, 70%, 58%);
  --color-warning: hsl(36, 90%, 55%);
  --color-success: hsl(145, 60%, 50%);
  --color-info:    hsl(210, 80%, 72%);

  /* ─── SÉQUENCEUR ─────────────────────────────────────────── */
  --seq-kick:  hsl(0,   80%, 62%);
  --seq-snare: hsl(220, 80%, 62%);
  --seq-hat:   hsl(47,  90%, 58%);
  --seq-bass:  hsl(155, 70%, 55%);
  --seq-rim:   hsl(30,  85%, 58%);
  --seq-crash: hsl(0, 0%, 85%);

  /* ─── TYPOGRAPHIE ────────────────────────────────────────── */
  --font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ─── ESPACEMENTS & RAYONS ───────────────────────────────── */
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  16px;
  --radius-xl:  24px;

  /* ─── TRANSITIONS ────────────────────────────────────────── */
  --transition-fast:   150ms ease;
  --transition-normal: 220ms ease;
  --transition-slow:   350ms ease;
}
```

**Modifier aussi dans `body` :**
```css
body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-base);
  /* Fond dégradé subtil pour éviter le noir plat */
  background-image: radial-gradient(ellipse at 20% 30%, hsla(258, 40%, 15%, 0.4) 0%, transparent 60%),
                    radial-gradient(ellipse at 80% 70%, hsla(200, 40%, 12%, 0.3) 0%, transparent 50%);
  background-attachment: fixed;
  color: var(--text-primary);
  font-family: var(--font-body);
  transition: background-color var(--transition-slow);
}
```

---

## Étape 2 — Classes Utilitaires Glassmorphism (ajouter dans `App.css`)

Ajouter à la **fin** de `App.css` sans supprimer l'existant :

```css
/* ═══════════════════════════════════════════════════════
   GLASSMORPHISM UTILITIES — Phase 9
═══════════════════════════════════════════════════════ */

.glass-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  transition: border-color var(--transition-normal),
              box-shadow var(--transition-normal);
}
.glass-panel:hover {
  border-color: var(--glass-border-hover);
  box-shadow: var(--glass-shadow), 0 0 0 1px var(--accent-glow);
}

/* Boutons premium */
.btn-premium {
  padding: 7px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: var(--glass-blur);
}
.btn-premium:hover {
  background: var(--glass-bg-hover);
  color: var(--text-primary);
  border-color: var(--border-muted);
}
.btn-premium.active,
.btn-premium[aria-pressed="true"] {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}

/* Select / dropdown premium */
.select-premium {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 0.82rem;
  padding: 6px 10px;
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
  backdrop-filter: var(--glass-blur);
}
.select-premium:hover,
.select-premium:focus {
  border-color: var(--accent);
}

/* Séparateur lumineux */
.divider-glass {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
  margin: 12px 0;
}

/* Label section */
.section-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
  margin-bottom: 6px;
}
```

---

## Étape 3 — `index.html` : Google Font

Dans `d:\IA\VisualMusic\index.html`, dans le `<head>`, ajouter **avant** le lien vers le CSS :
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

---

## Étape 4 — Application Composant par Composant

Ordre d'exécution recommandé (du plus simple au plus visible) :

### 4.1 `ControlPanel.jsx` — Remplacer les panels par `.glass-panel`
- Wrapper principal : ajouter `className="glass-panel"` + retirer le `background` et `border` inline.
- Boutons de mode (Studio/Dictionary) : remplacer les classes existantes par `.btn-premium` + `aria-pressed={isActive}`.

### 4.2 `PlaybackPanel.jsx`
- Container : `.glass-panel`
- Boutons Play/Stop : `.btn-premium`
- Sliders BPM/Volume : wrapper avec `style={{ accentColor: 'var(--accent)' }}`

### 4.3 `StudioPanel.jsx`
- Container : `.glass-panel`
- Boutons de progression/gamme : `.btn-premium`

### 4.4 `DictionaryPanel.jsx`
- Container principal : `.glass-panel`
- Tous les `<select>` : `.select-premium`
- Séparateurs visuels existants → `.divider-glass`

### 4.5 `InstrumentView.jsx`
- Container externe : `.glass-panel`
- Onglets Piano/Guitare : `.btn-premium` + `aria-pressed`

### 4.6 `MixerStrip.jsx` + `AudioVisualizer.jsx`
- Fond du Mixer : `.glass-panel`
- Faders/Boutons : `.btn-premium`

### 4.7 Modales (`AboutModal.jsx`, `TheoryModal.jsx`)
- Overlay de fond : `background: hsla(226, 30%, 4%, 0.75); backdrop-filter: blur(8px);`
- Container de la modale : `.glass-panel`

---

## Ordre de commit recommandé

```
feat(design): add Phase 9 glass tokens and CSS utilities
feat(ui): apply glassmorphism to ControlPanel and PlaybackPanel
feat(ui): apply glassmorphism to StudioPanel and DictionaryPanel
feat(ui): apply glassmorphism to InstrumentView and MixerStrip
feat(ui): apply glassmorphism to modals
```

---

## Vérification Minimale Post-Tâche

Après chaque commit :
1. `npm run dev` → l'app démarre sans erreur console
2. Test visuel : les panneaux apparaissent en "verre dépoli" sombre
3. Fonctionnel : cliquer un accord → son joué, notes affichées sur le piano/manche

---

## Phase 11 — Rendu Audio/Visuel des Accords (Polyphonie & Voicings)

**Contexte :** 
Actuellement, les accords sont joués sous forme d'arpèges (note par note via `setTimeout`) peu importe l'instrument. De plus, sur la guitare et la basse, le manche affiche la "carte thermique" de toutes les notes de l'accord sur toutes les cordes, ce qui ne reflète pas le doigté réel d'un instrument à cordes (où l'on ne joue qu'une note par corde). 

**Objectif :** Aligner l'audio et l'affichage visuel sur les réalités physiques des instruments. 
**Important pour Gemini Flash :** Toujours vérifier que la logique de `appMode === "dictionary"` ou `appMode === "studio"` reste intacte.

### [Tâche AV-1] Jouer les accords simultanément (Polyphonie Audio)
**Fichier cible :** `src/hooks/usePlaybackHandlers.js` (fonction `playSingleNote`)
- **Action :** Modifier la logique `if (appMode === "dictionary" && (dictType.includes("scale") || dictType.includes("chord")))`.
- **Règle :** Pour les gammes (`scale`), conserver la boucle `setTimeout` actuelle pour jouer un arpège. Pour les accords (`chord`), supprimer le `setTimeout` et envoyer le tableau complet des notes directement à `playDictionaryNote()` pour qu'elles soient jouées rigoureusement en même temps. 
- **Feedback UI :** S'assurer que `setCurrentlyPlayingNotes` reçoit bien le tableau complet des `absolutePitches` pour que toutes les touches du piano/cordes s'allument simultanément.

### [Tâche AV-2] N'afficher qu'une note par corde sur le manche (Voicings Visuels)
**Fichier cible :** `src/components/Instruments/Fretboard.jsx` (et `App.jsx` ou le composant parent qui lui passe les props)
- **Action :** La logique de "masquage" existe déjà (`isGuitarFingeringActive`). Il faut étendre cette variable pour inclure la basse. Remplacer `instrument === "guitar"` par `(instrument === "guitar" || instrument === "bass")`.
- **Intégration :** S'assurer que lorsque l'utilisateur sélectionne un accord, on calcule le doigté optimal via `getGuitarFingering()` ou `getBassFingering()` (déjà présents dans `fingeringLogic.js`) et qu'on le passe dans la prop `fingering` du composant `Fretboard`. 
- **Activation :** Forcer `showFingering={true}` en mode dictionnaire pour les accords.

### [Tâche AV-3] Faire correspondre l'Audio au "Shape" du manche
**Fichier cible :** `src/hooks/usePlaybackHandlers.js` (fonction `playSingleNote`)
- **Action :** Actuellement, le son d'un accord empile les notes selon les intervalles théoriques (`resolveChordSemitones`). Il faut modifier `playSingleNote` pour qu'il puisse recevoir de manière optionnelle le `fingering` actuel de l'instrument.
- **Règle :** Si l'utilisateur clique sur la guitare ou la basse pour déclencher un accord, l'audio doit utiliser les hauteurs absolues (`absolutePitches`) dérivées directement de la position (corde + frette) du doigté généré par `fingeringLogic.js`, et non l'empilement standard de piano. Cela donnera aux accords de guitare/basse leur véritable ampleur (avec les cordes à vide ou les renversements spécifiques).
