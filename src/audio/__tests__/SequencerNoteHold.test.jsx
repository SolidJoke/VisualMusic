import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// The repeat callback useSequencer registers on the Transport, and the Draw
// callbacks it schedules (with their times), captured so steps can be driven
// by hand and the scheduled clears can be run in time order.
const loop = vi.hoisted(() => ({ repeat: null, scheduled: [] }));

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
    // Deferred Draw: collect (fn, time) now, run them later in time order —
    // the real Draw loop the fix must respect (a clear scheduled at +150 ms
    // fires after a note scheduled at +125 ms, not before it).
    Draw: { schedule: (fn, time) => loop.scheduled.push({ fn, time }) },
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

import { useSequencer } from "../useSequencer";

/**
 * VMU-207 — the Studio loop must not blank a note that has just replaced
 * another. The loop publishes a step's notes on screen and clears them 150 ms
 * later. At 120 BPM a 16th lasts 125 ms, so when the next step has notes, the
 * previous step's unconditional clear used to erase them 25 ms after they lit.
 *
 * The fix turns the clear into a conditional updater: it only clears while the
 * notes shown are still *this step's* array, so it can never erase a later
 * step's notes. This test drives the real loop with a deferred, time-ordered
 * fake Tone.Draw and a setter that applies functional updates the way React's
 * useState setter does.
 */

/** Runs every scheduled Draw callback with `time <= now`, in time order. */
function drainDraw(now) {
  const due = loop.scheduled
    .filter((e) => e.time <= now)
    .sort((a, b) => a.time - b.time); // stable: equal times keep schedule order
  loop.scheduled = loop.scheduled.filter((e) => e.time > now);
  due.forEach((e) => e.fn());
}

/**
 * A setter like React's useState setter: a non-function value replaces the
 * state (and is recorded); a function receives the current state and its
 * result becomes the state.
 */
function makeSetter() {
  const state = { shown: [], published: [] };
  const set = (updater) => {
    state.shown = typeof updater === "function" ? updater(state.shown) : updater;
    // Record only a step's published notes (a non-empty array) — not a clear
    // ([] today, a functional update after the fix).
    if (typeof updater !== "function" && Array.isArray(updater) && updater.length > 0) {
      state.published.push(updater);
    }
  };
  return { state, set };
}

const BRICK = { rootValue: 0, scaleKey: "scale_major", _group: "pop" };

/** Starts the loop with a bass track (the pre-T3 selection shape). */
async function startWithBass(activeSteps) {
  const { state, set } = makeSetter();
  const { result } = renderHook(() =>
    useSequencer({
      appMode: "studio",
      activeBrick: BRICK,
      activeDrums: [],
      activeMelody: [{ name: "Bass", activeSteps }],
      activeProgression: ["1"],
      activeRhythm: [0],
      currentRootValue: 0,
      setCurrentlyPlayingNotes: set,
      chordOctaveOffset: 0,
    }),
  );
  await act(async () => {
    await result.current.togglePlayback();
  });
  return { state, result };
}

describe("useSequencer — a step's notes stay lit until replaced or 150 ms (VMU-207)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loop.repeat = null;
    loop.scheduled = [];
  });

  it("keeps the second of two consecutive steps lit past the first step's clear (120 BPM)", async () => {
    const { state } = await startWithBass([0, 1]);

    act(() => {
      loop.repeat(0); // step 0 — a 16th at 120 BPM is 0.125 s
    });
    act(() => {
      loop.repeat(0.125); // step 1, with notes, 25 ms before the clear
    });
    act(() => {
      drainDraw(0.15); // the first step's clear fires here
    });

    expect(state.published.length).toBeGreaterThanOrEqual(2);
    const second = state.published[1];
    expect(second.length).toBeGreaterThan(0);
    // The first step's clear must not erase the second step's notes: the notes
    // shown are still the second step's own array (identity, not just equal).
    expect(state.shown).toBe(second);
  });

  it("clears a step with no follower at +150 ms", async () => {
    const { state } = await startWithBass([0]);

    act(() => {
      loop.repeat(0); // step 0 — notes
    });
    act(() => {
      loop.repeat(0.125); // step 1 — no notes, nothing scheduled
    });
    act(() => {
      drainDraw(0.15);
    });

    expect(state.published.length).toBe(1);
    expect(state.shown).toEqual([]);
  });

  it("clears at +150 ms at 60 BPM (step 250 ms), unchanged", async () => {
    const { state } = await startWithBass([0, 1]);

    act(() => {
      loop.repeat(0); // step 0 — a 16th at 60 BPM is 0.25 s
    });
    act(() => {
      loop.repeat(0.25); // step 1 — after the clear, so it cannot hold it
    });
    act(() => {
      drainDraw(0.15); // the clear fires before the next step's notes
    });

    expect(state.shown).toEqual([]);
  });
});
