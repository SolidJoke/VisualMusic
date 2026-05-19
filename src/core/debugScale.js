/**
 * debugScale.js — VisualMusic Scale Debug Layer
 *
 * Activez le debug depuis la console du navigateur :
 *   window.VM_DEBUG = true   // activer tous les logs
 *   window.VM_DEBUG = false  // désactiver
 *
 * Logs produits :
 *   [VM-POS]      Contenu d'une position chargée (scaleFrets → noms de notes)
 *   [VM-SEQ]      Séquence de playback complète (montée + descente)
 *   [VM-PLAY]     Chaque note jouée avec ses coordonnées string/fret
 *   [VM-ACTIVE]   Notes isActive=true sur le fretboard au moment du rendu
 *   [VM-MISMATCH] Alerte si isPlaying=true pour une case non attendue
 */

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/** Convertit une valeur absolue MIDI en nom lisible (ex: 59 → "B3") */
export function absToName(abs) {
  if (abs == null || isNaN(abs)) return '?';
  return NOTE_NAMES[abs % 12] + Math.floor(abs / 12);
}

/** @returns {boolean} */
export function isDebugEnabled() {
  return typeof window !== 'undefined' && window.VM_DEBUG === true;
}

/**
 * Log le contenu d'une position de gamme après chargement.
 * @param {string} instrument  'guitar' | 'bass'
 * @param {number} posIndex    index 0-based de la position (0 = pos 1/5)
 * @param {Array}  scaleFrets  [{stringIndex, fret, noteValue}]
 * @param {Array}  reversedTuning  strings low→high reversed (index 0 = highest)
 */
export function logScalePosition(instrument, posIndex, scaleFrets, reversedTuning) {
  if (!isDebugEnabled()) return;

  const grouped = {};
  scaleFrets.forEach(sf => {
    if (!grouped[sf.stringIndex]) grouped[sf.stringIndex] = [];
    const openNote = getAbsoluteFromStringName(reversedTuning[sf.stringIndex]);
    const abs = openNote + sf.fret;
    grouped[sf.stringIndex].push(`${absToName(abs)}@f${sf.fret}`);
  });

  console.group(`[VM-POS] ${instrument.toUpperCase()} — Position ${posIndex + 1} (${scaleFrets.length} notes)`);
  Object.entries(grouped).forEach(([si, notes]) => {
    console.log(`  String ${si} (${reversedTuning[si]}): ${notes.join(', ')}`);
  });
  console.groupEnd();
}

/**
 * Log la séquence de playback complète (boxNotes triées montée+descente).
 * @param {Array} sequence  [{absoluteValue, stringIndex, fret}]
 */
export function logPlaybackSequence(sequence) {
  if (!isDebugEnabled()) return;
  const labels = sequence.map((n, i) =>
    `${i}: ${absToName(n.absoluteValue)} (s${n.stringIndex},f${n.fret})`
  );
  console.group(`[VM-SEQ] Playback sequence — ${sequence.length} steps`);
  console.log(labels.join('\n'));
  console.groupEnd();
}

/**
 * Log chaque note au moment où elle est jouée.
 * @param {object} note  {absoluteValue, stringIndex, fret}
 * @param {number} index Position dans la séquence
 */
export function logNotePlay(note, index) {
  if (!isDebugEnabled()) return;
  if (!note || typeof note !== 'object') {
    console.log(`[VM-PLAY] step=${index} → (no fretboard data, abs=${note})`);
    return;
  }
  console.log(
    `[VM-PLAY] step=${index} → ${absToName(note.absoluteValue)} | string=${note.stringIndex} fret=${note.fret} abs=${note.absoluteValue}`
  );
}

/**
 * Alerte si isPlaying=true se déclenche sur une case non attendue.
 * Appelé depuis computeFretMetadata quand on détecte un match inattendu.
 *
 * @param {number} stringIndex  Corde de la case évaluée
 * @param {number} fret         Case évaluée
 * @param {number} absoluteValue  Valeur absolue calculée pour cette case
 * @param {Array}  currentlyPlayingNotes  État actuel
 */
export function logPlayingMismatch(stringIndex, fret, absoluteValue, currentlyPlayingNotes) {
  if (!isDebugEnabled()) return;
  const playing = currentlyPlayingNotes.map(n =>
    typeof n === 'object'
      ? `${absToName(n.absoluteValue)}(s${n.stringIndex},f${n.fret})`
      : `abs=${n}`
  ).join(', ');
  console.warn(
    `[VM-MISMATCH] isPlaying=true for ${absToName(absoluteValue)} @ string=${stringIndex} fret=${fret} | currentlyPlaying=[${playing}]`
  );
}

/**
 * Log un snapshot des notes isActive sur le fretboard.
 * Appeler manuellement depuis la console : window.VM_SNAP()
 * (configuré dans Fretboard.jsx si debug actif)
 */
export function createFretboardSnapshot(activeCells) {
  if (!activeCells?.length) {
    console.log('[VM-ACTIVE] Aucune note isActive sur le fretboard.');
    return;
  }
  console.group(`[VM-ACTIVE] ${activeCells.length} notes actives sur le fretboard`);
  activeCells.forEach(c => {
    console.log(`  ${absToName(c.absoluteValue)} — string=${c.stringIndex} fret=${c.fret} isPlaying=${c.isPlaying}`);
  });
  console.groupEnd();
}

// --- Utilitaire interne ---
const STRING_BASE = { E2:40, A2:45, D3:50, G3:55, B3:59, E4:64, E1:28, A1:33, D2:38, G2:43 };
function getAbsoluteFromStringName(name) {
  return STRING_BASE[name] ?? 0;
}
