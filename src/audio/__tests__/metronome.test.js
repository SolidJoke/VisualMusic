import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * metronome.test.js — TDD reds predicted in the VMU-056 brief:
 *
 *   1. starting schedules a repeating event at "4n"; stopping clears it;
 *      starting twice schedules only once; stopping while the sequencer
 *      plays never stops the transport.
 *   2. the accent (beat 1 of 4) differs from the other three beats.
 *   4. changing the BPM while the metronome runs is not something this
 *      module can do — no code path here writes `transport.bpm`.
 *
 * The module did not exist before this ticket, so every one of these was
 * red by construction (module not found) before the file below existed.
 *
 * Tone is mocked wholesale, same strategy as src/__tests__/BpmControls.test.jsx:
 * jsdom has no Web Audio (confirmed by AudioEngine.test.js — a real Tone.Synth
 * cannot be constructed here), so the transport and the synth are both fakes
 * whose *calls* are what gets asserted, not any audio they would produce.
 */

/** @type {{value: number} & {}} tracks every write to transport.bpm.value */
let bpmWrites;
let transportState;
let scheduledCallback;
let mockTransport;
let synthInstances;

function makeMockTransport() {
  bpmWrites = [];
  transportState = "stopped";
  scheduledCallback = null;

  const bpmObj = {};
  Object.defineProperty(bpmObj, "value", {
    get: () => 120,
    set: (v) => {
      bpmWrites.push(v);
    },
  });

  return {
    bpm: bpmObj,
    get state() {
      return transportState;
    },
    scheduleRepeat: vi.fn((fn) => {
      scheduledCallback = fn;
      return "metronome-repeat-id";
    }),
    clear: vi.fn(),
    start: vi.fn(() => {
      transportState = "started";
    }),
    stop: vi.fn(() => {
      transportState = "stopped";
    }),
  };
}

vi.mock("tone", () => {
  return {
    getTransport: vi.fn(() => mockTransport),
    Synth: vi.fn().mockImplementation(function (opts) {
      const instance = {
        opts,
        connect: vi.fn(() => instance),
        triggerAttackRelease: vi.fn(),
      };
      synthInstances.push(instance);
      return instance;
    }),
  };
});

vi.mock("../AudioEngine", () => ({
  masterAnalyser: { connect: vi.fn() },
}));

describe("metronome (VMU-056)", () => {
  beforeEach(async () => {
    vi.resetModules();
    synthInstances = [];
    mockTransport = makeMockTransport();
  });

  it("starting schedules a repeating event at a quarter note (4n)", async () => {
    const { startMetronome } = await import("../metronome");
    startMetronome();

    expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(1);
    expect(mockTransport.scheduleRepeat.mock.calls[0][1]).toBe("4n");
  });

  it("stopping clears the scheduled event", async () => {
    const { startMetronome, stopMetronome } = await import("../metronome");
    startMetronome();
    stopMetronome();

    expect(mockTransport.clear).toHaveBeenCalledWith("metronome-repeat-id");
  });

  it("starting twice only schedules once (StrictMode double-invoke guard)", async () => {
    const { startMetronome } = await import("../metronome");
    startMetronome();
    startMetronome();

    expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(1);
  });

  it("standalone (sequencer stopped): starting starts the transport itself", async () => {
    const { startMetronome } = await import("../metronome");
    expect(mockTransport.state).toBe("stopped");

    startMetronome();

    expect(mockTransport.start).toHaveBeenCalledTimes(1);
    expect(mockTransport.state).toBe("started");
  });

  it("standalone: stopping while the sequencer is not playing stops the transport it started", async () => {
    const { startMetronome, stopMetronome } = await import("../metronome");
    startMetronome();

    stopMetronome({ isSequencerPlaying: false });

    expect(mockTransport.stop).toHaveBeenCalledTimes(1);
  });

  it("stopping while the sequencer plays never stops the transport", async () => {
    const { startMetronome, stopMetronome } = await import("../metronome");
    startMetronome(); // transport was stopped, so the module started it itself

    stopMetronome({ isSequencerPlaying: true });

    expect(mockTransport.stop).not.toHaveBeenCalled();
    // The click itself is still torn down even though the transport is left running.
    expect(mockTransport.clear).toHaveBeenCalledWith("metronome-repeat-id");
  });

  it("does not start the transport again if it is already running (sequencer already playing)", async () => {
    mockTransport = makeMockTransport();
    mockTransport.start(); // simulate the sequencer already having started it
    mockTransport.start.mockClear();

    const { startMetronome, stopMetronome } = await import("../metronome");
    startMetronome();
    expect(mockTransport.start).not.toHaveBeenCalled();

    // And since this module never started it, turning the metronome back off
    // must not stop it — even if the caller (wrongly) reports isSequencerPlaying: false.
    stopMetronome({ isSequencerPlaying: false });
    expect(mockTransport.stop).not.toHaveBeenCalled();
  });

  it("accents beat 1 of 4 with a different pitch than the other three beats", async () => {
    const { startMetronome } = await import("../metronome");
    startMetronome();

    const synth = synthInstances[0];
    expect(scheduledCallback).toBeTypeOf("function");

    const notesPlayed = [];
    for (let i = 0; i < 8; i++) {
      scheduledCallback(i * 0.5);
    }
    synth.triggerAttackRelease.mock.calls.forEach((call) => notesPlayed.push(call[0]));

    // 8 ticks = two bars of 4: beats 0 and 4 are the accent.
    expect(notesPlayed[0]).toBe(notesPlayed[4]); // both accents, same note
    expect(notesPlayed[1]).toBe(notesPlayed[2]);
    expect(notesPlayed[2]).toBe(notesPlayed[3]); // the three off-beats agree
    expect(notesPlayed[0]).not.toBe(notesPlayed[1]); // accent differs from off-beat
  });

  it("never writes the transport tempo — starting, ticking and stopping touch transport.bpm zero times", async () => {
    const { startMetronome, stopMetronome } = await import("../metronome");
    startMetronome();
    // Simulate several ticks.
    for (let i = 0; i < 4; i++) scheduledCallback(i * 0.5);
    stopMetronome({ isSequencerPlaying: true });

    expect(bpmWrites).toEqual([]);
  });

  it("a bpm change made elsewhere is picked up without a new tempo writer: scheduling uses musical time, not fixed seconds", async () => {
    // "4n" is what makes the click period tempo-relative: Tone.Transport
    // recomputes the interval's real-time duration from the CURRENT bpm on
    // every tick. A fixed-seconds interval would not follow a bpm change at
    // all, which is the failure this asserts against.
    const { startMetronome } = await import("../metronome");
    startMetronome();

    const [, interval] = mockTransport.scheduleRepeat.mock.calls[0];
    expect(interval).toBe("4n");
    expect(typeof interval).toBe("string"); // not a number of seconds
  });
});
