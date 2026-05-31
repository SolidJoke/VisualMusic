import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useBreakpoint, { BREAKPOINTS } from "../useBreakpoint";

describe("useBreakpoint hook", () => {
  let listeners = {};

  beforeEach(() => {
    listeners = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return 'desktop' if window.matchMedia is undefined (SSR safety)", () => {
    // Temporarily stub window.matchMedia to undefined to simulate SSR
    vi.stubGlobal("window", { matchMedia: undefined });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe(BREAKPOINTS.DESKTOP);
  });

  it("should return 'phone' if matchMedia max-width 767px matches", () => {
    const addEventListenerMock = vi.fn((event, cb) => {
      listeners[event] = cb;
    });

    const mockMatchMedia = vi.fn().mockImplementation((query) => {
      return {
        matches: query.includes("max-width: 767px"),
        media: query,
        addEventListener: addEventListenerMock,
        removeEventListener: vi.fn(),
      };
    });

    vi.stubGlobal("window", {
      matchMedia: mockMatchMedia,
    });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe(BREAKPOINTS.PHONE);
  });

  it("should return 'tablet' if matchMedia min-width 768px and max-width 2559px matches", () => {
    const mockMatchMedia = vi.fn().mockImplementation((query) => {
      return {
        matches: query.includes("min-width: 768px") && query.includes("max-width: 2559px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    vi.stubGlobal("window", {
      matchMedia: mockMatchMedia,
    });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe(BREAKPOINTS.TABLET);
  });

  it("should return 'desktop' if matchMedia min-width 2560px matches", () => {
    const mockMatchMedia = vi.fn().mockImplementation((query) => {
      return {
        matches: query.includes("min-width: 2560px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    vi.stubGlobal("window", {
      matchMedia: mockMatchMedia,
    });

    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.breakpoint).toBe(BREAKPOINTS.DESKTOP);
  });

  it("should cleanup event listeners on unmount to avoid memory leaks", () => {
    const removeEventListenerMock = vi.fn();
    const mockMatchMedia = vi.fn().mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
      };
    });

    vi.stubGlobal("window", {
      matchMedia: mockMatchMedia,
    });

    const { unmount } = renderHook(() => useBreakpoint());
    unmount();

    // The hook listens to 3 media queries, so it should cleanup all 3
    expect(removeEventListenerMock).toHaveBeenCalledTimes(3);
  });
});
