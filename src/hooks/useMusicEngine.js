// @ts-check
import { useMemo } from "react";
import { 
  getGuitarFingering, 
  getBassFingering, 
  getAvailableGuitarFingerings, 
  getAvailableBassFingerings, 
  getAvailableScaleFingerings,
  getAvailableSingleNoteFingerings
} from "../core/fingeringLogic";
import {
  getScaleNotes,
  resolveChordSemitones,
  resolveNnsToChordType,
  isNoteInRange,
  computeAbsoluteNote
} from "../core/theory";
import { TUNINGS } from "../core/tunings";
import { getInversionType, getChordIntervalLabel } from "../core/harmonyEngine";
import { realizeDictionarySelection } from "../core/realization";
import { getChordTargetNotes, getModeTargetNote } from "../core/targetNotes";

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
 * @param {any} options.selectedVoicingIndexGuitar
 * @param {any} options.selectedVoicingIndexBass
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
  selectedVoicingIndexGuitar,
  selectedVoicingIndexBass,
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

  // --- 3. Fingering Logic (Guitar & Bass) ---
  
  const toV2 = (fingering, instrument) => {
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
  };

  const guitarFingering = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary" && dictType) {
      if (dictType?.includes("scale")) {
        const tuning = activeBrick?.guitarStrings || TUNINGS.GUITAR_STANDARD;
        const avail = getAvailableScaleFingerings(dictRoot, dictType, 'guitar', tuning);
        if (avail.length === 0) return null;

        let pos;
        if (selectedVoicingIndexGuitar !== null) {
          // Manual selection: use explicitly chosen position
          pos = avail.find(p => p.id === selectedVoicingIndexGuitar);
        }
        if (!pos) {
          // Auto-select: map dictOctave (-3..+3) linearly to position index (0..N-1)
          // avail is sorted low fret → high fret; lower octave = lower position
          const octaveNorm = Math.max(-3, Math.min(3, Number(dictOctave ?? 0)));
          const posIdx = Math.round((octaveNorm + 3) / 6 * (avail.length - 1));
          pos = avail[Math.max(0, Math.min(avail.length - 1, posIdx))];
        }
        if (pos?.scaleFrets) return { scaleFrets: pos.scaleFrets, isScaleMode: true, startFret: pos.startFret, endFret: pos.endFret };
        return null;
      }
      if (dictType === "single_note") {
        if (selectedVoicingIndexGuitar !== null && dictActiveNotes?.length > 0) {
          const avail = getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'guitar', notation);
          const found = avail.find(p => p.id === selectedVoicingIndexGuitar);
          if (found) return toV2(found.fingering, 'guitar');
        }
        return null;
      }
      if (!dictType || !dictType?.includes("chord")) return null;
      rootVal = Number(dictRoot);
      chordType = dictType;
    } else {
      if (!effectiveChord) return null;
      rootVal = effectiveChord.rootNote.value;
      chordType = resolveNnsToChordType(effectiveChord.nns);
    }

    if (appMode === "dictionary" && selectedVoicingIndexGuitar !== null) {
      const avail = getAvailableGuitarFingerings(rootVal, chordType, dictOctave, notation);
      const found = avail.find(p => String(p.id) === String(selectedVoicingIndexGuitar));
      if (found) return toV2(found.fingering, 'guitar');
    }

    const offset = appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0);
    return toV2(getGuitarFingering(rootVal, chordType, selectedRootStringGuitar, offset), 'guitar');
  }, [effectiveChord, selectedRootStringGuitar, appMode, dictRoot, dictType, selectedVoicingIndexGuitar, activeBrick.guitarStrings, dictOctave, chordOctaveOffset, notation]);

  const availableGuitarFingerings = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary" && dictType) {
      rootVal = Number(dictRoot);
      chordType = dictType;
      if (dictType?.includes("scale")) {
        const tuning = activeBrick?.guitarStrings || TUNINGS.GUITAR_STANDARD;
        return getAvailableScaleFingerings(dictRoot, dictType, 'guitar', tuning, notation);
      }
    } else {
      if (!effectiveChord) return [];
      rootVal = effectiveChord.rootNote.value;
      chordType = resolveNnsToChordType(effectiveChord.nns);
    }

    if (dictType === "single_note") {
      if (dictActiveNotes.length > 0) {
        return getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'guitar', notation);
      }
      return [];
    }

    return getAvailableGuitarFingerings(rootVal, chordType, appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0), notation);
  }, [effectiveChord, appMode, dictRoot, dictType, activeBrick.guitarStrings, chordOctaveOffset, dictOctave, notation]);

  const bassFingering = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary" && dictType) {
      if (dictType?.includes("scale")) {
        const tuning = activeBrick?.bassStrings || TUNINGS.BASS_STANDARD;
        const avail = getAvailableScaleFingerings(dictRoot, dictType, 'bass', tuning);
        if (avail.length === 0) return null;

        let pos;
        if (selectedVoicingIndexBass !== null) {
          pos = avail.find(p => String(p.id) === String(selectedVoicingIndexBass));
        }
        if (!pos) {
          const octaveNorm = Math.max(-3, Math.min(3, Number(dictOctave ?? 0)));
          const posIdx = Math.round((octaveNorm + 3) / 6 * (avail.length - 1));
          pos = avail[Math.max(0, Math.min(avail.length - 1, posIdx))];
        }
        if (pos?.scaleFrets) return { scaleFrets: pos.scaleFrets, isScaleMode: true, startFret: pos.startFret, endFret: pos.endFret };
        return null;
      }
      if (dictType === "single_note") {
        if (selectedVoicingIndexBass !== null && dictActiveNotes?.length > 0) {
          const avail = getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'bass', notation);
          const found = avail.find(p => p.id === selectedVoicingIndexBass);
          if (found) return toV2(found.fingering, 'bass');
        }
        return null;
      }
      if (!dictType || !dictType?.includes("chord")) return null;
      rootVal = Number(dictRoot);
      chordType = dictType;
    } else {
      if (!effectiveChord) return null;
      rootVal = effectiveChord.rootNote.value;
      chordType = resolveNnsToChordType(effectiveChord.nns);
    }

    if (appMode === "dictionary" && selectedVoicingIndexBass !== null) {
      const avail = getAvailableBassFingerings(rootVal, chordType, dictOctave, notation);
      const found = avail.find(p => String(p.id) === String(selectedVoicingIndexBass));
      if (found) return toV2(found.fingering, 'bass');
    }

    const offset = appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0);
    return toV2(getBassFingering(rootVal, chordType, selectedRootStringBass, offset), 'bass');
  }, [effectiveChord, selectedRootStringBass, appMode, dictRoot, dictType, selectedVoicingIndexBass, activeBrick.bassStrings, dictOctave, chordOctaveOffset, notation]);

  const availableBassFingerings = useMemo(() => {
    let rootVal, chordType;
    if (appMode === "dictionary" && dictType) {
      rootVal = Number(dictRoot);
      chordType = dictType;
      if (dictType?.includes("scale")) {
        const tuning = activeBrick?.bassStrings || TUNINGS.BASS_STANDARD;
        return getAvailableScaleFingerings(dictRoot, dictType, 'bass', tuning, notation);
      }
    } else {
      if (!effectiveChord) return [];
      rootVal = effectiveChord.rootNote.value;
      chordType = resolveNnsToChordType(effectiveChord.nns);
    }
    if (dictType === "single_note") {
      if (dictActiveNotes.length > 0) {
        return getAvailableSingleNoteFingerings(dictActiveNotes[0].absoluteValue, 'bass', notation);
      }
      return [];
    }
    return getAvailableBassFingerings(rootVal, chordType, appMode === "dictionary" ? dictOctave : (chordOctaveOffset || 0), notation);
  }, [effectiveChord, appMode, dictRoot, dictType, activeBrick.bassStrings, chordOctaveOffset, dictOctave, notation]);

  // isOutOfRange: covers both chords AND scales (Option A: warning only, audio is not blocked)
  const isGuitarOutOfRange = useMemo(() => {
    if (appMode !== "dictionary") return false;
    if (dictType?.includes("chord")) {
      return !!(!guitarFingering || guitarFingering.isOutOfRange);
    }
    if (dictType?.includes("scale")) {
      // Check if the root note itself is out of guitar range at the selected octave
      const rootMidi = computeAbsoluteNote(Number(dictRoot ?? 0), dictOctave ?? 0);
      return !isNoteInRange(rootMidi, 'guitar');
    }
    return false;
  }, [appMode, dictType, guitarFingering, dictRoot, dictOctave]);

  const isBassOutOfRange = useMemo(() => {
    if (appMode !== "dictionary") return false;
    if (dictType?.includes("chord")) {
      return !!(!bassFingering || bassFingering.isOutOfRange);
    }
    if (dictType?.includes("scale")) {
      const rootMidi = computeAbsoluteNote(Number(dictRoot ?? 0), dictOctave ?? 0);
      return !isNoteInRange(rootMidi, 'bass');
    }
    return false;
  }, [appMode, dictType, bassFingering, dictRoot, dictOctave]);

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
      fingering: instrument === "guitar" ? guitarFingering
        : instrument === "bass" ? bassFingering
        : null,
      tuning: instrument === "bass"
        ? (activeBrick?.bassStrings || TUNINGS.BASS_STANDARD)
        : (activeBrick?.guitarStrings || TUNINGS.GUITAR_STANDARD),
      rootPitchClass: Number(dictRoot) % 12,
      theoreticalNotes: musicContext.activeNotes,
    });
    return { piano: realizeFor("piano"), guitar: realizeFor("guitar"), bass: realizeFor("bass") };
  }, [appMode, guitarFingering, bassFingering, activeBrick, dictRoot, musicContext.activeNotes]);

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
    availableGuitarFingerings,
    availableBassFingerings,
    isGuitarOutOfRange,
    isBassOutOfRange
  };
}
