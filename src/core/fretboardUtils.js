/**
 * Pure logic for the Fretboard component.
 * Decouples computation from the React view.
 */

import { NOTES, getAbsoluteNoteValue, getIntervalMetadata } from "./theory";
import { FINGER_LABELS } from "./fingeringLogic";
import { logPlayingMismatch } from "./debugScale";

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
  const noteInfo = NOTES[noteValue] || { us: '?', eu: '?', value: noteValue };

  // 1. Basic active state
  // In dictionary mode, we often want to see the scale/note across the whole neck
  // unless a specific voicing is active.
  const isDictionaryMode = params.appMode === "dictionary";
  const activeNote = activeNotes.find((n) => {
    // If it's a dictionary scale (and not a specific voicing yet),
    // we match by note value % 12 to show all octaves.
    // For single notes and chords, we want strict absolute matching when available.
    if (isDictionaryMode && dictType && (dictType.includes('scale') || dictType.includes('chord')) && !fingering?.fingeringMap && !fingering?.isScaleBox) {
      return (n.value % 12) === (noteValue % 12);
    }
    // Otherwise, try strict absolute matching first
    if (n.absoluteValue !== undefined && n.absoluteValue === absoluteValue) return true;
    // Fallback for Dictionary Mode: match by pitch class if no strict match found
    // ONLY if we are NOT in a specific voicing/box mode
    if (isDictionaryMode && !fingering?.fingeringMap && !fingering?.isScaleBox) {
      return (n.value % 12) === (noteValue % 12);
    }
    return false;
  });
  let isActive = !!activeNote;

  // 2. Playing state
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
      // Notes highlight during playback if absolute values match, 
      // but only if there is no instrument-specific coordinate playback for our current instrument,
      // to avoid duplicate/multi-octave highlighting.
      isPlaying = true;
      break;
    }
  }

  if (isPlaying && singlePlayContext?.instrument === instrument) {
    isPlaying = singlePlayContext.stringIndex === stringIndex && singlePlayContext.fret === fret;
  }

  // Defensive: when scaleFrets is active, ONLY coordinate-exact matches count.
  // Raw integers must never trigger highlights in scale-position mode.
  if (isPlaying && fingering?.scaleFrets) {
    const hasExactCoordinate = currentlyPlayingNotes.some(n =>
      typeof n === 'object' && n !== null && n.stringIndex === stringIndex && n.fret === fret
    );
    if (!hasExactCoordinate) {
      isPlaying = false;
    }
  }

  // 3. Voicing Masking
  //
  // Shared reads used by both scale and chord masking branches, and by section 3.5 / 4 below.
  const isScaleMode = dictType?.includes("scale");
  const fingeringMap = fingering?.fingeringMap || fingering;
  const actualFingering = (!fingering?.scaleFrets) ? fingeringMap?.[stringIndex] : null;

  // Option-B: Scale position mode. When fingering.scaleFrets is present, use it exclusively.
  // This is a flat list of {stringIndex, fret} pairs computed by getAvailableScaleFingerings.
  // Simple, explicit, zero cross-talk with chord fingeringMap logic.
  if (fingering?.scaleFrets) {
    const inPosition = fingering.scaleFrets.some(
      sf => sf.stringIndex === stringIndex && sf.fret === fret
    );
    isActive = inPosition;
    // Only allow playback highlight if the note is exactly at this position fret
    if (isPlaying && !inPosition) {
      const isSpecificallyTargeted = currentlyPlayingNotes.some(n =>
        typeof n === 'object' && n !== null && n.stringIndex === stringIndex && n.fret === fret
      );
      if (!isSpecificallyTargeted) {
        // Log mismatch: isPlaying was triggered for a cell outside the specifically targeted note.
        // This usually means the absoluteValue matched a wrong cell (pitch class collision).
        logPlayingMismatch(stringIndex, fret, absoluteValue, currentlyPlayingNotes);
        isPlaying = false;
      }
    }
    // Skip the fingeringMap voicing mask below — not applicable to scales
  } else {
    // Chord / single-note voicing masking (fingeringMap-based, unchanged)
    const isVoicingMaskActive = (instrument === "guitar" || instrument === "bass") && 
      (showFingering || params.appMode === "dictionary") && 
      fingering && 
      (fingering.isScaleBox || (fingeringMap && Object.keys(fingeringMap).length > 0));

    let isPartOfVoicing = false;
    if (isVoicingMaskActive) {
      if (actualFingering) {
        // V2 format Support
        if (actualFingering.status === 'open' && fret === 0) {
          isPartOfVoicing = true;
        } else if (actualFingering.status === 'played' && actualFingering.fret === fret) {
          isPartOfVoicing = true;
        } else if (actualFingering.status === 'muted') {
          isPartOfVoicing = false;
        } else {
          // Legacy format Support ( { fret: finger } )
          let finger = actualFingering[fret];
          if (finger === undefined && actualFingering.fret === fret) {
            finger = actualFingering.finger;
          }
          isPartOfVoicing = finger !== undefined && finger !== 'X';
        }
      }
      
      // In voicing mode, the mask determines active state
      isActive = isPartOfVoicing;
      
      // Fix: If the note is playing globally but is not part of this specific voicing mask, don't animate it
      if (isPlaying && !isPartOfVoicing) {
        const isSpecificallyTargeted = currentlyPlayingNotes.some(n => 
          typeof n === 'object' && n !== null && n.stringIndex === stringIndex && n.fret === fret
        );
        if (!isSpecificallyTargeted) {
          isPlaying = false;
        }
      }
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
  let isTargetNote = false;

  const hasContextualScale = contextualScaleAbsoluteValues?.length > 0;
  const hasPath = activePath?.length > 0;

  if (hasContextualScale) {
    const ctxNote = contextualScaleAbsoluteValues.find(n => n.absoluteValue === absoluteValue);
    if (ctxNote) {
      if (hasPath && isScaleMode) {
        const inPath = activePath.find(p => p.stringIndex === stringIndex && p.fret === fret);
        if (inPath) orderToDisplay = ctxNote.order;
        // Removed isSubtle forced state to ensure visibility without playback
      } else {
        orderToDisplay = ctxNote.order;
    }
  }
} else if (isScaleMode) {
    if (isActive) {
      const interval = (noteValue - rootValue + 12) % 12;
      if (interval === 0) orderToDisplay = "1";
      // Removed isSubtle = true for scales to ensure they are visible without playback
    }
  } else if (isActive && activeNote?.order) {
    orderToDisplay = activeNote.order;
  }

  if (isActive || isPlaying) {
    if (noteValue === targetValue) {
      roleClass = "role-target";
      isTargetNote = true;
    }
    else if (orderToDisplay) {
      const order = String(orderToDisplay);
      if (order === "1") roleClass = "role-root";
      else if (order.includes("3")) roleClass = "role-third";
      else if (order.includes("5")) roleClass = "role-fifth";
      else roleClass = "role-extension";
    } else {
      // Fallback for notes that are playing but not part of the explicit activeNote/order logic
      const interval = (noteValue - rootValue + 12) % 12;
      if (interval === 0) roleClass = "role-root";
      else if (interval === 3 || interval === 4) roleClass = "role-third";
      else if (interval === 7) roleClass = "role-fifth";
      else roleClass = isActive ? "role-scale" : "role-extension";
    }
  }

  // Fingering text and Interval metadata
  let label = orderToDisplay || noteInfo[notation];
  const intervalMeta = getIntervalMetadata((noteValue - rootValue + 12) % 12);
  
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

  return {
    absoluteValue,
    noteValue,
    noteName: noteInfo[notation],
    isActive,
    isPlaying,
    isSubtle,
    roleClass,
    label,
    isTargetNote,
    noteInfo,
    stringStatus: (() => {
      const actualFingeringMap = fingering?.fingeringMap || (fingering && !fingering.isScaleBox ? fingering : null);
      if (!actualFingeringMap) return null;
      
      const stringData = actualFingeringMap[stringIndex];
      if (!stringData) return null;

      // V2 Format
      if (stringData.status) {
        return stringData.status; // 'open', 'muted', 'played', 'muffled', etc.
      }
      
      // Legacy Format
      if (stringData['X'] === true || stringData.finger === 'X') return 'muted';
      if (stringData[0] === 'O' || stringData.finger === 'O') return 'open';
      if (Object.keys(stringData).some(k => !isNaN(parseInt(k, 10)))) return 'played';
      
      return null;
    })()
  };
}
