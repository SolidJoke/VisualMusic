/**
 * VMU-168 — no CSS rule may paint white text on a white background.
 *
 * Found in a build of `main` (1920 px, Studio & Harmonie window): the active
 * button "Variation A" had background, text and border all `rgb(255,255,255)`
 * because `.btn-premium.active` set `background: var(--lg-accent)` (= --select
 * = #fff) and `color: var(--text-on-select)` (#fff). F1 rule: an active
 * button / tab is `--surface-3` background, `--text-on-select` text, 1px
 * `--select` border — never a solid colour fill.
 *
 * jsdom does not resolve CSS custom properties, so this is a static scan: every
 * rule that declares BOTH a background and a text colour is resolved through the
 * token aliases (tokens.css) and rejected when both come out white. It cannot
 * see a background and a colour declared in two different rules of the cascade;
 * the in-page measurement (scripts/style_probe.mjs) covers that.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");

function collectCss(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") collectCss(full, acc);
    } else if (entry.name.endsWith(".css")) {
      acc.push(full);
    }
  }
  return acc;
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** Flat list of { selector, decls } — at-rule blocks (@media...) are descended into. */
export function parseRules(css) {
  const rules = [];
  const src = stripComments(css);
  let i = 0;
  const walk = (end) => {
    while (i < end) {
      const open = src.indexOf("{", i);
      if (open === -1 || open >= end) return;
      const head = src.slice(i, open).trim();
      // find matching close brace
      let depth = 1;
      let j = open + 1;
      while (j < end && depth > 0) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") depth--;
        j++;
      }
      const body = src.slice(open + 1, j - 1);
      if (head.startsWith("@")) {
        const saved = i;
        i = open + 1;
        walk(j - 1);
        i = j;
        void saved;
      } else {
        rules.push({ selector: head.replace(/\s+/g, " "), body });
        i = j;
      }
    }
  };
  walk(src.length);
  return rules;
}

function declarations(body) {
  const out = {};
  for (const part of body.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim().replace(/\s*!important$/i, "");
  }
  return out;
}

/** Custom properties declared on :root, across every stylesheet. */
function tokenMap(files) {
  const map = {};
  for (const file of files) {
    for (const rule of parseRules(fs.readFileSync(file, "utf8"))) {
      if (rule.selector !== ":root") continue;
      for (const [k, v] of Object.entries(declarations(rule.body))) {
        if (k.startsWith("--")) map[k] = v;
      }
    }
  }
  return map;
}

function resolve(value, tokens, depth = 0) {
  if (depth > 10) return value;
  let v = value.trim();
  const re = /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]*))?\)/;
  let m;
  while ((m = re.exec(v))) {
    const replacement = tokens[m[1]] !== undefined ? resolve(tokens[m[1]], tokens, depth + 1) : (m[2] ?? "");
    v = v.replace(m[0], replacement);
  }
  return v.trim();
}

export function isWhite(value) {
  const v = value.trim().toLowerCase();
  if (v === "#fff" || v === "#ffffff" || v === "white") return true;
  const m = /^rgba?\(\s*255\s*[, ]\s*255\s*[, ]\s*255\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(v);
  return !!m && (m[1] === undefined || parseFloat(m[1]) >= 1);
}

/** A shorthand `background:` counts only when its whole value is a single colour. */
const backgroundColor = (d) => d["background-color"] ?? d["background"];

export function findWhiteOnWhite() {
  const files = collectCss(SRC);
  const tokens = tokenMap(files);
  const hits = [];
  for (const file of files) {
    for (const rule of parseRules(fs.readFileSync(file, "utf8"))) {
      const d = declarations(rule.body);
      const bg = backgroundColor(d);
      const fg = d["color"];
      if (bg === undefined || fg === undefined) continue;
      if (isWhite(resolve(bg, tokens)) && isWhite(resolve(fg, tokens))) {
        hits.push(`${path.relative(SRC, file).split(path.sep).join("/")}: ${rule.selector}  (background: ${bg}; color: ${fg})`);
      }
    }
  }
  return hits;
}

describe("no white-on-white rule (VMU-168)", () => {
  it("the scan finds the token map and a non-trivial number of rules", () => {
    const files = collectCss(SRC);
    expect(files.length).toBeGreaterThan(10);
    expect(tokenMap(files)["--select"]).toBe("#ffffff");
  });

  it("resolves aliases: --lg-accent and --text-on-select are both white", () => {
    const tokens = tokenMap(collectCss(SRC));
    expect(isWhite(resolve("var(--lg-accent)", tokens))).toBe(true);
    expect(isWhite(resolve("var(--text-on-select)", tokens))).toBe(true);
    expect(isWhite(resolve("var(--surface-3)", tokens))).toBe(false);
  });

  it("no rule has a white background and a white text colour", () => {
    expect(findWhiteOnWhite()).toEqual([]);
  });
});
