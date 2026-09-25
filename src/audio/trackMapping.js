// Shared between playback (useSequencer.js) and MIDI export (MidiExporter.js).
// Both must resolve a track's instrument identically, or the exported file
// drifts from what the sequencer plays. That drift is exactly what VMU-128
// (drums) and VMU-125 (chords) were: two copies of the same rule that had
// quietly diverged. Putting the rule here once, imported by both sides, makes
// that divergence impossible instead of merely reminding someone not to
// introduce it again.
//
// T3: the rules below are applied once, when a style fills the timeline
// document (core/timeline.js), and their answer is stored as the track's
// `role`; nothing re-derives a role from a name afterwards. The chord rhythm
// rule that lived here too (`shouldPlayChordStep`) became the chord row of
// that document: it is applied once, by core/timeline.js's `chordHitCells`.

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
 * Classifies a melodic track by name: a track whose name contains "bass" is
 * the bass line, which follows the chord of the moment; any other melodic
 * track is a melody, which playback plays as the tonic. Before T3 this was
 * written twice — in dispatch.js (which note a track plays) and in
 * MidiExporter.js (which tracks the bass file keeps, EXPORT-3) — as the same
 * `name.toLowerCase().includes("bass")`; both now read the role it gives.
 * @param {string} trackName
 * @returns {"bass" | "melody"}
 */
export function classifyMelodicTrack(trackName) {
  return (trackName || "").toLowerCase().includes("bass") ? "bass" : "melody";
}
