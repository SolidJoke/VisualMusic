import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// VMU-209 — the loop's chord voice follows the chosen instrument. Guitar: the
// chord plays the grip the guitar neck draws for the chord covering the step
// (read from the step's chord, so a chord change on measure 2's first hit plays
// measure 2's grip, not the previous measure's). Bass: the chord stays on the
// piano, and the bass line still plays on the bass synth.

const loop = vi.hoisted(() => ({ repeat: null }));

vi.mock("tone", () => {
  const transport = {
    bpm: { value: 120 },
    state: "stopped",
    ticks: 0,
    scheduleRepeat: vi.fn((cb) => {
      loop.repeat = cb;
      return 1;
    }),
    clear: vi.fn(),
    start: vi.fn(function () {
      this.state = "started";
    }),
    stop: vi.fn(function () {
      this.state = "stopped";
      this.ticks = 0;
    }),
  };
  return {
    start: vi.fn(() => Promise.resolve()),
    now: vi.fn(() => 0),
    context: { lookAhead: 0.1 },
    Transport: transport,
    getTransport: () => transport,
    Draw: { schedule: (fn) => fn() },
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
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
  getPianoSynth: vi.fn(() => ({ releaseAll: vi.fn() })),
  getGuitarSynth: vi.fn(() => ({ releaseAll: vi.fn() })),
}));

import * as AudioEngine from "../AudioEngine";
import { useSequencer } from "../useSequencer";
import { guitarGripCells } from "../../core/guitarGrip";
import { midiToNoteName } from "../../core/theory";

const names = (cells) => cells.map((cell) => midiToNoteName(cell.absoluteValue));

async function startLoop(overrides) {
  const setCurrentlyPlayingNotes = vi.fn();
  const { result } = renderHook(() =>
    useSequencer({
      appMode: "studio",
      activeBrick: { rootValue: 0, scaleKey: "scale_major", _group: "pop" },
      activeDrums: [],
      activeMelody: [{ name: "Bass", activeSteps: [0] }],
      activeProgression: ["1", "5"],
      activeRhythm: [0],
      currentRootValue: 0,
      setCurrentlyPlayingNotes,
      chordOctaveOffset: 0,
      ...overrides,
    }),
  );
  await act(async () => {
    await result.current.togglePlayback();
  });
  expect(loop.repeat).toBeTypeOf("function");
  return { setCurrentlyPlayingNotes };
}

describe("séquenceur Studio — la voix d'accord suit l'instrument (VMU-209)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loop.repeat = null;
  });

  it("guitar: plays the grip of the chord covering each step, across a chord change", async () => {
    const { setCurrentlyPlayingNotes } = await startLoop({
      playbackInstrument: "guitar",
      selectedRootStringGuitar: null,
    });

    act(() => {
      loop.repeat(0);
    });
    const cMajor = guitarGripCells({ rootPc: 0, chordType: "chord_major" });
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith("guitar", names(cMajor), "4n", 0);

    // Advance to the first step of measure 2 (step 16): the chord changed to V
    // (G), and the grip follows the step's own chord, not the one the loop just
    // left. Steps 1..15 carry no chord hit (the rhythm is [0]).
    for (let step = 1; step < 16; step++) {
      act(() => {
        loop.repeat(step * 0.125);
      });
    }
    act(() => {
      loop.repeat(16 * 0.125);
    });
    const gMajor = guitarGripCells({ rootPc: 7, chordType: "chord_major" });
    expect(AudioEngine.playDictionaryNote).toHaveBeenLastCalledWith("guitar", names(gMajor), "4n", 2.0);

    // The chord notes published are the grip's cells, tagged guitar + nearShape.
    const published = setCurrentlyPlayingNotes.mock.calls
      .map((c) => c[0])
      .filter((a) => Array.isArray(a) && a.length > 0)
      .at(-1);
    expect(published.filter((n) => n.instrument === "guitar")).toEqual(
      gMajor.map((cell) => ({ absoluteValue: cell.absoluteValue, instrument: "guitar", nearShape: true })),
    );
  });

  it("bass: the chord stays on the piano and the bass line still plays", async () => {
    const { setCurrentlyPlayingNotes } = await startLoop({ playbackInstrument: "bass" });

    act(() => {
      loop.repeat(0);
    });
    expect(AudioEngine.playDictionaryNote).toHaveBeenCalledWith("piano", ["C4", "E4", "G4"], "4n", 0);
    expect(AudioEngine.bassSynth.triggerAttackRelease).toHaveBeenCalled();
    const published = setCurrentlyPlayingNotes.mock.calls
      .map((c) => c[0])
      .find((a) => Array.isArray(a) && a.length > 0);
    expect(published.some((n) => n.instrument === "piano")).toBe(true);
    expect(published.some((n) => n.instrument === "bass")).toBe(true);
  });
});
