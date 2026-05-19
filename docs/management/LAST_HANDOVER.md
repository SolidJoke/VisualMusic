# LAST HANDOVER — 2026-05-11 (Phase 2 - Stabilization Ongoing)
> **Modèle sortant** : Antigravity (Pro)
> **Dernière mise à jour** : 2026-05-11T07:15
> **Statut global** : 🚨 CRASH IDENTIFIÉ | 🟡 BUG VISUEL MANCHE | ✅ Piano Visibilité Fixé

---

## 🚨 RÈGLES ABSOLUES — LIRE EN PREMIER

1. **`npm test` avant ET après chaque tâche** → doit rester **560/560** ✅
2. **Ne jamais modifier** `src/core/fingeringLogic.js`, `src/core/theory.js` sans instruction explicite de l'expert.
3. **Lire le §MAP** en bas de chaque fichier avec variables alpha avant toute modification.
4. **Si les tests cassent → STOP**, ne pas continuer, reporter le blocage.

---

## ✅ ÉTAT DES LIEUX (Ce qui a été fait - Phase 2)
- [x] **BUG-08** : Fix de la visibilité des notes de gamme sur le Piano (Dictionary Mode).
- [x] **FEATURE-01** : Sélecteur d'octave complet (1-7) pour le mode "Single Note".
- [x] **F.2.2** : Extraction du `MixerPanel` pour un code plus modulaire.
- [x] **QW-03** : Audit i18n terminé pour `PositionSelector.jsx`.
- [x] **Audit QA** : Session de test exploratoire terminée (voir `qa_report.md`).

---

## 🚨 TÂCHES CRITIQUES (Antigravity en cours)

### FLASH-14 — Crash Tab "Accords"
Le changement d'onglet vers "Accords" provoque un crash lié à une valeur `null` passée à `CustomSelect` sans option correspondante.
- [ ] Patch `DictionaryPanel.jsx` pour inclure l'option "Toutes les positions" (null) par défaut.
- [ ] Sécuriser `CustomSelect.jsx` contre les valeurs `null`.

### FLASH-15 — Visibilité Manche (Fretboard)
Les notes de gamme sont "subtiles" (invisibles) par défaut sur le manche, contrairement au Piano déjà fixé.
- [ ] Aligner `fretboardUtils.js` sur la logique du Piano (supprimer `isSubtle` forcé).

---

## 🟡 TÂCHES EN ATTENTE (Pour Gemini Flash)

### FLASH-08 — Couverture I18n
Finaliser la localisation des labels techniques (Target Notes, Substitutions).

### D.1.1 — Logarithmic Fret Spacing
Appliquer l'espacement logarithmique aux frettes dans `Fretboard.jsx`.

### G.2.2 — Common Progressions
Intégrer les progressions d'accords classiques.

---

## 📊 FICHIERS À SURVEILLER
- `src/core/fretboardUtils.js` (Cible FLASH-15)
- `src/components/Panels/DictionaryPanel.jsx` (Cible FLASH-14)
- `src/components/Common/CustomSelect.jsx` (Cible FLASH-14)

