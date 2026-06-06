import { useMemo } from "react";
import { useMusicEngineContext } from "../context/MusicEngineContext";
import { useAppContext } from "../context/AppContext";
import { calcActivePath } from "../core/fretboardLogic";
import {
  getFretWidths,
  getFretboardGridTemplate,
  getStringTuning,
  extractBarreData,
} from "../core/fretboardUtils";

const NUM_FRETS = 22;

/**
 * Hook d'orchestration du Fretboard.
 *
 * Lit le contexte musical, appelle les fonctions pures avec les bonnes dépendances,
 * et expose une interface stable et mémoïsée au composant Fretboard.jsx.
 *
 * @param {string} instrument - "guitar" | "bass"
 * @returns {{
 *   strings: number[],
 *   fretWidths: number[],
 *   fretboardGridTemplate: string,
 *   activePath: object[],
 *   barreData: Array<{fret: number, minVisual: number, maxVisual: number}>,
 *   activeNotes: object[],
 *   fingering: object|null,
 *   isOutOfRange: boolean,
 *   dictType: string|null,
 *   notation: string,
 *   numFrets: number,
 * }}
 */
export function useFretboard(instrument) {
  const {
    activeNotes: rawActiveNotes = [],
    fretboardActiveNotes,
    currentRootValue: rootValue = 0,
    targetValue = -1,
    fretboardZone = "all",
    autoPlayNote: onNoteClick,
    currentlyPlayingNotes = [],
    contextualScaleAbsoluteValues = [],
    dictType: rawDictType = null,
    lastClickedContext = null,
    singlePlayContext = null,
    showFingering = false,
    fingeringMode = "numeric",
    guitarFingering,
    bassFingering,
    scaleAnchor = null,
    isGuitarOutOfRange,
    isBassOutOfRange,
    highlightTargetNotes = false,
    appMode = "studio",
    activeBrick,
  } = useMusicEngineContext();

  const { notation } = useAppContext();

  // ── Dérivations simples (pas de useMemo — calculs synchrones négligeables) ──
  const activeNotes = fretboardActiveNotes || rawActiveNotes;
  const fingering = instrument === "bass" ? bassFingering : guitarFingering;
  const isOutOfRange = instrument === "bass" ? isBassOutOfRange : isGuitarOutOfRange;
  const dictType = appMode === "dictionary" ? rawDictType : null;

  // ── Accordage (useMemo car dépend de activeBrick qui peut être un objet stable) ──
  const stringTuning = useMemo(
    () => getStringTuning(instrument, activeBrick),
    [instrument, activeBrick]
  );

  // ── Cordes (ordre visuel : inversé pour l'affichage de haut en bas) ──
  const strings = useMemo(
    () => stringTuning.slice().reverse(),
    [stringTuning]
  );

  // ── Largeurs des cases (dépend uniquement du nombre de cases, constant) ──
  const fretWidths = useMemo(() => getFretWidths(NUM_FRETS), []);

  // ── Template CSS (dépend des largeurs, lui-même stable) ──
  const fretboardGridTemplate = useMemo(
    () => getFretboardGridTemplate(fretWidths),
    [fretWidths]
  );

  // ── Chemin actif (gamme/mode en mode dictionnaire) ──
  const activePath = useMemo(
    () =>
      calcActivePath({
        contextualScaleAbsoluteValues,
        dictType,
        lastClickedContext,
        instrument,
        strings,
        numFrets: NUM_FRETS,
      }),
    [contextualScaleAbsoluteValues, dictType, lastClickedContext, instrument, strings]
  );

  // ── Données de barré ──
  const barreData = useMemo(() => {
    const actualMap = fingering?.fingeringMap || fingering;
    return extractBarreData(actualMap, dictType);
  }, [fingering, dictType]);

  return {
    // Données de rendu du manche
    strings,
    fretWidths,
    fretboardGridTemplate,
    activePath,
    barreData,
    numFrets: NUM_FRETS,

    // Données de note / contexte
    activeNotes,
    fingering,
    isOutOfRange,
    dictType,
    notation,

    // Props transmises telles quelles au composant (pour computeFretMetadata)
    rootValue,
    targetValue,
    fretboardZone,
    onNoteClick,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    lastClickedContext,
    singlePlayContext,
    showFingering,
    fingeringMode,
    scaleAnchor,
    highlightTargetNotes,
    appMode,
  };
}
