/**
 * VMU-184 (Gabriel, 2026-10-09) — the "Assistant · Studio & Harmonie /
 * Dictionnaire" button stands out: a mauve -> black gradient, through NEW
 * TOKENS of tokens.css (literal colours live there only), light text at
 * 4.5:1 or more, readable active / hover / focus states, data-fn kept.
 * F1's "no solid colour fill" is relaxed for this one button (VMU-183, Gabriel:
 * "trop stricte"). A transition dressing: the Assistant will melt into the dock.
 *
 * jsdom resolves no custom property, so this is a static scan: the tokens are
 * read from tokens.css and resolved through their var() aliases, the contrast
 * is computed with the WCAG formula on every stop the text can sit on (the
 * gradient's two ends, at rest and on hover). The rendered colours are
 * measured in Chromium by scripts/s1_probe.mjs (S1-20).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const tokensCss = fs.readFileSync(path.join(SRC, "styles", "tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const protoCss = fs.readFileSync(path.join(SRC, "prototype", "PrototypeA.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

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

/** The declarations of the rules whose selector contains `needle`. */
function rulesWith(needle) {
  const out = [];
  for (const m of protoCss.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].includes(needle)) out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

describe("VMU-184: the Assistant button's mauve -> black gradient, by tokens", () => {
  const t = tokens();
  const NAMES = ["--assistant-from", "--assistant-from-hover", "--assistant-to", "--assistant-text", "--assistant-border"];

  it("defines its tokens in tokens.css, each resolving to a colour", () => {
    for (const n of NAMES) {
      expect(t[n], n).toBeDefined();
      expect(resolve(t[n], t), n).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it("goes from a mauve to black", () => {
    const from = resolve(t["--assistant-from"], t).toLowerCase();
    const r = parseInt(from.slice(1, 3), 16);
    const g = parseInt(from.slice(3, 5), 16);
    const b = parseInt(from.slice(5, 7), 16);
    // mauve: blue and red above green, blue the strongest
    expect(b > r && r > g).toBe(true);
    expect(resolve(t["--assistant-to"], t).toLowerCase()).toMatch(/^#0{3}(0{3})?$/);
  });

  it("keeps its light text at 4.5:1 or more on every colour of the gradient, at rest and on hover", () => {
    const text = resolve(t["--assistant-text"], t);
    for (const stop of ["--assistant-from", "--assistant-from-hover", "--assistant-to"]) {
      const ratio = contrast(text, resolve(t[stop], t));
      expect(ratio, `${stop}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("draws its edge at 3:1 or more against the page (WCAG 1.4.11)", () => {
    const ratio = contrast(resolve(t["--assistant-border"], t), resolve(t["--bg"], t));
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it("is styled in PrototypeA.css by those tokens only: gradient, hover, focus and active states, no literal colour", () => {
    const base = rulesWith(".proto-a__assistant").find((r) => !/:hover|:focus|is-active/.test(r.selector));
    expect(base, "a rule for .proto-a__assistant").toBeDefined();
    expect(base.body).toMatch(/linear-gradient\([^;]*var\(--assistant-from\b[^;]*var\(--assistant-to\b/);
    expect(base.body).toMatch(/color:\s*var\(--assistant-text\b/);
    expect(base.body).toMatch(/border-color:\s*var\(--assistant-border\b/);
    expect(rulesWith(".proto-a__assistant:hover").some((r) => /var\(--assistant-from-hover\b/.test(r.body))).toBe(true);
    expect(rulesWith(".proto-a__assistant:focus-visible").some((r) => /var\(--focus-ring\b/.test(r.body))).toBe(true);
    expect(rulesWith(".proto-a__assistant.is-active").some((r) => /var\(--select\b/.test(r.body))).toBe(true);
    expect(protoCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
