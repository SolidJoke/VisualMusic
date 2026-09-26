/**
 * F1 / VMU-148 — a single theme (modern). The theme picker, the `vintage`
 * ("Zen Studio") theme and their state are removed entirely: no
 * `uiTheme`/`setUiTheme` identifier, no `theme-vintage` class, no
 * `vintage-theme.css`, no `theme === 'vintage'` / `theme="vintage"` branch.
 *
 * F1a deliberately did NOT flag class names that happened to contain the
 * substring "vintage" but were not part of the theme-toggle mechanism —
 * `.vintage-module` / `.vintage-header` / `.vintage-chassis` /
 * `.vintage-control-btn`, the shared "chassis" component look
 * (SequencerPanel.jsx, TheoryLegend.jsx, PlaybackPanel.jsx,
 * modern-theme.css). F1b (brief point 3b) renamed those four to neutral
 * names — `.module-body` / `.module-header` / `.module-chassis` /
 * `.module-control-btn` — so the substring "vintage" is now gone from the
 * app entirely; this test still targets only the theme-toggle-mechanism
 * patterns below, not a bare "vintage" grep.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");

function collectFiles(dir, extensions, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") collectFiles(full, extensions, acc);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      acc.push(full);
    }
  }
  return acc;
}

const appFiles = () =>
  collectFiles(SRC, [".css", ".jsx", ".js"]).map((file) => ({
    file: path.relative(SRC, file).replace(/\\/g, "/"),
    src: fs.readFileSync(file, "utf8"),
  }));

/** The theme-toggle-mechanism patterns VMU-148 removes — not a bare "vintage" grep. */
const PATTERNS = [
  { name: "uiTheme identifier", re: /\buiTheme\b/ },
  { name: "setUiTheme identifier", re: /\bsetUiTheme\b/ },
  { name: "vintage-theme.css (file or import)", re: /vintage-theme\.css/ },
  { name: "theme-vintage CSS class", re: /theme-vintage\b/ },
  { name: "'vintage' theme value (JS string literal)", re: /['"]vintage['"]/ },
  { name: "theme-${...} dynamic template class", re: /theme-\$\{/ },
];

describe("single theme — the vintage/modern picker is gone (VMU-148)", () => {
  it("actually scans a non-trivial number of files", () => {
    expect(appFiles().length).toBeGreaterThan(50);
  });

  it("vintage-theme.css no longer exists", () => {
    expect(fs.existsSync(path.join(SRC, "styles", "vintage-theme.css"))).toBe(false);
  });

  for (const { name, re } of PATTERNS) {
    it(`no file contains ${name}`, () => {
      const offenders = appFiles()
        .filter(({ src }) => re.test(src))
        .map(({ file }) => file);
      expect(offenders).toEqual([]);
    });
  }
});
