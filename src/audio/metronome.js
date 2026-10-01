// @ts-check
/**
 * metronome.js — a self-contained click, independent of the sequencer (VMU-056).
 *
 * Owns exactly one piece of state: the id Tone.Transport hands back from
 * `scheduleRepeat`, `null` when nothing is scheduled. It never writes the
 * tempo — three call sites already do that (VMU-025 debt: AudioEngine.setBpm,
 * useSequencer.js's handleBpmChange and togglePlayback) — it only reads
 * whatever `Tone.getTransport()` currently reports and schedules against it.
 * Scheduling at a musical interval ("4n") rather than a fixed number of
 * seconds is what makes the click follow tempo changes made elsewhere
 * without this module doing anything at all when the BPM badge is used.
 *
 * Whether the transport itself is started or stopped is no longer this
 * module's call (VMU-163-fix2, decision 4): `transportOwner.js` is the sole
 * owner of that decision now, so a metronome running during playback and a
 * Stop that must not silence a standalone metronome (VMU-056) are handled in
 * one place instead of two modules each guessing at the other's state.
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
import { enableMetronome, disableMetronome } from "./transportOwner";

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
 * Registered with an explicit start of `0` (VMU-163-fix2, decision 1 — "one
 * grid"): every repeating event the app puts on the transport is anchored to
 * absolute tick 0, so a "4n" click and the sequencer's "16n" steps (also
 * anchored at 0, see useSequencer.js) always share the same grid, whatever
 * transport position was current when each was registered. Before this, no
 * start time was passed, which defaults to "now" (`TransportTime`'s `_now()`
 * reads `transport.seconds` at the moment of the call) — anchoring the click
 * to wherever the transport happened to be instead of to true zero, which is
 * exactly the ~237 ms drift measured when the metronome was switched on
 * mid-playback (VMU-163-fix2 brief, sequence 2).
 *
 * Delegates whether the transport itself starts to `transportOwner.js`
 * (VMU-163-fix2, decision 4): it runs if and only if the music is playing or
 * the metronome is on, decided in one place instead of this module and
 * useSequencer.js each keeping (and sometimes losing track of) their own
 * flag.
 *
 * The beat-in-bar is read from the transport's own position at the moment
 * each click fires (`transport.getTicksAtTime(time)` against `transport.PPQ`
 * and `transport.timeSignature`), not from a free-running counter (VMU-163).
 */
export function startMetronome() {
  if (repeatId !== null) return;

  const synth = getClickSynth();

  enableMetronome((transport) => {
    repeatId = transport.scheduleRepeat((time) => {
      const ticks = transport.getTicksAtTime(time);
      // `timeSignature` is typed `number | number[]` (Tone.js's own setter
      // reduces an [n, d] pair to n/d*4 — replicated here since the getter's
      // static type keeps both, even though this app never sets anything but
      // the default 4/4).
      const rawTimeSignature = transport.timeSignature;
      const beatsPerBar = Array.isArray(rawTimeSignature)
        ? (rawTimeSignature[0] / rawTimeSignature[1]) * 4
        : rawTimeSignature;
      const beatInBar = Math.round(ticks / transport.PPQ) % beatsPerBar;
      const isAccent = beatInBar === 0;
      synth.triggerAttackRelease(
        isAccent ? ACCENT_NOTE : OFFBEAT_NOTE,
        CLICK_DURATION,
        time,
        CLICK_VELOCITY,
      );
    }, BEAT_INTERVAL, 0);
  });
}

/**
 * Clears the click. Whether the transport itself stops is
 * `transportOwner.js`'s call (it stops only if the music is not playing) —
 * this function no longer needs to be told (`isSequencerPlaying` is gone,
 * VMU-163-fix2): the owner already knows, because `useSequencer.js` reports
 * Play/Stop to the same module.
 */
export function stopMetronome() {
  disableMetronome((transport) => {
    if (repeatId !== null) {
      transport.clear(repeatId);
      repeatId = null;
    }
  });
}
