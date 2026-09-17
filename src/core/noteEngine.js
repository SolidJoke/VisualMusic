// @ts-check
// src/core/noteEngine.js
//
// First brick of VMU-115: the single place that turns a pitch class (and,
// for a chord or a scale, a set of semitone offsets from a root) into
// absolute MIDI pitches — ascending, correctly, whatever the root.
//
// The bug this exists to remove (VMU-140): the Dictionary computed each
// scale/chord note as `pitchClass + fixedOctaveBase`, where `pitchClass` is
// 0-11 and has already lost which octave the note is actually in
// (getScaleNotesGeneric, theory.js:565, returns pitch classes, not absolute
// pitches). Any note whose class fell below the root's — e.g. do# (1) below
// mi (4) in mi pentatonic major — landed a full octave under where it
// belonged: mi4 fa#4 sol#4 si4 **do#4** mi5 instead of ...**do#5** mi5. Only
// scales/chords rooted on do never trigger this, which is why
// PitchConsistency.test.js, do-only, never caught it.
//
// The fix is not "test more roots" — that would only push the class of bugs
// forward. It's this module: nothing downstream re-derives a pitch class
// into an absolute pitch by hand again. useDictionaryMode.js (display) and
// useDictionaryPlayback.js (sound) both call it, so the two cannot drift
// apart the way they did before core/realization.js unified fretted
// instruments' playback and display (see that file's header, which this one
// continues one layer down).
//
// No React, no Tone — same discipline as core/realization.js (Block 2 of the
// pipeline: intervals + octave + instrument -> concrete pitches) and
// core/theory.js, whose registries (SCALES, CHORDS) and MIDI convention this
// module treats as canonical rather than re-declaring:
//   - middle C = C4 = MIDI 60, i.e. `pitchClass + (octave + 1) * 12` — see
//     theory.js:75-78 (getAbsoluteNoteValue's comment) and theory.js:846-849
//     (midiToNoteName, the exact inverse of realizeNote below).
//   - SCALES (theory.js:309-331) store *steps* between degrees;
//     resolveScaleSemitones (theory.js:348-359) turns them into cumulative
//     semitones from the root, root-inclusive, closing-note-exclusive — the
//     shape realizeScale consumes.
//   - CHORDS (theory.js:409-459) store semitones from the root directly,
//     already ascending and already un-modulo'd (e.g. chord_9:
//     [0, 4, 7, 10, 14] — the 9th stays at 14, above the octave) — the shape
//     realizeChord consumes.
//
// The one rule that makes every function below correct regardless of root:
// **never take a semitone offset modulo 12 before adding it to the base**.
// `pitchClass + (octave + 1) * 12` folds a note back into a fixed octave and
// is exactly the formula that produced VMU-140; `root + semitone + base`,
// left un-modulo'd, cannot — it is monotonic in `semitone` by construction,
// so an ascending `semitones` array (every registry entry is one) yields
// ascending pitches for any root.

import { resolveScaleSemitones, resolveChordSemitones } from "./theory";

/**
 * A single pitch class at a given octave, as an absolute MIDI value.
 * The one formula the rest of this module (and its callers) should ever
 * need: MIDI 60 = C4 (theory.js:75-78, :846-849).
 *
 * @param {number} pitchClass 0-11 (C=0 ... B=11)
 * @param {number} octave e.g. 4 for the octave containing middle C
 * @returns {number} absolute MIDI pitch
 */
export function realizeNote(pitchClass, octave) {
  return pitchClass + (octave + 1) * 12;
}

/**
 * Realizes a scale rooted on `rootPc`: absolute MIDI pitches, strictly
 * ascending, root to root.
 *
 * The first pitch is the root at `octave`; the last is the same root one
 * octave up (the note that visually/audibly closes the scale); every pitch
 * in between is strictly greater than the one before it, whatever `rootPc`
 * is — because the semitones this walks are cumulative offsets from the
 * root (resolveScaleSemitones) added to the root and the octave base
 * without ever being taken modulo 12 first.
 *
 * @param {number} rootPc 0-11
 * @param {string|number[]} dictTypeOrSemitones a `SCALES` key (e.g.
 *   "scale_pentatonic_major"), resolved via theory.js, or an already-
 *   cumulative semitones array (root-inclusive, closing note excluded) for
 *   a caller that has its own scale data.
 * @param {number} octave the root's octave, e.g. 4
 * @returns {number[]} absolute MIDI pitches, root ... root+12
 */
export function realizeScale(rootPc, dictTypeOrSemitones, octave) {
  const semitones = Array.isArray(dictTypeOrSemitones)
    ? dictTypeOrSemitones
    : resolveScaleSemitones(dictTypeOrSemitones);
  if (!semitones || semitones.length === 0) return [];

  const base = realizeNote(0, octave);
  const pitches = semitones.map((semi) => base + rootPc + semi);
  pitches.push(base + rootPc + 12); // closing note: the root, one octave up
  return pitches;
}

/**
 * Realizes a chord rooted on `rootPc`, in fundamental position: the root
 * plus each semitone offset, in the order given, **without modulo** — an
 * extension past the octave (a 9th, 11th, 13th) stays past the octave
 * rather than folding back down next to the root.
 *
 * @param {number} rootPc 0-11
 * @param {number[]} semitones offsets from the root, ascending and already
 *   un-modulo'd (as `CHORDS[key].semitones` in theory.js already are, e.g.
 *   chord_9 = [0, 4, 7, 10, 14])
 * @param {number} octave the root's octave, e.g. 4
 * @returns {number[]} absolute MIDI pitches, one per semitone, in fundamental position
 */
export function realizeChord(rootPc, semitones, octave) {
  if (!semitones || semitones.length === 0) return [];
  const base = realizeNote(0, octave);
  return semitones.map((semi) => base + rootPc + semi);
}

/**
 * Convenience: realizeChord for a `CHORDS` dictType key instead of a raw
 * semitones array, resolved via theory.js's own registry. Not part of the
 * brief's minimal contract, but every call site in this ticket already has
 * a dictType, not a semitones array, in hand — this avoids each of them
 * re-importing resolveChordSemitones just to unwrap `.semitones`.
 *
 * @param {number} rootPc 0-11
 * @param {string} dictType a `CHORDS` key, e.g. "chord_9"
 * @param {number} octave the root's octave, e.g. 4
 * @returns {number[]} absolute MIDI pitches, or [] if dictType is unknown
 */
export function realizeChordFromType(rootPc, dictType, octave) {
  const chordData = resolveChordSemitones(dictType);
  if (!chordData) return [];
  return realizeChord(rootPc, chordData.semitones, octave);
}
