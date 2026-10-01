import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

/**
 * MixerApplied.test.jsx — T2 / VMU-153, decision 3: what the mixer shows is
 * what the mixer nodes play at.
 *
 * Before T2, `useSequencer` displayed kick -3, snare -5, hat -8, bass -6,
 * piano 0, guitar 0, but `AudioEngine.instrumentVols` were built at 0 dB and
 * only received a level when a slider moved — so the app played every
 * instrument at 0 dB while the screen (and the offline harness, which applies
 * these levels itself) said otherwise.
 *
 * Tone is not involved: the mixer nodes are simulated by a mocked
 * `setInstrumentVolume` that records the last level each node was given,
 * starting from the 0 dB every `Tone.Volume(0)` in AudioEngine.js starts at.
 * What is asserted is the level each node holds, not how many calls it took.
 *
 * Red at `4bf938f`: after the first Play every node still reads 0.
 */

/** dB currently held by each simulated mixer node. */
let nodes;

vi.mock("tone", () => {
  const transport = {
    bpm: { value: 120 },
    state: "stopped",
    ticks: 0,
    scheduleRepeat: vi.fn(() => 7),
    clear: vi.fn(),
    cancel: vi.fn(),
    stop: vi.fn(function () {
      this.state = "stopped";
      this.ticks = 0;
    }),
    start: vi.fn(function () {
      this.state = "started";
    }),
  };
  return {
    context: { lookAhead: 0 },
    Transport: transport,
    getTransport: () => transport,
    Draw: { schedule: vi.fn((cb) => cb()) },
    start: vi.fn().mockResolvedValue(),
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
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
  setInstrumentVolume: vi.fn((instrument, db) => {
    if (instrument in nodes) nodes[instrument] = db;
  }),
  playDictionaryNote: vi.fn(),
  getPianoSynth: vi.fn(() => null),
  getGuitarSynth: vi.fn(() => null),
}));

import { useSequencer } from "../useSequencer";

const BRICK = { rootValue: 0, scaleKey: "scale_major", _group: "pop", bpm: 120 };

function renderSequencer() {
  return renderHook(() =>
    useSequencer({
      appMode: "studio",
      activeBrick: BRICK,
      activeDrums: [{ name: "kick", activeSteps: [0, 4, 8, 12] }],
      activeMelody: [],
      activeProgression: ["I", "IV", "V", "I"],
      activeRhythm: [0, 4, 8, 12],
      currentRootValue: 0,
      setCurrentlyPlayingNotes: vi.fn(),
      chordOctaveOffset: 0,
    }),
  );
}

describe("mixer: displayed levels are applied levels (T2 / VMU-153)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nodes = { kick: 0, snare: 0, hat: 0, bass: 0, piano: 0, guitar: 0 };
  });

  it("at the first Play, every mixer node holds the level the mixer displays", async () => {
    const { result } = renderSequencer();

    await act(async () => {
      await result.current.togglePlayback();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(nodes).toEqual(result.current.instrumentVolumes);
    // And the displayed levels are the documented defaults, not 0 dB — the
    // assertion above would be vacuous if both sides were all zeros.
    expect(result.current.instrumentVolumes).toEqual({ kick: -3, snare: -5, hat: -8, bass: -6, piano: 0, guitar: 0 });
  });

  it("a slider move reaches its node, and the others keep the displayed level", async () => {
    const { result } = renderSequencer();

    await act(async () => {
      result.current.handleInstrumentVolumeChange("bass", "-12");
    });

    expect(result.current.instrumentVolumes.bass).toBe(-12);
    expect(nodes).toEqual(result.current.instrumentVolumes);
  });
});
