/**
 * F1 / VMU-149 — every `var(--x)` used in the app must resolve to something:
 * either a `--x:` definition in one of the token/theme stylesheets, or a
 * fallback baked into the same `var(--x, fallback)` call.
 *
 * Before F1, 12 variables were used but never defined anywhere (spec
 * F1-fondations-visuelles.md, constat C11): `--led-cyan` (used *without* a
 * fallback in MixerStrip.jsx), `--lcd-amber`, `--lg-accent-pink`, `--bg-deep`,
 * `--bg-base`, `--bg-surface-lighter`, `--surface-sunken`, `--color-bg-darker`,
 * `--color-alert-warning`, `--color-alert-error`, `--role-color`, `--theme-bg`.
 * tokens.css §1's compatibility aliases cover most of them; the remaining
 * usage (`--role-color`, in App.css's dead `.note-marker.active` rule) was
 * removed instead — see App.css.
 *
 * jsdom does not resolve CSS custom properties (CLAUDE.md "Pièges du
 * dépôt"), so this is a static source scan, not a rendered check.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const STYLES_DIR = path.join(SRC, "styles");

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

/**
 * Every `--name:` custom property declared anywhere under src/styles/*.css,
 * plus App.css and index.css — the two global stylesheets that also declare
 * their own root-level tokens (e.g. App.css's `--header-btn-width`).
 */
export function definedVariableNames() {
  const defined = new Set();
  const files = [
    ...collectFiles(STYLES_DIR, [".css"]),
    path.join(SRC, "App.css"),
    path.join(SRC, "index.css"),
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:^|[;{\s])(--[a-zA-Z0-9-]+)\s*:/g)) {
      defined.add(m[1]);
    }
  }
  return defined;
}

/**
 * Every `var(--name` usage under src/**\/*.{css,jsx,js} (excluding
 * __tests__), with whether that particular call carries its own fallback.
 */
export function varUsages() {
  const usages = [];
  for (const file of collectFiles(SRC, [".css", ".jsx", ".js"])) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*(,)?/g)) {
      usages.push({
        file: path.relative(SRC, file).replace(/\\/g, "/"),
        name: m[1],
        hasFallback: m[2] === ",",
      });
    }
  }
  return usages;
}

describe("CSS custom properties — every var(--x) resolves (VMU-149)", () => {
  it("actually scans a non-trivial number of files", () => {
    expect(collectFiles(SRC, [".css", ".jsx", ".js"]).length).toBeGreaterThan(50);
  });

  it("tokens.css defines the core role/surface/text tokens", () => {
    const defined = definedVariableNames();
    for (const name of ["--bg", "--surface-1", "--role-root", "--on-role", "--select", "--font-body"]) {
      expect(defined.has(name)).toBe(true);
    }
  });

  it("every var(--x) is either defined in src/styles/*.css or carries its own fallback", () => {
    const defined = definedVariableNames();
    const undefinedNoFallback = varUsages().filter(
      (u) => !defined.has(u.name) && !u.hasFallback
    );
    expect(undefinedNoFallback).toEqual([]);
  });
});
