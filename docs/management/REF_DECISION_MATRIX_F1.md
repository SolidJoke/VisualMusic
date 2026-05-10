# Matrice de Décision Technique : Navigation & Tessiture (F.1)

Ce document affine l'item F.1 du backlog et définit la stratégie de résolution des régressions historiques sur les doigtés de VisualMusic.

## 1. Analyse du Problème : La "Fragmentation Sémantique"
Les régressions identifiées proviennent d'une divergence entre le **Moteur de Calcul** (qui génère des positions) et le **Moteur de Rendu** (qui attend des marqueurs visuels). 
- **Bug O/X** : Perdu car le contrat de données ne distinguait pas explicitement "Corde Muette" de "Corde non mentionnée".
- **Bug Octave** : Actuellement, le système "force" l'affichage même si l'instrument ne peut pas produire la note, créant une dissonance cognitive.

## 2. Proposition : Le Contrat `fingeringMap` v2
Pour stabiliser l'architecture, nous abandonnons les structures "plates" pour un objet riche et auto-descriptif.

```typescript
interface MusicState {
  id: string;             // Unique ID de la variante (ex: "guitar-c-maj-pos1")
  family: 'note' | 'chord' | 'scale';
  root: number;           // MIDI Root (0-11)
  octave: number;         // Octave relative (-1, 0, 1)
  
  // Le Coeur : fingeringMap
  fingeringMap: {
    [stringIndex: number]: {
      fret: number | 'X'; // 'X' pour Muted
      status: 'played' | 'open' | 'muted' | 'barre';
      interval?: string;  // ex: "1", "b3", "5"
      finger?: number;    // 1, 2, 3, 4 (I, M, A, m)
    }
  };

  // Métadonnées de Tessiture
  isOutOfRange: boolean;  // True si une note de la structure est hors limites instrument
  rangeWarning?: string;  // Message contextuel pour l'UI
}
```

## 3. Matrice d'Aide à la Décision : Gestion des Hors-Tessiture

| Option | Expérience Utilisateur (UX) | Complexité Code | Risque de Régression | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Transposition Auto** | Fluide (toujours du son), mais pédagogiquement faux (on ne joue pas un Do grave sur une corde de Mi aigu). | Moyenne (logique de repli). | Élevé (décalage entre visuel et audio). | ❌ Non |
| **B. Masquage Sec (Silence)** | Brutal. L'utilisateur peut croire à un bug si l'instrument disparaît sans explication. | Faible. | Nul. | ⚠️ Partiel |
| **C. Feedback Visuel "Ghost"** | **Optimal**. L'instrument est "dimmed" (opacité réduite), un message "Out of Range" apparaît. Pas de son. | Moyenne (nécessite un état UI dédié). | Faible. | ✅ **Choix Aria** |

## 4. Matrice d'Aide à la Décision : Sélecteur de Variantes

| Option | Accès aux données | Charge Cognitive | Impact Design | Recommandation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Liste Déroulante (Standard)** | Précis. | Moyenne. | Faible (standard HTML). | ⚠️ Boring |
| **B. Inspecteur Flottant (Contextuel)** | Immédiat (au clic sur le manche). | Faible (lié à l'action). | Élevé (doit être premium/glassmorphism). | ✅ **Choix Aria** |
| **C. Mini-Carousel (Sidebar)** | Séquentiel. | Faible. | Moyen. | ⚠️ Lent |

## 5. Intégration des Données Expertes (AxiomRules)
Le nouveau moteur harmonique devra utiliser le fichier `SAS/expert_theory_data.json` pour :
1. **Prioriser les variantes** : Utiliser les règles de substitution pour suggérer des voicings "Jazz" ou "Pop" au lieu d'une liste alphabétique brute.
2. **Étendre les accords** : Ajouter les suffixes complexes (7b9, 13, etc.) au dictionnaire.

## 6. Prochaines Étapes de Refinement
- [ ] Valider le schéma `fingeringMap` v2.
- [ ] Rédiger le plan de test TDD pour la détection de tessiture (Guitar vs Bass).
- [ ] Prototyper l'UI de l'Inspecteur Flottant dans `Fretboard.css`.

---
**Note stratégique** : L'ajout de Tonal.js (Stream C.1) est le complément indispensable de ce chantier pour garantir la justesse des intervalles injectés dans la map.
