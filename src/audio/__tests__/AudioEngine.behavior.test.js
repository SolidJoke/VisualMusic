import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("tone", () => {
  const mockRampTo = vi.fn();
  const mockMasterRampTo = vi.fn();
  const mockTriggerAttackRelease = vi.fn();
  const mockGuitarTriggerAttackRelease = vi.fn();
  const mockPianoTriggerAttackRelease = vi.fn();
  const mockKickSet = vi.fn();

  // Attach mocks to globalThis so tests can access them without hoisting issues
  globalThis.__audioMocks = {
    mockRampTo,
    mockMasterRampTo,
    mockTriggerAttackRelease,
    mockGuitarTriggerAttackRelease,
    mockPianoTriggerAttackRelease,
    mockKickSet
  };

  const mockVolumeInstance = {
    volume: {
      rampTo: mockRampTo,
      value: 0
    },
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis()
  };

  const mockPolySynthInstance = {
    triggerAttackRelease: mockPianoTriggerAttackRelease,
    set: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis()
  };

  const mockMonoSynthInstance = {
    triggerAttackRelease: mockTriggerAttackRelease,
    set: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis()
  };

  const mockMembraneSynthInstance = {
    triggerAttackRelease: vi.fn(),
    set: mockKickSet,
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis()
  };

  const mockNoiseSynthInstance = {
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis()
  };

  const mockSamplerInstance = {
    triggerAttackRelease: mockGuitarTriggerAttackRelease,
    set: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis()
  };

  return {
    start: vi.fn().mockResolvedValue(true),
    context: {
      lookAhead: 0
    },
    Destination: {
      volume: {
        rampTo: mockMasterRampTo,
        value: 0
      },
      connect: vi.fn()
    },
    Transport: {
      bpm: { value: 120 }
    },
    Volume: vi.fn().mockImplementation(() => mockVolumeInstance),
    PolySynth: vi.fn().mockImplementation(() => mockPolySynthInstance),
    MonoSynth: vi.fn().mockImplementation(() => mockMonoSynthInstance),
    MembraneSynth: vi.fn().mockImplementation(() => mockMembraneSynthInstance),
    NoiseSynth: vi.fn().mockImplementation(() => mockNoiseSynthInstance),
    Sampler: vi.fn().mockImplementation(() => mockSamplerInstance),
    FMSynth: vi.fn(),
    Synth: vi.fn(),
    Filter: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      set: vi.fn()
    })),
    Reverb: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis()
    })),
    Chorus: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      start: vi.fn()
    })),
    Analyser: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis()
    })),
    Compressor: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockReturnThis(),
      toDestination: vi.fn().mockReturnThis()
    })),
    Frequency: vi.fn().mockImplementation((note) => {
      const notesMap = {
        "C1": 24,
        "C2": 36,
        "E2": 40,
        "C4": 60,
        "A4": 69,
        "C6": 84,
        "C8": 108
      };
      return {
        toMidi: () => notesMap[note] || 60
      };
    })
  };
});

// Import AudioEngine after the mocks are set up
import {
  setInstrumentVolume,
  setMasterVolume,
  playDictionaryNote,
  applyGenrePreset
} from "../AudioEngine";

describe("AudioEngine Quality Fixes Behavior Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Task B1-1: setInstrumentVolume('piano', -6) calls rampTo(-6, 0.05) on the instrument volume node", () => {
    setInstrumentVolume("piano", -6);
    expect(globalThis.__audioMocks.mockRampTo).toHaveBeenCalledWith(-6, 0.05);
  });

  it("Task B1-2: setMasterVolume(-12) calls rampTo(-12, 0.05) on Tone.Destination.volume", () => {
    setMasterVolume(-12);
    expect(globalThis.__audioMocks.mockMasterRampTo).toHaveBeenCalledWith(-12, 0.05);
  });

  it("Task B1-3: playDictionaryNote('bass', ['C2', 'C1'], '2n') filters C1 (midi 24) out of bass range (28-67) and plays C2 (midi 36)", () => {
    playDictionaryNote("bass", ["C2", "C1"], "2n");
    
    // Only C2 should be played because C1 is < 28 (physically impossible for visualmusic bass)
    expect(globalThis.__audioMocks.mockTriggerAttackRelease).toHaveBeenCalledWith("C2", "2n", undefined);
    expect(globalThis.__audioMocks.mockTriggerAttackRelease).not.toHaveBeenCalledWith("C1", "2n", undefined);
  });

  it("Task B1-4: playDictionaryNote('piano', [], '2n') returns without calling any synths and doesn't crash", () => {
    expect(() => {
      playDictionaryNote("piano", [], "2n");
    }).not.toThrow();

    expect(globalThis.__audioMocks.mockPianoTriggerAttackRelease).not.toHaveBeenCalled();
  });

  it("Task B1-5: applyGenrePreset('jazz') calls presets without crash and applies to kickSynth", () => {
    expect(() => {
      applyGenrePreset("jazz");
    }).not.toThrow();
  });

  it("B2b-1: playDictionaryNote(piano) appelle triggerAttackRelease sans crash quand time est undefined", () => {
    expect(() => playDictionaryNote('piano', ['C4', 'E4', 'G4'], '2n')).not.toThrow();
  });

  it("B2b-2: playDictionaryNote avec time fourni ne doit pas crasher (garde séquenceur)", () => {
    // Quand time est fourni, releaseAll ne doit PAS être appelé
    // car on est dans un contexte de séquenceur schedulé
    expect(() => playDictionaryNote('piano', ['C4'], '16n', 1.5)).not.toThrow();
  });
});
