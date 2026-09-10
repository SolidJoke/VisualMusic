import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// The repeat callback useSequencer registers on the Transport, captured so a
// single step can be run by hand.
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

import * as AudioEngine from "../AudioEngine";
import { useSequencer } from "../useSequencer";
import { getAbsoluteNoteValue } from "../../core/theory";

/**
 * The Studio loop, one step at a time: the chord and bass note it plays must be
 * the ones it highlights, and must stay audible in European notation.
 *
 * Before: chord pitches were built as `root + interval + 4 * 12` — the pre-MIDI
 * convention, so C4 was 48 — highlighted as C3 and named "C4". And both chord
 * and bass names were spelled in the UI notation, so in EU the synth received
 * "Do4" and "Do2", which Tone reads as NaN.
 */
describe("séquenceur Studio — hauteur jouée et hauteur affichée", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loop.repeat = null;
  });

  it("joue et affiche le même accord et la même basse, en notation européenne comprise", async () => {
    const setCurrentlyPlayingNotes = vi.fn();
    const { result } = renderHook(() =>
      useSequencer({
        appMode: "studio",
        activeBrick: { rootValue: 0, scaleKey: "scale_major", _group: "pop" },
        activeDrums: [],
        activeMelody: [{ name: "Bass", activeSteps: [0] }],
        activeProgression: ["1"],
        activeRhythm: [0],
        currentRootValue: 0,
        setCurrentlyPlayingNotes,
        chordOctaveOffset: 0,
        notation: "eu",
      })
    );

    await act(async () => {
      await result.current.togglePlayback();
    });
    expect(loop.repeat).toBeTypeOf("function");

    act(() => {
      loop.repeat(0);
    });

    const chordCall = AudioEngine.playDictionaryNote.mock.calls[0];
    expect(chordCall[0]).toBe("piano");
    expect(chordCall[1]).toEqual(["C4", "E4", "G4"]);

    const bassName = AudioEngine.bassSynth.triggerAttackRelease.mock.calls[0][0];
    expect(bassName).toBe("C2");

    const shown = setCurrentlyPlayingNotes.mock.calls
      .map((c) => c[0])
      .find((a) => Array.isArray(a) && a.length > 0);
    expect(shown).toEqual([...chordCall[1], bassName].map((n) => getAbsoluteNoteValue(n)));
  });
});
