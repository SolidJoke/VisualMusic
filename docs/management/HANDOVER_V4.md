# Passation de Contexte (HANDOVER_V4) — 2026-06-14

## 1. Ce qui a été accompli (Session Audio Refactor)
Nous avons mené à bien la refactorisation du moteur audio (Tone.js) pour corriger les craquements, la gigue et les erreurs d'octave/notes, en deux phases :

*   **Phase 1 (Bug Fixes) :**
    *   Fix ordre des notes lors des arpèges (tri ascendant).
    *   Fix de l'octave MIDI dans la logique d'inversion des accords (`getClosestInversionN`).
    *   Ajout de `releaseAll` sur les samplers (Piano/Guitare) lors de l'arrêt explicite du séquenceur pour couper les instances audio résiduelles (craquements).
*   **Phase 2 (Migration UI/Audio Tone.js) :**
    *   Remplacement total des `setTimeout` JavaScript natifs dans les hooks de playback interactif (`useDictionaryPlayback`, `useFretboardPlayback`, `useStudioPlayback`).
    *   Utilisation de `Tone.getDraw().schedule()` et `Tone.now()` pour lier fermement les événements d'interface (highlight de notes) à l'horloge audio interne de Tone.js, éliminant ainsi les désynchronisations et la gigue.
    *   Ajout de tests unitaires/comportementaux pour valider ces timings.
*   **État final :** Branche `refactor/audio-tone-unified` mergée dans `main`. **821 tests passent (100% au vert)**.

## 2. Ce qu'il reste à faire / Prochaines étapes
*   **Phase 3 Audio (Optionnelle) :** Uniquement si des craquements très résiduels persistent (nécessiterait une analyse Playwright pour tracer les allocations mémoire). À ce stade, c'est considéré comme résolu.
*   **Reprise du Backlog (Conv 1 - UX/Design) :**
    *   L'intégration de la modale d'Onboarding (Stitch → `MOB-LAND-4`).
    *   L'analyse Stitch (UX-02/03) et la création de la Design Bible.
*   **Ou passage direct à Conv 2 (Corrections Musicales) :**
    *   Sujet `SCALE-01` : vérifier l'affichage des gammes sur la guitare.

---

## 3. 📋 PROMPT DE PASSATION 
*(À copier/coller dans la nouvelle conversation avec ARIA sous Gemini Pro)*

> Bonjour ARIA. Je suis Gabriel. 
> 
> Reprends ton rôle de Tech Lead QA sur le projet VisualMusic.
>
> **Contexte** : Nous venons de terminer avec succès la refactorisation de l'intégration Tone.js. Nous avons supprimé les `setTimeout` natifs au profit de `Tone.getDraw().schedule()` dans les hooks de lecture interactive (Dictionary, Fretboard, Studio). Les bugs de notes (octave et ordre) ainsi que les craquements ont été corrigés. Tout a été mergé sur `main` et nous avons 821 tests Vitest au vert. Je suis d'ailleurs passé sur le modèle Gemini 3.1 Pro (High).
>
> **Instructions** :
> 1. Lis le fichier `docs/management/HANDOVER_V4.md` pour un résumé détaillé du dernier chantier.
> 2. Consulte `docs/management/BACKLOG_V2.md` qui est à jour.
> 3. Fais-moi un bref point de situation et propose-moi la prochaine tâche à attaquer (es-tu d'accord pour reprendre l'UX comme la modale d'Onboarding MOB-LAND-4, ou préfères-tu qu'on passe au stream SCALE ?).
