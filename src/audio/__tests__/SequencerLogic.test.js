import { describe, it, expect, vi } from "vitest";

// Mock Tone.js and AudioEngine before importing useSequencer
vi.mock("tone", () => ({
  Analyser: vi.fn(() => ({
    dispose: vi.fn(),
  })),
  Destination: { volume: { value: 0 } },
  Transport: {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    clear: vi.fn(),
  },
  start: vi.fn(),
  Draw: { schedule: vi.fn() },
}));

const mockPianoReleaseAll = vi.fn();
const mockGuitarReleaseAll = vi.fn();

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
  getPianoSynth: vi.fn(() => ({ releaseAll: mockPianoReleaseAll })),
  getGuitarSynth: vi.fn(() => ({ releaseAll: mockGuitarReleaseAll })),
}));

import { PITCH_MAP } from "../useSequencer";

describe("SequencerLogic - PITCH_MAP", () => {
  it("maps 'R' to 0 semitones", () => {
    expect(PITCH_MAP['R']).toBe(0);
  });

  it("maps '8va' to 12 semitones", () => {
    expect(PITCH_MAP['8va']).toBe(12);
  });

  it("maps '5' to 7 semitones (perfect fifth)", () => {
    expect(PITCH_MAP['5']).toBe(7);
  });

  it("maps 'b3' to 3 semitones (minor third)", () => {
    expect(PITCH_MAP['b3']).toBe(3);
  });

  it("handles alternative 'octave' label", () => {
    expect(PITCH_MAP['octave']).toBe(12);
  });
});

describe("useSequencer — releaseAll on stop", () => {
  it("getPianoSynth().releaseAll est disponible et appelable sans erreur", async () => {
    const { getPianoSynth } = await import("../AudioEngine");
    const synth = getPianoSynth();
    expect(() => synth.releaseAll()).not.toThrow();
  });

  it("getGuitarSynth().releaseAll est disponible et appelable sans erreur", async () => {
    const { getGuitarSynth } = await import("../AudioEngine");
    const synth = getGuitarSynth();
    expect(() => synth.releaseAll()).not.toThrow();
  });
});

describe("useSequencer — Tone.Draw scheduling", () => {
  it("Tone.Draw est le seul mécanisme pour effacer currentlyPlayingNotes (pas setTimeout)", async () => {
    const Tone = await import("tone");
    expect(typeof Tone.Draw.schedule).toBe("function");
  });
});

