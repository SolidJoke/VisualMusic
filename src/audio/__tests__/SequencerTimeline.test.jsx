import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * T3 — the playback loop plays the timeline document it is given, over the
 * document's own length (src/core/timeline.js), instead of a fixed 64-step
 * loop over the style's one-measure patterns.
 *
 * Same harness as SequencerPitch.test.js and PlaybackGolden.test.jsx: Tone
 * and AudioEngine are recorders, the Transport callback is captured and
 * driven by hand, one call per 16th-note step.
 *
 * Predicted red (written and run before the loop read a document): the test
 * fails on `buildStudioTimeline`, declared by the interface and not yet
 * implemented; past that, the hook ignores `timeline`, finds no progression
 * in its pre-T3 props, and plays no chord at all.
 */

const loop = vi.hoisted(() => ({ repeat: null }));

vi.mock("tone", () => {
  // transportOwner.js (VMU-163-fix2) reads Tone.getTransport(), never the
  // deprecated Tone.Transport — same object either way.
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
import { BRICKS } from "../../core/bricks";

describe("useSequencer — plays the timeline document, over its length (T3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loop.repeat = null;
  });

  it("8 measures: plays the fifth chord at step 64, then loops back to step 0 after 128 steps", async () => {
    const { buildStudioTimeline } = await import("../../core/timeline");
    // I IV V I vi ii V I in C major: the fifth chord is A minor (A4 C5 E5).
    const eight = ["1", "4", "5", "1", "6-", "2-", "5", "1"];
    const timeline = buildStudioTimeline({ brickIndex: 0, overrides: { customProgression: eight }, lengthMeasures: 8 });

    // Created once, outside the render: the loop's effect depends on it, and
    // a new function on every render would restart the loop on every step.
    const setCurrentlyPlayingNotes = vi.fn();
    const { result } = renderHook(() =>
      useSequencer({
        appMode: "studio",
        activeBrick: BRICKS[0],
        timeline,
        currentRootValue: 0,
        setCurrentlyPlayingNotes,
        chordOctaveOffset: 0,
      }),
    );
    await act(async () => {
      await result.current.togglePlayback();
    });
    expect(loop.repeat).toBeTypeOf("function");

    /** Chord notes played on each step, driving `count` steps. */
    const drive = (count) => {
      const chords = [];
      for (let i = 0; i < count; i++) {
        AudioEngine.playDictionaryNote.mockClear();
        act(() => {
          loop.repeat(i * 0.125);
        });
        chords.push(AudioEngine.playDictionaryNote.mock.calls.map((call) => call[1]));
      }
      return chords;
    };

    const chords = drive(129);
    expect(chords[64]).toEqual([["A4", "C5", "E5"]]);
    expect(chords[80]).toEqual([["D4", "F4", "A4"]]);
    // Step 128 is step 0 again: the loop is the document's 128 steps long.
    expect(result.current.currentStep).toBe(0);
    expect(chords[128]).toEqual([["C4", "E4", "G4"]]);
  });
});
