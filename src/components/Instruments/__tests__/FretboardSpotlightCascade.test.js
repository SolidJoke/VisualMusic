// VMU-203 — static read of Fretboard.css. The two fixes this ticket owns are
// CSS cascade properties, so they are pinned here without a browser:
//
//   Part 1 — `.note-marker.is-playing` (the --select-ring) must come AFTER the
//   role-* rules. Both are two-class selectors, so later-wins decides: before
//   the fix the role rules' `box-shadow: 0 0 0 2px var(--bg)` erased the ring.
//   The rule must also no longer force `color`, so the role's own label colour
//   survives.
//
//   Part 2 — the spotlight dims only inside `.is-running`, the playing note
//   punches through, the target's playing ring is thicker, the out-of-shape
//   ring stays fully opaque, and out-of-zone cells keep their own 0.25 dim.
//
// jsdom does not resolve the cascade; the Chromium probe (display_vs_sound)
// measures the computed box-shadow/opacity. This file pins the SOURCE order
// and declarations that produce it.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.resolve(p), "utf8");
const css = read("src/components/Instruments/Fretboard.css");
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of the first block whose selector text matches `selector`. */
function block(selector) {
  const start = stripped.indexOf(selector);
  if (start === -1) throw new Error(`missing selector: ${selector}`);
  const open = stripped.indexOf("{", start);
  const close = stripped.indexOf("}", open);
  if (open === -1 || close === -1) throw new Error(`unclosed block: ${selector}`);
  return stripped.slice(open + 1, close);
}

const indexOf = (selector) => {
  const i = stripped.indexOf(selector);
  if (i === -1) throw new Error(`missing selector: ${selector}`);
  return i;
};

describe("VMU-203 Part 1 — the playing ring survives every role", () => {
  it("is-playing is declared AFTER the role rules and the subtle-marker rule", () => {
    expect(indexOf(".note-marker.is-playing {")).toBeGreaterThan(indexOf(".note-marker.role-target {"));
    expect(indexOf(".note-marker.is-playing {")).toBeGreaterThan(indexOf(".note-marker.subtle-marker {"));
  });

  it("is-playing still sets --select-ring and scale(1.1), and no longer forces a colour", () => {
    const b = block(".note-marker.is-playing {");
    expect(b).toMatch(/box-shadow:\s*var\(--select-ring\)/);
    expect(b).toMatch(/transform:\s*scale\(1\.1\)/);
    expect(b).not.toMatch(/color\s*:/);
  });
});

describe("VMU-203 Part 2 — the spotlight", () => {
  it("dims every pastille to 0.4 while the neck is running", () => {
    expect(block(".is-running .note-marker {")).toMatch(/opacity:\s*0\.4\s*;?/);
  });

  it("keeps scale notes a touch brighter at 0.6, after the 0.4 rule", () => {
    expect(indexOf(".is-running .note-marker.role-scale {")).toBeGreaterThan(indexOf(".is-running .note-marker {"));
    expect(block(".is-running .note-marker.role-scale {")).toMatch(/opacity:\s*0\.6\s*;?/);
  });

  it("the playing note goes to opacity 1 and font-weight 800, after the dim", () => {
    expect(indexOf(".is-running .note-marker.is-playing {")).toBeGreaterThan(indexOf(".is-running .note-marker {"));
    const b = block(".is-running .note-marker.is-playing {");
    expect(b).toMatch(/opacity:\s*1\s*;?/);
    expect(b).toMatch(/font-weight:\s*800\s*;?/);
  });

  it("the target note's pushed playing ring applies whether or not the loop runs", () => {
    // The rule is a plain .note-marker selector, not scoped under .is-running:
    // the pushed 6px/8px ring holds in both states (loop running and not).
    expect(stripped.indexOf(".is-running .note-marker.is-playing.is-target-note")).toBe(-1);
    expect(block(".note-marker.is-playing.is-target-note {")).toMatch(
      /box-shadow:\s*0 0 0 6px var\(--bg\), 0 0 0 8px var\(--select\)/
    );
    // Later than the base playing rule so the thicker ring wins the cascade.
    expect(indexOf(".note-marker.is-playing.is-target-note {")).toBeGreaterThan(
      indexOf(".note-marker.is-playing {")
    );
  });

  it("the out-of-shape playing ring stays fully opaque", () => {
    expect(block(".is-running .note-marker.is-playing-outside {")).toMatch(/opacity:\s*1\s*;?/);
  });

  it("out-of-zone cells keep their own 0.25 dim as a class, not an inline style", () => {
    expect(block(".note-marker.is-out-of-zone {")).toMatch(/opacity:\s*0\.25\s*;?/);
  });

  it("reduced motion turns the new transitions off", () => {
    const start = stripped.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(start).not.toBe(-1);
    const close = stripped.indexOf("}", stripped.indexOf("{", start));
    expect(stripped.slice(start, close)).toMatch(/transition:\s*none/);
  });
});
