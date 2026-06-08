# HANDOVER V2 — VisualMusic Mobile & Responsive UX
**Date** : 2026-06-07 22:44 | **Conv** : `0565f023-3acc-438c-98d8-f70b8acfb491`
**Rôle ARIA** : Orchestrateur + Lead Tech (corrections directes) + Chef de projet (Jules + Stitch)

---

## 1. État de `main` — PROPRE et À JOUR (commit `956e94c`)

```
956e94c  Merge PR #64 — fix/fretboard-proportions-j10  ← ARIA correction directe
654fa88  fix(fretboard): 5 frettes + grid uniforme + STRING_HEIGHT=36
ac53a24  Merge PR #63 — feat/instrument-viewport-j09   ← Jules J-09
2d5ca43  Merge PR #62 — feat/landscape-layout-j08      ← Jules J-08
```

### ⚠️ Note sur Jules J-09
Jules a répondu "j'ai soumis ma PR sur `feat/instrument-viewport-j09`" — **c'est SA PR #63 déjà mergée**.
Aucun commit supplémentaire. Aucune régression. `main` est propre.

---

## 2. Procédure : Gestion des PRs Jules (pour Gabriel qui ne maîtrise pas Git)

> Gabriel doit suivre ces étapes AVANT de merger toute PR Jules future.

### Étape 1 — Vérifier s'il y a vraiment une nouvelle PR Jules
Demande à ARIA dans la nouvelle session :
```
"Vérifie s'il y a une nouvelle branche Jules non mergée sur GitHub et lis le diff sur Fretboard.jsx"
```
ARIA fera les commandes git à ta place.

### Étape 2 — Si ARIA dit "OK to merge"
Sur GitHub → onglet Pull Requests → bouton **"Merge pull request"** vert → **"Confirm merge"**

### Étape 3 — Après chaque merge, demande à ARIA
```
"PR mergée, mets main à jour et vérifie qu'il n'y a pas de régression"
```

### ⚠️ RÈGLE ABSOLUE — Fichiers protégés contre Jules
Si Jules touche ces fichiers, ARIA doit corriger AVANT le merge :

| Fichier | Protection |
|---|---|
| `src/utils/fingeringLogic.js` | **GELÉ — jamais toucher** |
| `src/components/Instruments/Fretboard.jsx` | Vérifier `STRING_HEIGHT=36`, `visibleFretCount`, `activeGridTemplate` |

---

## 3. Architecture technique — Décisions clés

### 3.1 Fretboard.jsx (326 lignes) — CRITIQUE

```javascript
// ✅ CONSTANTE — ne jamais rendre dynamique
const STRING_HEIGHT = 36;

// ✅ Breakpoints
const isMobile    = useMediaQuery('(max-width: 767px)');
const isLandscape = useLandscapeMode();   // orientation:landscape AND max-height:500px
const is4K        = useMediaQuery('(min-width: 3840px)');

// ✅ 5 frettes fixes sur tout écran <4K (une position de main standard)
const visibleFretCount = is4K ? numFrets : 5;

// ✅ Grid UNIFORME — NE JAMAIS slicer fretboardGridTemplate
const activeGridTemplate = is4K
  ? fretboardGridTemplate
  : `minmax(40px, 0.5fr) ${Array(visibleFretCount).fill('1fr').join(' ')}`;

// ✅ Navigation par position complète (5 frettes = 1 position de main)
const handlePrev = () => setFretOffset(o => Math.max(0, o - visibleFretCount));
const handleNext = () => setFretOffset(o => Math.min(numFrets - visibleFretCount, o + visibleFretCount));
```

### 3.2 PianoRoll.jsx — Pagination séquenceur
- State interne : `pageSize` (16/32/64) + `currentPage` (0-indexed)
- Auto-advance pendant lecture via `useEffect` sur `currentStep`
- Sélecteur visible dans le header du composant

### 3.3 Breakpoints consolidés
| Breakpoint | Valeur CSS | Usage |
|---|---|---|
| Mobile portrait | `max-width: 767px` | BottomNav, fretboard mobile |
| Mobile landscape | `orientation:landscape AND max-height:500px` | `LandscapeLayout.jsx`, string-row 24px |
| 4K | `min-width: 3840px` | Manche complet, no navigator |

---

## 4. Features accomplies ✅

| Feature | PR | Notes |
|---|---|---|
| BottomNav mobile portrait | J-07 | 4 tabs Studio/Dict/Play/Menu |
| Landscape cockpit | J-08 / PR #62 | `LandscapeLayout.jsx`, FAB+drawer |
| Séquenceur paginé [16][32][64] | J-09 / PR #63 | Auto-advance lecture |
| Fretboard viewport navigator | J-09 / PR #63 | ‹ Frettes X–Y › |
| **Fretboard proportions fixées** | **PR #64 ARIA** | 5 frettes, grid uniforme, STRING_HEIGHT=36 |

---

## 5. Features à implémenter (backlog priorisé)

### 🔴 P1 — Minimap Scrubber Fretboard (style Ableton/Premiere)

**Quoi** : Barre horizontale sous le fretboard montrant le manche complet en miniature, avec un rectangle draggable représentant les 5 frettes visibles. L'user glisse ce rectangle pour naviguer librement (remplace la pagination fixe).

**Références visuelles** : Screenshots Ableton dans `docs/design/screenshots/` (2 fichiers partagés par Gabriel le 2026-06-07). Le rectangle rouge en bas = l'indicateur de zone visible.

**Code prêt à implémenter dans Fretboard.jsx** :

```jsx
// Ajouter dans Fretboard.jsx, après la fermeture du .fretboard-wrapper
// Ajouter le ref : const scrubberRef = React.useRef(null);

const activeNotePositions = React.useMemo(() => {
  if (!activeNotes) return [];
  return activeNotes
    .filter(n => n.fret > 0)
    .map(n => n.fret);
}, [activeNotes]);

const handleScrubberDrag = React.useCallback((e) => {
  e.preventDefault();
  const scrubber = scrubberRef.current;
  if (!scrubber) return;
  const rect = scrubber.getBoundingClientRect();

  const onMove = (moveEvent) => {
    const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetFret = Math.round(relX * numFrets - visibleFretCount / 2);
    const clamped = Math.max(0, Math.min(numFrets - visibleFretCount, targetFret));
    setFretOffset(clamped);
  };

  const onEnd = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchend', onEnd);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}, [numFrets, visibleFretCount]);

// JSX à insérer sous </div> du fretboard-wrapper (seulement sur <4K):
{!is4K && (
  <div
    className="fretboard-scrubber"
    ref={scrubberRef}
    onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const targetFret = Math.round(relX * numFrets - visibleFretCount / 2);
      setFretOffset(Math.max(0, Math.min(numFrets - visibleFretCount, targetFret)));
    }}
  >
    {/* Points cyan = positions des notes actives */}
    {activeNotePositions.map((fret, i) => (
      <div
        key={i}
        className="scrubber-note"
        style={{ left: `${(fret / numFrets) * 100}%` }}
      />
    ))}
    {/* Rectangle = viewport visible */}
    <div
      className="scrubber-thumb"
      style={{
        left: `${(fretOffset / numFrets) * 100}%`,
        width: `${(visibleFretCount / numFrets) * 100}%`,
      }}
      onMouseDown={handleScrubberDrag}
      onTouchStart={handleScrubberDrag}
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}
```

**CSS à ajouter dans Fretboard.css** :

```css
/* === MINIMAP SCRUBBER === */
.fretboard-scrubber {
  position: relative;
  height: 16px;
  margin-top: 6px;
  background: #0e0e18;
  border-radius: 4px;
  border: 1px solid #262626;
  cursor: pointer;
  overflow: hidden;
}

.scrubber-thumb {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(0, 212, 255, 0.2);
  border: 1px solid #00d4ff;
  border-radius: 3px;
  cursor: grab;
  transition: background 0.1s;
  min-width: 8px;
}

.scrubber-thumb:active {
  cursor: grabbing;
  background: rgba(0, 212, 255, 0.35);
}

.scrubber-note {
  position: absolute;
  width: 3px;
  height: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #00d4ff;
  border-radius: 1px;
  opacity: 0.7;
  pointer-events: none;
}
```

**Décision ARIA vs Jules** : ARIA prend la main directement (code chirurgical sur fichier critique).

### 🟡 P2 — Piano Keyboard : limiter à 2 octaves <4K

**Problème** : Sur 1440p, le piano prend toute la largeur disponible (3+ octaves).
**Plan** : Même logique que fretboard — lire `src/components/Instruments/PianoKeyboard.jsx`,
appliquer `visibleOctaveCount = is4K ? fullRange : 2` + scrubber similaire.
**Qui** : ARIA après le scrubber fretboard (P1).

### 🟡 P3 — Header mobile cassé

**Problème** : "Vmu: VisualMusic Coach" affiché en rose/overflow sur mobile.
**Qui** : Jules sur brief (simple fix CSS).

---

## 6. Maquettes Stitch disponibles

Dossier : `D:\IA\VisualMusic\docs\design\screenshots\`

| Fichier | Contenu |
|---|---|
| `Stitch_Mobile_v3_tabs.png` | Portrait mobile, tabs Piano/Guitare |
| `Stitch_Landscape_MVP_0.png` | Landscape cockpit principal |
| `Stitch_Landscape_MVP_1.png` | Landscape menu drawer |
| `Stitch_Controls_0.png` | Séquenceur page selector [16][32][64] |
| `Stitch_Controls_2.png` | Fretboard "Frets 5-11 ‹ ›" |

StitchMCP project ID : `1663511171782434009`

---

## 7. Workflow équipe

| Agent | Outil | Rôle |
|---|---|---|
| **ARIA** | Antigravity | Architecture, corrections code critique, orchestration |
| **Jules** | `GoogleJules MCP create_session` | Implémentation sur brief détaillé |
| **Stitch** | `StitchMCP` | Design UI/UX, maquettes |

**Lancer Jules** : `create_session` avec `repo:"SolidJoke/VisualMusic"`, `branch:"main"`, `autoPr:true`, `interactive:false`.

**Tests obligatoires** après tout changement : `npx vitest run` → 797/797

---

*Généré par ARIA — 2026-06-07 22:44 — conv `0565f023-3acc-438c-98d8-f70b8acfb491`*
