import { Midi } from "@tonejs/midi";
import { stepEvents } from "./dispatch";
import { loopSteps, timelineFromSelection } from "../core/timeline";

// T1 (VMU-137): what each file holds comes from stepEvents (dispatch.js), the
// same function the playback loop plays. This module used to recompute each
// measure's chord itself (generateChordsFromNNS + resolveNnsToChordType +
// resolveChordSemitones), a second copy of the rule playback's
// resolveMeasureChord already held. It now only translates events into MIDI
// notes.
//
// T3: the events are those of a timeline document (core/timeline.js), over
// its window — 4 measures today, 8 once the timeline screen offers it. The
// `exportTimeline*` functions take the document the Studio plays; the three
// pre-T3 functions below them keep their signatures (ExportGolden.test.js
// calls them, frozen) and export the document the Studio would build from
// their arguments, through the same path.
//
// Where the files differ from what playback plays, it is here, named below.
// Every one of them predates T1 and is kept as it was (ExportGolden.test.js
// proves no byte moved); whether to align them is a decision for later.

/** EXPORT-1: every drum hit is written one step long (playback: kick 8n, snare 16n, hat 32n). */
const EXPORT_DRUM_DURATION_STEPS = 1;

/** EXPORT-2: chord notes are written at velocity 0.8 (playback: Tone's default, 1). */
const EXPORT_CHORD_VELOCITY = 0.8;

/**
 * EXPORT-3: only bass rows — melodic tracks whose name contains "bass"
 * (trackMapping.js's classifyMelodicTrack, stored as the row's role) — are
 * written to the bass file (playback plays every melodic track on the bass
 * synth).
 * EXPORT-4: a tonic-fallback note — no measure chord applies — is not written
 * (playback plays it).
 * @param {import("./dispatch").StepEvent} event
 */
function isExportedBassNote(event) {
  return event.role === "bass" && !event.tonicFallback;
}

/**
 * EXPORT-5: a chord row with no hit at all is written as the style's own
 * chord row (the document's base), where playback, reading the same empty
 * row, plays no chord. Before T3 this was the chord rhythm: an empty one fell
 * back to `brick.chordRhythm || [0]`, which is what the style's own row is.
 * @param {import("../core/timeline").TimelineDoc} doc
 */
function withExportedChordRow(doc) {
  const hasHit = doc.tracks.some((track) => track.role === "chordHits" && track.steps.some(Boolean));
  const styleRow = doc.base.tracks.find((track) => track.role === "chordHits");
  if (hasHit || !styleRow) return doc;
  return { ...doc, tracks: doc.tracks.map((track) => (track.role === "chordHits" ? styleRow : track)) };
}

// 1 step (16th note) duration in seconds
function getStepDuration(bpm) {
  return 15 / bpm;
}

function getStepTime(step, bpm) {
  return step * getStepDuration(bpm);
}

/** The events of `voice` on every step of the document's window, in step order. */
function loopEvents(doc, voice, options) {
  const all = [];
  for (let step = 0; step < loopSteps(doc); step++) {
    stepEvents(doc, step, options).forEach((event) => {
      if (event.voice === voice) all.push({ step, event });
    });
  }
  return all;
}

/** A file at `bpm` with one empty track named `name`, and that track. */
function newFile(bpm, name) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const track = midi.addTrack();
  track.name = name;
  return { midi, track };
}

/**
 * EXPORT-6 (VMU-217): the GM percussion key of a drum row, read from the row's
 * **name** — the export only. Playback sorts every drum row into three voices
 * (trackMapping.js: kick, snare group, hi-hat group) because the Studio has
 * three drum synths; a DAW's drum rack has one pad per GM key, so the file
 * keeps what each row is called. Rim therefore sounds as a snare in the app
 * and as a side stick in Live; the playback mapping is unchanged.
 *
 * First match wins, so the specific names come before the general ones. A
 * name this table does not know keeps `fallback`, the key of the voice
 * playback plays it with (dispatch.js DRUM_GM_KEY) — the pre-VMU-217 export.
 * Names present in bricks.json today: Kick, Snare, Hat, Rim, Crash. The rest
 * are kept for the styles to come, on the usual GM drum-kit keys.
 */
const GM_DRUM_KEYS = [
  [/\b(kick|bass ?drum)\b/, 36],
  [/\b(rim|rimshot|side ?stick)\b/, 37],
  [/\bsnare\b/, 38],
  [/\bclaps?\b/, 39],
  [/\b(open|ouvert|aberto)\b.*\bhi-?hat\b|\bhi-?hat\b.*\bopen\b|\bopen\b.*\bhat\b|\bhat\b.*\bopen\b/, 46],
  [/\bpedal\b/, 44],
  [/\b(hi-?hat|hat|charleston)\b/, 42],
  [/\b(floor|low)\b.*\btom\b|\btom\b.*\b(floor|low)\b/, 41],
  [/\b(high|hi)\b.*\btom\b|\btom\b.*\b(high|hi)\b/, 48],
  [/\btom(-?tom)?s?\b/, 45],
  [/\bcrash\b/, 49],
  [/\bride\b/, 51],
  [/\bsplash\b/, 55],
  [/\bcowbell\b/, 56],
  [/\btambourine\b/, 54],
  [/\bshaker\b/, 70],
];

/**
 * @param {string} trackName the drum row's name ("Kick", "Rim", "Crash", ...)
 * @param {number} fallback GM key to keep for a name the table does not know
 * @returns {number} GM percussion key (channel 10)
 */
export function drumExportKey(trackName, fallback) {
  const name = String(trackName || "").toLowerCase();
  const hit = GM_DRUM_KEYS.find(([pattern]) => pattern.test(name));
  return hit ? hit[1] : fallback;
}

/** What each file is called in a file name, by interface language. */
const PART_LABELS = {
  fr: { drums: "Batterie", chords: "Accords", bass: "Basse" },
  en: { drums: "Drums", chords: "Chords", bass: "Bass" },
  pt: { drums: "Bateria", chords: "Acordes", bass: "Baixo" },
  zh: { drums: "鼓", chords: "和弦", bass: "贝斯" },
};

/** Note names of the 12 pitch classes: Do-Ré-Mi for fr/pt, letters for en/zh (the app's NOTES). */
const KEY_NAMES = {
  eu: ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"],
  us: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
};

/** One piece of a file name: no character Windows forbids, spaces as "-". Accents stay. */
function fileNamePart(text) {
  return String(text ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\.+$/, "");
}

/**
 * VMU-217: the name of an exported file — `VMU_<style>_<key>_<bpm>bpm_<A|B>_<part>.mid`,
 * e.g. `VMU_Bossa-Nova_Sol_130bpm_A_Batterie.mid` — so the three files of a
 * style, and its two variations, never collide in a DAW's drop zone.
 * Style, key and part are in the interface language.
 *
 * @param {Object} file
 * @param {string} [file.styleName] the style's name in the interface language
 * @param {{ rootValue: number }|null} [file.key] the document's key (tonic only)
 * @param {"fr"|"en"|"pt"|"zh"|string} [file.lang]
 * @param {number} file.bpm
 * @param {"A"|"B"|string} [file.variation] the displayed variation
 * @param {"drums"|"chords"|"bass"} file.part
 * @returns {string}
 */
export function midiFileName({ styleName, key, lang = "fr", bpm, variation = "A", part }) {
  const labels = PART_LABELS[lang] || PART_LABELS.fr;
  const names = lang === "fr" || lang === "pt" ? KEY_NAMES.eu : KEY_NAMES.us;
  const tonic = key && Number.isInteger(key.rootValue) ? names[((key.rootValue % 12) + 12) % 12] : "";
  const parts = [
    "VMU",
    fileNamePart(styleName) || "Studio",
    fileNamePart(tonic),
    `${Math.round(bpm)}bpm`,
    variation === "B" ? "B" : "A",
    fileNamePart(labels[part] || part),
  ].filter(Boolean);
  return `${parts.join("_")}.mid`;
}

/**
 * The drum file of a timeline document: every drum row, over its window.
 * @param {import("../core/timeline").TimelineDoc} doc
 * @param {number} bpm
 */
export function exportTimelineDrums(doc, bpm) {
  const { midi, track } = newFile(bpm, "Drums");
  // Channel 10 is standard for drums in GM (0-indexed = 9)
  track.channel = 9;

  // The event's GM key is the voice playback plays the row with (dispatch.js
  // DRUM_GM_KEY, VMU-128); the row's name refines it (EXPORT-6, above).
  loopEvents(doc, "drums").forEach(({ step, event }) => {
    track.addNote({
      midi: drumExportKey(event.track, event.midi[0]),
      time: getStepTime(step, bpm),
      duration: EXPORT_DRUM_DURATION_STEPS * getStepDuration(bpm),
      velocity: event.velocity,
    });
  });

  return midi.toArray();
}

/**
 * The bass file of a timeline document: its bass rows, over its window.
 * @param {import("../core/timeline").TimelineDoc} doc
 * @param {number} bpm
 */
export function exportTimelineBass(doc, bpm) {
  const { midi, track } = newFile(bpm, "Bass");

  loopEvents(doc, "melody").forEach(({ step, event }) => {
    if (!isExportedBassNote(event)) return;
    track.addNote({
      midi: event.midi[0],
      time: getStepTime(step, bpm),
      duration: event.durationSteps * getStepDuration(bpm),
      velocity: event.velocity,
    });
  });

  return midi.toArray();
}

/**
 * The chord file of a timeline document: its chords where the chord row
 * strikes them, over its window.
 * @param {import("../core/timeline").TimelineDoc} doc
 * @param {number} bpm
 * @param {{ octaveOffset?: number }} [options] the Studio "Octave Base" setting
 */
export function exportTimelineChords(doc, bpm, { octaveOffset = 0 } = {}) {
  const { midi, track } = newFile(bpm, "Chords");

  loopEvents(withExportedChordRow(doc), "chords", { octaveOffset }).forEach(({ step, event }) => {
    event.midi.forEach((note) => {
      track.addNote({
        midi: note,
        time: getStepTime(step, bpm),
        duration: event.durationSteps * getStepDuration(bpm),
        velocity: EXPORT_CHORD_VELOCITY,
      });
    });
  });

  return midi.toArray();
}

// ─── Pre-T3 signatures ───────────────────────────────────────────────
// A style's selection in, the document the Studio builds from it
// (timelineFromSelection, 4 measures) exported through the functions above.

export function exportDrums(drumTracks, bpm, _genreName) {
  return exportTimelineDrums(timelineFromSelection({ drums: drumTracks }), bpm);
}

export function exportBass(melodyTracks, brick, progression, bpm) {
  if (!melodyTracks || !brick || !progression) return newFile(bpm, "Bass").midi.toArray();
  return exportTimelineBass(timelineFromSelection({ brick, melody: melodyTracks, progression }), bpm);
}

export function exportChords(brick, progression, rhythm, octaveOffset, bpm, _genreName) {
  if (!progression || progression.length === 0 || !brick) return newFile(bpm, "Chords").midi.toArray();

  // VMU-125: callers should pass the rhythm actually played (customRhythm ||
  // activeBrick.chordRhythm || [0], computed in useStudioMode.js). Falling
  // back to brick.chordRhythm here only covers callers that predate that
  // parameter; it ignores any per-session override, which is the bug.
  // An empty rhythm is EXPORT-5's case: the document's base is the style's
  // own chord row, which the export writes instead.
  const styleRhythm = brick.chordRhythm || [0];
  const style = timelineFromSelection({ brick, progression, rhythm: styleRhythm });
  const played = timelineFromSelection({ brick, progression, rhythm: rhythm || styleRhythm }, { base: style.base });
  return exportTimelineChords(played, bpm, { octaveOffset });
}

export function triggerMidiDownload(midiArrayBuffer, filename) {
  const blob = new Blob([midiArrayBuffer], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
