/**
 * VMU-025 (master volume, one owner) — A′-ACCÈS adds a master-volume slider to
 * the A′ transport. It must be a second READER of the one state, through the
 * same setter the "Instruments & Audio" window uses (useSequencer's
 * `setMasterVolume`), never a new WRITER of the engine's volume.
 *
 * A static scan of src/ (tests excluded): the places that write the output
 * volume (Tone.Destination / getDestination().volume) are exactly the ones
 * that existed before A′-ACCÈS — useSequencer.js (its effect and its first
 * Play) and AudioEngine.setMasterVolume — and the master-volume state is
 * declared once (useSequencer.js). The prototype page reaches the volume only
 * through the setter it is handed: it imports neither Tone nor the engine.
 * The behaviour (one state, both ways, reaching the engine) is tested in
 * src/prototype/__tests__/PrototypeAAccess.test.jsx (d) and measured in the
 * browser by scripts/s1_probe.mjs (S1-20, volume).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");

function collect(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") collect(full, acc);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const rel = (f) => path.relative(SRC, f).replace(/\\/g, "/");
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("master volume: no new writer (VMU-025)", () => {
  const files = collect(SRC).map((f) => ({ file: rel(f), src: stripComments(fs.readFileSync(f, "utf8")) }));

  it("writes the output volume in the same three places as before A′-ACCÈS", () => {
    const writers = {};
    for (const { file, src } of files) {
      const n = (src.match(/(?:Destination|getDestination\(\))\s*\.volume\s*(?:\.rampTo\(|\.value\s*=(?!=)|\.setValueAtTime\(|\.linearRampToValueAtTime\()/g) || []).length;
      if (n) writers[file] = n;
    }
    expect(writers).toEqual({ "audio/useSequencer.js": 2, "audio/AudioEngine.js": 1 });
  });

  it("declares the master-volume state once, in useSequencer.js", () => {
    const decl = files.filter(({ src }) => /\[\s*masterVolume\s*,\s*setMasterVolume\s*\]\s*=\s*useState/.test(src)).map((f) => f.file);
    expect(decl).toEqual(["audio/useSequencer.js"]);
  });

  it("lets the A′ page change the volume only through the setter it is handed", () => {
    const page = files.find((f) => f.file === "prototype/PrototypeA.jsx").src;
    expect(page).toMatch(/setMasterVolume\(/);
    expect(page).not.toMatch(/from\s+["']tone["']/);
    expect(page).not.toMatch(/AudioEngine/);
  });
});
