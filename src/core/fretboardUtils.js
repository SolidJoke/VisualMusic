/**
 * Pure logic for the Fretboard component.
 * Decouples computation from the React view.
 */

import { NOTES, getAbsoluteNoteValue, getIntervalMetadata } from "./theory";
import { FINGER_LABELS } from "./fingeringLogic";

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
export function computeFretMetadata(params) {
  const {
    stringIndex,
    fret,
    openStringAbsValue,
    activeNotes,
    currentlyPlayingNotes,
    contextualScaleAbsoluteValues,
    activePath,
    dictType,
    fingering,
    instrument,
    rootValue,
    targetValue,
    showFingering,
    fingeringMode,
    singlePlayContext,
    notation,
    scaleAnchor,
  } = params;

  const absoluteValue = openStringAbsValue + fret;
  const noteValue = absoluteValue % 12;
  const noteInfo = NOTES[noteValue];

  // 1. Basic active state
  const activeNote = activeNotes.find((n) => {
    if (n.absoluteValue !== undefined) return n.absoluteValue === absoluteValue;
    return n.value % 12 === noteValue;
  });
  let isActive = !!activeNote;

  // 2. Playing state
  let isPlaying = false;
  for (const n of currentlyPlayingNotes) {
    if (typeof n === 'object' && n !== null) {
      if (n.absoluteValue === absoluteValue && n.stringIndex === stringIndex && n.fret === fret) {
        isPlaying = true;
        break;
      }
    } else if (n === absoluteValue) {
      // If raw pitch, only highlight if it's currently active (visible) on this fretboard
      // This prevents homonyms from lighting up when they are outside the current box/fingering
      if (isActive) {
        isPlaying = true;
        break;
      }
    }
  }

  if (isPlaying && singlePlayContext?.instrument === instrument) {
    isPlaying = singlePlayContext.stringIndex === stringIndex && singlePlayContext.fret === fret;
  }

  // 3. Voicing Masking
  const isScaleMode = dictType?.includes("scale");
  const actualFingering = fingering?.fingeringMap || (fingering && !fingering.isScaleBox ? fingering : null);
  const isVoicingMaskActive = (instrument === "guitar" || instrument === "bass") && showFingering && (fingering?.isScaleBox || actualFingering);

  if (isVoicingMaskActive) {
    if (fingering.isScaleBox) {
      const isPartOfVoicing = (fret >= fingering.startFret && fret <= fingering.endFret);
      if (!isPartOfVoicing) isActive = false;
    } else {
      const fingerAtLocation = actualFingering[stringIndex]?.[fret];
      const isMuted = actualFingering[stringIndex]?.['X'] === true;
      const isPartOfVoicing = (fingerAtLocation && fingerAtLocation !== 'X' && fingerAtLocation !== 'O') || (fret === 0 && fingerAtLocation === 'O');
      
      if (isMuted) isActive = false;
      else if (!isPartOfVoicing) isActive = false;
    }
  }

  // 3.5 Scale Anchor Masking (Local Root Focus)
  if (isScaleMode && scaleAnchor && (instrument === "guitar" || instrument === "bass")) {
    // If we have an anchor, show notes in a 5-fret box around it
    // Pattern: -1 to +4 frets from anchor
    const isWithinBox = fret >= scaleAnchor.fret - 1 && fret <= scaleAnchor.fret + 4;
    if (!isWithinBox) isActive = false;
  }

  // 4. Role & Labels
  let roleClass = "";
  let orderToDisplay = null;
  let isSubtle = false;

  const hasContextualScale = contextualScaleAbsoluteValues?.length > 0;
  const hasPath = activePath?.length > 0;

  if (hasContextualScale) {
    const ctxNote = contextualScaleAbsoluteValues.find(n => n.absoluteValue === absoluteValue);
    if (ctxNote) {
      if (hasPath && isScaleMode) {
        const inPath = activePath.find(p => p.stringIndex === stringIndex && p.fret === fret);
        if (inPath) orderToDisplay = ctxNote.order;
        else { isSubtle = !isPlaying; isPlaying = isPlaying; }
      } else {
        orderToDisplay = ctxNote.order;
      }
    } else if (isActive) {
      isSubtle = !isPlaying;
    }
  } else if (isScaleMode) {
    if (isActive) {
      const interval = (noteValue - rootValue + 12) % 12;
      if (interval === 0) orderToDisplay = "1";
      else isSubtle = true;
    }
  } else if (isActive && activeNote.order) {
    orderToDisplay = activeNote.order;
  }

  if (isActive) {
    if (noteValue === targetValue) roleClass = "role-target";
    else if (orderToDisplay) {
      const order = String(orderToDisplay);
      if (order === "1") roleClass = "role-root";
      else if (order.includes("3")) roleClass = "role-third";
      else if (order.includes("5")) roleClass = "role-fifth";
      else roleClass = "role-scale";
    } else {
      const interval = (noteValue - rootValue + 12) % 12;
      if (interval === 0) roleClass = "role-root";
      else if (interval === 3 || interval === 4) roleClass = "role-third";
      else if (interval === 7) roleClass = "role-fifth";
      else roleClass = "role-scale";
    }
  }

  // Fingering text and Interval metadata
  let label = orderToDisplay || noteInfo[notation];
  const intervalMeta = getIntervalMetadata((noteValue - rootValue + 12) % 12);
  
  if (showFingering && !isScaleMode) {
    const fingerAtLocation = actualFingering?.[stringIndex]?.[fret];
    if (fingerAtLocation) {
      const labels = fingeringMode === 'anatomic' ? FINGER_LABELS.anatomic : FINGER_LABELS.numeric;
      label = labels[fingerAtLocation] ?? fingerAtLocation;
    }
  }

  return {
    absoluteValue,
    noteValue,
    noteName: noteInfo[notation],
    isActive,
    isPlaying,
    isSubtle,
    roleClass,
    label,
    isNoteOpen: fret === 0 && isActive,
    noteInfo
  };
}
