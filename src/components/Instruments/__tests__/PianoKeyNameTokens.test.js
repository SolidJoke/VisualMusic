/**
 * L1b-1a — the quiet grey of the key names on the vertical piano of A', by
 * TWO TOKENS of tokens.css (literal colours live there only): one for the name
 * of an unplayed white key (on --key-white), one for an unplayed black key (on
 * --key-black). Both must read at 4.5:1 or more on their own key; the
 * existing --text-muted (#8c8c8c) does not on the white key (2.16:1), which is
 * why a single grey would not do.
 *
 * jsdom resolves no custom property, so this is a static scan: the tokens are
 * read from tokens.css and resolved through their var() aliases, the contrast
 * is computed with the WCAG formula, and PianoKeyboard.css is checked to wire
 * each token to the right key. The colours actually rendered, and their
 * contrast against what is really behind them, are measured in Chromium by
 * scripts/s1_probe.mjs (S1-22).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const tokensCss = stripComments(fs.readFileSync(path.join(SRC, "styles", "tokens.css"), "utf8"));
const pianoCss = stripComments(fs.readFileSync(path.join(SRC, "components", "Instruments", "PianoKeyboard.css"), "utf8"));

/** The :root block's declarations, name -> raw value. */
function tokens() {
  const root = tokensCss.slice(tokensCss.indexOf(":root"), tokensCss.indexOf("}", tokensCss.indexOf(":root")));
  const out = {};
  for (const m of root.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function resolve(value, t, depth = 0) {
  const m = /^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)$/.exec(value);
  if (!m) return value;
  if (depth > 10 || !(m[1] in t)) return null;
  return resolve(t[m[1]], t, depth + 1);
}

const luminance = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const c = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** The declarations of every rule of PianoKeyboard.css whose selector contains `needle`. */
function rulesWith(needle) {
  const out = [];
  for (const m of pianoCss.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].includes(needle)) out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

describe("L1b-1a: the quiet grey of the key names, by two tokens", () => {
  const t = tokens();

  it("defines --key-name-on-white and --key-name-on-black, each resolving to a colour", () => {
    for (const n of ["--key-name-on-white", "--key-name-on-black"]) {
      expect(t[n], n).toBeDefined();
      expect(resolve(t[n], t), n).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  /** A token resolved to its colour, or a clear failure when it is missing. */
  const colour = (name) => {
    expect(t[name], `${name} is defined in tokens.css`).toBeDefined();
    const value = resolve(t[name], t);
    expect(value, `${name} resolves to a colour`).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    return value;
  };

  it("positive control: the existing --text-muted would NOT read on the white key", () => {
    const ratio = contrast(resolve(t["--text-muted"], t), resolve(t["--key-white"], t));
    expect(ratio).toBeLessThan(4.5);
    expect(Math.round(ratio * 100) / 100).toBe(2.16);
  });

  it("reads at 4.5:1 or more on its own key: white-key name on --key-white, black-key name on --key-black", () => {
    const onWhite = contrast(colour("--key-name-on-white"), colour("--key-white"));
    const onBlack = contrast(colour("--key-name-on-black"), colour("--key-black"));
    expect(onWhite, `white: ${onWhite.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    expect(onBlack, `black: ${onBlack.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it("stays quiet: each token is a grey (r = g = b), and the white-key one is not the black text of a lit key", () => {
    // "Gris discret": not a role colour, not the --on-role black a lit key's text keeps.
    for (const n of ["--key-name-on-white", "--key-name-on-black"]) {
      const hex = colour(n).replace("#", "");
      expect(hex.slice(0, 2), n).toBe(hex.slice(2, 4));
      expect(hex.slice(2, 4), n).toBe(hex.slice(4, 6));
    }
    expect(colour("--key-name-on-white").toLowerCase()).not.toBe(colour("--on-role").toLowerCase());
  });

  it("is wired in PianoKeyboard.css: each key's unplayed label takes its own token, at full opacity", () => {
    const onWhite = rulesWith(".white-key .note-label--unplayed").filter((r) => !r.selector.includes(".flat-label"));
    const onBlack = rulesWith(".black-key .note-label--unplayed").filter((r) => !r.selector.includes(".flat-label"));
    expect(onWhite.some((r) => /color:\s*var\(--key-name-on-white\b/.test(r.body)), "white-key rule").toBe(true);
    expect(onBlack.some((r) => /color:\s*var\(--key-name-on-black\b/.test(r.body)), "black-key rule").toBe(true);
    // The flat name's 0.9 opacity (.flat-label) would pull the black key's grey under 4.5:1.
    const flat = rulesWith(".note-label--unplayed .flat-label");
    expect(flat.some((r) => /opacity:\s*1\b/.test(r.body)), "flat-label opacity").toBe(true);
    // Scoped to the vertical keyboard: the horizontal one never carries the class.
    for (const r of [...onWhite, ...onBlack, ...flat]) expect(r.selector, r.selector).toContain(".piano-vertical");
    expect(pianoCss.replace(/--key-name-on-(white|black)/g, "")).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
