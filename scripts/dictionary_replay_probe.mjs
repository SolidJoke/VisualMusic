#!/usr/bin/env node
/**
 * dictionary_replay_probe.mjs — VMU-187: starting a Dictionary playback stops
 * the previous one, measured on the served page.
 *
 * Gabriel, 2026-10-10: "Si on appuie 2x sur le bouton lecture d'un instrument
 * (exemple guitare), alors on lance 2x la lecture de la gamme: il faudrait
 * arreter la lecture de la premiere lecture au moment de lancer la lecture de
 * la seconde." A scale is scheduled whole, up front (useDictionaryPlayback.js:
 * one playDictionaryNote(..., time) per note), and nothing took the notes back.
 *
 * Same method as scripts/metronome_probe.mjs (VMU-163-fix2): the REAL page
 * (`/?prototype=a`, Chromium), the REAL buttons (the three column heads' play
 * buttons and the big "Ecouter" button), the Web Audio methods wrapped before
 * any app script runs, the scheduled dates read back — plus a tap on what
 * reaches the output. For each family (scale of C major, scale of A minor
 * pentatonic, chord C major, single note C) it plays:
 *
 *   baseline  one press of an instrument's play button, alone — twice, the
 *             second gives the noise floor of every reading below
 *   double    press, wait (0.6 s for a scale, 0.2 s for a chord or a note,
 *             which last a second), press again; also: another instrument
 *             second (guitar then bass, piano then guitar), the big "Ecouter"
 *             second, three presses 0.3 s apart
 *
 * and prints, for each, what the NEWEST play and the OLDER ones did:
 *
 *   older plays   the native `start(when)` dates (AudioBufferSourceNode for the
 *                 samplers) that fall at or after the instant the last press was
 *                 handled, and how many of them can still be heard: a source is
 *                 "silenced" when it was stopped at or before its start date, or
 *                 disconnected from the graph before it. Before the fix all of
 *                 them are audible (that is the defect: a second scale on top of
 *                 the first); after it, none.
 *   newest play   the same sources (sample and pitch: buffer length and
 *                 playback rate) at the same offsets as a baseline press. A
 *                 chord's or a note's notes are not dated by the engine (each
 *                 reads Tone.now() in its own call), so their offsets are
 *                 allowed 20 ms of spread; a scale's, 1.5 ms.
 *   output        what reaches the destination, tapped by a ScriptProcessor:
 *                 the energy in two windows after the newest play's first note
 *                 ("near" 0.15-0.5 s, "whole" to the end of the play), the
 *                 distance between its amplitude envelope and the baseline's,
 *                 and its sustain level (the median of the envelope where the
 *                 baseline sounds). Samplers: energy and envelope. The bass
 *                 (one Tone.MonoSynth: one oscillator, three signals for every
 *                 note, no source per note) shows nothing in the dates, and its
 *                 accents are too random from press to press for an energy or
 *                 an envelope; its sustain level is what is compared (it nearly
 *                 doubles when two plays interleave).
 *
 * WHAT THIS IS NOT: it is not listening. "Dates" are scheduled start dates;
 * "output" is the render of a headless Chromium's AudioContext, compared window
 * to window. Whether it SOUNDS right (no click at the cut, the new scale
 * clean) is for Gabriel's ears. Gecko (LibreWolf) is not measured. Chords and
 * notes pressed again while the first still rings show nothing in the dates (all
 * starts precede the second press): only the output speaks for them.
 *
 * Positive control: take the stop out (git checkout origin/main --
 * src/hooks/useDictionaryPlayback.js, or comment its stopDictionaryVoices()
 * call) and run again: nearly every line turns red, with the older plays'
 * audible starts and the output ratios printed. To show an instrument is
 * covered on its own, make the stop of one kind of voice a no-op in
 * src/audio/dictionaryVoices.js (the bass's monoSynthVoice, say): only that
 * instrument's lines turn red.
 *
 *   npm run dictionary_replay:probe                  # port 5214 by default
 *   npm run dictionary_replay:probe -- --only=scale  # or apenta, chord, note (comma list)
 *   npm run dictionary_replay:probe -- --scenario="bass then bass"
 *   npm run dictionary_replay:probe -- --verbose     # every source of every press
 *   npm run dictionary_replay:probe -- --envelope    # and the envelopes, per 50 ms
 *   npm run dictionary_replay:probe -- --json
 *   DICTIONARY_REPLAY_PROBE_PORT=5214 npm run dictionary_replay:probe
 *
 * Exit 1 on any FAIL. Its own dev server on its own port (reused if one
 * already answers there; the "dev server" line says which).
 */
import path from "node:path";
import process from "node:process";
import { repoRootFrom } from "./lib/repoRoot.mjs";

const ROOT = repoRootFrom(import.meta.url);
const PORT = Number(process.env.DICTIONARY_REPLAY_PROBE_PORT ?? 5214);
const ORIGIN = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const AS_JSON = args.includes("--json");
const KEEP_OPEN = args.includes("--headed");
const VERBOSE = args.includes("--verbose");
const ENVELOPE = args.includes("--envelope");
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length).split(",").filter(Boolean);
const ONLY_SCENARIO = (args.find((a) => a.startsWith("--scenario=")) || "").slice("--scenario=".length);

const VIEWPORT = { width: 3840, height: 2160 };
const INSTRUMENTS = ["piano", "guitar", "bass"];
// The family index in the Dictionary panel's first segment group: Note / Accords / Gammes.
// gapMs: the wait before the second press. The scale's is the brief's "~0.5 s", off the 0.25 s
// step grid on purpose; a chord or a note lasts one second (a 2n), so it is pressed again sooner,
// while the first still rings.
const FAMILIES = [
  { id: "scale", label: "scale of C major", url: "cmajscale", gapMs: 600 },
  // The bass plays only the notes of the scale that lie in its current position on the neck: 3 notes
  // for C major (C3 D3 C3, under a second), 9 for A minor pentatonic. Too short to leave anything
  // pending at the second press, so the bass gets its own scale here.
  { id: "apenta", label: "scale of A minor pentatonic (bass: 9 notes, guitar: 11)", url: "apenta", gapMs: 600 },
  { id: "chord", label: "chord C major", url: "cmaj", gapMs: 200, undatedNotes: true },
  { id: "note", label: "single note C", url: "cmaj", panelFamily: 0, gapMs: 200, undatedNotes: true },
];

const LOOKAHEAD_S = 0.1; // Tone.now() = currentTime + this: where a press's first note lands
const CUT_SLIVER_S = 0.02; // see readRun
// How long the whole newest play lasts, per family, at the default tempo (15 notes x 0.25 s; a 2n).
const WHOLE_SECONDS = { scale: 4.0, apenta: 3.0, chord: 1.4, note: 1.4 };
// Verdict limits (see the doc comment). Every limit on the output is the noise floor measured
// in the same run (two single presses compared with each other) plus a margin, never a constant
// alone. PROVISIONAL until calibrated against main and the fix (see the VMU-187 report).
const STARTS_TOLERANCE_MS = 1;
const UNDATED_SPREAD_MS = 20; // a chord / a note: each note reads Tone.now() in its own call
const ENERGY_UP = 0.25; // a sanity bound: the older-play readings above decide; this catches a play that is plainly louder
const ENERGY_DOWN = 0.3; // the master compressor, still down from a louder moment, takes some back
const SHAPE_FACTOR = 1.5;
const SHAPE_MARGIN = 0.25;
const LEVEL_TOLERANCE = 0.2;

// ─── dev server (same pattern as scripts/metronome_probe.mjs) ───────────────

async function isServerUp() {
  try {
    const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await isServerUp()) return { server: null, reused: true };
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: path.join(ROOT, "vite.config.js"),
    root: ROOT,
    logLevel: "warn",
    server: { port: PORT, strictPort: true },
  });
  await server.listen();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isServerUp()) return { server, reused: false };
    await new Promise((r) => setTimeout(r, 200));
  }
  await server.close();
  throw new Error(`vite did not answer on ${ORIGIN} within 60s`);
}

// ─── in-page instrumentation ────────────────────────────────────────────────

/**
 * Installed with page.addInitScript, before any app script runs. Records, for
 * every source node of the page's real AudioContext (an OfflineAudioContext —
 * Tone.Reverb builds its impulse response in one — is ignored):
 *   when / ctxAtCall / t   the start date, the audio clock and the wall clock at the call
 *   stops                  every stop(when) argument, in order
 *   severedAtCtx           the audio clock at the first disconnect()
 * and taps whatever reaches the destination with a ScriptProcessor, one
 * [playbackTime, mean square] pair per 512-frame block.
 */
function installProbe() {
  const vm = { ctx: null, nodes: [], blocks: [], blockLen: 0, tapSources: 0, automation: [] };
  // @ts-ignore — page context
  window.__vm = vm;
  const recs = new WeakMap();
  const real = (node) => !(node.context instanceof OfflineAudioContext);

  const wrap = (proto, kind) => {
    const origStart = proto.start;
    const origStop = proto.stop;
    proto.start = function start(when, ...rest) {
      if (real(this)) {
        vm.ctx = this.context;
        const rec = {
          kind,
          when: typeof when === "number" ? when : this.context.currentTime,
          ctxAtCall: this.context.currentTime,
          t: performance.now(),
          stops: [],
          severedAtCtx: null,
          // Which note it is: the sampler picks a sample and bends it (playbackRate) to the pitch.
          sig: this.buffer ? `${this.buffer.duration.toFixed(3)}@${this.playbackRate.value.toFixed(4)}` : "",
        };
        recs.set(this, rec);
        vm.nodes.push(rec);
      }
      return origStart.call(this, when, ...rest);
    };
    proto.stop = function stop(when) {
      const rec = recs.get(this);
      if (rec) rec.stops.push(typeof when === "number" ? when : this.context.currentTime);
      return origStop.call(this, when);
    };
  };
  wrap(AudioBufferSourceNode.prototype, "buffer");
  wrap(OscillatorNode.prototype, "oscillator");

  const origDisconnect = AudioNode.prototype.disconnect;
  AudioNode.prototype.disconnect = function disconnect(...a) {
    const rec = recs.get(this);
    if (rec && rec.severedAtCtx === null) rec.severedAtCtx = this.context.currentTime;
    return origDisconnect.apply(this, a);
  };

  const origConnect = AudioNode.prototype.connect;
  const taps = new WeakMap();
  AudioNode.prototype.connect = function connect(dest, ...rest) {
    const result = origConnect.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode && real(this)) {
      const ctx = this.context;
      if (!taps.has(ctx)) {
        const proc = ctx.createScriptProcessor(512, 1, 1);
        const mute = ctx.createGain();
        mute.gain.value = 0;
        proc.onaudioprocess = (e) => {
          const d = e.inputBuffer.getChannelData(0);
          let s = 0;
          for (let i = 0; i < d.length; i++) s += d[i] * d[i];
          vm.blocks.push([e.playbackTime, s / d.length]);
        };
        origConnect.call(proc, mute);
        origConnect.call(mute, ctx.destination);
        vm.blockLen = 512 / ctx.sampleRate;
        taps.set(ctx, proc);
      }
      origConnect.call(this, taps.get(ctx));
      vm.tapSources += 1;
    }
    return result;
  };

  // What every AudioParam still has scheduled, with Web Audio's own rules for taking it back:
  // cancelScheduledValues(t) removes the events at or after t, cancelAndHoldAtTime(t) those after t.
  // This is how the bass is seen: one oscillator carries every note of a scale, and the pitch of
  // each is an event on a signal, so a note that is still "pending" is a pitch event that is
  // still scheduled. (A source node has no such thing to observe: see the sampler lines.)
  const lists = new WeakMap();
  const listOf = (param) => {
    let list = lists.get(param);
    if (!list) {
      list = [];
      lists.set(param, list);
      vm.automation.push(list);
    }
    return list;
  };
  const addsEvent = ["setValueAtTime", "linearRampToValueAtTime", "exponentialRampToValueAtTime", "setTargetAtTime", "setValueCurveAtTime"];
  for (const name of addsEvent) {
    const orig = AudioParam.prototype[name];
    AudioParam.prototype[name] = function patched(...a) {
      listOf(this).push({ time: a[1] ?? 0, wall: performance.now(), ctx: vm.ctx ? vm.ctx.currentTime : 0 });
      return orig.apply(this, a);
    };
  }
  const origCancel = AudioParam.prototype.cancelScheduledValues;
  AudioParam.prototype.cancelScheduledValues = function cancelScheduledValues(t) {
    const list = listOf(this);
    for (let i = list.length - 1; i >= 0; i--) if (list[i].time >= t) list.splice(i, 1);
    return origCancel.call(this, t);
  };
  const origHold = AudioParam.prototype.cancelAndHoldAtTime;
  AudioParam.prototype.cancelAndHoldAtTime = function cancelAndHoldAtTime(t) {
    const list = listOf(this);
    for (let i = list.length - 1; i >= 0; i--) if (list[i].time > t) list.splice(i, 1);
    return origHold.call(this, t);
  };
}

// ─── page actions ───────────────────────────────────────────────────────────

const HEAD_PLAY = (id) => `[data-fn="jouer.instrument-play-${id}"]`;
const BIG_PLAY = '[data-fn="jouer.lecture"]';

/** `element.click()` through evaluate (as metronome_probe.mjs does), stamped on both clocks. */
async function press(page, selector) {
  return page.locator(selector).evaluate((el) => {
    el.click();
    // @ts-ignore
    const vm = window.__vm;
    return { t: performance.now(), ctx: vm.ctx ? vm.ctx.currentTime : null };
  });
}

/** Chooses the Dictionary family in the drawer panel (the single note has no URL scenario). */
async function chooseFamilyInDrawer(page, familyIndex) {
  await page.locator('[data-testid="proto-drawer-toggle"]').click();
  const panel = page.locator('[data-testid="dictionary-panel"]');
  await panel.waitFor({ state: "visible", timeout: 10_000 });
  const button = panel.locator(".btn-segment-group").first().locator(".btn-segment").nth(familyIndex);
  await button.click();
  await button.and(page.locator(".btn-segment--active")).waitFor({ timeout: 5_000 });
  await page.locator('[data-testid="proto-drawer-toggle"]').click();
  await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: 5_000 });
}

async function openFamily(page, family) {
  await page.goto(`${ORIGIN}/?prototype=a&bench=1&scenario=${family.url}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(`[data-scenario="${family.url}"].is-active`).waitFor({ timeout: 10_000 });
  if (family.panelFamily !== undefined) await chooseFamilyInDrawer(page, family.panelFamily);
}

/** Waits until every scheduled source is in the past, plus the longest reverb tail and a margin. */
async function waitQuiet(page, tail = 3.4) {
  const deadline = Date.now() + 40_000;
  for (;;) {
    const s = await page.evaluate(() => {
      // @ts-ignore
      const vm = window.__vm;
      const last = vm.nodes.reduce((m, n) => Math.max(m, n.when), 0);
      return { now: vm.ctx ? vm.ctx.currentTime : 0, last, n: vm.nodes.length };
    });
    if (s.n > 0 && s.now > s.last + tail) return;
    if (Date.now() > deadline) throw new Error(`audio did not go quiet (now ${s.now}, last start ${s.last}, ${s.n} sources)`);
    await page.waitForTimeout(250);
  }
}

async function resetLogs(page) {
  await page.evaluate(() => {
    // @ts-ignore
    window.__vm.nodes.length = 0;
    // @ts-ignore
    window.__vm.blocks.length = 0;
    // @ts-ignore
    window.__vm.automation.forEach((list) => (list.length = 0));
  });
}

/**
 * One instrument at a time, press its play button until the sound comes from
 * the sampler (buffer sources) — the samplers load in the background after the
 * first press, and until they have, the PolySynth fallback plays. The bass has
 * no sampler: any oscillator will do.
 */
async function warmUp(page) {
  const log = [];
  for (const id of ["guitar", "piano", "bass"]) {
    const wanted = id === "bass" ? "oscillator" : "buffer";
    let ok = false;
    for (let attempt = 1; attempt <= 14 && !ok; attempt++) {
      await resetLogs(page);
      await press(page, HEAD_PLAY(id));
      await page.waitForTimeout(1100);
      ok = await page.evaluate((kind) => {
        // @ts-ignore
        return window.__vm.nodes.some((n) => n.kind === kind);
      }, wanted);
      if (!ok) await page.waitForTimeout(1500);
      else log.push(`${id}: ${wanted} sources after ${attempt} press(es)`);
    }
    if (!ok) throw new Error(`warm-up: ${id} never produced ${wanted} sources — the sampler did not load`);
    await waitQuiet(page);
  }
  return log;
}

/** Presses `plays` (selector + wait before it), waits for quiet, returns what was recorded. */
async function runPlays(page, plays) {
  await resetLogs(page);
  const clicks = [];
  for (const [i, p] of plays.entries()) {
    if (i > 0) await page.waitForTimeout(p.after);
    clicks.push(await press(page, p.selector));
  }
  await waitQuiet(page);
  const data = await page.evaluate(() => {
    // @ts-ignore
    const vm = window.__vm;
    return {
      nodes: vm.nodes.slice(),
      blocks: vm.blocks.slice(),
      blockLen: vm.blockLen,
      tapSources: vm.tapSources,
      automation: vm.automation.flatMap((list) => list.map((e) => ({ ...e }))),
    };
  });
  return { clicks, ...data };
}

// ─── analysis ───────────────────────────────────────────────────────────────

const f = (n, d = 2) => (typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : String(n));

/** The recorded sources split by the press that caused them (wall clock). */
function groupByPress(run) {
  return run.clicks.map((c, i) => {
    const next = run.clicks[i + 1];
    return run.nodes.filter((n) => n.t >= c.t && (!next || n.t < next.t));
  });
}

/** Can the source still be heard at its start date? (stopped or cut off before it = no) */
function audibleAtStart(n) {
  const lastStop = n.stops.length ? n.stops[n.stops.length - 1] : Infinity;
  const stopped = lastStop <= n.when;
  const severed = n.severedAtCtx !== null && n.severedAtCtx <= n.when;
  return !stopped && !severed;
}

function energy(run, from, to) {
  let e = 0;
  for (const [t, ms] of run.blocks) if (t >= from && t < to) e += ms * run.blockLen;
  return e;
}

/**
 * The output's amplitude envelope (square root of the mean square per block) on a
 * fixed 10 ms grid from `from` to `to`, so two runs can be laid on top of each other
 * whatever the phase of their 512-frame blocks.
 */
function envelopeGrid(run, from, to) {
  const grid = [];
  let k = 0;
  for (let t = from; t < to; t += 0.01) {
    while (k + 1 < run.blocks.length && run.blocks[k + 1][0] <= t) k++;
    grid.push(run.blocks.length ? Math.sqrt(run.blocks[k][1]) : 0);
  }
  // A 50 ms box filter: a sharp attack landing a few ms earlier or later (the phase of the
  // blocks, the audio clock's quantum) must not read as a different envelope.
  return grid.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(grid.length - 1, i + 2); j++) {
      sum += grid[j];
      n++;
    }
    return sum / n;
  });
}

/** How far apart two envelopes are: ||a - b|| / ||b||. 0 = identical. */
function shapeDistance(a, b) {
  let num = 0;
  let den = 0;
  for (let i = 0; i < b.length; i++) {
    num += ((a[i] ?? 0) - b[i]) ** 2;
    den += b[i] ** 2;
  }
  return den === 0 ? Infinity : Math.sqrt(num / den);
}

/** Where the baseline envelope is at least a tenth of its peak: the part of the play that sounds. */
function activeMask(grid) {
  const peak = Math.max(...grid);
  return grid.map((v) => v >= 0.1 * peak);
}

/** The median of an envelope over the active part: its level between the accents, not the accents. */
function levelOf(grid, mask) {
  const values = grid.filter((_, i) => mask[i]).sort((x, y) => x - y);
  return values.length ? values[Math.floor(values.length / 2)] : 0;
}

/** What one run says about its newest play and the older ones. */
function readRun(run, wholeSeconds, naturalStops = null) {
  const groups = groupByPress(run);
  const newest = groups[groups.length - 1];
  const older = groups.slice(0, -1).flat();
  const lastPress = run.clicks[run.clicks.length - 1].ctx;
  // The bass may schedule no source of its own (see the doc comment), so the reference of
  // the newest play is the instant of its press plus Tone's 0.1 s look-ahead, not its first source.
  const ref = lastPress + LOOKAHEAD_S;
  const first = newest.length ? Math.min(...newest.map((n) => n.when)) : ref;
  const offsets = newest.map((n) => n.when - first).sort((a, b) => a - b);
  const sigs = newest.map((n) => n.sig).sort();
  // The cut is made while the newest press is handled, after the click returned (a few ms, or the tens
  // of ms a render of this page takes): a note or an event that falls before that instant has already
  // started for the engine, it is not pending. The instant is read from the first thing the newest
  // press did to the audio graph (a source it started, a signal it scheduled).
  const lastPressWallMs = run.clicks[run.clicks.length - 1].t;
  const handledAt = Math.min(
    ...newest.map((n) => n.ctxAtCall),
    ...run.automation.filter((e) => e.wall >= lastPressWallMs).map((e) => e.ctx),
  );
  const cutCtx = Math.max(lastPress + CUT_SLIVER_S, Number.isFinite(handledAt) ? handledAt - 0.005 : 0);
  const olderPending = older.filter((n) => n.when >= cutCtx);
  const olderAudible = olderPending.filter(audibleAtStart);
  // Sampler notes that were sounding at the cut and had a good while left (a baseline press tells how
  // long each sample rings: its last native stop() minus its start): was the stop brought forward?
  // Tone's own stop() is timer-driven, so the native stop() date is when the note really ended.
  // Two copies of the same sample half a second apart add or cancel by phase, so the output alone
  // cannot tell a chord that rings on from one that was cut; this can.
  const naturalOf = new Map();
  for (const n of newest) {
    // Two natural dates, both relative to the start: the native stop() argument (a date in the future when
    // the timer fires) and the disconnect() call (made when Tone cleans the note up, earlier than that date).
    if (n.kind === "buffer" && n.stops.length && n.severedAtCtx !== null) {
      naturalOf.set(n.sig, { stop: n.stops[n.stops.length - 1] - n.when, sever: n.severedAtCtx - n.when });
    }
  }
  let soundingAtCut = 0;
  let stoppedEarly = 0;
  if (naturalStops) {
    for (const n of older) {
      const natural = naturalStops.get(n.sig);
      if (n.kind !== "buffer" || n.when >= cutCtx || natural === undefined) continue;
      if (n.when + natural.stop <= cutCtx + 0.6) continue; // over, or ends within the 0.4 s Tone takes to stop one: no difference to see
      soundingAtCut++;
      const lastStop = n.stops.length ? n.stops[n.stops.length - 1] : Infinity;
      // Cut short = its stop() came early, or it was taken out of the graph early (a note the engine
      // found not yet started at its own cut, a few ms before this one is seen to have started):
      // each against the date the same sample has when nobody interferes.
      const severed = n.severedAtCtx !== null ? n.severedAtCtx : Infinity;
      if (lastStop <= n.when + natural.stop - 0.15 || severed <= n.when + natural.sever - 0.15) stoppedEarly++;
    }
  }
  // Events (pitch, amplitude, filter...) the older plays scheduled for the cut or later and nothing took back.
  const lastPressWall = run.clicks[run.clicks.length - 1].t;
  const olderAutomationEvents = run.automation.filter((e) => e.wall < lastPressWall && e.time >= cutCtx);
  const olderAutomation = olderAutomationEvents.length;
  if (VERBOSE && olderAutomation > 0) {
    console.log(`        signal events left by the older plays, seconds after the last press: ${olderAutomationEvents.map((e) => f(e.time - lastPress, 3)).join(" ")}`);
  }
  const near = energy(run, ref + 0.15, ref + 0.5);
  const whole = energy(run, ref + 0.15, ref + wholeSeconds);
  const shape = envelopeGrid(run, ref + 0.15, ref + wholeSeconds);
  const kinds = [...new Set(run.nodes.map((n) => n.kind))].join("+");
  if (VERBOSE) {
    groups.forEach((g, i) => {
      const t0 = run.clicks[i].ctx;
      console.log(`        [press ${i + 1} at ctx ${f(t0, 3)}] ${g.length} sources: ` + g.map((n) => `${n.kind[0]}@${f(n.when - t0, 3)}${n.sig ? `(${n.sig})` : ""}${n.stops.length ? ` stop${f(n.stops[n.stops.length - 1] - t0, 3)}` : ""}${n.severedAtCtx !== null ? ` cut${f(n.severedAtCtx - t0, 3)}` : ""}`).join(" "));
    });
  }
  return {
    plays: groups.map((g) => g.length),
    newestCount: newest.length,
    offsets,
    sigs,
    olderTotal: older.length,
    olderPending: olderPending.length,
    olderAudible: olderAudible.length,
    olderAutomation,
    naturalOf,
    soundingAtCut,
    stoppedEarly,
    near,
    whole,
    shape,
    kinds,
    gapsMs: run.clicks.slice(1).map((c, i) => (c.ctx - run.clicks[i].ctx) * 1000),
    tapSources: run.tapSources,
  };
}

function maxOffsetDeviationMs(a, b) {
  if (a.length !== b.length) return Infinity;
  return Math.max(0, ...a.map((x, i) => Math.abs(x - b[i]) * 1000));
}

// ─── run ────────────────────────────────────────────────────────────────────

const { chromium } = await import("playwright");
const dev = await startDevServer();
if (!AS_JSON) {
  console.log("\nVisualMusic dictionary replay probe (VMU-187)");
  console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
  console.log("  browser    : Chromium, real play buttons. Measures scheduled start dates and the energy at the");
  console.log("               output of a headless AudioContext. It does NOT listen: the sound is Gabriel's to judge.\n");
}

const browser = await chromium.launch({
  headless: !KEEP_OPEN,
  args: ["--autoplay-policy=no-user-gesture-required"],
});

const results = [];
const pageErrors = [];
let failures = 0;

try {
  for (const family of FAMILIES) {
    if (ONLY.length && !ONLY.includes(family.id)) continue;
    const page = await browser.newPage({ viewport: VIEWPORT });
    page.on("pageerror", (e) => pageErrors.push(`[${family.id}] ${String(e)}`));
    await page.addInitScript(installProbe);
    await openFamily(page, family);
    const warm = await warmUp(page);
    if (!AS_JSON) console.log(`── ${family.label}  (warm-up: ${warm.join("; ")})`);

    // Baselines: one press alone, twice per instrument (the second = noise floor).
    const baseline = {};
    for (const id of INSTRUMENTS) {
      const a = readRun(await runPlays(page, [{ selector: HEAD_PLAY(id) }]), WHOLE_SECONDS[family.id]);
      const b = readRun(await runPlays(page, [{ selector: HEAD_PLAY(id) }]), WHOLE_SECONDS[family.id]);
      baseline[id] = {
        a,
        b,
        noiseNear: b.near / a.near,
        noiseWhole: b.whole / a.whole,
        noiseShape: shapeDistance(b.shape, a.shape),
        noiseLevel: levelOf(b.shape, activeMask(a.shape)) / levelOf(a.shape, activeMask(a.shape)),
        noiseOffsetsMs: maxOffsetDeviationMs(b.offsets, a.offsets),
      };
    }

    // Information, not a verdict: the big "Ecouter" button alone (the guitar chosen without playing,
    // through its head's name) against the guitar's own play button alone. Same notes, same samples;
    // if their energy differs, a difference in a later "then Ecouter" line is not the cut's.
    await press(page, '[data-fn="jouer.instrument-tuile-guitar"]');
    await page.waitForTimeout(300);
    const bigAlone = readRun(await runPlays(page, [{ selector: BIG_PLAY }]), WHOLE_SECONDS[family.id]);
    if (!AS_JSON) {
      console.log(`    (info) Ecouter alone vs guitar's play button alone: ${bigAlone.newestCount} starts (${baseline.guitar.a.newestCount}), energy near x${f(bigAlone.near / baseline.guitar.a.near)}, whole x${f(bigAlone.whole / baseline.guitar.a.whole)}`);
    }

    // How long each sample of this family really rings (last native stop - start), from the baseline presses.
    const naturalAll = new Map();
    for (const id of INSTRUMENTS) for (const [sig, offset] of baseline[id].a.naturalOf) naturalAll.set(sig, offset);

    const gap = family.gapMs;
    const scenarios = [];
    for (const id of INSTRUMENTS) {
      scenarios.push({ name: `${id} then ${id}`, as: id, plays: [{ selector: HEAD_PLAY(id) }, { selector: HEAD_PLAY(id), after: gap }] });
    }
    scenarios.push({ name: "guitar then bass", as: "bass", plays: [{ selector: HEAD_PLAY("guitar") }, { selector: HEAD_PLAY("bass"), after: gap }] });
    scenarios.push({ name: "piano then guitar", as: "guitar", plays: [{ selector: HEAD_PLAY("piano") }, { selector: HEAD_PLAY("guitar"), after: gap }] });
    scenarios.push({ name: "guitar then Ecouter", as: "guitar", plays: [{ selector: HEAD_PLAY("guitar") }, { selector: BIG_PLAY, after: gap }] });
    scenarios.push({ name: "guitar x3", as: "guitar", plays: [{ selector: HEAD_PLAY("guitar") }, { selector: HEAD_PLAY("guitar"), after: 300 }, { selector: HEAD_PLAY("guitar"), after: 300 }] });

    for (const sc of scenarios) {
      if (ONLY_SCENARIO && !sc.name.includes(ONLY_SCENARIO)) continue;
      const run = await runPlays(page, sc.plays);
      const r = readRun(run, WHOLE_SECONDS[family.id], naturalAll);
      const ref = baseline[sc.as];
      const devMs = maxOffsetDeviationMs(r.offsets, ref.a.offsets);
      const nearRatio = r.near / ref.a.near;
      const wholeRatio = r.whole / ref.a.whole;
      const shape = shapeDistance(r.shape, ref.a.shape);
      const mask = activeMask(ref.a.shape);
      const level = levelOf(r.shape, mask) / levelOf(ref.a.shape, mask);
      const sampler = sc.as !== "bass";
      // (1) the older plays: no start at or after the cut can still be heard
      // For a bass playing alone there is no source node to look at: what the older play left scheduled
      // on the signals of the one voice (a pitch event per note) is what is counted. Not asked of a
      // mixed scenario: a sampler's own gain events would be counted there, and they are not audible.
      const bassAlone = sc.plays.every((p) => p.selector === HEAD_PLAY("bass"));
      const ringsOn = r.soundingAtCut - r.stoppedEarly;
      const quiet = r.olderAudible === 0 && ringsOn === 0 && (!bassAlone || r.olderAutomation === 0);
      // (2) the newest play: the same sources (sample and pitch) at the same offsets as one press alone —
      // for the samplers (the bass is one oscillator the whole play through: Tone restarts it or not,
      // so what it started says nothing). The offsets of a chord or a note are as spread as the audio
      // clock makes them: each note reads Tone.now() in its own call (measured 0-12 ms on unchanged code).
      const offsetsLimit = family.undatedNotes ? UNDATED_SPREAD_MS : Math.max(STARTS_TOLERANCE_MS, ref.noiseOffsetsMs + 1.5);
      const sameSigs = r.sigs.length === ref.a.sigs.length && r.sigs.every((s, i) => s === ref.a.sigs[i]);
      const sameNotes = !sampler || (sameSigs && devMs <= offsetsLimit);
      // (3) what reaches the output is that of one press alone. A second scale on top of the first adds
      // energy (the samplers: x1.2-x2.5 on main); the bass, one voice, does not get louder, it gets
      // muddled (its sustain level between accents doubles) and its accents are too random from press
      // to press (noise floor up to 0.35) for an energy or a shape: its level is what is compared.
      const noiseLevel = Math.abs(ref.noiseLevel - 1);
      const energyOk = !sampler || (nearRatio <= 1 + ENERGY_UP && nearRatio >= 1 - ENERGY_DOWN && wholeRatio <= 1 + ENERGY_UP && wholeRatio >= 1 - ENERGY_DOWN);
      const shapeOk = !sampler || shape <= SHAPE_FACTOR * ref.noiseShape + SHAPE_MARGIN;
      const levelOk = Math.abs(level - 1) <= LEVEL_TOLERANCE + noiseLevel;
      const ok = quiet && sameNotes && energyOk && shapeOk && levelOk;
      if (!ok) failures++;
      const rest = { ...r };
      delete rest.shape; // the grid is for the comparison, not for the report
      delete rest.naturalOf;
      results.push({ family: family.id, scenario: sc.name, ok, ...rest, devMs, nearRatio, wholeRatio, shape, level, refCount: ref.a.newestCount });
      if (ENVELOPE && !AS_JSON) {
        const every5 = (g) => g.filter((_, i) => i % 5 === 0).map((v) => Math.round(v * 1000));
        console.log(`        envelope x1000 per 50 ms, baseline a: ${every5(ref.a.shape).join(" ")}`);
        console.log(`        envelope x1000 per 50 ms, baseline b: ${every5(ref.b.shape).join(" ")}`);
        console.log(`        envelope x1000 per 50 ms, this run  : ${every5(r.shape).join(" ")}`);
      }
      if (!AS_JSON) {
        console.log(`${ok ? "PASS" : "FAIL"}  ${sc.name}   (gap ${r.gapsMs.map((g) => f(g, 0)).join("/")} ms, sources: ${r.kinds})`);
        console.log(`        older plays: ${r.olderPending} starts at or after the cut, ${r.olderAudible} still audible (silenced: ${r.olderPending - r.olderAudible}); ${r.soundingAtCut} sounding at the cut with time to spare, ${r.stoppedEarly} stopped early${bassAlone ? `; ${r.olderAutomation} signal events still scheduled at or after the cut` : ""}${quiet ? "" : "   <-- NOT QUIET"}`);
        console.log(`        newest play: ${r.newestCount} starts (baseline ${ref.a.newestCount}), offsets deviate by at most ${f(devMs, 3)} ms (limit ${f(offsetsLimit, 1)})${sameNotes ? "" : "   <-- NOT THE SAME NOTES"}`);
        console.log(`        output vs one press alone: energy near x${f(nearRatio)}, whole x${f(wholeRatio)}; envelope distance ${f(shape)}; sustain level x${f(level)}${energyOk && shapeOk && levelOk ? "" : "   <-- NOT THE SAME OUTPUT"}`);
        console.log(`                                   (two single presses against each other: near x${f(ref.noiseNear)}, whole x${f(ref.noiseWhole)}, distance ${f(ref.noiseShape)}, level x${f(ref.noiseLevel)})`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}

if (pageErrors.length > 0) {
  failures++;
  if (!AS_JSON) {
    console.log(`\nFAIL  page errors during the probe (${pageErrors.length}):`);
    pageErrors.slice(0, 5).forEach((e) => console.log(`  ${e.slice(0, 240)}`));
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ results, pageErrors }, null, 2));
} else {
  const total = results.length + (pageErrors.length ? 1 : 0);
  console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${total - failures}/${total} readings passed\n`);
}

process.exit(failures > 0 ? 1 : 0);
