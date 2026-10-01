import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

/**
 * TransportStateAgreement.test.jsx — T2 / VMU-025, decision 4: the transport
 * owner and React cannot disagree about whether the music plays, whether the
 * metronome is on, or what the tempo is.
 *
 * Before T2 the same three facts lived twice: `transportOwner.js` kept
 * `musicPlaying` / `metronomeOn` for its own start/stop decisions, while
 * React kept `isPlaying` (useSequencer), `metronomeOn` (useMetronome) and
 * `currentBpm` (useSequencer), each updated by a separate call after the
 * other. This file drives the real hooks, the real metronome.js and the real
 * transportOwner.js on a simulated Tone transport, and checks — after every
 * step — that what the hooks report is what the owner reports and, for the
 * tempo, what the transport itself is set to.
 *
 * Red at `4bf938f`: the owner exposes no state at all (`getTransportState`
 * does not exist), so the agreement cannot even be read; and the race case
 * below leaves a second step repeat registered, because both clicks read the
 * same stale `isPlaying === false` from their closure.
 */

let transport;

function makeTransport() {
  const t = {
    bpm: { value: 120 },
    PPQ: 192,
    timeSignature: 4,
    state: "stopped",
    ticks: 0,
    live: new Set(),
    nextId: 1,
    scheduleRepeat: vi.fn(() => {
      const id = t.nextId++;
      t.live.add(id);
      return id;
    }),
    clear: vi.fn((id) => {
      t.live.delete(id);
    }),
    cancel: vi.fn(),
    getTicksAtTime: vi.fn(() => 0),
    stop: vi.fn(() => {
      t.state = "stopped";
      t.ticks = 0;
    }),
    start: vi.fn(() => {
      t.state = "started";
    }),
  };
  return t;
}

/** Resolved by the test, to hold the first Play inside its `await Tone.start()`. */
let releaseToneStart = null;

vi.mock("tone", () => {
  class Synth {
    connect() {
      return this;
    }
    triggerAttackRelease() {}
  }
  return {
    context: { lookAhead: 0 },
    get Transport() {
      return transport;
    },
    getTransport: () => transport,
    Draw: { schedule: vi.fn((cb) => cb()) },
    start: vi.fn(
      () =>
        new Promise((resolve) => {
          if (releaseToneStart === "hold") {
            releaseToneStart = resolve;
          } else {
            resolve();
          }
        }),
    ),
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
    Synth,
  };
});

vi.mock("../AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  snareSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
  bassSynth: { triggerAttackRelease: vi.fn(), triggerRelease: vi.fn() },
  initPianoSampler: vi.fn(),
  initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(),
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
  getPianoSynth: vi.fn(() => null),
  getGuitarSynth: vi.fn(() => null),
  masterAnalyser: {},
}));

import { useSequencer } from "../useSequencer";
import { useMetronome } from "../../hooks/useMetronome";
import * as owner from "../transportOwner";

const BRICK = { rootValue: 0, scaleKey: "scale_major", _group: "pop", bpm: 120 };
const ensureAudioReady = () => Promise.resolve();

function useStudioTransport() {
  const seq = useSequencer({
    appMode: "studio",
    activeBrick: BRICK,
    activeDrums: [{ name: "kick", activeSteps: [0, 4, 8, 12] }],
    activeMelody: [],
    activeProgression: ["I", "IV", "V", "I"],
    activeRhythm: [0, 4, 8, 12],
    currentRootValue: 0,
    setCurrentlyPlayingNotes: vi.fn(),
    chordOctaveOffset: 0,
  });
  const met = useMetronome({ ensureAudioReady });
  return { seq, met };
}

/** The owner's own view; throws a readable error where the API is missing. */
function ownerState() {
  expect(typeof owner.getTransportState, "transportOwner.getTransportState() must exist").toBe("function");
  return owner.getTransportState();
}

function expectAgreement(result, label) {
  const s = ownerState();
  expect(result.current.seq.isPlaying, `${label}: isPlaying`).toBe(s.musicPlaying);
  expect(result.current.met.metronomeOn, `${label}: metronomeOn`).toBe(s.metronomeOn);
  expect(result.current.seq.currentBpm, `${label}: displayed tempo vs owner`).toBe(s.bpm);
  expect(transport.bpm.value, `${label}: transport tempo vs owner`).toBe(s.bpm);
}

describe("transport state: owner and React agree (T2 / VMU-025, decision 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport = makeTransport();
    releaseToneStart = null;
  });

  it("agree through Play, metronome on, Stop, metronome off, tempo change and unmount", async () => {
    const { result, unmount } = renderHook(() => useStudioTransport());
    expectAgreement(result, "at mount");

    await act(async () => {
      await result.current.seq.togglePlayback(); // Play
    });
    expect(result.current.seq.isPlaying).toBe(true);
    expectAgreement(result, "after Play");

    await act(async () => {
      await result.current.met.toggleMetronome(); // metronome on
    });
    expect(result.current.met.metronomeOn).toBe(true);
    expectAgreement(result, "after metronome on");

    await act(async () => {
      await result.current.seq.togglePlayback(); // Stop
    });
    expect(result.current.seq.isPlaying).toBe(false);
    expect(transport.state, "metronome keeps the transport alive").toBe("started");
    expectAgreement(result, "after Stop");

    await act(async () => {
      result.current.seq.handleBpmChange(90);
    });
    expect(result.current.seq.currentBpm).toBe(90);
    expectAgreement(result, "after a tempo change");

    await act(async () => {
      await result.current.met.toggleMetronome(); // metronome off
    });
    expect(transport.state).toBe("stopped");
    expectAgreement(result, "after metronome off");

    await act(async () => {
      await result.current.seq.togglePlayback(); // Play again
      await result.current.met.toggleMetronome(); // metronome on again
    });
    expectAgreement(result, "playing with the metronome");

    unmount();
    const s = ownerState();
    expect(s.musicPlaying, "unmount: music reported stopped").toBe(false);
    expect(s.metronomeOn, "unmount: metronome reported off").toBe(false);
    expect(transport.state, "unmount: transport stopped").toBe("stopped");
    expect(transport.live.size, "unmount: nothing left scheduled").toBe(0);
  });

  it("two Play clicks before the audio unlock resolves leave one coherent state and no orphan repeat", async () => {
    const { result } = renderHook(() => useStudioTransport());
    releaseToneStart = "hold";

    let first;
    let second;
    await act(async () => {
      first = result.current.seq.togglePlayback();
      second = result.current.seq.togglePlayback();
    });
    await act(async () => {
      releaseToneStart();
      await first;
      await second;
    });

    // However the two clicks resolve (Play then Stop, or one Play), the
    // registered step repeats must be exactly the ones the state implies.
    // Checked first: it needs no owner API, so it is red on its own merits.
    expect(transport.live.size, "step repeats still registered").toBe(result.current.seq.isPlaying ? 1 : 0);
    expectAgreement(result, "after the double click");
  });
});
