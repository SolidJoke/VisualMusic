// Shared between playback (useSequencer.js) and MIDI export (MidiExporter.js).
// Both must resolve a drum track's instrument and a chord rhythm's active
// steps identically, or the exported file drifts from what the sequencer
// plays. That drift is exactly what VMU-128 (drums) and VMU-125 (chords)
// were: two copies of the same rule that had quietly diverged. Putting the
// rule here once, imported by both sides, makes that divergence impossible
// instead of merely reminding someone not to introduce it again.

/**
 * Classifies a drum track by name into the GM percussion role it plays as.
 * Mirrors the naming convention every style in bricks.json follows: a track
 * literally named "Kick" is the kick, "Snare"/"Clap"/"Rim" are the snare
 * group, and anything else (Hat, Crash, Perc, ...) falls back to hi-hat —
 * this is what useSequencer's playback loop has always done; MidiExporter
 * used to default the "anything else" case to kick instead (VMU-128).
 * @param {string} trackName
 * @returns {"kick" | "snare" | "hat"}
 */
export function classifyDrumTrack(trackName) {
  const name = (trackName || "").toLowerCase();
  if (name.includes("kick")) return "kick";
  if (name.includes("snare") || name.includes("clap") || name.includes("rim")) return "snare";
  return "hat";
}

/**
 * Whether a chord should sound on this absolute 16th-note step (0..63 across
 * the 4-measure loop), given the chord rhythm currently in effect
 * (`customRhythm || activeBrick.chordRhythm || [0]`).
 *
 * A rhythm containing a value above 3 is a custom, absolute-step pattern
 * (e.g. [0, 6, 10]) and is matched against the position within one 16-step
 * measure. Otherwise it's a beat-relative pattern (e.g. [0, 2]) re-applied on
 * every quarter note, and is matched against the position within one beat.
 * @param {number[]} rhythm
 * @param {number} stepCounter
 * @returns {boolean}
 */
export function shouldPlayChordStep(rhythm, stepCounter) {
  const isAbsolute16 = rhythm.some((step) => step > 3);
  return isAbsolute16 ? rhythm.includes(stepCounter % 16) : rhythm.includes(stepCounter % 4);
}
