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
 *   stops the transport (which resets its tick position to 0 — confirmed
 *   below), then registers the caller's own repeat, then starts it again —
 *   so step 0 of the music sounds at tick 0, not at the next 16th-note
 *   boundary after the click (decision 2). The metronome (already running or
 *   not) re-anchors to that same zero for free — no code here touches it —
 *   because both `metronome.js` and `useSequencer.js` now register their
 *   repeats with an explicit start of `0` (decision 1, "one grid"), and Tone
 *   recomputes every repeat event's next fire time whenever the transport
 *   emits "ticks" or "start" (`TransportRepeatEvent._restart`, confirmed by
 *   reading node_modules/tone/build/esm/core/clock/TransportRepeatEvent.js:
 *   83-99).
 * - Stop (`stopMusic`) stops the transport only if the metronome is off —
 *   turning the music off must never silence a metronome that is still on
 *   (VMU-056: it runs during playback *and* alone).
 * - Turning the metronome on (`enableMetronome`) starts the transport only if
 *   nothing already has it running, and never resets position — only Play
 *   restarts the song; the metronome joining mid-playback must not do it too.
 * - Turning the metronome off (`disableMetronome`) stops the transport only
 *   if the music is not playing.
 *
 * ## Why `stop(); register(); start();` and not `transport.ticks = 0`
 *
 * The first version of this function set `transport.ticks = 0` before
 * registering, on the reasoning that `Transport.js`'s `ticks` setter
 * (node_modules/tone/build/esm/core/clock/Transport.js:449-467) re-anchors
 * every live repeat event by emitting "stop"/"start". **That reasoning was
 * wrong in one case, caught by the offline harness, not by the mocked unit
 * tests below** (VMU-163-fix2, own regression during this ticket): when the
 * transport is already started (the metronome had it running before Play),
 * that setter's own code schedules the reset for "the next tick boundary"
 * (`time = now + remainingTick`) instead of applying it immediately — so a
 * repeat registered right after still saw the *pre-reset* tick count at
 * construction (confirmed with `metronome-then-play-midbar`'s debug
 * instrumentation: `transport.ticks` read the old value, and zero step
 * events were ever captured for the whole render). `transport.stop()`, by
 * contrast, resets the tick position synchronously and unconditionally
 * (confirmed the same way: `transport.ticks` reads `0` immediately after)
 * regardless of whether the transport was running — which is also exactly
 * what the pre-fix `Tone.Transport.stop(); Tone.Transport.start();` in
 * `useSequencer.js`'s old `togglePlayback` did, and what the already-proven
 * `metronome-phase-restart` scenario (this ticket's predecessor) relies on.
 * The bug this ticket fixes was never in stopping-then-starting itself — it
 * was in the *ordering* (registering before the restart, not after) and in
 * the *anchor* (no explicit `0`); reusing the same primitive the app was
 * already calling, just correctly ordered and anchored, is the fix.
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
 * `stop()` first — synchronously resets the tick position to 0, whether or
 * not the transport was already running (see the module docstring's "why
 * stop(); register(); start();" for what was tried and measured wrong).
 * `registerSteps(transport)` then synchronously registers the caller's own
 * step repeat (with an explicit start of `0`, decision 1), *before* the
 * transport is started again, so the first step is scheduled for the same
 * tick the position was just reset to (decision 2). Doing it in the other
 * order — starting first, registering later — is the pre-fix bug: by the
 * time a deferred registration ran (a React effect, one render after
 * `Tone.Transport.start()`), the transport had already ticked forward by
 * however long the render took (measured 9.6 ms in the app), so the music's
 * own grid anchored late relative to the metronome's.
 *
 * @param {(transport: import("tone").Transport) => void} registerSteps
 */
export function playMusic(registerSteps) {
  transport().stop();
  registerSteps(transport());
  musicPlaying = true;
  transport().start();
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
