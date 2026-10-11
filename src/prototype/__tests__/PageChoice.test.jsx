// VMU-188 — which page the app shows. src/layout.js owns the choice (see its
// header): A′ by default on a desktop (>= 2560 px), the classic page with
// ?layout=classic, A′ still under ?prototype=a, the classic page on a narrower
// window. AppDesktop reads the choice once, when its module loads, so each case
// here sets the URL and the viewport, then loads a fresh copy of the app.
//
//   (a) no parameter, desktop -> A′ (its root, data-s1="center")
//   (b) ?layout=classic -> the classic page
//   (c) ?prototype=a -> A′, even on a window narrower than 2560 px
//   (d) no parameter, narrower than 2560 px -> the classic page
//   (e) ?layout=classic&prototype=a -> the classic page
//   (f) pianoOwnsOctave follows the same choice (A′ => true, classic => false),
//       and there is one owner: no source file but src/layout.js reads the
//       layout or prototype parameter.
import { vi, describe, it, expect, afterEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Every call of useDictionaryMode is recorded, and the real hook still runs.
// `real` is set by openApp, after the module registry is reset: a mock factory
// that imported the hook itself would keep the AppContext of its first load.
const dictionary = vi.hoisted(() => ({ calls: [], real: null }));

vi.mock("../../hooks/useDictionaryMode", () => ({
  useDictionaryMode: (options) => {
    dictionary.calls.push(options);
    return dictionary.real(options);
  },
}));

vi.mock("tone", () => {
  const transport = {
    bpm: { value: 120 },
    scheduleRepeat: vi.fn(),
    clear: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    state: "stopped",
  };
  return {
    start: vi.fn(),
    now: vi.fn(() => 0),
    getDraw: vi.fn(() => ({ schedule: vi.fn() })),
    context: { lookAhead: 0.1 },
    Transport: transport,
    getTransport: () => transport,
    Draw: { schedule: vi.fn() },
    Destination: { volume: { value: 0, rampTo: vi.fn() } },
    Analyser: vi.fn(() => ({ dispose: vi.fn() })),
    Frequency: vi.fn(() => ({ toMidi: () => 60 })),
  };
});

vi.mock("../../audio/AudioEngine", () => ({
  kickSynth: { triggerAttackRelease: vi.fn() },
  snareSynth: { triggerAttackRelease: vi.fn() },
  hatSynth: { triggerAttackRelease: vi.fn() },
  bassSynth: { triggerAttackRelease: vi.fn() },
  initPianoSampler: vi.fn(),
  initGuitarSampler: vi.fn(),
  applyGenrePreset: vi.fn(),
  setInstrumentVolume: vi.fn(),
  playDictionaryNote: vi.fn(),
  setBpm: vi.fn(),
  initAudio: vi.fn(),
  setMasterVolume: vi.fn(),
  masterAnalyser: { getValue: () => new Float32Array(8) },
}));
vi.mock("../../components/Visualizer/AudioVisualizer", () => ({
  default: (props) => <div data-testid="mock-visualizer" data-height={props.height} />,
}));
vi.mock("../../components/Instruments/PianoKeyboard", () => ({ default: () => <div data-testid="piano-stub" /> }));
vi.mock("../../components/Instruments/Fretboard", () => ({ default: () => <div data-testid="neck-stub" /> }));
vi.mock("../../components/Panels/SequencerPanel", () => ({ default: () => <div data-testid="sequencer-stub" /> }));

import React, { Suspense } from "react";
import { render, cleanup, waitFor } from "@testing-library/react";

// Each case loads the whole app (lazy A′ chunk included): generous limits.
vi.setConfig({ testTimeout: 60_000 });
const LOAD_TIMEOUT = 20_000;
const DESKTOP_QUERY = "(min-width: 2560px)";

/** Sets the URL and the viewport, loads a fresh copy of the app, and reports
 * which page it shows (A′ root [data-prototype="a"], else the classic root). */
async function openApp(search, desktop) {
  cleanup();
  window.history.replaceState({}, "", `/${search}`);
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === DESKTOP_QUERY ? desktop : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  dictionary.calls.length = 0;
  vi.resetModules();
  const { AppProvider } = await import("../../context/AppContext");
  dictionary.real = (await vi.importActual("../../hooks/useDictionaryMode")).useDictionaryMode;
  const { default: AppDesktop } = await import("../../AppDesktop");
  render(
    <AppProvider>
      <Suspense fallback={<div data-testid="loading" />}>
        <AppDesktop />
      </Suspense>
    </AppProvider>
  );
  await waitFor(
    () => expect(document.querySelector('[data-prototype="a"], .app-container')).not.toBeNull(),
    { timeout: LOAD_TIMEOUT }
  );
  return {
    page: document.querySelector('[data-prototype="a"]') ? "a" : "classic",
    pianoOwnsOctave: dictionary.calls.at(-1)?.pianoOwnsOctave,
  };
}

afterEach(() => cleanup());

describe("VMU-188: which page the app shows", () => {
  it("(a) no parameter on a desktop shows A′", async () => {
    const { page } = await openApp("", true);
    expect(page).toBe("a");
    expect(document.querySelector('[data-s1="center"]')).not.toBeNull();
  });

  it("(b) ?layout=classic shows the classic page", async () => {
    const { page } = await openApp("?layout=classic", true);
    expect(page).toBe("classic");
    expect(document.querySelector('[data-s1="center"]')).toBeNull();
  });

  it("(c) ?prototype=a shows A′, also on a window narrower than 2560 px", async () => {
    const { page } = await openApp("?prototype=a", false);
    expect(page).toBe("a");
  });

  it("(d) no parameter below 2560 px shows the classic page", async () => {
    const { page } = await openApp("", false);
    expect(page).toBe("classic");
  });

  it("(e) ?layout=classic wins over ?prototype=a", async () => {
    const { page } = await openApp("?layout=classic&prototype=a", true);
    expect(page).toBe("classic");
  });

  it("(f) pianoOwnsOctave follows the choice: true on A′, false on the classic page", async () => {
    expect((await openApp("", true)).pianoOwnsOctave).toBe(true);
    expect((await openApp("?layout=classic", true)).pianoOwnsOctave).toBe(false);
  });

  it("(f) one owner: only src/layout.js reads the layout or prototype parameter", () => {
    // vitest runs from the repository root (npm test): src/ is there.
    const srcDir = path.resolve(process.cwd(), "src");
    const READ = /\.(get|has)\(\s*["'](layout|prototype)["']\s*\)/;
    const readers = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(full);
          continue;
        }
        if (!/\.(js|jsx|ts|tsx)$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
        if (READ.test(readFileSync(full, "utf8"))) {
          readers.push(path.relative(srcDir, full).split(path.sep).join("/"));
        }
      }
    };
    walk(srcDir);
    expect(readers).toEqual(["layout.js"]);
  });
});
