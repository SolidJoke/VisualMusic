/**
 * F1 / VMU-148 — a single theme (modern). The theme picker, the `vintage`
 * ("Zen Studio") theme and their state are removed entirely: no
 * `uiTheme`/`setUiTheme` identifier, no `theme-vintage` class, no
 * `vintage-theme.css`, no `theme === 'vintage'` / `theme="vintage"` branch.
 *
 * Deliberately NOT flagged: class names that happen to contain the
 * substring "vintage" but are not part of the theme-toggle mechanism —
 * `.vintage-module` / `.vintage-header` / `.vintage-chassis` /
 * `.vintage-control-btn` are a pre-existing, still-used naming convention
 * for the shared "chassis" component look (SequencerPanel.jsx,
 * TheoryLegend.jsx, PlaybackPanel.jsx, modern-theme.css). Renaming them is
 * a separate refactor the brief does not ask for and this ticket does not
 * touch — see the F1a report for the explicit list this test targets
 * instead.
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
