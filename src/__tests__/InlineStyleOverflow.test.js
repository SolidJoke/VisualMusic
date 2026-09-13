/**
 * Inline styles — a `width: "100%"` element with horizontal padding or border
 * must be border-box.
 *
 * The companion of PhoneLayoutOverflow.test.js for what a stylesheet check
 * cannot see: style objects written in JSX. Two were measured overflowing on a
 * 390px phone, in the default content-box model:
 *
 *   InstrumentView — the fretboard wrapper, `width: "100%"` + `paddingLeft: "35px"`,
 *                    18px past its parent;
 *   TheoryLegend   — the legend panel, `width: "100%"` + `padding: "20px"` +
 *                    a 1px border, 42px past its parent when opened.
 *
 * Form controls are skipped: `<button>`, `<input>`, `<select>` and `<textarea>`
 * are border-box by the browser's own stylesheet. Measured, not assumed: the
 * DictionaryPanel full-width buttons compute to border-box, and a first version
 * of this check flagged them.
 *
 * What this does not see: a width passed as a prop. AudioVisualizer's frame
 * takes `width` from its caller and had the same defect (a 1px border, 2px too
 * wide); it was found in the browser, not by this scan, and is fixed at source.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const FORM_CONTROLS = new Set(["button", "input", "select", "textarea"]);

function jsxFiles(dir = SRC, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") jsxFiles(full, acc);
    } else if (entry.name.endsWith(".jsx")) {
      acc.push(full);
    }
  }
  return acc;
}

const isZero = (v) => /^0(px)?$/.test(v);

/**
 * @param {Array<{file: string, src: string}>} files
 * @returns {Array<{file: string, line: number, tag: string, widening: string[]}>}
 */
export function findInlineOverflow(files) {
  const offenders = [];
  for (const { file, src } of files) {
    for (const m of src.matchAll(/style=\{\{([\s\S]*?)\}\}/g)) {
      const body = m[1];
      if (!/(?<![A-Za-z])width:\s*["']100%["']/.test(body)) continue;
      if (/\bboxSizing\b/.test(body)) continue;

      const before = src.slice(0, m.index);
      const opened = [...before.matchAll(/<([a-zA-Z][\w.]*)\b/g)];
      const tag = opened.length ? opened[opened.length - 1][1] : "?";
      if (FORM_CONTROLS.has(tag.toLowerCase())) continue;

      const widening = [];
      for (const [, key, value] of body.matchAll(/\b(padding(?:Left|Right|Inline)?)\s*:\s*["']([^"']*)["']/g)) {
        const parts = value.trim().split(/\s+/);
        const horizontal = key === "padding" ? (parts.length === 1 ? parts[0] : parts[1]) : value.trim();
        if (horizontal && !isZero(horizontal)) widening.push(`${key}: ${value}`);
      }
      for (const [, key, value] of body.matchAll(/\b(border(?:Left|Right)?)\s*:\s*["']([^"']*)["']/g)) {
        if (!/^(none|0)\b/.test(value.trim())) widening.push(`${key}: ${value}`);
      }
      if (widening.length) {
        offenders.push({ file, line: before.split("\n").length, tag, widening });
      }
    }
  }
  return offenders;
}

const appFiles = () =>
  jsxFiles().map((file) => ({
    file: path.relative(SRC, file).replace(/\\/g, "/"),
    src: fs.readFileSync(file, "utf8"),
  }));

describe("inline styles — full-width padded or bordered elements are border-box", () => {
  const check = (src) => findInlineOverflow([{ file: "x.jsx", src }]);

  it("detects horizontal padding and borders on a full-width element", () => {
    expect(check('<div style={{ width: "100%", paddingLeft: "35px" }} />')).toHaveLength(1);
    expect(check('<div style={{ width: "100%", border: "1px solid red" }} />')).toHaveLength(1);
    expect(check('<div\n  className="x"\n  style={{\n    padding: "20px",\n    width: "100%",\n  }}\n/>')).toHaveLength(1);
  });

  it("accepts border-box, vertical-only padding, and form controls", () => {
    expect(check('<div style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} />')).toEqual([]);
    expect(check('<div style={{ width: "100%", padding: "8px 0" }} />')).toEqual([]);
    expect(check('<button style={{ width: "100%", padding: "10px" }} />')).toEqual([]);
    expect(check('<div style={{ maxWidth: "100%", padding: "8px" }} />')).toEqual([]);
  });

  it("actually reads the app's inline styles", () => {
    const files = appFiles();
    expect(files.length).toBeGreaterThan(30);
    const fullWidth = files.flatMap(({ src }) => [...src.matchAll(/width:\s*["']100%["']/g)]);
    expect(fullWidth.length).toBeGreaterThan(10);
  });

  it("no full-width inline-styled element is wider than its parent", () => {
    expect(findInlineOverflow(appFiles())).toEqual([]);
  });
});
