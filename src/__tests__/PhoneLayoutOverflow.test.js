/**
 * Phone layout — a full-width container must not be wider than the screen.
 *
 * Under 768px, App.css gave `.layout-col` and `.app-main-content` both
 * `width: 100% !important` and `padding: 8px`, in the default content-box model.
 * Such a box is its parent's width PLUS its padding. Measured in the browser at
 * 390px: `.app-main-content` 406px, and inside it `.layout-col` and
 * `#instrument-view` each 16px past their parent. `.app-container-inner` hides
 * horizontal overflow, so nothing scrolled: the right 16px of the keyboard, the
 * fretboards and the instrument bar were simply cut off.
 *
 * jsdom has no layout engine, so the overflow itself cannot be measured here.
 * What CAN be checked is the rule that produces it: when a phone media block
 * makes a selector 100% wide, the declarations that apply to that selector on a
 * phone — its unconditional rules plus its phone rules, merged — must not add
 * horizontal padding or border in the content-box model.
 *
 * Merged, because the defect does not have to sit in one rule. `.fretboard`
 * takes a 2px border from its base rule and `width: 100% !important` from a
 * phone block; neither rule alone shows it, the browser measured it 2px wide.
 *
 * Kept deliberately narrow. A first, global version (every rule, every media,
 * rule by rule) flagged 17 rules, of which the browser showed 15 were not
 * overflowing anything. A guard that cries wolf gets deleted. Only phone blocks
 * that set width 100% are policed here.
 *
 * Inline JSX styles are covered by InlineStyleOverflow.test.js.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const PHONE_WIDTH = 390;
const PHONE_MAX_WIDTH = 768;

function cssFiles(dir = SRC, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") cssFiles(full, acc);
    } else if (entry.name.endsWith(".css")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Removes comments while keeping line numbers stable. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (c) => "\n".repeat((c.match(/\n/g) || []).length));
}

/** Flat list of style rules, each with the @media preludes that enclose it. */
function parseRules(css) {
  const text = stripComments(css);
  const out = [];
  const stack = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      stack.push({ prelude: buf.trim(), start: i });
      buf = "";
    } else if (c === "}") {
      const open = stack.pop();
      buf = "";
      if (!open) continue;
      const body = text.slice(open.start + 1, i);
      if (!open.prelude.startsWith("@") && !body.includes("{")) {
        out.push({
          selectors: open.prelude.split(",").map((s) => s.trim().replace(/\s+/g, " ")),
          declarations: parseDeclarations(body),
          media: stack.map((s) => s.prelude).filter((p) => p.startsWith("@media")),
          line: text.slice(0, open.start).split("\n").length,
        });
      }
    } else {
      buf += c;
      if (c === ";" && (!stack.length || stack[stack.length - 1].prelude.startsWith("@"))) buf = "";
    }
  }
  return out;
}

function parseDeclarations(body) {
  const decl = {};
  for (const part of body.split(";")) {
    const idx = part.indexOf(":");
    if (idx > 0) {
      decl[part.slice(0, idx).trim().toLowerCase()] = part
        .slice(idx + 1)
        .replace("!important", "")
        .trim()
        .toLowerCase();
    }
  }
  return decl;
}

const isZero = (v) => /^0(px|rem|em|%)?$/.test(v);

/** Non-zero horizontal padding and border lengths in a declaration set. */
function horizontalWidening(decl) {
  const found = [];
  if (decl.padding) {
    const v = decl.padding.split(/\s+/);
    const h = v.length === 1 ? [v[0], v[0]] : v.length <= 3 ? [v[1], v[1]] : [v[1], v[3]];
    found.push(...h.filter((x) => x && !isZero(x)).map((x) => `padding ${x}`));
  }
  for (const side of ["padding-left", "padding-right", "padding-inline"]) {
    if (decl[side] && !isZero(decl[side])) found.push(`${side} ${decl[side]}`);
  }
  for (const side of ["border", "border-left", "border-right"]) {
    const v = decl[side];
    if (!v || /^(none|0)\b/.test(v) || /\b0px\b/.test(v)) continue;
    found.push(`${side} ${v}`);
  }
  return found;
}

const maxWidths = (media) => media.flatMap((m) => [...m.matchAll(/max-width:\s*(\d+)px/g)].map((x) => Number(x[1])));
const minWidths = (media) => media.flatMap((m) => [...m.matchAll(/min-width:\s*(\d+)px/g)].map((x) => Number(x[1])));

/** A phone-specific block: bounded by a max-width no wider than the phone breakpoint. */
const isPhoneBlock = (media) => maxWidths(media).some((w) => w <= PHONE_MAX_WIDTH);

/** Whether the rule is in force on a 390px screen at all. */
const appliesOnPhone = (media) =>
  minWidths(media).every((w) => w <= PHONE_WIDTH) && maxWidths(media).every((w) => w >= PHONE_WIDTH);

/**
 * @param {Array<{file: string, css: string}>} sheets
 * @returns {Array<{file: string, line: number, selector: string, widening: string[]}>}
 */
export function findPhoneOverflowRules(sheets) {
  const rules = sheets.flatMap(({ file, css }) => parseRules(css).map((r) => ({ ...r, file })));

  const merged = new Map();
  for (const r of rules) {
    if (!appliesOnPhone(r.media)) continue;
    for (const selector of r.selectors) {
      const entry = merged.get(selector) || { decl: {}, fullWidthAt: null };
      Object.assign(entry.decl, r.declarations);
      if (isPhoneBlock(r.media) && r.declarations.width === "100%") {
        entry.fullWidthAt = { file: r.file, line: r.line };
      }
      merged.set(selector, entry);
    }
  }

  const offenders = [];
  for (const [selector, { decl, fullWidthAt }] of merged) {
    if (!fullWidthAt || decl.width !== "100%") continue;
    if ((decl["box-sizing"] || "").includes("border-box")) continue;
    const widening = horizontalWidening(decl);
    if (widening.length) offenders.push({ ...fullWidthAt, selector, widening });
  }
  return offenders;
}

const appSheets = () =>
  cssFiles().map((file) => ({
    file: path.relative(SRC, file).replace(/\\/g, "/"),
    css: fs.readFileSync(file, "utf8"),
  }));

describe("phone layout — full-width padded or bordered containers are border-box", () => {
  // The checker is tested before it is trusted: a parser that silently reads
  // nothing would report no offenders and pass forever.
  it("detects padding set in the phone rule itself", () => {
    const css = "@media (max-width: 767px) { .col { width: 100% !important; padding: 8px; } }";
    expect(findPhoneOverflowRules([{ file: "x.css", css }])).toHaveLength(1);
  });

  it("detects a border inherited from the base rule (the .fretboard shape)", () => {
    const css = ".fb { border: 2px solid #000; padding: 10px 0; }\n" +
      "@media (max-width: 768px) { .fb { width: 100% !important; } }";
    expect(findPhoneOverflowRules([{ file: "x.css", css }])).toHaveLength(1);
  });

  it("accepts border-box, vertical-only padding, and desktop-only rules", () => {
    const fixedElsewhere = ".col { box-sizing: border-box; }\n" +
      "@media (max-width: 767px) { .col { width: 100%; padding: 8px; } }";
    const verticalOnly = "@media (max-width: 767px) { .col { width: 100%; padding: 8px 0; } }";
    const desktop = "@media (min-width: 1440px) { .col { width: 100%; padding: 8px; } }";
    for (const css of [fixedElsewhere, verticalOnly, desktop]) {
      expect(findPhoneOverflowRules([{ file: "x.css", css }])).toEqual([]);
    }
  });

  it("actually reads the app's phone rules", () => {
    const phoneRules = appSheets()
      .flatMap(({ css }) => parseRules(css))
      .filter((r) => isPhoneBlock(r.media));
    expect(phoneRules.length).toBeGreaterThan(20);
    expect(phoneRules.some((r) => r.selectors.includes(".main-layout-grid"))).toBe(true);
  });

  it("no phone rule makes a container 100% wide and wider than its parent", () => {
    expect(findPhoneOverflowRules(appSheets())).toEqual([]);
  });
});
