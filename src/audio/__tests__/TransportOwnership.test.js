import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * TransportOwnership.test.js — the guard for VMU-163-fix2, decision 5: no
 * file under `src/` may call `.start(` / `.stop(` on the transport
 * (`Tone.Transport`, `Tone.getTransport()`, or a local `transport` variable
 * holding it) except `transportOwner.js` itself, `src/audio/measure/**`
 * (the offline harness, which must *reproduce* a real Play/Stop to measure
 * the app — see offlineRender.js's own scenarios) and test files.
 *
 * Positive control, run by hand before this file was kept (recorded here so
 * the check is not just asserted but shown to actually catch a violation):
 * with `src/audio/useSequencer.js`'s pre-fix `Tone.Transport.stop();
 * Tone.Transport.start();` restored (togglePlayback, VMU-163-fix2's own
 * predecessor state at commit 2e4f3fb) and `src/audio/metronome.js`'s
 * pre-fix `transport.start()` / `transport.stop()` restored, this test
 * failed, naming exactly those two files and lines. Restored to the real
 * (fixed) source, it passes — see the ticket report for the exact before/
 * after run.
 *
 * The pattern intentionally does *not* match every `.start(`/`.stop(` in the
 * codebase (e.g. `osc.start()`, `synth.triggerAttackRelease` are unrelated
 * Web Audio calls) — only calls chained directly off `Tone.Transport`,
 * `getTransport()`, or an identifier literally named `transport`, which is
 * the naming convention every real call site in this app already uses
 * (metronome.js, transportOwner.js, offlineRender.js all name their local
 * variable `transport`).
 */

const SRC_ROOT = path.resolve(__dirname, "../../");

const ALLOWED_FILES = new Set([path.resolve(SRC_ROOT, "audio/transportOwner.js")]);

const ALLOWED_DIR_SEGMENTS = [
  `${path.sep}audio${path.sep}measure${path.sep}`,
  `${path.sep}__tests__${path.sep}`,
];

const FORBIDDEN_PATTERN =
  /(?:Tone\.Transport|getTransport\(\))\s*\.\s*(start|stop)\s*\(|\btransport\s*\.\s*(start|stop)\s*\(/;

function isAllowed(absPath) {
  if (ALLOWED_FILES.has(absPath)) return true;
  return ALLOWED_DIR_SEGMENTS.some((seg) => absPath.includes(seg));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith(".test.js") && !entry.name.endsWith(".test.jsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("transport ownership guard (VMU-163-fix2, decision 5)", () => {
  it("no file outside transportOwner.js, audio/measure/, and tests calls .start(/.stop( on the transport", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowed(f));
    const violations = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        // Skip comment-only lines: this codebase documents the *history* of
        // this exact call (what the pre-fix code used to do) in prose right
        // next to the fix, and a guard that cannot tell code from commentary
        // would force every future comment to dance around its own pattern.
        // A line that mixes code and a trailing comment still starts with
        // code, so it is still scanned.
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        if (FORBIDDEN_PATTERN.test(line)) {
          violations.push(`${path.relative(SRC_ROOT, file)}:${i + 1}  ${trimmed}`);
        }
      });
    }

    expect(violations, `direct transport start/stop found outside the owner:\n${violations.join("\n")}`).toEqual([]);
  });

  // Control: the pattern itself must be able to catch a violation, not just
  // pass vacuously because it never matches anything. Exercised directly
  // against synthetic lines rather than by re-running the positive control
  // above (which required editing production files back to their pre-fix
  // state) — this is the mechanical half of that same control, kept so a
  // future change to the regex cannot silently stop matching anything.
  it("the forbidden pattern does match the kind of call it exists to catch", () => {
    expect(FORBIDDEN_PATTERN.test('  Tone.Transport.stop();')).toBe(true);
    expect(FORBIDDEN_PATTERN.test('  Tone.Transport.start();')).toBe(true);
    expect(FORBIDDEN_PATTERN.test('  Tone.getTransport().stop();')).toBe(true);
    expect(FORBIDDEN_PATTERN.test('  const transport = Tone.getTransport(); transport.start();')).toBe(true);
  });

  // And it must not flag unrelated Web Audio calls that happen to be named
  // start/stop on some other object.
  it("the forbidden pattern does not match unrelated start/stop calls", () => {
    expect(FORBIDDEN_PATTERN.test('  osc.start(0.05).stop(0.95);')).toBe(false);
    expect(FORBIDDEN_PATTERN.test('  synth.triggerAttackRelease(note, dur, time);')).toBe(false);
    expect(FORBIDDEN_PATTERN.test('  transportSelector.start = 0;')).toBe(false);
  });
});
