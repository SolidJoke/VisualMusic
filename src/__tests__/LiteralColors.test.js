/**
 * F1b / spec §8-1 — no literal color (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba())
 * survives in the theming-sensitive scope: src/components, src/App.css,
 * src/index.css. Every color must come from a token in src/styles/tokens.css
 * (spec F1-fondations-visuelles.md §6).
 *
 * Two kinds of literal are legitimately excluded, per the F1b brief point 1:
 *   - occurrences inside comments (CSS /* *\/ and JS // or /* *\/) — not
 *     rendered, not a real color;
 *   - the explicit, named exceptions below: the modal-veil
 *     `rgba(0, 0, 0, 0.7)` (three call sites — it has no token, spec §6 says
 *     "conservé"), and the `playability.color` gauge in StudioPanel.jsx
 *     (~line 77 and its rendering, left for the harmonyEngine.js "couleur →
 *     état" work done by a different executor — F1b brief point 4).
 *
 * Exceptions are matched by exact file + literal text, never by line number
 * (spec §6's own line numbers are stale — dated `f6ac1b0` — brief says to
 * search by value instead).
 *
 * jsdom does not resolve CSS custom properties or render anything here; this
 * is a plain static source scan (CLAUDE.md "Pièges du dépôt").
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

function collectFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") collectFiles(full, acc);
    } else if (/\.(css|jsx|js)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Blanks out comment bodies (same length, so this stays a pure filter, not
 * a rewrite) so a color mentioned only in prose never counts as a real one. */
function blankComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
  out = out.replace(/\/\/.*$/gm, (m) => " ".repeat(m.length));
  return out;
}

const SCOPE_FILES = [
  ...collectFiles(path.join(SRC, "components")),
  path.join(SRC, "App.css"),
  path.join(SRC, "index.css"),
];

/**
 * Exact literal strings still allowed to remain, per file (relative to src/,
 * forward slashes). Each entry is consumed once — a file may not have MORE
 * occurrences of an excepted literal than are listed here.
 */
const EXPECTED_REMAINING = {
  "components/Common/Modal.css": ["rgba(0, 0, 0, 0.7)"],
  "components/Modals/HelpModal.css": ["rgba(0, 0, 0, 0.7)"],
  // Mobile drawer's own full-screen scrim — same veil pattern as the modal
  // overlay above (no token exists for a translucent backdrop), aligned to
  // the same 0.7 alpha instead of leaving a second, slightly different one.
  "components/Layout/BottomNav.css": ["rgba(0, 0, 0, 0.7)"],
  "components/Panels/StudioPanel.jsx": [
    "rgba(0,0,0,0.4)", // Playability gauge background — playability.color's block (brief point 4).
    "#ccc", // Same gauge block, "Score de Jouabilité" header label.
    "rgba(255,255,255,0.1)", // Same gauge block, score-bar track.
    "#aaa", // Same gauge block, per-detail text.
  ],
};
// App.css's own modal-veil rgba(0, 0, 0, 0.7) — file is outside src/components
// so it is asserted separately below, not through EXPECTED_REMAINING.
const APP_CSS_EXPECTED = ["rgba(0, 0, 0, 0.7)"];

function findLiterals(absPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const scanned = blankComments(raw);
  return [...scanned.matchAll(COLOR_RE)].map((m) => m[0]);
}

describe("no literal color outside tokens.css in the theming-sensitive scope (spec §8-1)", () => {
  it("actually scans a non-trivial number of files", () => {
    expect(SCOPE_FILES.length).toBeGreaterThan(30);
  });

  it("src/App.css has no literal color beyond the modal-veil rgba(0, 0, 0, 0.7)", () => {
    const found = findLiterals(path.join(SRC, "App.css"));
    const remaining = [...found];
    for (const expected of APP_CSS_EXPECTED) {
      const i = remaining.indexOf(expected);
      expect(i, `expected exception "${expected}" not found in App.css`).toBeGreaterThanOrEqual(0);
      remaining.splice(i, 1);
    }
    expect(remaining).toEqual([]);
  });

  it("src/index.css has no literal color", () => {
    expect(findLiterals(path.join(SRC, "index.css"))).toEqual([]);
  });

  it("no file under src/components has a literal color beyond the named exceptions", () => {
    const unexpected = [];
    for (const file of collectFiles(path.join(SRC, "components"))) {
      const rel = path.relative(SRC, file).replace(/\\/g, "/");
      const found = findLiterals(file);
      const remaining = [...found];
      for (const expected of EXPECTED_REMAINING[rel] || []) {
        const i = remaining.indexOf(expected);
        if (i >= 0) remaining.splice(i, 1);
      }
      for (const text of remaining) unexpected.push(`${rel}: ${text}`);
    }
    expect(unexpected).toEqual([]);
  });

  it("every named exception is actually present (no stale exception left over)", () => {
    for (const [rel, literals] of Object.entries(EXPECTED_REMAINING)) {
      const found = findLiterals(path.join(SRC, rel));
      const remaining = [...found];
      for (const expected of literals) {
        const i = remaining.indexOf(expected);
        expect(i, `${rel}: expected exception "${expected}" not found`).toBeGreaterThanOrEqual(0);
        remaining.splice(i, 1);
      }
    }
  });
});
