// @ts-check
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

// D.1.2 — numFrets par instrument : bass → 20 frets, guitar → 22 frets
const getNumFrets = (instrument) => instrument === "bass" ? 20 : 22;

/**
 * Hook d'orchestration du Fretboard.
 *
 * Lit le contexte musical, appelle les fonctions pures avec les bonnes dépendances,
 * et expose une interface stable et mémoïsée au composant Fretboard.jsx.
 *
 * @param {string} instrument - "guitar" | "bass"
 * @returns Tout ce que Fretboard.jsx consomme : geometrie du manche, notes
 * actives, doigte, et les entrees transmises telles quelles a
 * computeFretMetadata. Le type n'est volontairement pas ecrit a la main — il
 * listait 11 champs sur les 24 reellement renvoyes, et une liste de cette
 * taille derive. TypeScript l'infere exactement depuis l'objet retourne.
 */
export function useFretboard(instrument) {
  const numFrets = getNumFrets(instrument);
  const {
    activeNotes: rawActiveNotes = [],
    fretboardActiveNotes,
    currentRootValue: rootValue = 0,
    targetValuesByInstrument = {},
    fretboardZone = "all",
    autoPlayNote: onNoteClick,
    currentlyPlayingNotes = [],
    contextualScaleAbsoluteValues = [],
    dictType: rawDictType = null,
    lastClickedContext = null,
    singlePlayContext = null,
    showFingering = false,
    showFingerNumbers = false,
    guitarFingering,
    bassFingering,
    scaleAnchor = null,
    isGuitarOutOfRange,
    isBassOutOfRange,
    appMode = "studio",
    activeBrick,
  } = useMusicEngineContext();

  const { notation } = useAppContext();

  // ── Dérivations simples (pas de useMemo — calculs synchrones négligeables) ──
  const activeNotes = fretboardActiveNotes || rawActiveNotes;
  const fingering = instrument === "bass" ? bassFingering : guitarFingering;
  const isOutOfRange = instrument === "bass" ? isBassOutOfRange : isGuitarOutOfRange;
  const dictType = appMode === "dictionary" ? rawDictType : null;
  // VMU-123 decision #4 — the bass never shows a target note. The engine
  // (useMusicEngine's targetValuesByInstrument) already returns [] for
  // "bass"; this re-asserts it here rather than trusting a single source,
  // because a Fretboard rendered for "bass" must never show role-target
  // even if some future caller feeds this hook a context built by hand.
  const targetValues = instrument === "bass" ? [] : (targetValuesByInstrument[instrument] || []);

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

  // ── Largeurs des cases (dépend de l'instrument car numFrets varie) ──
  const fretWidths = useMemo(() => getFretWidths(numFrets), [numFrets]);

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
        numFrets,
      }),
    [contextualScaleAbsoluteValues, dictType, lastClickedContext, instrument, strings, numFrets]
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
    numFrets,

    // Données de note / contexte
    activeNotes,
    fingering,
    isOutOfRange,
    dictType,
    notation,

    // Props transmises telles quelles au composant (pour computeFretMetadata)
    rootValue,
    targetValues,
    fretboardZone,
    onNoteClick,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    lastClickedContext,
    singlePlayContext,
    showFingering,
    showFingerNumbers,
    scaleAnchor,
    appMode,
  };
}
