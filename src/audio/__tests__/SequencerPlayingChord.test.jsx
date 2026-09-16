import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// The repeat callback useSequencer registers on the Transport, captured so
// individual 16th-note steps can be driven by hand — same harness as
// SequencerPitch.test.js.
const loop = vi.hoisted(() => ({ repeat: null }));

vi.mock("tone", () => ({
  start: vi.fn(() => Promise.resolve()),
  now: vi.fn(() => 0),
  context: { lookAhead: 0.1 },
  Transport: {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn((cb) => {
      loop.repeat = cb;
      return 1;
    }),
    clear: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
  Draw: { schedule: (fn) => fn() },
  Destination: { volume: { value: 0, rampTo: vi.fn() } },
}));

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

import { useSequencer } from "../useSequencer";

/**
 * VMU-129 — useSequencer must publish (via currentPlayingChord) the chord
 * it is actually playing, once per measure, so the instruments can follow
 * the loop instead of the last clicked chord. Pitches derived from the
 * domain: "Pop Moderne (4 Accords)" progression I-V-vi-IV in C major —
 * do majeur (60 64 67) then sol majeur (67 71 74). This test drives the
 * real Transport loop (mocked Tone), unlike SequencerMeasureChord.test.js
 * which tests the pure chord-selection function in isolation.
 */
describe("useSequencer — publishes the chord it plays, once per measure (VMU-129)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loop.repeat = null;
  });

  it("publishes measure 1's chord at step 0 and republishes only at the step-16 measure boundary", async () => {
    const setCurrentlyPlayingNotes = vi.fn();
    const { result } = renderHook(() =>
      useSequencer({
        appMode: "studio",
        activeBrick: { rootValue: 0, scaleKey: "scale_major", _group: "pop" },
        activeDrums: [],
        activeMelody: [],
        activeProgression: ["1", "5", "6-", "4"],
        activeRhythm: [0],
        currentRootValue: 0,
        setCurrentlyPlayingNotes,
        chordOctaveOffset: 0,
      })
    );

    await act(async () => {
      await result.current.togglePlayback();
    });
    expect(loop.repeat).toBeTypeOf("function");

    act(() => {
      loop.repeat(0);
    }); // step 0 — measure 1
    expect(result.current.currentPlayingChord?.nns).toBe("1");
    expect(result.current.currentPlayingChord?.absolutePitches).toEqual([60, 64, 67]);

    // Steps 1..15 stay in measure 1 — no republish (same object reference,
    // proving the dedup: setCurrentPlayingChord isn't called every step).
    const measure1Ref = result.current.currentPlayingChord;
    for (let i = 1; i < 16; i++) {
      act(() => {
        loop.repeat(0);
      });
    }
    expect(result.current.currentPlayingChord).toBe(measure1Ref);

    // Step 16 — measure 2: republishes with the next chord of the progression.
    act(() => {
      loop.repeat(0);
    });
    expect(result.current.currentPlayingChord?.nns).toBe("5");
    expect(result.current.currentPlayingChord?.absolutePitches).toEqual([67, 71, 74]);
  });

  it("resets to null when playback stops, so instruments fall back to the clicked chord", async () => {
    const setCurrentlyPlayingNotes = vi.fn();
    const { result } = renderHook(() =>
      useSequencer({
        appMode: "studio",
        activeBrick: { rootValue: 0, scaleKey: "scale_major", _group: "pop" },
        activeDrums: [],
        activeMelody: [],
        activeProgression: ["1"],
        activeRhythm: [0],
        currentRootValue: 0,
        setCurrentlyPlayingNotes,
        chordOctaveOffset: 0,
      })
    );

    await act(async () => {
      await result.current.togglePlayback();
    });
    act(() => {
      loop.repeat(0);
    });
    expect(result.current.currentPlayingChord).not.toBeNull();

    await act(async () => {
      await result.current.togglePlayback();
    }); // stop
    expect(result.current.currentPlayingChord).toBeNull();
  });
});
