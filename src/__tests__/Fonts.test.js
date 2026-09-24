/**
 * F1 / spec §5 — index.html loads Hanken Grotesk, JetBrains Mono and
 * Orbitron (not just Inter, per spec constat C6), and no component file
 * hardcodes a literal font-family anymore — they go through
 * var(--font-body|display|mono) (tokens.css §1) instead.
 *
 * This is a static source check; jsdom does not load real fonts or resolve
 * CSS custom properties (CLAUDE.md "Pièges du dépôt") — the actual glyphs
 * are verified in the browser by `npm run style:probe`
 * (`document.fonts.check`, spec §8-5).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const SRC = path.resolve("src");

// spec §5's explicit conversion list — the files whose literal font-family
// must now be a var(--font-*) token. (CompositionPanel.css, EuclideanCircle.css,
// PhasingVisualizer.css, DAWHelper.css use generic 'Courier New'/monospace
// fallbacks unrelated to the three loaded families — spec does not list them,
// F1b's job if ever revisited.)
const CONVERTED_FILES = [
  "index.css",
  "styles/modern-theme.css",
  "components/Layout/Sidebar.css",
  "components/Instruments/Fretboard.css",
  "components/Sequencer/PianoRoll.css",
];

describe("fonts (spec §5)", () => {
  it("index.html loads Hanken Grotesk, JetBrains Mono and Orbitron", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    expect(html).toMatch(/family=Hanken\+Grotesk/);
    expect(html).toMatch(/family=JetBrains\+Mono/);
    expect(html).toMatch(/family=Orbitron/);
  });

  it("index.html no longer loads Inter on its own", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    expect(html).not.toMatch(/family=Inter/);
  });

  it("tokens.css defines --font-display/--font-body/--font-mono", () => {
    const css = fs.readFileSync(path.join(SRC, "styles", "tokens.css"), "utf8");
    expect(css).toMatch(/--font-display:\s*'Orbitron'/);
    expect(css).toMatch(/--font-body:\s*'Hanken Grotesk'/);
    expect(css).toMatch(/--font-mono:\s*'JetBrains Mono'/);
  });

  it("modern-theme.css no longer @imports Orbitron itself (index.html does)", () => {
    const css = fs.readFileSync(path.join(SRC, "styles", "modern-theme.css"), "utf8");
    expect(css).not.toMatch(/@import.*fonts\.googleapis/);
  });

  for (const rel of CONVERTED_FILES) {
    it(`${rel} has no literal font-family — only var(--font-*)`, () => {
      const src = fs.readFileSync(path.join(SRC, rel), "utf8");
      const literalFontFamily = [...src.matchAll(/font-family:\s*([^;]+);/g)]
        .map((m) => m[1].trim())
        .filter((value) => !value.startsWith("var(--font"));
      expect(literalFontFamily).toEqual([]);
    });
  }
});
