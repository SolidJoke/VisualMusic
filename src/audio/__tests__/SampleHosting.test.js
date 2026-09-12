/**
 * VMU-021 — Sample hosting contract.
 *
 * The piano sampler used to load 19 MP3 files from a third-party GitHub Pages
 * host (`nbrosowsky.github.io`) that answers 404. Tone.js swallowed the failure
 * through `onerror` and silently fell back to a PolySynth, so the sampled piano
 * had never played once — and nothing in the suite noticed.
 *
 * What is testable here is not the sound, it is the contract:
 *   1. every declared sample URL is relative to this origin;
 *   2. every declared sample file actually exists in `public/`;
 *   3. once loading succeeds, `getPianoSynth()` returns the sampler and not the
 *      fallback — i.e. the fallback is a safety net, not the normal path.
 *
 * Assertion (3) is the one that would have caught the original defect: the URLs
 * were syntactically fine, they simply pointed at nothing.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Resolved against the working directory, which vitest sets to the repository
// root. Not from import.meta.url: under jsdom that is not a file: URL, and
// fileURLToPath throws. The beforeAll guard below turns a wrong root into an
// explicit failure rather than nineteen "missing sample" reports.
const PUBLIC_DIR = path.resolve("public");

// Sampler options are captured at construction time so the test reads the real
// call site rather than a constant that may or may not be the one in use.
globalThis.__samplerCalls = [];

vi.mock("tone", () => {
  const node = () => ({
    connect: vi.fn().mockReturnThis(),
    toDestination: vi.fn().mockReturnThis(),
    set: vi.fn(),
    start: vi.fn(),
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    volume: { rampTo: vi.fn(), value: 0 },
  });

  return {
    start: vi.fn().mockResolvedValue(true),
    context: { lookAhead: 0 },
    Destination: { volume: { rampTo: vi.fn(), value: 0 }, connect: vi.fn() },
    Transport: { bpm: { value: 120 } },
    Volume: vi.fn().mockImplementation(node),
    PolySynth: vi.fn().mockImplementation(node),
    MonoSynth: vi.fn().mockImplementation(node),
    MembraneSynth: vi.fn().mockImplementation(node),
    NoiseSynth: vi.fn().mockImplementation(node),
    Synth: vi.fn().mockImplementation(node),
    FMSynth: vi.fn().mockImplementation(node),
    Filter: vi.fn().mockImplementation(node),
    Reverb: vi.fn().mockImplementation(node),
    Chorus: vi.fn().mockImplementation(node),
    Analyser: vi.fn().mockImplementation(node),
    Compressor: vi.fn().mockImplementation(node),
    Frequency: vi.fn().mockImplementation(() => ({ toMidi: () => 60 })),
    Sampler: vi.fn().mockImplementation((options) => {
      const instance = node();
      globalThis.__samplerCalls.push({ options, instance });
      return instance;
    }),
  };
});

import {
  initPianoSampler,
  initGuitarSampler,
  getPianoSynth,
  getGuitarSynth,
} from "../AudioEngine";

/** @param {string} marker a url key unique to the sampler being looked up */
function samplerCallContaining(marker) {
  const call = globalThis.__samplerCalls.find(
    (c) => c.options && c.options.urls && marker in c.options.urls
  );
  if (!call) throw new Error(`no Tone.Sampler was constructed with a "${marker}" sample`);
  return call;
}

describe("VMU-021 — samples are hosted by this origin", () => {
  beforeAll(() => {
    // Guard: if the root ever moves, fail here rather than reporting every
    // sample as missing — or, worse, passing because nothing was checked.
    expect(fs.existsSync(PUBLIC_DIR)).toBe(true);
    initPianoSampler();
    initGuitarSampler();
  });

  describe.each([
    ["piano", "A1"],
    ["guitar", "E2"],
  ])("%s sampler", (instrument, marker) => {
    it("declares a baseUrl relative to this origin", () => {
      const { options } = samplerCallContaining(marker);
      expect(options.baseUrl).toMatch(/^\/samples\//);
    });

    it("declares no absolute or cross-origin sample URL", () => {
      const { options } = samplerCallContaining(marker);
      // The scheme lives in baseUrl, not in the file names, so the check has to
      // be made on the URL Tone.js actually resolves: baseUrl + file name.
      const absolute = Object.entries(options.urls)
        .map(([note, file]) => `${note}: ${options.baseUrl}${file}`)
        .filter((resolved) => /\w+:\/\//.test(resolved));
      expect({ instrument, absolute }).toEqual({ instrument, absolute: [] });
    });

    it("declares only sample files that exist on disk", () => {
      const { options } = samplerCallContaining(marker);
      const dir = path.join(PUBLIC_DIR, options.baseUrl.replace(/^\//, ""));
      const missing = Object.entries(options.urls)
        .filter(([, file]) => !fs.existsSync(path.join(dir, file)))
        .map(([note, file]) => `${note}: ${file}`);
      expect({ instrument, missing }).toEqual({ instrument, missing: [] });
    });
  });

  it("uses the piano sampler, not the fallback, once loading succeeds", () => {
    const { options, instance } = samplerCallContaining("A1");
    expect(getPianoSynth()).not.toBe(instance); // before onload: fallback
    options.onload();
    expect(getPianoSynth()).toBe(instance);
  });

  it("uses the guitar sampler, not the fallback, once loading succeeds", () => {
    const { options, instance } = samplerCallContaining("E2");
    options.onload();
    expect(getGuitarSynth()).toBe(instance);
  });
});
