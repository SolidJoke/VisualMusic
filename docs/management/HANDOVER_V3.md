# HANDOVER V3 — VisualMusic Orchestration
> **Créé par** : ARIA (Claude Sonnet via Antigravity) — 2026-06-08  
> **Pour** : Session d'orchestration suivante (Gemini Pro ou Claude)  
> **Repo** : https://github.com/SolidJoke/VisualMusic  
> **Prod** : https://visualmusiccoach.netlify.app

---

## 1. CONTEXTE PROJET

VisualMusic Coach est une web app d'apprentissage musical (React + Vite + Tone.js).
- **Solo dev** : Gabriel (vibe coding, pas de background dev)
- **ARIA** = Tech Lead / QA / Chef de projet — prend toutes les décisions techniques
- **Jules** = Agent Google (Google Jules) — exécute les tâches de code avec brief précis d'ARIA
- **Stitch** = Agent design MCP — génère maquettes et systèmes de design
- **Langue** : Toutes les réponses à Gabriel **en français**. Code/commits en anglais.

---

## 2. ÉTAT AU 2026-06-08

| Indicateur | Valeur |
|---|---|
| Branche principale | `main` — propre, commit `f205020` |
| Tests | ✅ **797/797** Vitest |
| Prod Netlify | ✅ **Déployé** — visualmusiccoach.netlify.app |
| Dernier commit | `f205020` — docs(backlog): BUG-10 closed |
| PRs mergées (session) | #65 (scrubber fretboard) · #66-67 (zoom CSS, supercédés) · #68 (piano viewport) |

---

## 3. RÈGLES ABSOLUES — NE JAMAIS VIOLER

| Fichier | Règle |
|---|---|
| `src/core/fingeringLogic.js` | 🔴 JAMAIS toucher — logique de doigté complexe |
| `src/components/Instruments/Fretboard.jsx` | 🔴 JAMAIS toucher sans spec ARIA validée |
| `src/hooks/useMusicEngine.js` | 🔴 JAMAIS toucher |
| `src/context/AppContext.jsx` | 🔴 State global — toute modif impacte tout |
| Tests Vitest | **797/797 obligatoires** avant toute PR |
| Branches | Jamais de commit direct sur `main` |
| Langues | **4 langues** dans `src/i18n/translations.js` : `fr`, `en`, `pt`, `zh` |

---

## 4. ARCHITECTURE CLÉS

```
src/
├── AppDesktop.jsx          # Composant principal desktop (et mobile via délégation)
├── AppMobile.jsx           # Délègue à AppDesktop
├── App.css                 # CSS global principal (~1364 lignes)
├── i18n/translations.js    # 4 langues : fr(L2), en(L311), pt(L620), zh(L903)
├── components/
│   ├── Instruments/
│   │   ├── PianoKeyboard.jsx   # ⚠️ Sensible — visibleOctaveCount ajouté PR#68
│   │   ├── PianoKeyboard.css
│   │   ├── Fretboard.jsx       # 🔴 INTERDIT
│   │   └── Fretboard.css
│   ├── Layout/
│   │   ├── Sidebar.jsx         # Sidebar desktop (position:fixed, z-index:2000)
│   │   ├── Sidebar.css         # is-open=340px / is-closed=60px
│   │   ├── BottomNav.jsx       # Nav mobile bottom
│   │   └── BottomNav.css
│   ├── Panels/
│   │   ├── DictionaryPanel.jsx
│   │   ├── HarmonicSeriesPanel.jsx
│   │   └── ...
│   └── Modals/
│       ├── AboutModal.jsx
│       └── TheoryModal.jsx
├── core/
│   ├── fingeringLogic.js   # 🔴 INTERDIT
│   ├── theory.js
│   └── acousticEngine.js
└── hooks/
    ├── useFretboard.js     # numFrets: bass=20, guitar=22 (D.1.2 fait)
    └── useMusicEngine.js   # 🔴 INTERDIT
```

**Sidebar layout** : `position: fixed`. Content décalé via `padding-left` sur `.app-container-inner` **uniquement à min-width: 1024px** (App.css L1037-1044). En dessous de 1024px → sidebar overlay le contenu.

**BottomNav** : `position: fixed; bottom: 0`. Affiché uniquement mobile (<767px portrait). `env(safe-area-inset-bottom)` déjà en place.

---

## 5. PROCHAINES TÂCHES — PRIORITÉ

### 🔥 PR-A : MOB-LAND-1/2/3/5 (Jules)

**Branche :** `fix/mobile-landscape-ux`  
**Specs complètes dans :** `BACKLOG_V2.md` section `MOB-LAND — PR-A`

Résumé des 4 fixes :
1. **MOB-LAND-1** : Rail icons sidebar deviennent des boutons cliquables (Studio/Dict/Play)
2. **MOB-LAND-2** : Backdrop semi-transparent sur sidebar ouverte en mobile (<1024px) — clic ferme sidebar
3. **MOB-LAND-3** : Toggle sidebar passe de `position:absolute` à `position:sticky` pour suivre le scroll
4. **MOB-LAND-5** : BottomNav `justify-content: space-evenly` + `padding-bottom: max(safe-area, 8px)`

### 🎨 PR-B : MOB-LAND-4 (Stitch design → Jules code)

**⚠️ Stitch d'abord, Jules ensuite.**  
**Specs complètes dans :** `BACKLOG_V2.md` section `MOB-LAND — PR-B`

Modale d'aide/onboarding (❓ dans le header) avec tabs Desktop/Mobile/À propos.  
**Contrainte critique : 4 langues (fr/en/pt/zh) dans translations.js.**

### 📸 UX-01 : Screenshots automatiques (Jules)

Script `take_screenshots.js` (Playwright) déjà dans le repo.

Jules doit :
1. `npm install` (vérifie Playwright)
2. `npx playwright install chromium`
3. Démarrer dev server en arrière-plan : `npm run dev &` puis attendre 3s
4. `node take_screenshots.js`
5. Commit + push les PNG dans `docs/design/screenshots/`

Résultat : 14 screenshots (7 résolutions × 2 modes) pour l'audit UX Stitch.

### 🔵 SCALE-01 : Audit gammes guitare (Conv 2)

Vérifier que les gammes guitare affichent exactement 7 pitch classes. Si bug → corriger dans `fretboardUtils.js` uniquement.

---

## 6. WORKFLOW JULES

Jules est un agent Google qui travaille sur le repo GitHub. Pour le briefer :

1. Utiliser l'outil MCP `GoogleJules/create_session` avec :
   - `repo: "SolidJoke/VisualMusic"`
   - `branch: "main"` (il crée sa propre branche)
   - `autoPr: true`
   - `prompt:` le brief complet (voir exemples dans BACKLOG_V2.md)

2. Jules ouvre une PR → ARIA fait la code review via `GoogleJules/show_code_diff`
3. Si diff OK → Gabriel merge
4. Si problème → ARIA corrige directement ou renvoie Jules

**Points de vigilance Jules :**
- Jules a tendance à ajouter des fichiers non demandés → vérifier la checklist de fichiers
- Jules peut ne pas tester visuellement → toujours exiger `npx vitest run` en checklist
- Jules ne connaît pas le contexte musical → les specs doivent être ultra-précises

---

## 7. WORKFLOW STITCH

Stitch est accessible via MCP `StitchMCP`. Utiliser pour :
- `generate_screen_from_text` : générer une maquette depuis un prompt texte
- `edit_screens` : affiner une maquette existante

Brief type pour Stitch (à adapter) :
```
Style : dark, glassmorphism, fond #131313, accent #a6c8ff, 
police Hanken Grotesk. Cohérent avec VisualMusic Coach.
```

---

## 8. SCREENSHOTS PROBLÈMES PROD (2026-06-08)

Les 4 screenshots illustrant les bugs MOB-LAND sont dans la conversation Antigravity du 2026-06-08.
Ils montrent (mobile Android, Brave, orientation paysage) :
- Sidebar overlay les instruments (pas de backdrop)
- Titre "VisualMusic Coach" tronqué (sidebar overlay)
- Rail icons passifs (non cliquables)
- BottomNav légèrement décalé

---

## 9. HISTORIQUE PRs

| PR | Description | Auteur | Statut |
|---|---|---|---|
| #59 | UX mobile instruments + modales | Jules/ARIA | ✅ Main |
| #63 | Séquenceur paginé + viewport navigator | Jules | ✅ Main |
| #64 | Fretboard proportions (STRING_HEIGHT=36) | ARIA | ✅ Main |
| #65 | Minimap scrubber fretboard (Ableton-style) | ARIA | ✅ Main |
| #66 | Responsive clamp() CSS | Jules | ✅ Main (supercédé) |
| #67 | Zoom CSS paliers | ARIA | ✅ Main (supercédé) |
| #68 | Piano visibleOctaveCount + scrubber | Jules | ✅ Main |

---

## 10. POUR DÉMARRER LA PROCHAINE SESSION

Lire dans l'ordre :
1. Ce fichier (`HANDOVER_V3.md`) — contexte global
2. `BACKLOG_V2.md` — tâches détaillées avec specs Jules/Stitch
3. Vérifier `git log --oneline -5` pour confirmer l'état de `main`
4. Lancer `npx vitest run` pour confirmer 797/797
5. Commencer par PR-A (Jules) ou UX-01 (screenshots) selon disponibilité
