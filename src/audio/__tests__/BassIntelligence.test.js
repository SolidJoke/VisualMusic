import { describe, it, expect, vi } from "vitest";

// Mocking dependencies of useSequencer to avoid side effects
vi.mock("tone", () => ({
  Analyser: vi.fn(() => ({ dispose: vi.fn() })),
  Destination: { volume: { value: 0 } },
  Transport: { bpm: { value: 120 }, scheduleRepeat: vi.fn(), cancel: vi.fn() },
  start: vi.fn(),
  Draw: { schedule: vi.fn() },
}));

vi.mock("../AudioEngine", () => ({
  kickSynth: {}, snareSynth: {}, hatSynth: {}, bassSynth: {},
  initPianoSampler: vi.fn(), initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(), setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
}));

import { getBassNote, getLeadingTone } from "../useSequencer";

describe("Bass Intelligence - getBassNote", () => {
  it("resolves the root note correctly (C2)", () => {
    const result = getBassNote(0, 'R', 2); // 0 = C
    expect(result.name).toBe("C2");
    expect(result.midi).toBe(36); // C2 = 36 (0 + 3*12 if octave 2 and baseMidi logic is (octave+1)*12)
  });

  it("resolves the perfect fifth correctly (G2 from C)", () => {
    const result = getBassNote(0, '5', 2);
    expect(result.name).toBe("G2");
    expect(result.midi).toBe(43); // 36 + 7
  });

  it("resolves the octave correctly (C3 from C2)", () => {
    const result = getBassNote(0, '8va', 2);
    expect(result.name).toBe("C3");
    expect(result.midi).toBe(48); // 36 + 12
  });

  it("resolves the root of a different chord (F2 from F)", () => {
    const result = getBassNote(5, 'R', 2); // 5 = F
    expect(result.name).toBe("F2");
    expect(result.midi).toBe(41); // 5 + 36
  });

  it("handles minor third (b3) for minor chords", () => {
    const result = getBassNote(9, 'b3', 2); // 9 = A. A + b3 = C
    expect(result.name).toBe("C3");
    expect(result.midi).toBe(48); // (9+3) + 36
  });

  it("calculates leading tone correctly (B2 before C3)", () => {
    const result = getLeadingTone(0, 2); // Target C (0), Octave 2
    expect(result.name).toBe("B1");
    expect(result.midi).toBe(35); // 36 - 1
  });
});
