/**
 * VMU-120 — fold-section header layout must not depend on a media query.
 *
 * Coordinator browser QA (2026-09-14, after VMU-112 merged) measured the
 * defect at an emulated 2560x1440: `.fold-section__header` computed to
 * `display: inline-block`, `padding: 1px 6px`, height 22-23px,
 * `cursor: default`, title and state-indicator overlapping around
 * x=836-912 on a button spanning x=731->2175. 1280px and 390px were fine.
 *
 * Cause: `.panel__header`'s layout (flex, space-between, padding 12px 16px,
 * pointer cursor) lives only inside `@media (max-width: 2559px)`
 * (src/App.css, "Collapse UI for 1440px"). VMU-112's `button.panel__header`
 * reset strips native `<button>` chrome unconditionally but never restores
 * a layout, so above 2559px there is nothing left but browser defaults.
 *
 * jsdom has neither a media-query engine nor layout, so the pixel defect
 * itself cannot be reproduced here (the coordinator verifies that in the
 * browser at 2560, 1280 and 390px). What CAN be checked statically is the
 * rule that causes it: whether `.fold-section__header` declares its own
 * `display: flex` / `cursor: pointer` OUTSIDE any `@media` block, so the
 * layout survives regardless of viewport width. Modelled on the
 * `@media`-parsing guard in PhoneLayoutOverflow.test.js (PR #105).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const APP_CSS = path.resolve("src/App.css");

/** Removes comments while keeping line numbers stable. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (c) => "\n".repeat((c.match(/\n/g) || []).length));
}

/**
 * Flat list of top-level style rules (selectors + declarations), each
 * tagged with whether an @media block encloses it.
 */
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
          insideMedia: stack.some((s) => s.prelude.startsWith("@media")),
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

/** Declarations for `selector` merged from unconditional (non-@media) rules only. */
function unconditionalDeclarations(css, selector) {
  const decl = {};
  for (const rule of parseRules(css)) {
    if (rule.insideMedia) continue;
    if (rule.selectors.includes(selector)) Object.assign(decl, rule.declarations);
  }
  return decl;
}

describe("fold-section header layout is unconditional (VMU-120)", () => {
  // The checker is tested before it is trusted: a parser that silently
  // reads nothing would report an empty object and pass for the wrong
  // reason.
  it("reads an unconditional declaration and ignores a media-scoped one for the same property", () => {
    const css = ".x { color: red; }\n@media (max-width: 2559px) { .x { color: blue; } }";
    expect(unconditionalDeclarations(css, ".x")).toEqual({ color: "red" });
  });

  it("merges declarations across two unconditional rules for the same selector", () => {
    const css = ".x { color: red; }\n.x { cursor: pointer; }";
    expect(unconditionalDeclarations(css, ".x")).toEqual({ color: "red", cursor: "pointer" });
  });

  it(".fold-section__header declares display:flex and cursor:pointer outside any @media block", () => {
    const css = fs.readFileSync(APP_CSS, "utf8");
    const decl = unconditionalDeclarations(css, ".fold-section__header");
    expect(decl.display).toBe("flex");
    expect(decl.cursor).toBe("pointer");
  });
});
