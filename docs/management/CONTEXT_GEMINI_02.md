# CONTEXT_GEMINI_02 — Breakpoints Responsive 1440p
> **Agent** : Gemini 2.5 Pro (nouvelle conversation dédiée)
> **Prérequis** : PR `fix/mode-m-layout` mergée sur `main` ✅
> **Durée estimée** : 60-90 min
> **Branche à créer** : `feat/responsive-1440p`

---

## Fichiers de référence — Lire EN PREMIER

1. `docs/design/DESIGN_BIBLE.md` — règles de design et tokens CSS
2. `docs/design/UX_AUDIT.md` — audit des problèmes identifiés
3. `ARCHITECTURE.md` — structure du projet
4. `BACKLOG.md` lignes 22-28 — items UX-06, UX-07

---

## Contexte projet

VisualMusic est une app React + Vite (CSS vanilla + CSS variables).
La version 4K (2560px+) est **validée et ne doit PAS être modifiée**.
Travail uniquement sur le breakpoint 1440px (≥1440px et <2560px).

**Structure des composants clés :**
- `src/components/Layout/Sidebar.jsx` + `Sidebar.css` — sidebar principale
- `src/components/Panels/StudioPanel.jsx` — panneau Studio
- `src/components/Panels/ControlPanel.jsx` — BPM, gamme, contrôles
- `src/components/Intelligence/CompositionPanel.jsx` — calculatrice Mode M
- `src/components/Intelligence/HarmonicSeriesPanel.jsx` — psychoacoustique
- `src/styles/` — CSS global et variables

---

## Tâche principale — UX-06 : Breakpoints CSS 1440p

### Objectif
À 1440px, les panneaux secondaires (P2/P3) doivent être collapsibles pour réduire la surcharge verticale. Les utilisateurs scrollent trop en 1440p car tous les panneaux sont déployés par défaut comme en 4K.

### Contraintes impératives
- La sidebar reste fixe (~280px), **Play button toujours visible** en haut
- BPM et sélecteur de gamme restent toujours visibles dans la sidebar
- Fretboard + Piano : doivent rester visibles simultanément (jamais de tabs)
- Panneaux P0/P1 (instruments) : toujours déployés
- Panneaux P2/P3 (Studio, CompositionPanel, HarmonicSeries, TheoryLegend) : collapsibles

### Ce que tu dois implémenter

**1. Mécanisme collapse dans chaque panneau P2/P3**

Pour chaque composant Panel secondaire, ajouter un state `isCollapsed` (par défaut `true` à 1440px) et un header cliquable :

```jsx
// Exemple pattern pour un panel
const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 2560);

return (
  <div className={`panel ${isCollapsed ? 'panel--collapsed' : ''}`}>
    <div className="panel__header" onClick={() => setIsCollapsed(!isCollapsed)}>
      <span className="panel__title">Nom du panneau</span>
      <span className="panel__toggle">{isCollapsed ? '▼' : '▲'}</span>
    </div>
    {!isCollapsed && (
      <div className="panel__content">
        {/* contenu existant */}
      </div>
    )}
  </div>
);
```

**2. CSS pour le collapse**

Dans le CSS global ou par composant :

```css
@media (max-width: 2559px) and (min-width: 1440px) {
  .panel__header {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    user-select: none;
    border-bottom: 1px solid var(--color-border, #1e293b);
  }
  
  .panel__header:hover {
    background: rgba(255,255,255,0.04);
  }

  .panel__toggle {
    font-size: 11px;
    opacity: 0.6;
    transition: transform 0.2s ease;
  }
}
```

**3. "Comprendre le mode harmonique" accordion**

Dans `CompositionPanel.jsx`, il y a probablement un accordion "Comprendre le mode harmonique". Il doit être **collapsed par défaut** à ≤2560px (il l'est peut-être déjà — vérifie).

---

## Tâche secondaire — UX-07 : Bouton collapse sidebar à 1440px

Ajouter un bouton toggle sidebar (icône `‹`/`›` ou similaire) dans le coin de la sidebar pour permettre à l'utilisateur de la masquer temporairement et gagner de l'espace pour les instruments.

Ce bouton doit :
- Être toujours visible même quand la sidebar est rétractée (flottant ou dans un mini-rail)
- Utiliser une transition CSS smooth (transform/width)
- Fonctionner indépendamment du responsive CSS

---

## Règles CRITIQUES

1. **JAMAIS toucher** `src/utils/fingeringLogic.js` — fichier gelé
2. **JAMAIS commit sur `main`** — utiliser `feat/responsive-1440p`
3. **Préserver le comportement 4K** — les `useState` initiaux doivent être conditionnels (`window.innerWidth < 2560`)
4. **Tester** `npx vitest run` avant commit — must stay ≥797 tests
5. **Builder** `npm run build` — must pass exit 0
6. **Pas de nouvelles librairies** sans justification

---

## Format rapport final

Crée `docs/management/FEEDBACK_GEMINI_02.md` :

```markdown
# FEEDBACK_GEMINI_02

## Résumé
- Branch: feat/responsive-1440p
- PR URL: [url]
- Tests: X/797
- Build: OK/FAIL

## Tâches complétées
- [ ] UX-06 : collapse panels à 1440p
- [ ] UX-07 : sidebar toggle button

## Fichiers modifiés
[liste]

## Problèmes rencontrés
[si applicable]

## Recommandations pour GEMINI-03 (breakpoints 1080p)
[observations sur la structure CSS pour aider l'agent suivant]
```
