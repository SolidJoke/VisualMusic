// @ts-check
import { useMemo } from "react";
import { getGuitarFingering, getBassFingering } from "../core/fingeringLogic";
import {
  getScaleNotes,
  resolveChordSemitones,
  resolveNnsToChordType
} from "../core/theory";
import { TUNINGS } from "../core/tunings";
import { getInversionType, getChordIntervalLabel } from "../core/harmonyEngine";
import { realizeDictionarySelection } from "../core/realization";
import {
  listPlacements,
  resolvePlacement,
  familyOf,
  tessitura,
  isOutsideTessitura
} from "../core/placements";
import { getChordTargetNotes, getModeTargetNote } from "../core/targetNotes";

/**
 * INST-B1 — what one neck's position list is about, for listPlacements. The
 * branching is the one the former availableGuitarFingerings /
 * availableBassFingerings memos used, unchanged — including its Studio quirk:
 * with a chord clicked and the Dictionary left on a single note, the arrows
 * list that note's places.
 * @returns {import("../core/placements").Selection|null}
 */
function placementSelectionFor({ appMode, dictType, dictRoot, dictOctave, dictActiveNotes, effectiveChord, chordOctaveOffset, rootString }) {
  /** @returns {import("../core/placements").Selection} */
  const noteSelection = () => ({ family: "note", type: "single_note", notePitch: dictActiveNotes?.[0]?.absoluteValue ?? null });
  if (appMode === "dictionary" && dictType) {
    if (dictType.includes("scale")) return { family: "scale", type: dictType, root: dictRoot, octave: dictOctave };
    if (dictType === "single_note") return noteSelection();
    return { family: "chord", type: dictType, root: Number(dictRoot), octave: dictOctave, rootString };
  }
  if (!effectiveChord) return null;
  if (dictType === "single_note") return noteSelection();
  return {
    family: "chord",
    type: resolveNnsToChordType(effectiveChord.nns),
    root: effectiveChord.rootNote.value,
    octave: chordOctaveOffset || 0,
    rootString,
  };
}

/**
 * fingeringLogic.js's map `{ [string]: { [fret]: finger } }` as the neck reads
 * it: `{ [string]: { fret, status, finger } }` (MusicState v2). Unchanged by
 * INST-B1, only moved out of the hook (it reads no state).
 */
function toV2(fingering, instrument) {
  if (!fingering) return null;
  const v2Map = {};
  const rawMap = fingering.fingeringMap;
  if (!rawMap) return fingering;
  const maxString = instrument === 'bass' ? 3 : 5;

  for (let i = 0; i <= maxString; i++) {
    const stringData = rawMap[i];
    if (!stringData || stringData.X) {
      v2Map[i] = { fret: -1, status: 'muted' };
    } else if (stringData[0] === 'O' || stringData.O) {
      v2Map[i] = { fret: 0, status: 'open' };
    } else {
      const fret = Object.keys(stringData).find(k => !isNaN(Number(k)));
      v2Map[i] = {
        fret: parseInt(fret),
        status: 'played',
        finger: stringData[fret]
      };
    }
  }
  return { ...fingering, fingeringMap: v2Map };
}

/**
 * What one neck draws.
 * - Dictionary: the chosen placement, or the default one — for a chord the
 *   shape fingeringLogic.js picks from the root string and the octave
 *   (listPlacements marks it, and it is computed again here only if no entry
 *   matched); for a scale the box the octave picks (C-06, core/placements.js);
 *   for a single note none (every place of the note is lit).
 * - Studio: the clicked chord's default shape, unchanged — the chosen index is
 *   not read there, as before.
 */
function fingeringFor({ instrument, placements, index, rootString, appMode, dictType, dictRoot, dictOctave, effectiveChord, chordOctaveOffset }) {
  const getDefault = instrument === "bass" ? getBassFingering : getGuitarFingering;
  if (appMode === "dictionary" && dictType) {
    const placement = resolvePlacement(placements, index);
    if (dictType.includes("scale")) {
      const box = placement?.fingering;
      if (box?.scaleFrets) return { scaleFrets: box.scaleFrets, isScaleMode: true, startFret: box.startFret, endFret: box.endFret };
      return null;
    }
    if (dictType === "single_note") return placement ? toV2(placement.fingering, instrument) : null;
    if (!dictType.includes("chord")) return null;
    if (placement) return toV2(placement.fingering, instrument);
    return toV2(getDefault(Number(dictRoot), dictType, rootString, dictOctave), instrument);
  }
  if (!effectiveChord) return null;
  const offset = appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0);
  return toV2(getDefault(effectiveChord.rootNote.value, resolveNnsToChordType(effectiveChord.nns), rootString, offset), instrument);
}

/**
 * useMusicEngine Hook
 * 
 * Centralizes harmonic resolution and fingering calculations.
 * Adheres to MusicState v2 contract.
 * @param {Object} options
 * @param {string} options.appMode
 * @param {any} options.activeBrick
 * @param {any} options.clickedChord
 * @param {boolean} [options.isPlaying] whether the sequencer loop is currently
 *   playing (VMU-129). While true, the studio-mode musical context (notes,
 *   fingerings) follows `currentPlayingChord` instead of `clickedChord`; at
 *   rest (or with nothing playing yet) it follows `clickedChord`, unchanged
 *   from before VMU-129.
 * @param {any} [options.currentPlayingChord] the chord useSequencer is
 *   currently playing, published once per measure — same shape as
 *   clickedChord ({ rootNote: { value }, nns }) plus `absolutePitches`, the
 *   actual MIDI notes it is playing this measure. Null at rest.
 * @param {any[]} options.currentAbsoluteNotes
 * @param {number} options.chordOctaveOffset
 * @param {string} options.displayMode
 * @param {any} options.selectedRootStringGuitar
 * @param {any} options.selectedRootStringBass
 * @param {{piano?: {octave: number}, guitar?: {index: number|null}, bass?: {index: number|null}}} options.placementByInstrument
 *   INST-B1 — the chosen position of each neck (useDictionaryMode): an index
 *   into that neck's list (`placementsByInstrument`, nut -> body), null = the
 *   default. Read in the Dictionary only, as the voicing indexes it replaces
 *   were; the Studio shows the default shape. No default value: a call site
 *   that forgets it fails HookOptionContracts.
 * @param {any} options.dictRoot
 * @param {string} options.dictType
 * @param {any[]} options.dictActiveNotes
 * @param {number} options.dictOctave
 * @param {string} options.notation
 * @param {'piano'|'guitar'|'bass'} [options.playbackInstrument] instrument that
 *   owns the realization: its fingering decides the pitches that are both
 *   played and highlighted. Defaults to piano, i.e. the theoretical notes.
 * @param {string} [options.targetNotesPreset] VMU-123 — which notes of the
 *   current chord (or, with no chord, the current mode) to mark as targets:
 *   one of core/targetNotes.js's TARGET_NOTES_PRESETS. Defaults to
 *   "majorMinor" — good without any setting, since a beginner will not
 *   change it (brief decision #2).
 */
export function useMusicEngine({
  appMode,
  activeBrick,
  clickedChord,
  isPlaying = false,
  currentPlayingChord = null,
  currentAbsoluteNotes,
  chordOctaveOffset,
  displayMode,
  selectedRootStringGuitar,
  selectedRootStringBass,
  placementByInstrument,
  dictRoot,
  dictType,
  dictActiveNotes,
  dictOctave,
  notation,
  playbackInstrument = 'piano',
  targetNotesPreset = 'majorMinor'
}) {

  // VMU-129 — while the sequencer plays, the studio-mode chord the
  // instruments show is the one it is currently playing, not the last
  // clicked one; at rest it's the clicked chord, unchanged. Every read
  // below that used to say `clickedChord` reads `effectiveChord` instead,
  // so no consumer here ever recomputes the chord from the progression on
  // its own — the sequencer is the only place that does that (VMU-003).
  const effectiveChord = (isPlaying && currentPlayingChord) ? currentPlayingChord : clickedChord;
  // The absolute pitches behind effectiveChord: the actually-played voicing
  // for a clicked chord (state set at click time), or the sequencer's own
  // `absolutePitches` for the chord it is currently playing — never
  // re-derived from `effectiveChord.nns` here.
  const effectiveAbsoluteNotes = (isPlaying && currentPlayingChord)
    ? currentPlayingChord.absolutePitches
    : currentAbsoluteNotes;

  // --- 1. Harmonization & Active Notes ---
  const musicContext = useMemo(() => {
    let activeNotes = [];
    let fretboardActiveNotes = null;
    let currentRootValue = 0;

    if (appMode === "studio") {
      const scaleNotes = getScaleNotes(
        activeBrick.rootValue,
        activeBrick.scaleKey
      );

      if (displayMode === "scale") {
        activeNotes = scaleNotes;
      } else {
        if (effectiveChord) {
          activeNotes = effectiveAbsoluteNotes.map((val) => {
            const semi = (val - effectiveChord.rootNote.value + 12) % 12;
            return {
              value: val % 12,
              order: getChordIntervalLabel(-1, semi),
              absoluteValue: val,
            };
          });

          const chordType = resolveNnsToChordType(effectiveChord.nns);
          const chordData = resolveChordSemitones(chordType);
          if (chordData) {
            // Use the absolute value of the played notes if possible, or calculate from root
            // VMU-146: index -1 (not chordData's own position `i`), to match
            // the piano producer above (:119) — see report, "producer index
            // divergence" (chord_aug/chord_dim7 disagreed with the piano).
            fretboardActiveNotes = chordData.semitones.map((semi) => {
              const val = (effectiveChord.rootNote.value + semi) % 12;
              // Try to find if this note is in the played voicing to get its absolute value
              const played = activeNotes.find(n => n.value === val);
              return {
                value: val,
                order: getChordIntervalLabel(-1, semi),
                absoluteValue: played ? played.absoluteValue : (effectiveChord.rootNote.value + semi + 48)
              };
            });
          }
        } else {
          // Default triad if no chord clicked
          const n1 = scaleNotes.at(0).value;
          const n2 = scaleNotes.at(2).value;
          const n3 = scaleNotes.at(4).value;
          activeNotes.push(
            { value: n1, order: getChordIntervalLabel(0, 0), absoluteValue: n1 + 48 },
            { value: n2, order: getChordIntervalLabel(1, (n2 - n1 + 12) % 12), absoluteValue: n2 + (n2 < n1 ? 60 : 48) },
            { value: n3, order: getChordIntervalLabel(2, (n3 - n1 + 12) % 12), absoluteValue: n3 + (n3 < n1 ? 60 : 48) },
          );
          // VMU-146: `order` is now a degree label from getChordIntervalLabel
          // (the same function the clicked-chord branch above already uses),
          // not the note's bare rank (1, 2, 3) in the triad. The rank read as
          // a degree is exactly the bug: PianoKeyboard.jsx and
          // core/fretboardUtils.js both interpreted `order` as a harmonic
          // degree, so the 3rd (rank 2) showed as "extension" and the 5th
          // (rank 3) as "third". See getRoleForDegreeLabel (harmonyEngine.js).
        }
      }

      currentRootValue = effectiveChord
        ? effectiveChord.rootNote.value
        : activeBrick.rootValue;

    } else {
      // Dictionary Mode
      currentRootValue = Number(dictRoot);
      activeNotes = dictActiveNotes;
    }

    return { activeNotes, fretboardActiveNotes, currentRootValue };
  }, [appMode, activeBrick, effectiveChord, effectiveAbsoluteNotes, displayMode, dictRoot, dictActiveNotes]);

  // --- 1bis. Target notes (VMU-123) ---
  //
  // A "target note" is always a note of the chord being played — never a
  // scale-degree suggestion outside it (redefined 2026-09-16). Two branches,
  // mirrored between Studio and Dictionary:
  //   - a chord is showing (effectiveChord in Studio; a chord_* family in
  //     Dictionary) -> the chord's own notes for the chosen preset
  //     (getChordTargetNotes).
  //   - no chord (nothing clicked yet in Studio; a scale_* family in
  //     Dictionary) -> the mode's characteristic note, the former "Magic
  //     Note" (getModeTargetNote), or nothing if the mode has none.
  //   - Dictionary "single_note" family, or preset "off": nothing.
  // Bass never receives a target (brief decision #4) — enforced in
  // targetValuesByInstrument below, not here, the same way realizations
  // above are computed generically and only diverge per instrument in
  // realizationsByInstrument.
  const targetValues = useMemo(() => {
    if (appMode === "studio") {
      if (effectiveChord) {
        const chordType = resolveNnsToChordType(effectiveChord.nns);
        return getChordTargetNotes(effectiveChord.rootNote.value, chordType, targetNotesPreset);
      }
      return getModeTargetNote(activeBrick.rootValue, activeBrick.scaleKey, targetNotesPreset);
    }

    // Dictionary mode
    if (typeof dictType === "string" && dictType.startsWith("chord_")) {
      return getChordTargetNotes(Number(dictRoot), dictType, targetNotesPreset);
    }
    if (typeof dictType === "string" && dictType.startsWith("scale_")) {
      return getModeTargetNote(Number(dictRoot), dictType, targetNotesPreset);
    }
    // "single_note", or an unrecognised dictType: nothing.
    return [];
  }, [appMode, effectiveChord, activeBrick, dictType, dictRoot, targetNotesPreset]);

  const targetValuesByInstrument = useMemo(() => ({
    piano: targetValues,
    guitar: targetValues,
    bass: [], // VMU-123 decision #4 — the bass never shows the 3rd or any other target.
  }), [targetValues]);

  // --- 2. Inversion Logic ---
  //
  // VMU-129 QA follow-up (found while implementing VMU-123): this used to
  // read `clickedChord`/`currentAbsoluteNotes` directly, so during playback
  // the label kept describing the last CLICKED chord (or stayed empty)
  // instead of the chord actually playing. Reads `effectiveChord` /
  // `effectiveAbsoluteNotes` now, exactly like block 1 above — "which chord
  // are we describing right now" is the same question in both places.
  const inversionText = useMemo(() => {
    if (effectiveChord && effectiveAbsoluteNotes && effectiveAbsoluteNotes.length > 0) {
      const invType = getInversionType(
        effectiveAbsoluteNotes[0],
        effectiveChord.rootNote.value,
        effectiveChord.nns,
      );
      // Note: Translations should ideally be handled outside or passed in,
      // but we match App.jsx behavior for now.
      return invType;
    }
    return "";
  }, [effectiveChord, effectiveAbsoluteNotes]);

  // --- 3. Placements and Fingering Logic (Guitar & Bass) ---
  //
  // INST-B1 — each neck's positions, from core/placements.js: the shapes
  // fingeringLogic.js offers, ordered from the nut to the body, each with its
  // fret bounds, the span it sounds and whether it is the default. The Position
  // arrows, the positions window and (L1b-1) the column heads read these lists
  // and nothing else. In the Studio the list is the clicked chord's, as before.
  const guitarTuning = activeBrick?.guitarStrings || TUNINGS.GUITAR_STANDARD;
  const bassTuning = activeBrick?.bassStrings || TUNINGS.BASS_STANDARD;
  const guitarIndex = placementByInstrument?.guitar?.index ?? null;
  const bassIndex = placementByInstrument?.bass?.index ?? null;

  const guitarPlacements = useMemo(() => listPlacements(
    placementSelectionFor({ appMode, dictType, dictRoot, dictOctave, dictActiveNotes, effectiveChord, chordOctaveOffset, rootString: selectedRootStringGuitar }),
    { id: "guitar", tuning: guitarTuning, notation }
  ), [appMode, dictType, dictRoot, dictOctave, dictActiveNotes, effectiveChord, chordOctaveOffset, selectedRootStringGuitar, guitarTuning, notation]);

  const bassPlacements = useMemo(() => listPlacements(
    placementSelectionFor({ appMode, dictType, dictRoot, dictOctave, dictActiveNotes, effectiveChord, chordOctaveOffset, rootString: selectedRootStringBass }),
    { id: "bass", tuning: bassTuning, notation }
  ), [appMode, dictType, dictRoot, dictOctave, dictActiveNotes, effectiveChord, chordOctaveOffset, selectedRootStringBass, bassTuning, notation]);

  const placementsByInstrument = useMemo(() => ({
    guitar: guitarPlacements,
    bass: bassPlacements,
  }), [guitarPlacements, bassPlacements]);

  // What each neck draws (fingeringFor, above the hook): the chosen
  // placement or the default one in the Dictionary, the clicked chord's
  // default shape in the Studio.
  const rawGuitarFingering = useMemo(() => fingeringFor({
    instrument: "guitar", placements: guitarPlacements, index: guitarIndex, rootString: selectedRootStringGuitar,
    appMode, dictType, dictRoot, dictOctave, effectiveChord, chordOctaveOffset,
  }), [guitarPlacements, guitarIndex, selectedRootStringGuitar, appMode, dictType, dictRoot, dictOctave, effectiveChord, chordOctaveOffset]);

  const rawBassFingering = useMemo(() => fingeringFor({
    instrument: "bass", placements: bassPlacements, index: bassIndex, rootString: selectedRootStringBass,
    appMode, dictType, dictRoot, dictOctave, effectiveChord, chordOctaveOffset,
  }), [bassPlacements, bassIndex, selectedRootStringBass, appMode, dictType, dictRoot, dictOctave, effectiveChord, chordOctaveOffset]);

  // A `suggestedInversionIndex` memo used to sit here, computing a voice-leading
  // suggestion from a `prevAbsoluteNotes` option. It was stillborn: AppDesktop
  // never passed that option, so the memo returned null on every render, and no
  // component ever read the value it returned. Removed rather than wired up —
  // wiring it would have produced a computation with no consumer.
  //
  // The engine behind it is intact and tested: suggestReVoicing() and
  // getBestVoiceLeading() in core/voicingEngine.js. Making voice leading visible
  // is real work with a UI attached, tracked as VMU-062.

  // --- 4. Realization (VMU-003) ---
  //
  // Blocks 3 and 4 — what is played and what is lit up — must read the same
  // notes. The fingerings above are computed from the selection; the grip they
  // describe is what a player would actually hear, so in Dictionary mode it is
  // the grip, not a theoretical fold into one octave, that defines the notes.
  //
  // Studio mode is untouched: its notes come from a played progression, which
  // already carries its own register.
  //
  // All three instruments are realized, not only the one being played: the
  // instrument bar (VMU-101) shows each one's register, and a register on a tile
  // is only honest if it comes from the same function that decides what
  // selecting that instrument lights up and plays.
  const realizations = useMemo(() => {
    const theory = { notes: musicContext.activeNotes, source: "theory" };
    if (appMode !== "dictionary") {
      return { piano: theory, guitar: theory, bass: theory };
    }
    const realizeFor = (instrument) => realizeDictionarySelection({
      instrument,
      fingering: instrument === "guitar" ? rawGuitarFingering
        : instrument === "bass" ? rawBassFingering
        : null,
      tuning: instrument === "bass" ? bassTuning : guitarTuning,
      rootPitchClass: Number(dictRoot) % 12,
      theoreticalNotes: musicContext.activeNotes,
    });
    return { piano: realizeFor("piano"), guitar: realizeFor("guitar"), bass: realizeFor("bass") };
  }, [appMode, rawGuitarFingering, rawBassFingering, guitarTuning, bassTuning, dictRoot, musicContext.activeNotes]);

  // --- 4bis. Out-of-range warning (INST-B1) ---
  //
  // Computed on what the neck plays: the realization (open string of the
  // style's tuning + fret, realization.js) against the pitches that tuning
  // reaches (core/placements.js tessitura). It used to add the common octave to
  // the frets (`case + octave x 12`, fingeringLogic.js analyzeVoicing) — for a
  // scale, to test the root at that octave — although the octave never moves
  // a shape: Do majeur showed the same A shape at -1 and +1 and warned at -1
  // only. Chords and scales, as before; a single note never warned and still
  // does not. The Studio is untouched (its chord octave, VMU-115 / A3).
  const isGuitarOutOfRange = useMemo(() => {
    if (appMode !== "dictionary") return false;
    const family = familyOf(dictType);
    if (family !== "chord" && family !== "scale") return false;
    return isOutsideTessitura(realizations.guitar.notes, tessitura("guitar", guitarTuning));
  }, [appMode, dictType, realizations, guitarTuning]);

  const isBassOutOfRange = useMemo(() => {
    if (appMode !== "dictionary") return false;
    const family = familyOf(dictType);
    if (family !== "chord" && family !== "scale") return false;
    return isOutsideTessitura(realizations.bass.notes, tessitura("bass", bassTuning));
  }, [appMode, dictType, realizations, bassTuning]);

  // The fingering each neck draws carries the same warning: Fretboard.jsx and
  // DictPositionPanel.jsx read `fingering.isOutOfRange`, which fingeringLogic.js
  // still computes the old way. In the Dictionary, for a chord or a scale, that
  // flag is replaced by the one above, so every reader agrees with it.
  const guitarFingering = useMemo(() => {
    if (appMode !== "dictionary" || !rawGuitarFingering) return rawGuitarFingering;
    const family = familyOf(dictType);
    if (family !== "chord" && family !== "scale") return rawGuitarFingering;
    return { ...rawGuitarFingering, isOutOfRange: isGuitarOutOfRange };
  }, [appMode, dictType, rawGuitarFingering, isGuitarOutOfRange]);

  const bassFingering = useMemo(() => {
    if (appMode !== "dictionary" || !rawBassFingering) return rawBassFingering;
    const family = familyOf(dictType);
    if (family !== "chord" && family !== "scale") return rawBassFingering;
    return { ...rawBassFingering, isOutOfRange: isBassOutOfRange };
  }, [appMode, dictType, rawBassFingering, isBassOutOfRange]);

  const realization = realizations[playbackInstrument] ?? realizations.piano;

  const realizationsByInstrument = useMemo(() => ({
    piano: realizations.piano.notes,
    guitar: realizations.guitar.notes,
    bass: realizations.bass.notes,
  }), [realizations]);

  return {
    ...musicContext,
    activeNotes: realization.notes,
    realizationSource: realization.source,
    realizationsByInstrument,
    targetValuesByInstrument,
    inversionText,
    guitarFingering,
    bassFingering,
    placementsByInstrument,
    isGuitarOutOfRange,
    isBassOutOfRange
  };
}
