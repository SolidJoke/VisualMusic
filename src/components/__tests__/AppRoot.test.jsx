import React from "react";
import { describe, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import App from "../../App";

vi.mock("../../audio/AudioEngine", () => ({
  masterAnalyser: { 
    connect: vi.fn(), 
    disconnect: vi.fn(), 
    getValue: () => new Float32Array(64) 
  },
  instrumentVols: {
    piano: { volume: { value: 0 }, connect: vi.fn() },
    bass: { volume: { value: 0 }, connect: vi.fn() },
    kick: { volume: { value: 0 }, connect: vi.fn() },
    snare: { volume: { value: 0 }, connect: vi.fn() },
    hat: { volume: { value: 0 }, connect: vi.fn() },
    guitar: { volume: { value: 0 }, connect: vi.fn() }
  },
  setInstrumentVolume: vi.fn(),
  playDrumHit: vi.fn(),
  getGuitarSynth: vi.fn(),
  initGuitarSampler: vi.fn(),
  playBassNote: vi.fn(),
  getPianoSynth: vi.fn(),
}));

vi.mock("../../audio/useSequencer", () => ({
  useSequencer: () => ({
    isAudioReady: true,
    setIsAudioReady: vi.fn(),
    isPlaying: false,
    setIsPlaying: vi.fn(),
    masterVolume: 0,
    setMasterVolume: vi.fn(),
    currentBpm: 120,
    setCurrentBpm: vi.fn(),
    instrumentVolumes: {
      piano: 0,
      bass: 0,
      kick: 0,
      snare: 0,
      hat: 0,
      guitar: 0
    },
    handleInstrumentVolumeChange: vi.fn(),
    currentStep: 0,
    togglePlayback: vi.fn(),
    handleBpmChange: vi.fn(),
    currentlyPlayingNotes: [],
    isPianoReady: true,
  }),
}));

describe("App runtime error trap", () => {
  it("renders app without throwing", () => {
    // This will throw the exact error that causes the black screen!
    try {
      renderToString(<App />);
    } catch(e) {
      console.error("APP CRASH TRACE:", e.stack);
      throw e;
    }
  });
});
