import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useDebugExport from "../useDebugExport";

describe("useDebugExport hook", () => {
  let createObjectURLMock;
  let revokeObjectURLMock;
  let clickMock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock DOM download mechanism
    createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectURLMock = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    clickMock = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        const anchor = originalCreateElement("a");
        vi.spyOn(anchor, "click").mockImplementation(clickMock);
        return anchor;
      }
      return originalCreateElement(tagName);
    });
  });

  it("should exist and return an exportDebugSnapshot function", () => {
    const { result } = renderHook(() => useDebugExport({}));
    expect(result.current.exportDebugSnapshot).toBeTypeOf("function");
  });

  it("should run without crashing even if all states are undefined or null", () => {
    const { result } = renderHook(() => useDebugExport({}));
    
    let snapshot;
    expect(() => {
      snapshot = result.current.exportDebugSnapshot();
    }).not.toThrow();

    expect(snapshot).toBeDefined();
  });

  it("should return a snapshot containing required keys: timestamp, appVersion, context, musicEngine, audio, errors", () => {
    const mockAppContext = {
      appMode: "studio",
      lang: "fr",
      notation: "latin",
      playbackInstrument: "piano",
      showFingering: true,
      fingeringMode: "guitar",
      uiTheme: "dark",
      layoutMode: "4k",
    };

    const mockMusicEngine = {
      dictRoot: 0,
      dictType: "major",
      activeNotes: ["C4", "E4", "G4"],
      currentlyPlayingNotes: ["C4"],
      guitarFingering: { chord: "C" },
      bassFingering: null,
    };

    const mockSequencer = {
      isAudioReady: true,
      isPlaying: false,
      masterVolume: -10,
      currentBpm: 120,
      instrumentVolumes: { piano: -6 },
    };

    const mockErrors = [{ message: "Some mock error", time: "12:00" }];

    const { result } = renderHook(() =>
      useDebugExport({
        appContextState: mockAppContext,
        musicEngineState: mockMusicEngine,
        sequencerState: mockSequencer,
        errors: mockErrors,
      })
    );

    const snapshot = result.current.exportDebugSnapshot();

    expect(snapshot).toHaveProperty("timestamp");
    expect(snapshot).toHaveProperty("appVersion");
    expect(snapshot).toHaveProperty("context");
    expect(snapshot).toHaveProperty("musicEngine");
    expect(snapshot).toHaveProperty("audio");
    expect(snapshot).toHaveProperty("errors");

    expect(snapshot.context.appMode).toBe("studio");
    expect(snapshot.musicEngine.dictRoot).toBe(0);
    expect(snapshot.audio.masterVolume).toBe(-10);
    expect(snapshot.errors).toEqual(mockErrors);
  });

  it("should have a valid ISO 8601 timestamp string", () => {
    const { result } = renderHook(() => useDebugExport({}));
    const snapshot = result.current.exportDebugSnapshot();
    
    expect(snapshot.timestamp).toBeTypeOf("string");
    // ISO 8601 validation (YYYY-MM-DDTHH:mm:ss.sssZ or similar)
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(isoRegex.test(snapshot.timestamp)).toBe(true);
  });

  it("should return empty array for errors if errors is undefined or null", () => {
    const { result } = renderHook(() => useDebugExport({}));
    const snapshot = result.current.exportDebugSnapshot();
    
    expect(Array.isArray(snapshot.errors)).toBe(true);
    expect(snapshot.errors).toHaveLength(0);
  });
});
