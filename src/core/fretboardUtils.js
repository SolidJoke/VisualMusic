/**
 * Pure logic for the Fretboard component.
 * Decouples computation from the React view.
 */

import { NOTES } from "./theory";
import { FINGER_LABELS } from "./fingeringLogic";
import { logPlayingMismatch } from "./debugScale";
import { TUNINGS } from "./tunings";

/**
 * Calculates the width of each fret in a logarithmic progression (Rule of 18).
 * @param {number} numFrets 
 * @returns {number[]} array of relative widths
 */
export function getFretWidths(numFrets) {
  const widths = [];
  let L = 100;
  const R = 17.817;
  for (let i = 1; i <= numFrets; i++) {
    let w = L / R;
    widths.push(w);
    L -= w;
  }
  return widths;
}

/**
 * Calculates the absolute horizontal position (0-100) of a fret line.
 * @param {number} fret 
 * @param {number[]} widths 
 * @returns {number} position in relative units
 */
export function getFretX(fret, widths) {
  if (fret <= 0) return 0;
  let x = 40; // Base offset for nut (approximate or based on grid)
  // In our CSS grid, the first column is 40px fixed-ish.
  // This is tricky because the grid uses 'fr' units.
  // For pixel-accurate barre markers, we might need a different approach.
  // But for now, let's provide a consistent logic.
  return x + widths.slice(0, fret).reduce((a, b) => a + b, 0);
}

/**
 * Computes all metadata for a single fret on a single string.
 */
function resolveActiveState({ activeNotes, dictType, fingering }, noteValue, absoluteValue, isDictionaryMode) {
  const activeNote = activeNotes.find((n) => {
    const isScale = dictType && dictType.includes('scale');
    const isChord = dictType && dictType.includes('chord');

    if (isDictionaryMode) {
      if (isScale) {
        return (n.value % 12) === (noteValue % 12);
      }
      if (isChord && !fingering?.fingeringMap) {
        return (n.value % 12) === (noteValue % 12);
      }
    }
    
    // Strict absolute matching
    if (n.absoluteValue !== undefined && n.absoluteValue === absoluteValue) return true;
    return false;
  });
  return { isActive: !!activeNote, activeNote };
}

function resolvePlayingState({ currentlyPlayingNotes, singlePlayContext }, stringIndex, fret, absoluteValue, instrument) {
  let isPlaying = false;
  const hasInstrumentCoordinates = currentlyPlayingNotes.some(
    n => typeof n === 'object' && n !== null && n.instrument === instrument
  );
  
  for (const n of currentlyPlayingNotes) {
    if (typeof n === 'object' && n !== null) {
      if (n.absoluteValue === absoluteValue && n.stringIndex === stringIndex && n.fret === fret) {
        if (!n.instrument || n.instrument === instrument) {
          isPlaying = true;
          break;
        }
      }
    } else if (n === absoluteValue && !hasInstrumentCoordinates) {
      isPlaying = true;
      break;
    }
  }

  if (isPlaying && singlePlayContext?.instrument === instrument) {
    isPlaying = singlePlayContext.stringIndex === stringIndex && singlePlayContext.fret === fret;
  }
  return isPlaying;
}

function resolveVoicingMask({ fingering, currentlyPlayingNotes, showFingering, appMode }, stringIndex, fret, absoluteValue, instrument, isActiveIn, isPlayingIn) {
  let isActive = isActiveIn;
  let isPlaying = isPlayingIn;
  let actualFingering = null;
  let isOutOfBox = false;

  if (fingering?.scaleFrets) {
    const inPosition = fingering.scaleFrets.some(sf => sf.stringIndex === stringIndex && sf.fret === fret);
    if (isActive && !inPosition) {
      isOutOfBox = true;
    }
    if (isPlaying && !inPosition) {
      const isSpecificallyTargeted = currentlyPlayingNotes.some(n =>
        typeof n === 'object' && n !== null && n.stringIndex === stringIndex && n.fret === fret
      );
      if (!isSpecificallyTargeted) {
        logPlayingMismatch(stringIndex, fret, absoluteValue, currentlyPlayingNotes);
        isPlaying = false;
      }
    }
  } else {
    const fingeringMap = fingering?.fingeringMap || fingering;
    actualFingering = fingeringMap?.[stringIndex];
    
    const isVoicingMaskActive = (instrument === "guitar" || instrument === "bass") && 
      (showFingering || appMode === "dictionary") && 
      fingering && 
      (fingeringMap && Object.keys(fingeringMap).length > 0);

    if (isVoicingMaskActive) {
      let isPartOfVoicing = false;
      if (actualFingering) {
        if (actualFingering.status === 'open' && fret === 0) {
          isPartOfVoicing = true;
        } else if (actualFingering.status === 'played' && actualFingering.fret === fret) {
          isPartOfVoicing = true;
        } else if (actualFingering.status === 'muted') {
          isPartOfVoicing = false;
        } else {
          let finger = actualFingering[fret];
          if (finger === undefined && actualFingering.fret === fret) finger = actualFingering.finger;
          isPartOfVoicing = finger !== undefined && finger !== 'X';
        }
      }
      isActive = isPartOfVoicing;
      
      if (isPlaying && !isPartOfVoicing) {
        const isSpecificallyTargeted = currentlyPlayingNotes.some(n => 
          typeof n === 'object' && n !== null && n.stringIndex === stringIndex && n.fret === fret
        );
        if (!isSpecificallyTargeted) isPlaying = false;
      }
    }
  }
  return { isActive, isPlaying, actualFingering, isOutOfBox };
}

function resolveScaleAnchorMask({ scaleAnchor }, fret, instrument, isActiveIn, isScaleMode) {
  let isActive = isActiveIn;
  let isOutOfBoxFromAnchor = false;
  if (isScaleMode && scaleAnchor && (instrument === "guitar" || instrument === "bass")) {
    const isWithinBox = fret >= scaleAnchor.fret - 1 && fret <= scaleAnchor.fret + 4;
    if (!isWithinBox) isOutOfBoxFromAnchor = true;
  }
  return { isActive, isOutOfBoxFromAnchor };
}

function resolveRoleAndLabel(params, stringIndex, fret, noteValue, absoluteValue, isActive, isPlaying, activeNote, isScaleMode, noteInfo, actualFingering, isOutOfBox) {
  const { contextualScaleAbsoluteValues, activePath, rootValue, targetValue, showFingering, fingeringMode, notation } = params;
  let roleClass = "";
  let orderToDisplay = null;
  let isSubtle = isOutOfBox || false;
  let isTargetNote = false;

  const hasContextualScale = contextualScaleAbsoluteValues?.length > 0;
  const hasPath = activePath?.length > 0;

  if (hasContextualScale) {
    const ctxNote = contextualScaleAbsoluteValues.find(n => n.absoluteValue === absoluteValue);
    if (ctxNote) {
      if (hasPath && isScaleMode) {
        const inPath = activePath.find(p => p.stringIndex === stringIndex && p.fret === fret);
        if (inPath) orderToDisplay = ctxNote.order;
      } else {
        orderToDisplay = ctxNote.order;
      }
    }
  } else if (isScaleMode) {
    if (isActive) {
      const interval = (noteValue - rootValue + 12) % 12;
      if (interval === 0) orderToDisplay = "1";
    }
  } else if (isActive && activeNote?.order) {
    orderToDisplay = activeNote.order;
  }

  if (isActive || isPlaying) {
    if (noteValue === targetValue) {
      roleClass = "role-target";
      isTargetNote = true;
    } else if (orderToDisplay) {
      const order = String(orderToDisplay);
      if (order === "1") roleClass = "role-root";
      else if (order.includes("3")) roleClass = "role-third";
      else if (order.includes("5")) roleClass = "role-fifth";
      else roleClass = "role-extension";
    } else {
      const interval = (noteValue - rootValue + 12) % 12;
      if (interval === 0) roleClass = "role-root";
      else if (interval === 3 || interval === 4) roleClass = "role-third";
      else if (interval === 7) roleClass = "role-fifth";
      else roleClass = isActive ? "role-scale" : "role-extension";
    }
  }

  let label = orderToDisplay || noteInfo[notation];
  if (showFingering && !isScaleMode && actualFingering) {
    let fingerNum = null;
    if (actualFingering.status === 'played' && actualFingering.fret === fret) {
      fingerNum = actualFingering.finger;
    } else if (actualFingering[fret] !== undefined) {
      fingerNum = actualFingering[fret];
    }
    if (fingerNum) {
      const labels = (fingeringMode === 'anatomic' || fingeringMode === 'classical') ? FINGER_LABELS.anatomic : FINGER_LABELS.numeric;
      label = labels[fingerNum] ?? fingerNum;
    }
  }

  return { roleClass, orderToDisplay, isSubtle, isTargetNote, label };
}

function resolveStringStatus(fingering, stringIndex) {
  const actualFingeringMap = fingering?.fingeringMap || (fingering && !fingering.isScaleBox ? fingering : null);
  if (!actualFingeringMap) return null;
  const stringData = actualFingeringMap[stringIndex];
  if (!stringData) return null;

  if (stringData.status) return stringData.status;
  if (stringData['X'] === true || stringData.finger === 'X') return 'muted';
  if (stringData[0] === 'O' || stringData.finger === 'O') return 'open';
  if (Object.keys(stringData).some(k => !isNaN(parseInt(k, 10)))) return 'played';
  return null;
}

/**
 * Computes all metadata for a single fret on a single string.
 */
export function computeFretMetadata(params) {
  const { stringIndex, fret, openStringAbsValue, dictType, instrument } = params;
  const absoluteValue = openStringAbsValue + fret;
  const noteValue = absoluteValue % 12;
  const noteInfo = NOTES[noteValue] || { us: '?', eu: '?', value: noteValue };
  
  const isDictionaryMode = params.appMode === "dictionary";
  const isScaleMode = dictType?.includes("scale");

  // 1. Basic active state
  const { isActive: initialIsActive, activeNote } = resolveActiveState(params, noteValue, absoluteValue, isDictionaryMode);

  // 2. Playing state
  let isPlaying = resolvePlayingState(params, stringIndex, fret, absoluteValue, instrument);

  // 3. Voicing Masking
  const voicingRes = resolveVoicingMask(params, stringIndex, fret, absoluteValue, instrument, initialIsActive, isPlaying);
  let isActive = voicingRes.isActive;
  isPlaying = voicingRes.isPlaying;
  const actualFingering = voicingRes.actualFingering;

  // 3.5 Scale Anchor Masking
  const anchorRes = resolveScaleAnchorMask(params, fret, instrument, isActive, isScaleMode);
  isActive = anchorRes.isActive;
  const isOutOfBox = voicingRes.isOutOfBox || anchorRes.isOutOfBoxFromAnchor;

  // 4. Role & Labels
  const roleRes = resolveRoleAndLabel(params, stringIndex, fret, noteValue, absoluteValue, isActive, isPlaying, activeNote, isScaleMode, noteInfo, actualFingering, isOutOfBox);

  return {
    absoluteValue,
    noteValue,
    noteName: noteInfo[params.notation],
    isActive,
    isPlaying,
    isSubtle: roleRes.isSubtle,
    roleClass: roleRes.roleClass,
    label: roleRes.label,
    isTargetNote: roleRes.isTargetNote,
    noteInfo,
    stringStatus: resolveStringStatus(params.fingering, stringIndex)
  };
}

// ─── Fonctions extraites de Fretboard.jsx (refactoring A.1.3) ────────────────

/**
 * Déduit l'accordage actif en fonction de l'instrument et du brick actif.
 * @param {string} instrument - "guitar" | "bass"
 * @param {object|null} activeBrick - brick actif du contexte musical
 * @returns {number[]} tableau de valeurs de corde (accordage)
 */
export function getStringTuning(instrument, activeBrick) {
  if (instrument === "bass") {
    return activeBrick?.bassStrings || TUNINGS.BASS_STANDARD;
  }
  return activeBrick?.guitarStrings || TUNINGS.GUITAR_STANDARD;
}

/**
 * Génère la valeur CSS `grid-template-columns` logarithmique pour le fretboard.
 * La première colonne est fixe (corde à vide), les suivantes suivent la règle de 18.
 * @param {number[]} fretWidths - tableau de largeurs relatives (issu de getFretWidths)
 * @returns {string} valeur CSS `grid-template-columns`
 */
export function getFretboardGridTemplate(fretWidths) {
  const cols = ["minmax(40px, 0.5fr)"];
  fretWidths.forEach(w => cols.push(`${w.toFixed(4)}fr`));
  return cols.join(" ");
}

/**
 * Détecte les données de barré à partir d'un fingeringMap.
 * Supporte le format V2 ({ fret, finger, status }) et le format Legacy ({ [fret]: finger }).
 * N'est actif que pour les types dictionnaire non-gamme.
 * @param {object|null} fingeringMap - map de doigté par corde
 * @param {string|null} dictType - type de dictionnaire courant
 * @returns {Array<{fret: number, minVisual: number, maxVisual: number}>}
 */
export function extractBarreData(fingeringMap, dictType) {
  if (!fingeringMap || dictType?.includes('scale')) return [];

  const fretFingerOneVisual = {};

  Object.entries(fingeringMap).forEach(([strIdxStr, stringData]) => {
    const visualIdx = parseInt(strIdxStr, 10);
    if (!stringData) return;

    // Format V2 : { fret, finger, status }
    if (stringData.status === 'played' && stringData.finger === 1) {
      const fret = stringData.fret;
      if (fret > 0) {
        if (!fretFingerOneVisual[fret]) fretFingerOneVisual[fret] = [];
        fretFingerOneVisual[fret].push(visualIdx);
      }
    }
    // Format Legacy : { [fret]: finger }
    else if (typeof stringData === 'object' && !stringData.status) {
      Object.entries(stringData).forEach(([fretStr, finger]) => {
        const fret = parseInt(fretStr, 10);
        if (!isNaN(fret) && fret > 0 && finger === 1) {
          if (!fretFingerOneVisual[fret]) fretFingerOneVisual[fret] = [];
          fretFingerOneVisual[fret].push(visualIdx);
        }
      });
    }
  });

  return Object.entries(fretFingerOneVisual)
    .filter(([_, indices]) => indices.length >= 2)
    .map(([fret, indices]) => ({
      fret: parseInt(fret, 10),
      minVisual: Math.min(...indices),
      maxVisual: Math.max(...indices),
    }));
}
