import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * TempoOwnership.test.js — the guard for T2 (VMU-025), decisions 1 and 2:
 * the transport's tempo and the context's `lookAhead` each have exactly one
 * writer, `src/audio/transportOwner.js`. No other file under `src/` may write
 * `bpm.value`, call `bpm.rampTo(` (or any other automation method on `bpm`),
 * pass `bpm:` / `lookAhead:` through a `.set({...})`, or assign `lookAhead`.
 *
 * Exempt, same as the transport start/stop guard next to this file
 * (TransportOwnership.test.js): `transportOwner.js` itself, `src/audio/
 * measure/**` (the offline harness builds its own offline context and must
 * set the tempo on *that* transport to reproduce a real session), and tests.
 *
 * Red before T2, by design (first commit of the branch): at `4bf938f` it
 * names the three tempo writers — `AudioEngine.js` (`setBpm`, called by
 * `AppDesktop.jsx` on a style change), `useSequencer.js` (`togglePlayback`,
 * first Play) and `useSequencer.js` (`handleBpmChange`) — and the two
 * `lookAhead` writers, `AudioEngine.js` (`initAudio`) and `useSequencer.js`
 * (`togglePlayback`).
 *
 * What it does not see (stated so nobody trusts it for more): a write split
 * across lines (`.set({\n bpm: 90 })`), a `bpm` param reached through an alias
 * that is not named `bpm`, or a new `Tone.Context({ lookAhead })`. Each would
 * need deliberate effort to write, not an accident.
 */

const SRC_ROOT = path.resolve(__dirname, "../../");

const ALLOWED_FILES = new Set([path.resolve(SRC_ROOT, "audio/transportOwner.js")]);

const ALLOWED_DIR_SEGMENTS = [
  `${path.sep}audio${path.sep}measure${path.sep}`,
  `${path.sep}__tests__${path.sep}`,
];

/** Any write to a transport's tempo param: assignment or automation. */
const TEMPO_WRITE =
  /\bbpm\s*\.\s*(?:value\s*=(?!=)|(?:rampTo|linearRampTo|exponentialRampTo|setValueAtTime|linearRampToValueAtTime|exponentialRampToValueAtTime|setTargetAtTime|targetRampTo|setRampPoint|cancelScheduledValues)\s*\()/;

/** Any write to the context's scheduling look-ahead. */
const LOOKAHEAD_WRITE = /\blookAhead\s*=(?!=)/;

/** A Tone `.set({...})` carrying either key on the same line. */
const SET_OBJECT_WRITE = /\.set\s*\(\s*\{[^}]*\b(?:bpm|lookAhead)\s*:/;

const PATTERNS = [TEMPO_WRITE, LOOKAHEAD_WRITE, SET_OBJECT_WRITE];

function isAllowed(absPath) {
  if (ALLOWED_FILES.has(absPath)) return true;
  return ALLOWED_DIR_SEGMENTS.some((seg) => absPath.includes(seg));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name) && !/\.test\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isForbidden(line) {
  return PATTERNS.some((p) => p.test(line));
}

describe("tempo and lookAhead ownership guard (T2 / VMU-025, decisions 1-2)", () => {
  it("no file outside transportOwner.js, audio/measure/ and tests writes the tempo or lookAhead", () => {
    const files = walk(SRC_ROOT).filter((f) => !isAllowed(f));
    const violations = [];

    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        // Comment-only lines are prose about history, not code — same rule
        // as TransportOwnership.test.js. A line that starts with code and
        // ends with a comment is still scanned.
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        if (isForbidden(line)) {
          violations.push(`${path.relative(SRC_ROOT, file)}:${i + 1}  ${trimmed}`);
        }
      });
    }

    expect(violations, `tempo / lookAhead written outside transportOwner.js:\n${violations.join("\n")}`).toEqual([]);
  });

  // The patterns must be able to catch what they exist for — otherwise the
  // test above passes vacuously.
  it("the patterns match the writes they exist to catch", () => {
    for (const line of [
      "  Tone.Transport.bpm.value = bpm;",
      "  Tone.getTransport().bpm.value = 90;",
      "  transport.bpm.rampTo(140, 2);",
      "  t.bpm.setValueAtTime(100, now);",
      "  Tone.context.lookAhead = 0.1;",
      "  Tone.getContext().lookAhead = 0.05;",
      "  Tone.getTransport().set({ bpm: 90 });",
      "  Tone.getContext().set({ lookAhead: 0 });",
    ]) {
      expect(isForbidden(line), line).toBe(true);
    }
  });

  // And must not flag reads, comparisons, or unrelated keys.
  it("the patterns do not match reads or unrelated code", () => {
    for (const line of [
      "  const now = transport.bpm.value;",
      "  if (transport.bpm.value === bpm) return;",
      "  setCurrentBpm(activeBrick.bpm);",
      "  const lookAheadMs = ctx.lookAhead * 1000;",
      "  synth.set({ volume: -6 });",
      "  bpmBadge.value = String(bpm);",
    ]) {
      expect(isForbidden(line), line).toBe(false);
    }
  });
});
