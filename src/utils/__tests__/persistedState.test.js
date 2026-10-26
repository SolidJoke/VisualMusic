// VMU-050 (first slice) - the app reopens on the last selection.
//
// What is kept is CONTENT (mode, language, notation, played instrument, the
// Studio's style, its base octave, the Dictionary's root / type / octave), in
// one JSON object under one versioned key. Nothing about what the user
// understood, nothing personal. The module must never be the reason the app
// fails to open: every storage problem reads as "nothing stored", silently.
import { describe, it, expect, vi, afterEach } from "vitest";
import { loadPersisted, savePersisted, STORAGE_KEY } from "../persistedState";

const FULL = {
  appMode: "dictionary",
  lang: "en",
  notation: "us",
  playbackInstrument: "guitar",
  brickId: "Bossa Nova",
  chordOctaveOffset: 2,
  dictRoot: 7,
  dictType: "chord_m7",
  dictOctave: -1,
};

/** Puts a raw value under the key, as an older build or a curious user could. */
function plant(value) {
  window.localStorage.setItem(STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));
}

// Spies are restored one by one: vi.restoreAllMocks() would also wipe the
// matchMedia mock setupTests.js installs once for the whole run.
let spies = [];
let consoleSpies = [];
const track = (spy) => {
  spies.push(spy);
  return spy;
};
function watchConsole() {
  consoleSpies = ["log", "info", "warn", "error", "debug"].map((m) =>
    track(vi.spyOn(console, m).mockImplementation(() => {})),
  );
}
function consoleCalls() {
  return consoleSpies.reduce((n, s) => n + s.mock.calls.length, 0);
}

afterEach(() => {
  spies.forEach((s) => s.mockRestore());
  spies = [];
  consoleSpies = [];
});

describe("persistedState - the key", () => {
  it("is the versioned key visualmusic.state.v1", () => {
    expect(STORAGE_KEY).toBe("visualmusic.state.v1");
  });
});

describe("persistedState - round trip", () => {
  it("restores every kept field exactly as saved", () => {
    savePersisted(FULL);
    expect(loadPersisted()).toEqual(FULL);
  });

  it("merges a partial save into what is already stored", () => {
    savePersisted({ lang: "en" });
    savePersisted({ notation: "us" });
    expect(loadPersisted()).toEqual({ lang: "en", notation: "us" });
  });

  it("reads storage on every call (no module cache: tests and tabs stay isolated)", () => {
    savePersisted({ lang: "en" });
    expect(loadPersisted().lang).toBe("en");
    window.localStorage.clear();
    expect(loadPersisted()).toEqual({});
    plant({ v: 1, lang: "pt" });
    expect(loadPersisted().lang).toBe("pt");
  });

  it("stores one JSON object under the key, with a version, and only the kept fields", () => {
    savePersisted({ ...FULL, secret: "x", customProgression: ["1", "4"], tempo: 90 });
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(raw.v).toBe(1);
    expect(Object.keys(raw).sort()).toEqual(["v", ...Object.keys(FULL)].sort());
    expect(window.localStorage.length).toBe(1);
  });

  it("keeps the Studio's style by its stable name, never by an index", () => {
    savePersisted({ brickId: "Bossa Nova" });
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(raw.brickId).toBe("Bossa Nova");
    expect(raw).not.toHaveProperty("currentBrickIndex");
  });
});

describe("persistedState - what is invalid is ignored, the rest is kept", () => {
  it("drops a value out of bounds or out of its list, and keeps the other fields", () => {
    plant({
      v: 1,
      lang: "en",
      notation: "xx",
      appMode: "karaoke",
      playbackInstrument: "kazoo",
      brickId: "No Such Style",
      chordOctaveOffset: -4,
      dictRoot: 12,
      dictType: "chord_nonexistent",
      dictOctave: 17,
    });
    expect(loadPersisted()).toEqual({ lang: "en" });
  });

  it("drops wrong types and non-integers", () => {
    plant({ v: 1, notation: "eu", dictRoot: "3", dictOctave: 1.5, chordOctaveOffset: null, lang: 7 });
    expect(loadPersisted()).toEqual({ notation: "eu" });
  });

  it("accepts the bounds: octave -3 and +3, root 0 and 11, the single note", () => {
    plant({ v: 1, dictOctave: -3, chordOctaveOffset: 3, dictRoot: 0, dictType: "single_note" });
    expect(loadPersisted()).toEqual({ dictOctave: -3, chordOctaveOffset: 3, dictRoot: 0, dictType: "single_note" });
    plant({ v: 1, dictRoot: 11 });
    expect(loadPersisted()).toEqual({ dictRoot: 11 });
  });

  it("does not store an invalid value on save either, and keeps the valid ones", () => {
    savePersisted({ lang: "en", dictOctave: 99 });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY))).toEqual({ v: 1, lang: "en" });
  });
});

describe("persistedState - storage that cannot be trusted", () => {
  it("reads corrupted JSON as nothing stored, silently", () => {
    watchConsole();
    plant("{not json");
    expect(loadPersisted()).toEqual({});
    expect(consoleCalls()).toBe(0);
  });

  it("reads a non-object (an array, a string, null) as nothing stored", () => {
    watchConsole();
    ["[1,2]", '"text"', "null", "42"].forEach((raw) => {
      plant(raw);
      expect(loadPersisted()).toEqual({});
    });
    expect(consoleCalls()).toBe(0);
  });

  it("ignores an unknown version altogether", () => {
    watchConsole();
    plant({ v: 99, lang: "en", dictRoot: 3 });
    expect(loadPersisted()).toEqual({});
    plant({ lang: "en" });
    expect(loadPersisted()).toEqual({});
    expect(consoleCalls()).toBe(0);
  });

  it("starts over from nothing when it saves over a corrupted entry", () => {
    plant("{not json");
    savePersisted({ lang: "en" });
    expect(loadPersisted()).toEqual({ lang: "en" });
  });

  it("survives getItem throwing", () => {
    watchConsole();
    track(vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    }));
    expect(loadPersisted()).toEqual({});
    expect(() => savePersisted({ lang: "en" })).not.toThrow();
    expect(consoleCalls()).toBe(0);
  });

  it("survives setItem throwing, and a full quota", () => {
    watchConsole();
    const setItem = track(vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    }));
    expect(() => savePersisted(FULL)).not.toThrow();
    expect(setItem).toHaveBeenCalled();
    expect(loadPersisted()).toEqual({});
    expect(consoleCalls()).toBe(0);
  });

  it("survives window.localStorage itself being unreachable", () => {
    watchConsole();
    track(vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    }));
    expect(loadPersisted()).toEqual({});
    expect(() => savePersisted(FULL)).not.toThrow();
    expect(consoleCalls()).toBe(0);
  });

  it("does not throw on a hostile partial (null, a non-object)", () => {
    expect(() => savePersisted(null)).not.toThrow();
    expect(() => savePersisted("lang")).not.toThrow();
    expect(() => savePersisted(undefined)).not.toThrow();
  });
});
