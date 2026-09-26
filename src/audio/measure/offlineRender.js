// @ts-check
/**
 * offlineRender.js — the other half of the audio harness (VMU-026): it makes
 * VisualMusic's *real* audio graph play into an `OfflineAudioContext` and hands
 * the samples to `signalMetrics.js`.
 *
 * ## Why this file runs in a browser and not in vitest
 *
 * jsdom implements no Web Audio at all, so the jsdom suite cannot render one
 * sample. This module therefore runs inside a real Chromium page, driven by
 * `scripts/audio_measure.mjs`. It is a normal module under `src/` for one
 * concrete reason: it must import `tone` by bare specifier, exactly as
 * `AudioEngine.js` does, so Vite resolves both to the *same* optimized
 * dependency. Importing Tone by URL from the page instead gives a second Tone
 * module with its own global context — measured, 2026-09-16: two Tone banners
 * in the console, `AudioContext is suspended` warnings, and a render that came
 * back digital silence while the notes played into the realtime context nobody
 * was recording.
 *
 * ## How the graph is captured without rebuilding it
 *
 * `AudioEngine.js` builds all of its nodes at import time, bound to whatever
 * context is current — the difficulty VMU-026 flagged as the real one. The fix
 * needs no production change and no mirror: `Tone.Offline` installs an offline
 * context as the global one for the duration of its callback, so importing
 * `AudioEngine` *inside* that callback builds every node on the offline
 * context. The import is dynamic for that ordering alone.
 *
 * Because an import is cached, a module instance belongs to the first context
 * that built it: one render per page. The driver opens a fresh page per
 * scenario, which also keeps sampler state and Transport state from leaking
 * between measurements.
 *
 * ## Two taps, one render
 *
 * The chain is `instrumentVols.* -> masterAnalyser -> masterLimiter ->
 * Destination`. The harness unhooks the last edge and merges two taps into one
 * stereo render: channel 0 is the mix *before* the output link, channel 1 the
 * mix *after* it. Gain reduction is then sample-aligned. Rendering twice and
 * diffing would not work — the drums are NoiseSynths, so two renders are not
 * the same signal.
 *
 * The merge goes to the *raw* context destination, bypassing Tone's
 * `Destination` volume node, so the reported levels are the levels inside the
 * chain and do not move when someone changes the master fader. Master volume
 * is reported separately.
 *
 * @module audio/measure/offlineRender
 */
import * as Tone from "tone";
import {
  analyzeChannel,
  comparePitchContent,
  detectOnsets,
  gainReductionMetrics,
  levelMetrics,
  magnitudeSpectrum,
  midiToFreq,
  noteNameToMidi,
  refinePeakBin,
} from "./signalMetrics";

/** Sample rate every measurement is taken at. */
export const DEFAULT_SAMPLE_RATE = 44100;

/**
 * Musical content starts here, not at 0. `setInstrumentVolume` ramps over
 * 50 ms and the samplers settle at the top of the render; measuring across
 * that would report the ramp.
 */
export const LEAD_IN_SEC = 0.2;

/**
 * The Studio's state on a cold start, which is what "the default progression"
 * means. Read from the app's own data and defaults rather than retyped:
 * `useStudioMode` opens on `BRICKS[0]` with theme "A", and `useSequencer`
 * opens at 120 BPM, master -12 dB, with these instrument trims.
 */
export const STUDIO_DEFAULTS = {
  brickIndex: 0,
  bpm: 120,
  masterVolumeDb: -12,
  chordOctaveOffset: 0,
  instrumentVolumes: { kick: -3, snare: -5, hat: -8, bass: -6, piano: 0, guitar: 0 },
};

/**
 * Renders a scenario and returns its measurements.
 *
 * @param {Object} spec
 * @param {string} spec.scenario name from SCENARIOS
 * @param {Object} [spec.params] scenario-specific parameters
 * @param {number} [spec.durationSec]
 * @param {number} [spec.sampleRate]
 * @param {number} [spec.pitchOffsetSec] where to place the pitch-analysis window
 * @param {number} [spec.fftSize]
 * @param {number} [spec.maxPitches]
 * @param {string[]} [spec.expectedNotes] notes the render is supposed to contain;
 *   the verdict is computed here rather than in the Node driver so there is one
 *   implementation of "is this the right pitch" and one note-naming convention
 *   (the driver cannot import this module — Node does not resolve Vite's
 *   extensionless imports)
 * @returns {Promise<Object>} plain JSON, safe to cross the page boundary
 */
export async function runScenario(spec) {
  const {
    scenario,
    params = {},
    durationSec,
    sampleRate = DEFAULT_SAMPLE_RATE,
    pitchOffsetSec,
    fftSize = 16384,
    maxPitches = 8,
    expectedNotes = null,
  } = spec;

  const definition = SCENARIOS[scenario];
  if (!definition) {
    throw new Error(`runScenario: unknown scenario "${scenario}". Known: ${Object.keys(SCENARIOS).join(", ")}`);
  }

  const duration = durationSec ?? definition.durationSec;
  const pitchOffset = pitchOffsetSec ?? definition.pitchOffsetSec ?? LEAD_IN_SEC + 0.05;

  /** @type {Object} */
  const diagnostics = { scenario, params, durationSec: duration, sampleRate };
  /** @type {Object|null} set by the render callback, read after render() */
  let scenarioContext = null;

  const buffer = await Tone.Offline(
    async () => {
      diagnostics.contextDuringRender = Tone.getContext().constructor.name;

      // Built on the offline context precisely because the import happens here.
      const engine = await import("../AudioEngine");
      diagnostics.destinationIsOffline = Tone.getDestination().context === Tone.getContext();

      // VMU-144 phase B (coordinator follow-up, 2026-09-23): pianoReverb and
      // guitarReverb (AudioEngine.js) each generate their impulse response
      // asynchronously in their own nested OfflineContext (Tone.Reverb's own
      // `generate()`, node_modules/tone/.../effect/Reverb.js — "the impulse
      // response generation is async"), started at module import above, a few
      // lines up. Both draw from the same seeded Math.random (this script's
      // page.addInitScript) but as two independent async tasks, so *which one
      // finishes generating its buffer first* was not itself deterministic —
      // measured: the one scenario that did not already have an incidental
      // synchronisation point here (guitar-fallback-note, no loadSamplers
      // call) read 0.02-0.03 LU apart across otherwise-identical runs, while
      // every scenario that happened to await something else first did not.
      // Awaiting both `.ready` promises here, once, for every scenario,
      // removes the race outright rather than relying on that coincidence.
      await Promise.all([engine.pianoReverb.ready, engine.guitarReverb.ready]);

      // Unhook masterLimiter -> Destination, then tap both sides of it.
      engine.masterLimiter.disconnect();
      const merge = new Tone.Merge();
      engine.masterAnalyser.connect(merge, 0, 0); // pre-limiter  -> channel 0
      engine.masterLimiter.connect(merge, 0, 1); // post-limiter -> channel 1
      merge.connect(Tone.getContext().rawContext.destination);

      const ctx = { Tone, engine, params, diagnostics };
      await definition.body(ctx);
      scenarioContext = ctx;
    },
    duration,
    2,
    sampleRate,
  );

  if (scenarioContext?.scheduledPitches) {
    const pitches = scenarioContext.scheduledPitches;
    diagnostics.scheduledPitchCount = pitches.length;
    diagnostics.scheduledPitchRange = pitches.length
      ? { lowest: Math.min(...pitches), highest: Math.max(...pitches) }
      : null;
  }

  const pre = buffer.getChannelData(0);
  const post = buffer.getChannelData(1);
  const pitchOffsetSamples = Math.max(0, Math.round(pitchOffset * sampleRate));

  const mix = analyzeChannel(post, { sampleRate, pitchOffset: pitchOffsetSamples, fftSize, maxPitches });

  // Opt-in (VMU-056's "metronome" scenario below): counts clicks and their
  // spacing on the real post-limiter mix. Gated on a param rather than always
  // computed, so every other scenario's returned shape is unchanged.
  const onsets = params.detectOnsets
    ? detectOnsets(post, {
        sampleRate,
        thresholdDbfs: params.onsetThresholdDbfs ?? -35,
        minGapMs: params.onsetMinGapMs ?? 150,
      })
    : null;

  // Opt-in (VMU-163's "metronome-phase-restart" scenario): which onsets carry
  // the accent pitch vs. the off-beat pitch. `diagnostics.accentNote` /
  // `.offbeatNote` are set by the scenario body from metronome.js's own
  // exported constants, so this file names no note itself.
  const clickPitches =
    params.classifyClickPitch && onsets && diagnostics.accentNote && diagnostics.offbeatNote
      ? classifyClickPitches(post, onsets.onsets, {
          sampleRate,
          accentHz: midiToFreq(noteNameToMidi(diagnostics.accentNote)),
          offbeatHz: midiToFreq(noteNameToMidi(diagnostics.offbeatNote)),
        })
      : null;

  return {
    ...diagnostics,
    renderedSamples: pre.length,
    // "The mix", as heard: the output of the last link in the chain.
    mix,
    // The same mix before that link — the level VMU-020 is about.
    preLimiter: levelMetrics(pre),
    gainReduction: gainReductionMetrics(pre, post, { thresholdDbfs: -6, sampleRate }),
    pitchVerdict: expectedNotes ? comparePitchContent(mix.pitches, expectedNotes) : null,
    expectedNotes,
    onsets,
    clickPitches,
  };
}

/**
 * Waits for every Tone buffer to finish decoding, and reports which voice
 * each instrument's render will actually use. VMU-102 was the first note
 * playing the fallback synth; a measurement that does not say which voice it
 * heard cannot tell that defect from a bad sample.
 *
 * Bass has no sampler and no fallback distinction — `bassSynth` (AudioEngine.js)
 * is a single `Tone.MonoSynth`, always — but VMU-144's brief asks the voice be
 * reported "pour la basse aussi", so a reader comparing the three instruments'
 * loudness sees in one place that bass is a synth while piano/guitar can be
 * either a sampler or their own fallback synth.
 *
 * @param {Object} args
 * @returns {Promise<void>}
 */
async function loadSamplers({ Tone: T, engine, diagnostics }) {
  engine.initPianoSampler();
  engine.initGuitarSampler();
  await T.loaded();
  diagnostics.pianoVoice = engine.getPianoSynth().constructor.name;
  diagnostics.guitarVoice = engine.getGuitarSynth().constructor.name;
  diagnostics.bassVoice = engine.bassSynth.constructor.name;
}

/**
 * Classifies each detected onset as one of two known pitches, by finding the
 * strongest spectral peak in a short window right after the onset (skipping
 * the attack transient) and comparing it in cents to both candidates.
 *
 * VMU-163: the "metronome-phase-restart" scenario needs to say *which* click
 * carries the accent, not just where the clicks fall — `detectOnsets` alone
 * cannot tell an `ACCENT_NOTE` click from an `OFFBEAT_NOTE` one. The search
 * band is clamped to the two candidate pitches themselves (¬20 %), so a
 * harmonic of the lower note cannot be mistaken for the higher one.
 *
 * @param {Float32Array} samples the post-limiter mix (channel the click is heard in)
 * @param {number[]} onsetTimesSec from `detectOnsets`
 * @param {Object} options
 * @param {number} options.sampleRate
 * @param {number} options.accentHz
 * @param {number} options.offbeatHz
 * @param {number} [options.skipMs] time after the onset to start the analysis
 *   window, to skip the attack transient (envelope attack is 1 ms — VMU-056)
 * @param {number} [options.fftSize]
 * @returns {Array<{ timeSec: number, isAccent: boolean, freq: number }>}
 */
function classifyClickPitches(samples, onsetTimesSec, options) {
  const { sampleRate, accentHz, offbeatHz, skipMs = 4, fftSize = 1024 } = options;
  const skipSamples = Math.round((skipMs / 1000) * sampleRate);
  const loHz = Math.min(accentHz, offbeatHz) * 0.8;
  const hiHz = Math.max(accentHz, offbeatHz) * 1.2;

  return onsetTimesSec.map((t) => {
    const offset = Math.round(t * sampleRate) + skipSamples;
    const { magnitudes, binHz } = magnitudeSpectrum(samples, { sampleRate, fftSize, offset });
    const loBin = Math.max(1, Math.floor(loHz / binHz));
    const hiBin = Math.min(magnitudes.length - 2, Math.ceil(hiHz / binHz));

    let peakBin = loBin;
    let peakMag = -Infinity;
    for (let k = loBin; k <= hiBin; k++) {
      if (magnitudes[k] > peakMag) {
        peakMag = magnitudes[k];
        peakBin = k;
      }
    }
    const freq = refinePeakBin(magnitudes, peakBin) * binHz;
    const toAccentCents = Math.abs(1200 * Math.log2(freq / accentHz));
    const toOffbeatCents = Math.abs(1200 * Math.log2(freq / offbeatHz));

    return { timeSec: t, isAccent: toAccentCents < toOffbeatCents, freq };
  });
}

/**
 * The measurement scenarios. Each `body` schedules audio; the caller renders
 * and measures. Keeping them here rather than in the Node driver means they
 * are versioned next to the graph they exercise.
 */
export const SCENARIOS = {
  /**
   * Control, and the ticket's TDD step 1 against a real OfflineAudioContext
   * rather than a synthetic array: a bare 440 Hz oscillator, no AudioEngine.
   * If this does not come back as A4, the harness is broken and nothing it
   * says about the app means anything. It separates "harness broken" from
   * "application silent", which is the distinction the VMU-129 QA could not
   * make.
   */
  "sine-440": {
    durationSec: 1.0,
    pitchOffsetSec: 0.2,
    async body(ctx) {
      const { Tone: T, diagnostics } = ctx;
      const osc = new T.Oscillator({ frequency: 440, type: "sine", volume: -6 });
      // Straight to the raw destination: this scenario deliberately bypasses
      // the app's chain, so it stays valid even if that chain is silent.
      osc.connect(T.getContext().rawContext.destination);
      osc.start(0.05).stop(0.95);
      diagnostics.note = "bare oscillator, bypasses AudioEngine on purpose";
    },
  },

  /**
   * One note on one instrument, through the real router. Answers "is this path
   * silent" and "is the pitch the one asked for" — the two questions VMU-100
   * and VMU-080 turned out to be.
   */
  "single-note": {
    durationSec: 1.6,
    async body(ctx) {
      const { engine, params, diagnostics } = ctx;
      await loadSamplers(ctx);
      // VMU-144 phase B, bass control: applies a genre preset (Studio's own
      // trigger, AppDesktop.jsx:288 / useSequencer.js:310 — appMode==="studio"
      // gated in the app, but the harness has no "mode" to gate on, so this
      // param calls the same function directly) *before* playing, so the
      // scenario can prove Dictionary's bass level does not move afterward.
      if (params.applyGenrePreset) {
        engine.applyGenrePreset(params.applyGenrePreset);
        diagnostics.genrePresetApplied = params.applyGenrePreset;
      }
      const instrument = params.instrument ?? "piano";
      const note = params.note ?? "C4";
      diagnostics.requested = { instrument, notes: [note] };
      engine.playDictionaryNote(instrument, note, params.duration ?? 1.0, LEAD_IN_SEC);
    },
  },

  /**
   * VMU-144 phase B, item 3: the guitar fallback synth (`guitarFallback`,
   * no `volume` declared before this ticket) forced regardless of sampler
   * state — `loadSamplers` always awaits full decode, so `getGuitarSynth()`
   * never picks the fallback in this harness otherwise (the brief names this
   * gap explicitly: "si le harnais ne sait pas forcer le repli, ajoute-lui ce
   * moyen"). Triggers `engine.guitarFallback` directly, bypassing the
   * sampler-or-fallback router entirely — this measures the fallback voice
   * itself, not a code path a real session would take on its own.
   */
  "guitar-fallback-note": {
    durationSec: 1.6,
    async body(ctx) {
      const { engine, params, diagnostics } = ctx;
      const note = params.note ?? "C3";
      diagnostics.requested = { instrument: "guitar (forced fallback)", notes: [note] };
      diagnostics.guitarVoice = engine.guitarFallback.constructor.name;
      engine.guitarFallback.triggerAttackRelease(note, params.duration ?? 1.0, LEAD_IN_SEC);
    },
  },

  /**
   * A chord, to check that every note asked for is present and that none
   * arrives an octave out — the VMU-080 / VMU-103 / VMU-105 failure shape.
   */
  chord: {
    durationSec: 1.6,
    async body(ctx) {
      const { engine, params, diagnostics } = ctx;
      await loadSamplers(ctx);
      const instrument = params.instrument ?? "piano";
      const notes = params.notes ?? ["C4", "E4", "G4"];
      diagnostics.requested = { instrument, notes };
      engine.playDictionaryNote(instrument, notes, params.duration ?? 1.0, LEAD_IN_SEC);
    },
  },

  /**
   * A calibrated sine injected into the real chain at a known level, to
   * characterise what the last link actually does to a signal.
   *
   * This is the measurement VMU-020 and VMU-024 need and cannot get from
   * musical material, where level and content vary together: here the input
   * level is known exactly, so the difference between the two taps is a
   * property of the node and not of the music.
   */
  "output-link-probe": {
    durationSec: 1.2,
    pitchOffsetSec: 0.3,
    async body(ctx) {
      const { Tone: T, engine, params, diagnostics } = ctx;
      const levelDb = params.levelDb ?? -40;
      // Unity on the piano trim, so the only thing between the oscillator and
      // the pre tap is a volume node at 0 dB.
      engine.setInstrumentVolume("piano", 0);
      const osc = new T.Oscillator({ frequency: 220, type: "sine", volume: levelDb });
      osc.connect(engine.instrumentVols.piano);
      osc.start(0.1).stop(1.15);
      diagnostics.probeLevelDb = levelDb;
      diagnostics.note = `220 Hz sine at ${levelDb} dBFS into instrumentVols.piano`;
    },
  },

  /**
   * A path that is asked for nothing. The control that proves a silent result
   * is a real observation and not the harness failing to connect anything.
   */
  "silent-path": {
    durationSec: 0.5,
    async body(ctx) {
      const { diagnostics } = ctx;
      diagnostics.note = "nothing triggered; a non-silent result would mean the harness leaks signal";
    },
  },

  /**
   * The metronome alone, sequencer stopped (VMU-056): the exact case decision
   * 3 of the brief requires ("marche... seul, séquenceur à l'arrêt"). Proves
   * three things at once: it produces audible clicks through the real output
   * chain (so through the VMU-020 limiter, same as every other voice — decision
   * 2), it starts the transport itself since nothing else has, and it never
   * writes the tempo — this scenario sets `transport.bpm.value` once, exactly
   * as the BPM badge would, and metronome.js only ever reads it back.
   *
   * `startMetronome()` decides on its own whether to start the transport
   * (nothing here calls `transport.start()`), which is the standalone
   * behaviour under test, not a detail this scenario works around.
   */
  metronome: {
    durationSec: 2.3, // 0.2s lead-in convention unused here on purpose — see body()
    pitchOffsetSec: 0.05,
    async body(ctx) {
      const { Tone: T, params, diagnostics } = ctx;
      const bpm = params.bpm ?? 120;
      T.getTransport().bpm.value = bpm;

      const metronomeMod = await import("../metronome");
      metronomeMod.startMetronome();

      diagnostics.bpm = bpm;
      diagnostics.note =
        "metronome alone, sequencer not playing (VMU-056); transport started by the module itself, not by this scenario";
    },
  },

  /**
   * VMU-163: the metronome already running, then a Studio-style Play restart
   * (`Tone.Transport.stop(); start();`, exactly `useSequencer.js`'s
   * `togglePlayback`) a non-multiple-of-4 number of beats later. Proves
   * decision 1 of the brief — the accent is read from the transport's own
   * tick position at click time, not from a free-running counter that only
   * resets when the metronome itself (re)starts — by classifying which pitch
   * each click carries (`classifyClickPitches` above, wired through
   * `runScenario`'s `clickPitches`). Before the fix the module's own
   * `beatIndex` keeps counting through the restart, so the first click after
   * Play lands on the wrong beat of the bar.
   *
   * The restart is scheduled with an explicit `time` on `stop`/`start` rather
   * than called bare: this body runs entirely before `Tone.Offline` renders,
   * so there is no live "now" to press Play at — only a point on the offline
   * timeline to schedule the same two calls the real Play button makes.
   */
  "metronome-phase-restart": {
    durationSec: 5.6,
    async body(ctx) {
      const { Tone: T, params, diagnostics } = ctx;
      const bpm = params.bpm ?? 120;
      const transport = T.getTransport();
      transport.bpm.value = bpm;

      const metronomeMod = await import("../metronome");
      metronomeMod.startMetronome();
      diagnostics.accentNote = metronomeMod.ACCENT_NOTE;
      diagnostics.offbeatNote = metronomeMod.OFFBEAT_NOTE;

      const beatsBeforeRestart = params.beatsBeforeRestart ?? 2;
      const restartAtSec = (60 / bpm) * beatsBeforeRestart;
      transport.stop(restartAtSec);
      transport.start(restartAtSec);

      diagnostics.bpm = bpm;
      diagnostics.beatsBeforeRestart = beatsBeforeRestart;
      diagnostics.restartAtSec = restartAtSec;
      diagnostics.note =
        "metronome running, then a Play-style transport stop+start restart 2 beats in (not a multiple of 4) — VMU-163";
    },
  },

  /**
   * The Studio's default four-chord pop loop, driven through the real synths
   * and the real Transport.
   *
   * Every musical decision here is the application's own, and every voice is
   * the real one. Until T1 this scenario carried a hand-kept copy of the
   * dispatch inside `useSequencer`'s `repeat` callback, which lived in a React
   * effect and could not be called from outside the hook — so a change to the
   * dispatch would not have reached the measurement. T1 extracted it: both
   * the loop and this scenario now call `stepEvents` (dispatch.js) and play
   * its events with `playStepEvents` (playStep.js), so what is measured is
   * what the app plays by construction.
   *
   * T3: what they play is a timeline document. This scenario renders the one
   * the Studio builds on a cold start — `buildStudioTimeline`, the function
   * useStudioMode calls, for the style, theme A, no override.
   */
  "default-progression": {
    durationSec: 8.7,
    pitchOffsetSec: 0.3,
    async body(ctx) {
      const { Tone: T, engine, params, diagnostics } = ctx;
      await loadSamplers(ctx);

      const [{ BRICKS }, timeline, dispatch, playStep] = await Promise.all([
        import("../../core/bricks"),
        import("../../core/timeline"),
        import("../dispatch"),
        import("../playStep"),
      ]);

      const brickIndex = params.brickIndex ?? STUDIO_DEFAULTS.brickIndex;
      const brick = BRICKS[brickIndex];
      const bpm = params.bpm ?? brick.bpm ?? STUDIO_DEFAULTS.bpm;
      const octaveOffset = params.chordOctaveOffset ?? STUDIO_DEFAULTS.chordOctaveOffset;
      const progression = brick.nnsProgression;
      const doc = timeline.buildStudioTimeline({ brickIndex });

      const volumes = { ...STUDIO_DEFAULTS.instrumentVolumes, ...(params.instrumentVolumes ?? {}) };
      Object.entries(volumes).forEach(([name, db]) => engine.setInstrumentVolume(name, db));
      const masterVolumeDb = params.masterVolumeDb ?? STUDIO_DEFAULTS.masterVolumeDb;

      diagnostics.style = { index: brickIndex, name: brick.name?.en ?? brick.name, progression, bpm };
      diagnostics.mixerState = { instrumentVolumes: volumes, masterVolumeDb };
      diagnostics.masterVolumeNote =
        "master volume is reported, not applied: both taps sit before Tone.Destination";

      const transport = T.getTransport();
      transport.bpm.value = bpm;

      let stepCounter = 0;
      /** @type {number[]} */
      const scheduledPitches = [];

      /** @type {import("../dispatch").PlayOptions} */
      const playOptions = { octaveOffset, rootValue: brick.rootValue };

      // T1: this used to be a hand-kept copy of useSequencer's `repeat`
      // decisions. It now plays what dispatch.stepEvents says plays, through
      // playStep.playStepEvents — the same two functions the loop calls — on
      // the AudioEngine built on this offline context. Same calls, same
      // order, same arguments as before, so the seeded render is unchanged.
      const repeat = (time) => {
        const events = dispatch.stepEvents(doc, stepCounter, playOptions);
        scheduledPitches.push(...playStep.playStepEvents(engine, events, time));
        stepCounter = (stepCounter + 1) % timeline.loopSteps(doc);
      };

      const measures = params.measures ?? doc.lengthMeasures;
      transport.scheduleRepeat(repeat, "16n", 0, `${measures}m`);
      transport.start(LEAD_IN_SEC);

      diagnostics.measures = measures;
      // The loop runs during render(), after this callback has returned, so the
      // array is handed over by reference and counted by runScenario once the
      // render has finished.
      ctx.scheduledPitches = scheduledPitches;
    },
  },
};

/** Names of the available scenarios, for the driver's --help and validation. */
export const SCENARIO_NAMES = Object.keys(SCENARIOS);
