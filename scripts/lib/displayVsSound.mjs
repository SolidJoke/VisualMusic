/**
 * displayVsSound.mjs — shared plumbing of scripts/display_vs_sound_probe.mjs (VMU-180).
 *
 * The question the probe asks of the served page: what an instrument SHOWS
 * (the lit keys and cells) against what its synth is TOLD (the notes of
 * `triggerAttack`, read at the synth, not at the call that hands them over).
 *
 * How the synth is watched: the page imports the same AudioEngine module the
 * app imports (same URL, so same instance) and wraps `triggerAttack` on every
 * synth instance. `triggerAttackRelease` of Tone 15 calls `this.triggerAttack`
 * on all three synth families (Monophonic, PolySynth, Sampler), so the wrap
 * sees every note once. Nothing is audible: only the page's own scheduling is
 * observed, which is also why this cannot say how it SOUNDS (Gabriel's ear).
 */

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" -> 61 (scientific pitch, C4 = 60, as Tone and midiToNoteName spell it). */
export function nameToMidi(name) {
  const m = /^([A-G])(#|b|x)?(-?\d+)$/.exec(String(name));
  if (!m) return NaN;
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : m[2] === "x" ? 2 : 0;
  return (Number(m[3]) + 1) * 12 + NAMES[m[1]] + acc;
}

const PC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function midiToName(n) {
  return `${PC[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

/** Open strings, low to high, MIDI. The page numbers strings from the highest (index 0). */
export const OPEN = {
  guitar: [40, 45, 50, 55, 59, 64],
  bass: [28, 33, 38, 43],
};

/** "stringIndex:fret ..." (data-s1-positions) -> sorted MIDI pitches, by the literal tuning above. */
export function positionsToMidi(instrument, positions) {
  const open = OPEN[instrument];
  return String(positions || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => {
      const [s, f] = p.split(":").map(Number);
      return open[open.length - 1 - s] + f;
    })
    .sort((a, b) => a - b);
}

/** Installed in the page once: wraps every synth's triggerAttack. Runs in the browser. */
export async function installSynthTap() {
  const m = await import("/src/audio/AudioEngine.js");
  const w = (window.__vm = window.__vm || { log: [], wrapped: new WeakSet(), names: new Map() });
  const known = [
    ["pianoFallback", m.chordSynth],
    ["guitarFallback", m.guitarFallback],
    ["bassSynth", m.bassSynth],
    ["bassSynthDictionary", m.bassSynthDictionary],
    ["guitarCurrent", m.getGuitarSynth()],
    ["pianoCurrent", m.getPianoSynth()],
  ];
  for (const [name, synth] of known) {
    if (!synth || w.wrapped.has(synth)) continue;
    w.wrapped.add(synth);
    w.names.set(synth, name);
    const original = synth.triggerAttack.bind(synth);
    synth.triggerAttack = (notes, time, velocity) => {
      const list = Array.isArray(notes) ? notes : [notes];
      w.log.push({ synth: name, ctor: synth.constructor.name, notes: list.map(String), t: typeof time === "number" ? time : null });
      return original(notes, time, velocity);
    };
  }
  return known.map(([n, s]) => `${n}:${s ? s.constructor.name : "none"}`);
}
