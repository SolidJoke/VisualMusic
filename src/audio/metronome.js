// @ts-check
/**
 * metronome.js — a self-contained click, independent of the sequencer (VMU-056).
 *
 * Owns exactly one piece of state: the id Tone.Transport hands back from
 * `scheduleRepeat`, `null` when nothing is scheduled. It never writes the
 * tempo — three call sites already do that (VMU-025 debt: AudioEngine.setBpm,
 * useSequencer.js:307 and :351) — it only reads whatever `Tone.getTransport()`
 * currently reports and schedules against it. Scheduling at a musical
 * interval ("4n") rather than a fixed number of seconds is what makes the
 * click follow tempo changes made elsewhere without this module doing
 * anything at all when the BPM badge is used.
 *
 * `Tone.getTransport()` is used throughout, never the deprecated `Tone.Transport`
 * export. `Tone.Transport` is `getContext().transport` evaluated exactly once,
 * the first time "tone" is imported anywhere on the page (confirmed in
 * node_modules/tone/build/esm/index.js) — a real snapshot, not a live getter.
 * That is harmless in the running app (one real-time context for the page's
 * whole life) but wrong under the VMU-026 offline harness, which installs a
 * temporary offline context via `Tone.Offline` — `Tone.Transport` would still
 * point at the page's original (real-time) transport and this module would
 * silently schedule onto a context nobody renders. `getTransport()` re-reads
 * `getContext()` on every call, so it resolves to whichever context is
 * current — the same reasoning already applied to `masterLimiter.connect(
 * Tone.getDestination())` in AudioEngine.js.
 *
 * @module audio/metronome
 */
import * as Tone from "tone";
import { masterAnalyser } from "./AudioEngine";

/** One metronome beat = one quarter note, so the click follows the transport's own 4/4 pulse. */
const BEAT_INTERVAL = "4n";
/**
 * Beat 1 of the bar: higher pitch, per the coordinator's decision (pitch over
 * level). Exported (VMU-163) so the audio harness can tell an accent click
 * from an off-beat one by ear without duplicating the note name — see
 * `src/audio/measure/offlineRender.js`'s "metronome-phase-restart" scenario.
 */
export const ACCENT_NOTE = "C6";
/** Beats 2-4: same velocity, lower pitch — the only thing that distinguishes them. */
export const OFFBEAT_NOTE = "C5";
/** Short enough to read as a click, not a tone. */
const CLICK_DURATION = 0.03;
const CLICK_VELOCITY = 0.8;

/** @type {import("tone").Synth | null} lazily built on first use, not at import time. */
let clickSynth = null;
/** @type {number | null} the id `Tone.Transport.scheduleRepeat` returned, or null. */
let repeatId = null;
/** True only when *this module* called `transport.start()` — the fact `stopMetronome` needs. */
let startedTransportBySelf = false;
/** 0..3, which beat of the bar the next scheduled click accents. */
let beatIndex = 0;

/**
 * Builds the click synth on first use and connects it to `masterAnalyser` —
 * the same node every instrument voice feeds (AudioEngine.js) — so the click
 * passes through the real limiter chain (VMU-020), same as everything else.
 * @returns {import("tone").Synth}
 */
function getClickSynth() {
  if (!clickSynth) {
    clickSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: CLICK_DURATION, sustain: 0, release: 0.01 },
      volume: -6,
    }).connect(masterAnalyser);
  }
  return clickSynth;
}

/** Whether a click is currently scheduled on the transport. */
export function isMetronomeScheduled() {
  return repeatId !== null;
}

/**
 * Schedules the click, once per quarter note, accenting beat 1 of every bar.
 *
 * Idempotent: a second call while already scheduled does nothing. That guard
 * is what keeps React StrictMode's double-invoke (or a fast double click)
 * from producing two `scheduleRepeat` registrations and a doubled click.
 *
 * Starts the transport itself only if it is not already running, so the
 * metronome works standalone, sequencer stopped — not only during playback.
 * `stopMetronome` is the matching teardown: it only stops what this function
 * started.
 */
export function startMetronome() {
  if (repeatId !== null) return;

  beatIndex = 0;
  const synth = getClickSynth();
  const transport = Tone.getTransport();

  repeatId = transport.scheduleRepeat((time) => {
    const isAccent = beatIndex % 4 === 0;
    synth.triggerAttackRelease(
      isAccent ? ACCENT_NOTE : OFFBEAT_NOTE,
      CLICK_DURATION,
      time,
      CLICK_VELOCITY,
    );
    beatIndex = (beatIndex + 1) % 4;
  }, BEAT_INTERVAL);

  if (transport.state !== "started") {
    transport.start();
    startedTransportBySelf = true;
  } else {
    startedTransportBySelf = false;
  }
}

/**
 * Clears the click. Stops the transport only if this module started it *and*
 * the sequencer is not currently playing — turning the metronome off must
 * never cut playback already under way.
 *
 * @param {Object} [options]
 * @param {boolean} [options.isSequencerPlaying] the caller's `isPlaying`, read
 *   (never written) so this function can tell "I started this transport and
 *   nothing else needs it" from "I started it, but the sequencer took over".
 */
export function stopMetronome({ isSequencerPlaying = false } = {}) {
  const transport = Tone.getTransport();

  if (repeatId !== null) {
    transport.clear(repeatId);
    repeatId = null;
  }

  if (startedTransportBySelf && !isSequencerPlaying) {
    transport.stop();
  }
  startedTransportBySelf = false;
}
