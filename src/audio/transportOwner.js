// @ts-check
/**
 * transportOwner.js — the one place that decides whether Tone's Transport is
 * running (VMU-163 §4 decision / VMU-165). The embryo of T2's single owner
 * (VMU-025) for *this one decision only* — it never touches tempo (three
 * writers remain: AudioEngine.setBpm, useSequencer.js's handleBpmChange and
 * togglePlayback), the mixer, or the click/step sound.
 *
 * ## The rule (coordinator's decision 4, VMU-163-fix2 brief)
 *
 * The transport runs if and only if the music is playing OR the metronome is
 * on. `useSequencer.js` and `metronome.js` report their own intent here and
 * never call `transport.start()` / `.stop()` themselves — this file is the
 * only production module that does (besides `audio/measure/**`, which drives
 * the transport directly to *reproduce* what a real Play/Stop does, and
 * tests). `src/audio/__tests__/TransportOwnership.test.js` is the guard that
 * keeps it that way.
 *
 * - Play (`playMusic`) always restarts the song from its own beginning: it
 *   resets the transport to tick 0 *before* the caller's own repeat is
 *   registered, so step 0 of the music sounds at tick 0, not at the next
 *   16th-note boundary after the click (decision 2). The metronome (already
 *   running or not) re-anchors to that same zero for free — no code here
 *   touches it — because both `metronome.js` and `useSequencer.js` now
 *   register their repeats with an explicit start of `0` (decision 1, "one
 *   grid"), and Tone recomputes every repeat event's next fire time whenever
 *   the transport emits "ticks" or "start"
 *   (`TransportRepeatEvent._restart`, confirmed by reading
 *   node_modules/tone/build/esm/core/clock/TransportRepeatEvent.js:83-99 —
 *   `_restart` runs on `transport.on("start"|"loopStart"|"ticks", ...)` and
 *   recomputes `_nextTick` from `this.floatTime` (the event's own fixed
 *   anchor) against the transport's *current* ticks).
 * - Stop (`stopMusic`) stops the transport only if the metronome is off —
 *   turning the music off must never silence a metronome that is still on
 *   (VMU-056: it runs during playback *and* alone).
 * - Turning the metronome on (`enableMetronome`) starts the transport only if
 *   nothing already has it running, and never resets position — only Play
 *   restarts the song; the metronome joining mid-playback must not do it too.
 * - Turning the metronome off (`disableMetronome`) stops the transport only
 *   if the music is not playing.
 *
 * ## Why `transport.ticks = 0` and not `stop(); start();`
 *
 * `Transport.js`'s `ticks` setter (node_modules/tone/build/esm/core/clock/
 * Transport.js:449-467): if the transport is already started, it emits
 * "stop" then "start" at the next tick boundary and repositions the clock —
 * exactly the re-anchoring every live repeat event needs — *without* the
 * caller having to decide whether the transport was already running (the
 * metronome might have started it long before Play). If the transport is
 * stopped, the setter just moves the tick pointer and emits "ticks" (same
 * `_restart` trigger). Calling `stop()` unconditionally, as the pre-fix
 * `togglePlayback` did, would work too when nothing else is running, but it
 * also collapses "is anything else allowed to keep this transport alive"
 * into a single blunt call — the exact bug measured in VMU-163-fix2 (Stop
 * silenced a metronome that was still marked "on").
 *
 * @module audio/transportOwner
 */
import * as Tone from "tone";

/** True while the sequencer is playing — set only from playMusic/stopMusic. */
let musicPlaying = false;
/** True while the metronome is on — set only from enableMetronome/disableMetronome. */
let metronomeOn = false;

function transport() {
  return Tone.getTransport();
}

/**
 * Play: the music always starts from its own beginning.
 *
 * `registerSteps(transport)` must synchronously register the caller's own
 * step repeat (with an explicit start of `0`, decision 1) — called here,
 * *after* the position reset and *before* the transport is (re)started, so
 * the first step is scheduled for the same tick the position was just reset
 * to (decision 2). Doing it in the other order — starting first, registering
 * later — is exactly the pre-fix bug: by the time a deferred registration
 * ran (a React effect, one render after `Tone.Transport.start()`), the
 * transport had already ticked forward by however long the render took
 * (measured 9.6 ms in the app), so the music's own grid anchored late
 * relative to the metronome's.
 *
 * @param {(transport: import("tone").Transport) => void} registerSteps
 */
export function playMusic(registerSteps) {
  transport().ticks = 0;
  musicPlaying = true;
  registerSteps(transport());
  if (transport().state !== "started") {
    transport().start();
  }
}

/**
 * Stop: the music stops; the transport itself stops only if the metronome is
 * not keeping it alive (VMU-056).
 *
 * `unregisterSteps(transport)` must synchronously clear the caller's own step
 * repeat — always, whether or not the transport itself actually stops, since
 * a metronome-kept-alive transport must not keep firing stale step events.
 *
 * @param {(transport: import("tone").Transport) => void} unregisterSteps
 */
export function stopMusic(unregisterSteps) {
  musicPlaying = false;
  unregisterSteps(transport());
  if (!metronomeOn) {
    transport().stop();
  }
}

/**
 * Metronome on: starts the transport only if nothing already has it running.
 * Never resets position — only Play does that (decision 4); the metronome
 * joining mid-playback re-anchors to the existing grid for free (decision 1),
 * and joining while nothing plays just starts wherever ticks already are
 * (0, from the last full stop).
 *
 * @param {(transport: import("tone").Transport) => void} registerClick
 */
export function enableMetronome(registerClick) {
  metronomeOn = true;
  registerClick(transport());
  if (transport().state !== "started") {
    transport().start();
  }
}

/**
 * Metronome off: stops the transport only if the music is not playing.
 *
 * @param {(transport: import("tone").Transport) => void} unregisterClick
 */
export function disableMetronome(unregisterClick) {
  metronomeOn = false;
  unregisterClick(transport());
  if (!musicPlaying) {
    transport().stop();
  }
}
