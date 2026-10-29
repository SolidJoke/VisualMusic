/**
 * VMU-193 / VMU-194 (Gabriel, 2026-10-29) — the Assistant's mauve -> black
 * gradient reaches A′'s step buttons (the tempo's − / + and every ‹ / › head
 * arrow), and the master volume slider is visible and filled with that same
 * gradient in Chromium AND Gecko.
 *
 * jsdom resolves neither custom properties nor pseudo-elements, so, like
 * AssistantButtonTokens.test.js, this is a static scan of the stylesheets:
 * comments stripped, rules found by selector, their declarations matched.
 * What the browser actually paints is measured elsewhere (S1 probes).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve("src");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const protoCss = strip(fs.readFileSync(path.join(SRC, "prototype", "PrototypeA.css"), "utf8"));
const appCss = strip(fs.readFileSync(path.join(SRC, "App.css"), "utf8"));

/** Every `selector { body }` whose selector contains `needle`, with its
 *  position in the file (`index`) so cascade tests can compare source order. */
function rulesWith(css, needle) {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].includes(needle)) out.push({ selector: m[1].trim(), body: m[2], index: m.index });
  }
  return out;
}

/** Number of class selectors and pseudo-classes in one complex selector.
 *  That is enough to rank the selectors involved here: both are made of
 *  classes only (no id, no element selector), so the count is the (0,b,0)
 *  part of the specificity that decides between them. Comments are gone. */
function classSpecificity(selector) {
  return (selector.match(/\.[\w-]+|:(?!:)[\w-]+/g) || []).length;
}

const isState = (r) => /:hover|:disabled|:focus/.test(r.selector);
const GRADIENT = /linear-gradient\(/;
const LITERAL_COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

/** The Assistant's rest appearance, expected on the new targets. */
function expectAssistantLook(rule, what) {
  expect(rule, `a rest rule for ${what}`).toBeDefined();
  expect(rule.body, what).toMatch(/linear-gradient\([^;]*var\(--assistant-from\b[^;]*var\(--assistant-to\b/);
  expect(rule.body, what).toMatch(/color:\s*var\(--assistant-text\b/);
  expect(rule.body, what).toMatch(/border-color:\s*var\(--assistant-border\b/);
}

describe("VMU-193: the Assistant's gradient on A′'s step buttons", () => {
  const tempo = rulesWith(protoCss, ".proto-a__tempo .proto-a__btn--square");
  const arrows = rulesWith(protoCss, ".proto-a__head-arrow");
  const TARGETS = [
    ["the tempo's − / +", tempo],
    ["the ‹ / › head arrows", arrows],
  ];

  it("the tempo's − / + take the Assistant's rest look", () => {
    expectAssistantLook(tempo.find((r) => !isState(r)), "the tempo's − / +");
  });

  it("every ‹ / › head arrow takes the Assistant's rest look", () => {
    expectAssistantLook(arrows.find((r) => !isState(r)), "the ‹ / › head arrows");
  });

  it("the arrows' rest gradient wins the cascade over .proto-a__head-btn", () => {
    // Every arrow carries BOTH classes `proto-a__head-btn proto-a__head-arrow`
    // (see PrototypeA.jsx). A rule for `.proto-a .proto-a__head-arrow` and the
    // existing `.proto-a .proto-a__head-btn { background: var(--bg) }` therefore
    // have the SAME specificity (0,2,0): whichever comes later in the file
    // paints. If the gradient rule sits earlier, the arrows are flat at rest —
    // the regression this test guards. So the gradient's arrow selector must
    // either be strictly more specific, or tie on specificity and come later.
    const gradientRule = rulesWith(protoCss, ".proto-a__head-arrow").find(
      (r) => !isState(r) && GRADIENT.test(r.body)
    );
    expect(gradientRule, "the arrows' rest gradient rule").toBeDefined();

    // The rule may group several selectors; take the part that targets the
    // arrow, since that is the one matching the element.
    const arrowSelector = gradientRule.selector
      .split(",")
      .map((s) => s.trim())
      .find((s) => s.includes(".proto-a__head-arrow"));
    expect(arrowSelector, "an arrow selector in the gradient rule").toBeDefined();

    // The flat rule the arrows must beat: the head-btn rule with no state
    // and no Assistant gradient (the fixed arrow rule also names
    // .proto-a__head-btn, so it must be excluded here).
    const baseRule = rulesWith(protoCss, ".proto-a__head-btn").find(
      (r) => !r.selector.includes(":") && !GRADIENT.test(r.body)
    );
    expect(baseRule, "the flat .proto-a__head-btn background rule").toBeDefined();

    const gradientSpecificity = classSpecificity(arrowSelector);
    const baseSpecificity = classSpecificity(baseRule.selector);

    expect(
      gradientSpecificity > baseSpecificity ||
        (gradientSpecificity === baseSpecificity && gradientRule.index > baseRule.index),
      `"${arrowSelector}" (specificity ${gradientSpecificity}, index ${gradientRule.index}) must beat ` +
        `"${baseRule.selector}" (specificity ${baseSpecificity}, index ${baseRule.index})`
    ).toBe(true);
  });

  it("both take the lighter hover gradient, when not disabled", () => {
    for (const [what, list] of TARGETS) {
      const hover = list.filter((r) => r.selector.includes(":hover"));
      expect(hover.length, `${what}: a hover rule`).toBeGreaterThan(0);
      expect(hover.some((r) => /var\(--assistant-from-hover\b/.test(r.body)), what).toBe(true);
      expect(hover.every((r) => r.selector.includes(":disabled")), `${what}: hover skips disabled`).toBe(true);
    }
  });

  it("a disabled step button keeps its muted look: no gradient", () => {
    for (const [what, list] of TARGETS) {
      // A disabled rule proper — not the hover rule's :not(:disabled) guard.
      const disabled = list.filter((r) => /:disabled/.test(r.selector) && !/:hover|:focus/.test(r.selector));
      expect(disabled.length, `${what}: a :disabled rule`).toBeGreaterThan(0);
      for (const r of disabled) expect(r.body, `${what}: ${r.selector}`).not.toMatch(GRADIENT);
    }
  });

  it("leaves the ▶ play button alone: no gradient rule for .proto-a__head-play", () => {
    for (const r of rulesWith(protoCss, ".proto-a__head-play")) {
      expect(r.body, r.selector).not.toMatch(GRADIENT);
      expect(r.body, r.selector).not.toMatch(/--assistant-/);
    }
  });
});

describe("VMU-194: A′'s volume slider, visible and filled in Chromium and Gecko", () => {
  const sliderRules = (pseudo) => rulesWith(protoCss, `.proto-a__volume-slider${pseudo}`);

  it("has a visible 8px track for both engines: --surface-3, --border-strong", () => {
    for (const pseudo of ["::-webkit-slider-runnable-track", "::-moz-range-track"]) {
      const rs = sliderRules(pseudo);
      expect(rs.length, pseudo).toBeGreaterThan(0);
      for (const r of rs) {
        expect(r.selector, `${pseudo} is scoped to .proto-a`).toMatch(/\.proto-a \.proto-a__volume-slider/);
        expect(r.body, pseudo).toMatch(/height:\s*8px/);
        expect(r.body, pseudo).toMatch(/var\(--surface-3\b/);
        expect(r.body, pseudo).toMatch(/1px solid var\(--border-strong\b/);
      }
    }
  });

  it("fills the left of the thumb with the Assistant gradient, in both engines", () => {
    // Chromium: the track's background, limited to --value (the filled %).
    const webkit = sliderRules("::-webkit-slider-runnable-track");
    expect(
      webkit.some(
        (r) =>
          /var\(--value\b/.test(r.body) &&
          /var\(--assistant-from\b/.test(r.body) &&
          /var\(--assistant-to\b/.test(r.body)
      ),
      "Chromium: --value + the gradient on the track"
    ).toBe(true);
    // Gecko: its own progress element, which only covers the filled part.
    const progress = sliderRules("::-moz-range-progress");
    expect(progress.length, "::-moz-range-progress").toBeGreaterThan(0);
    expect(
      progress.some(
        (r) => /linear-gradient\([^;]*var\(--assistant-from\b/.test(r.body) && /var\(--assistant-to\b/.test(r.body)
      ),
      "Gecko: the Assistant gradient on ::-moz-range-progress"
    ).toBe(true);
  });

  it("shows a 24px round thumb in the Assistant's colours in both engines", () => {
    for (const pseudo of ["::-webkit-slider-thumb", "::-moz-range-thumb"]) {
      const rs = sliderRules(pseudo);
      expect(rs.length, pseudo).toBeGreaterThan(0);
      const body = rs.map((r) => r.body).join(";");
      expect(body, pseudo).toMatch(/width:\s*24px/);
      expect(body, pseudo).toMatch(/height:\s*24px/);
      expect(body, pseudo).toMatch(/border-radius:\s*50%/);
      expect(body, pseudo).toMatch(/background:\s*var\(--assistant-text\b/);
      expect(body, pseudo).toMatch(/border:\s*2px solid var\(--assistant-border\b/);
    }
    // The webkit thumb is centred on the track by hand.
    expect(
      sliderRules("::-webkit-slider-thumb").some((r) => /margin-top:\s*-\d+px/.test(r.body)),
      "webkit thumb margin-top"
    ).toBe(true);
  });
});

describe("VMU-194: Gecko parity for every range input (App.css)", () => {
  it("mirrors the webkit track and thumb with ::-moz-range-track / ::-moz-range-thumb", () => {
    const track = rulesWith(appCss, 'input[type="range"]::-moz-range-track');
    const thumb = rulesWith(appCss, 'input[type="range"]::-moz-range-thumb');
    expect(track.length, 'input[type="range"]::-moz-range-track').toBeGreaterThan(0);
    expect(thumb.length, 'input[type="range"]::-moz-range-thumb').toBeGreaterThan(0);
    expect(track[0].body).toMatch(/height:\s*4px/);
    expect(track[0].body).toMatch(/var\(--surface-1\b/);
    expect(thumb[0].body).toMatch(/height:\s*28px/);
    expect(thumb[0].body).toMatch(/width:\s*14px/);
    expect(thumb[0].body).toMatch(/border:\s*1px solid var\(--border-strong\b/);
  });
});

describe("VMU-193/194: the added rules use tokens only", () => {
  it("has no literal colour in the rules added to PrototypeA.css", () => {
    const added = [
      ...rulesWith(protoCss, ".proto-a__tempo .proto-a__btn--square"),
      ...rulesWith(protoCss, ".proto-a__head-arrow"),
      ...rulesWith(protoCss, ".proto-a__volume-slider"),
    ];
    expect(added.length).toBeGreaterThan(0);
    for (const r of added) expect(r.body, r.selector).not.toMatch(LITERAL_COLOUR);
  });
});
