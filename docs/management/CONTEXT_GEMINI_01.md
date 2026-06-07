# Contexte d'Initialisation — Conversation GEMINI-01
> **Titre** : Fix MODE M + CSS Overflow
> **Modèle recommandé** : Gemini 2.5 Pro
> **Branche à créer** : `fix/mode-m-layout`
> **Durée estimée** : 30-45 min
> **Rapport de retour à écrire** : `docs/management/FEEDBACK_GEMINI_01.md`
> **Template** : `docs/management/FEEDBACK_REPORT_TEMPLATE.md`

---

## Contexte du projet

VisualMusic est une application React + Vite d'apprentissage musical à `D:\IA\VisualMusic`.

**Règles absolues :**
- Ne JAMAIS toucher `src/utils/fingeringLogic.js`
- Ne JAMAIS committer directement sur `main`
- Maintenir les tests à **797/797** minimum (`npx vitest run`)
- `npm run build` doit passer sans erreur avant tout commit

**État actuel (2026-06-07) :**
- Branche courante : `main`
- Fichier modifié non commité : `src/i18n/translations.js` (wording "MODE M" en cours)
- Tests : 797/797 ✅
- Dernier commit : `ce75b5c — React Portal InfoTooltip`

---

## Tâches à accomplir

### Tâche 1 — Créer la branche
```bash
git checkout -b fix/mode-m-layout
```

### Tâche 2 — Wording "MODE M"

Trouver TOUTES les occurrences de "Meshuggah" dans le code source (hors `node_modules`, `dist`, `.git`).

**Fichiers suspects :**
- `src/i18n/translations.js` — traductions FR/EN
- `src/components/Intelligence/CompositionPanel.jsx` — labels HTML
- `src/components/Intelligence/CompositionPanel.css` — commentaires CSS

**Règle de remplacement :**
- `"MODE MESHUGGAH"` → `"MODE M"` (en majuscules, court)
- `"Meshuggah Mode"` → `"Mode M"` (en anglais si dans la version EN)
- `"Calculatrice Meshuggah"` → `"Calculatrice M"` (si utilisé)
- Adapter le contexte : dans les traductions, garder la cohérence FR/EN
- Mettre à jour également tous les commentaires de code qui mentionnent "Meshuggah"

### Tâche 3 — Fix CSS overflow `.retro-switch-container`

**Fichier** : `src/components/Intelligence/CompositionPanel.css`

**Problème** : Le label du toggle "MODE M" déborde horizontalement à cause de la mise en page en ligne.

**Rechercher la classe** `.retro-switch-container` (ligne approximative : 208-212).

**Changement à appliquer** :
```css
/* AVANT */
.retro-switch-container {
  display: flex;
  align-items: center;
  gap: 10px;
  /* ... autres règles */
}

/* APRÈS — placer le label SOUS le switch */
.retro-switch-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px; /* grille 8px */
  /* ... autres règles conservées */
}
```

> **Note** : Vérifier visuellement (via build) que le switch et le label s'affichent correctement en colonne.

### Tâche 4 — Vérification & Commit

```bash
# 1. Vérifier les tests
npx vitest run
# Doit afficher : 797/797 passants

# 2. Build
npm run build
# Doit terminer sans erreur

# 3. Commit
git add -A
git commit -m "fix(ui): rename Meshuggah to Mode M and fix retro-switch layout overflow

- Replace all occurrences of 'Meshuggah' with 'Mode M' / 'Calculatrice M'
  in translations.js, CompositionPanel.jsx and CompositionPanel.css
- Fix .retro-switch-container overflow: flex-direction column + 8px gap
- Tests: 797/797 | Build: OK"
```

---

## Rapport de retour obligatoire

À la fin de la conversation, créer le fichier `docs/management/FEEDBACK_GEMINI_01.md` en utilisant le template `docs/management/FEEDBACK_REPORT_TEMPLATE.md`.

**Points à documenter impérativement :**
1. Nombre exact d'occurrences "Meshuggah" trouvées et dans quels fichiers
2. Résultat des tests (avant/après)
3. Tout problème CSS inattendu sur le switch
4. Commit hash final

---
*Généré par ARIA (Claude Sonnet) — Conv 0565f023 — 2026-06-07*
