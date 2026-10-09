// L1a-fix2 follow-up (Gabriel, 2026-10-06): "Pour la couleur du manche on peut
// avoir une couleur un peu différente. La règle de couleurs F1 est trop stricte
// et on va devoir la faire évoluer, mais on fera ça plus tard."
//
// The vertical neck's board colour is one variable (--fbv-board in
// Fretboard.css), a token. It was --surface-1 (#0a0a0a on a #000 page: almost
// invisible); it is --surface-3 (#1f1f1f) until the F1 rule for large surfaces
// is reviewed (VMU-183). A lighter board costs contrast to what is drawn ON it,
// so this file keeps the neck legible whatever token the variable names:
//
//   - non-text (WCAG 1.4.11, >= 3:1) against the board: the strings (--string),
//     the fret wires (--fret-wire) and the fret markers (--border-strong), the
//     scale notes' edge (--role-scale-edge), and the role fills of a pastille;
//   - text (WCAG 1.4.3, >= 4.5:1): the scale notes' label (--text-secondary,
//     they have no fill, so it sits on the board), and every pastille's label
//     (--on-role) on its own fill.
// The fret numbers and the open-string names sit on the page (the gutter and
// the head rows have no board): they do not depend on this variable.
//
// A static read of the stylesheets (jsdom resolves no custom property): the
// in-page colours were also measured in Chromium when the board was changed.
// The tokens are resolved through their aliases, as ActiveStateContrast.test.js
// does. Hex literals appear here only as a positive control of the helper
// (this folder is outside LiteralColors.test.js's scope, as every __tests__).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.resolve(p), "utf8");
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

const tokens = (() => {
  const map = new Map();
  for (const m of stripComments(read("src/styles/tokens.css")).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (!map.has(m[1])) map.set(m[1], m[2].trim());
  }
  return map;
})();

/** "#1f1f1f" | "var(--x)" | "var(--x, fallback)" -> { r, g, b } through the aliases. */
function resolve(value, seen = new Set()) {
  const v = value.trim();
  const alias = v.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]*)?\)$/);
  if (alias) {
    if (seen.has(alias[1])) throw new Error(`alias loop on ${alias[1]}`);
    if (!tokens.has(alias[1])) throw new Error(`${alias[1]} is not a token of tokens.css`);
    return resolve(tokens.get(alias[1]), new Set([...seen, alias[1]]));
  }
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (!hex) throw new Error(`cannot resolve "${value}" to a #rrggbb colour`);
  const n = parseInt(hex[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const lin = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const neckCss = stripComments(read("src/components/Instruments/Fretboard.css"));
const token = (name) => resolve(`var(${name})`);
const board = () => {
  const m = neckCss.match(/--fbv-board:\s*([^;]+);/);
  if (!m) throw new Error("--fbv-board is not declared in Fretboard.css");
  return resolve(m[1]);
};

describe("the vertical neck's board colour", () => {
  it("is ONE variable, a token: declared once, read by the fret rows, no colour literal", () => {
    expect(neckCss.match(/--fbv-board\s*:/g)).toHaveLength(1);
    expect(neckCss).toMatch(/--fbv-board:\s*var\(--[a-z0-9-]+\)\s*;/);
    expect(neckCss).toMatch(/linear-gradient\([^;]*var\(--fbv-board,/);
    // The only colour on the board's own rule is the token the variable names.
    expect(neckCss.match(/--fbv-board:[^;]*#[0-9a-f]{3,8}/i)).toBeNull();
  });

  it("is the token Gabriel's review asked for: --surface-3, a more marked board than --surface-1", () => {
    expect(neckCss).toMatch(/--fbv-board:\s*var\(--surface-3\)/);
    expect(luminance(board())).toBeGreaterThan(luminance(token("--surface-1")));
  });

  describe("what is drawn on it keeps its contrast", () => {
    const NON_TEXT = [
      ["the strings", "--string"],
      ["the fret wires", "--fret-wire"],
      ["the fret markers", "--border-strong"],
      ["the scale notes' edge", "--role-scale-edge"],
      ["a root pastille", "--role-root"],
      ["a third pastille", "--role-third"],
      ["a fifth pastille", "--role-fifth"],
      ["an extension pastille", "--role-extension"],
      ["a target-note pastille", "--role-target"],
    ];
    it.each(NON_TEXT)("%s (%s) are at least 3:1 against the board (WCAG 1.4.11)", (_what, name) => {
      expect(contrast(token(name), board())).toBeGreaterThanOrEqual(3);
    });

    it("the scale notes' label (--text-secondary, no fill) is at least 4.5:1 against the board", () => {
      expect(contrast(token("--text-secondary"), board())).toBeGreaterThanOrEqual(4.5);
    });

    it.each(["--role-root", "--role-third", "--role-fifth", "--role-extension", "--role-target"])(
      "the label of a pastille filled with %s (--on-role) is at least 4.5:1 on that fill",
      (fill) => {
        expect(contrast(token("--on-role"), token(fill))).toBeGreaterThanOrEqual(4.5);
      }
    );
  });

  it("positive control: the helper does see a board that is too light for the wires and markers", () => {
    // #6b6b6b (--border-strong) on #1f1f1f is about 3.09:1; on #2a2a2a it drops under 3:1.
    expect(contrast(token("--border-strong"), resolve("#1f1f1f"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("--border-strong"), resolve("#2a2a2a"))).toBeLessThan(3);
  });
});
