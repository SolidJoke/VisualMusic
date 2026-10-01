#!/usr/bin/env node
/**
 * style_probe.mjs — F1 fondations visuelles (VMU-148, VMU-149), rouge #4.
 *
 * Opens the app in a real Chromium page (Studio and Dictionnaire, at
 * 3840x2160 / 1920x1080 / 390x844) and reports/verifies, per the brief
 * (`.eve/gabriel/chantiers/visualmusic-fusion/briefs/F1a-fondations-brief.md`)
 * and the spec's acceptance criteria (F1-fondations-visuelles.md §8):
 *
 *   - §8-2: `getComputedStyle` of `:root` and of `body` give the SAME
 *     --role-root / --select / --bg (single source of truth, tokens.css).
 *   - §8-5: `document.fonts.check` is true for Hanken Grotesk, JetBrains
 *     Mono and Orbitron, after `document.fonts.ready`.
 *   - computed font-size of piano/fretboard note labels >= 18px at 3840,
 *     >= 15px elsewhere.
 *   - `body`'s computed background-color is rgb(0, 0, 0).
 *   - no theme-toggle button in the header (VMU-148: single theme).
 *
 *   npm run style:probe                  # human-readable table
 *   npm run style:probe -- --json        # JSON array, one entry per (viewport, state)
 *
 * Why a browser: jsdom resolves neither CSS custom properties nor media
 * queries (CLAUDE.md "Pièges du dépôt"), so none of the above can be a
 * vitest suite. Modelled on scripts/layout_probe.mjs (dev-server reuse
 * pattern, viewport table) — its own build/preview stays untouched: this
 * script picks its own port (not 4173, not 5199) and never writes to
 * dist/ or preview.local/.
 */
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");

// Own port, distinct from vite preview's 4173 and audio_measure.mjs /
// layout_probe.mjs's shared 5199 (brief: "sur un port libre autre que 4173
// et 5199", and "ne touche pas ... aux ports 4173 et 5199").
const PORT = Number(process.env.STYLE_PROBE_PORT ?? 5983);
const ORIGIN = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const AS_JSON = flag("json");
const KEEP_OPEN = flag("headed");

const VIEWPORTS = [
  { w: 3840, h: 2160, label: "3840x2160" },
  { w: 1920, h: 1080, label: "1920x1080" },
  { w: 390, h: 844, label: "390x844" },
];

const FONT_CHECKS = [
  ['16px "Hanken Grotesk"', "Hanken Grotesk"],
  ['16px "JetBrains Mono"', "JetBrains Mono"],
  ['16px "Orbitron"', "Orbitron"],
];

// ─── dev server (same pattern as scripts/layout_probe.mjs / audio_measure.mjs) ──

async function isServerUp() {
  try {
    const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await isServerUp()) return { server: null, reused: true };
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: path.join(ROOT, "vite.config.js"),
    root: ROOT,
    logLevel: "warn",
    server: { port: PORT, strictPort: true },
  });
  await server.listen();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isServerUp()) return { server, reused: false };
    await new Promise((r) => setTimeout(r, 200));
  }
  await server.close();
  throw new Error(`vite did not answer on ${ORIGIN} within 60s`);
}

// ─── page checks (evaluated in-page) ───────────────────────────────────────

/** Runs inside the page via page.evaluate — no access to outer scope. */
async function evaluateInPage(fontChecks) {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const tokenNames = ["--role-root", "--select", "--bg"];
  const tokenMatch = {};
  for (const name of tokenNames) {
    tokenMatch[name] = { root: root.getPropertyValue(name).trim(), body: body.getPropertyValue(name).trim() };
  }

  // `document.fonts.ready` only covers glyphs already matched by rendered
  // text at that point; explicitly request each family too (harmless if
  // already loaded) so a family used by little on-screen text (e.g.
  // Orbitron, just the <h1>) is not reported missing on a timing fluke.
  await Promise.all(fontChecks.map(([spec]) => document.fonts.load(spec).catch(() => {})));

  const fonts = {};
  for (const [spec, label] of fontChecks) {
    fonts[label] = document.fonts.check(spec);
  }

  const labelSizes = [...document.querySelectorAll(".note-label, .note-marker")]
    .filter((el) => el.offsetParent !== null) // visible only
    .map((el) => parseFloat(getComputedStyle(el).fontSize))
    .filter((n) => Number.isFinite(n) && n > 0);

  const themeToggle = [...document.querySelectorAll(".app-header button, .btn-header-action")].some((b) =>
    /Neon Monolith|Zen Studio/.test(b.textContent || "")
  );

  return {
    tokenMatch,
    fonts,
    labelSizes,
    minLabelSize: labelSizes.length ? Math.min(...labelSizes) : null,
    bodyBackgroundColor: body.backgroundColor,
    themeToggleFound: themeToggle,
  };
}

async function switchToDictionary(page, isPhone) {
  if (isPhone) {
    await page.locator('button[aria-label="Open menu"]').click();
    await page.locator(".bottom-nav-btn", { hasText: "Dict" }).click();
  } else {
    await page.locator('[data-testid="btn-mode-dictionary"]').click();
  }
  await page.waitForTimeout(100);
}

async function runState(browser, viewport, mode) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
    await page.locator(".sidebar-cta-btn, .bottom-nav-btn").first().waitFor({ state: "visible", timeout: 15_000 });

    const isPhone = viewport.w < 768;
    if (mode === "dictionary") await switchToDictionary(page, isPhone);

    // document.fonts.ready before checking (spec §8-5).
    await page.evaluate(() => document.fonts.ready);

    const result = await page.evaluate(evaluateInPage, FONT_CHECKS);
    return { ...result, pageErrors };
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), pageErrors };
  } finally {
    await page.close();
  }
}

// ─── active-state contrast (VMU-168) ────────────────────────────────────────
//
// An active button / chosen list item must stay readable: computed text vs
// background contrast >= 4.5:1 (WCAG 1.4.3), measured on the rendered page —
// jsdom resolves no custom properties, and the static scan in
// src/__tests__/ActiveStateContrast.test.js cannot see a cascade split across
// rules. Measured in the "Studio & Harmonie" popup at 1920x1080.

const CONTRAST_FLOOR = 4.5;

/** Runs inside the page: computed colours + contrast of the element matched by `selector`. */
function measureColors({ selector, text }) {
  const parse = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const p = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const candidates = [...document.querySelectorAll(selector)].filter(
    (e) => e.offsetParent !== null && (!text || new RegExp(text, "i").test(e.textContent || ""))
  );
  const el = candidates[0];
  if (!el) return { found: false, selector };
  // Effective background: first ancestor-or-self with a non-transparent colour.
  let bgEl = el;
  let bg = parse(getComputedStyle(bgEl).backgroundColor);
  while (bg && bg.a === 0 && bgEl.parentElement) {
    bgEl = bgEl.parentElement;
    bg = parse(getComputedStyle(bgEl).backgroundColor);
  }
  const cs = getComputedStyle(el);
  const fg = parse(cs.color);
  const l1 = lum(fg);
  const l2 = lum(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return {
    found: true,
    selector,
    label: (el.textContent || "").trim().slice(0, 30),
    color: cs.color,
    background: getComputedStyle(bgEl).backgroundColor,
    border: cs.borderTopColor,
    ratio: Math.round(ratio * 100) / 100,
  };
}

async function runActiveStates(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const out = {};
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
    await page.locator(".sidebar-cta-btn").first().waitFor({ state: "visible", timeout: 15_000 });
    const openPopup = async () => {
      await page.locator(".sidebar-cta-btn").first().click(); // "Studio & Harmonie"
      await page.locator(".modal-container").first().waitFor({ state: "visible", timeout: 5_000 });
    };
    // Buttons transition `all 0.2s`: park the pointer away (no :hover) and wait
    // past the transition, or a mid-fade colour is measured instead of the rest state.
    const measure = async (arg) => {
      await page.mouse.move(2, 2);
      await page.waitForTimeout(500);
      return page.evaluate(measureColors, arg);
    };
    const closePopup = async () => {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    };

    // 1. Studio: "Variation A" is the active theme variant by default.
    await openPopup();
    out["Variation A (Studio)"] = await measure({ selector: ".btn-premium.active", text: "Variation A|Variante A" });

    // 2. A CustomSelect list, opened inside the popup: the chosen item.
    await page.locator(".modal-container .custom-select-header").first().click();
    await page.locator('[data-testid="custom-select-dropdown"]').first().waitFor({ state: "visible", timeout: 5_000 });
    out["chosen list item (CustomSelect)"] = await measure({ selector: ".select-item.selected" });
    await page.keyboard.press("Escape");
    await closePopup();

    // 3. Dictionnaire: harmonic mode toggled on.
    await page.locator('[data-testid="btn-mode-dictionary"]').click();
    await page.waitForTimeout(100);
    await openPopup();
    const toggle = page.locator(".modal-container .btn-toggle", { hasText: /Harmonic|Harmonique/i }).first();
    await toggle.click();
    await page.waitForTimeout(100);
    out["harmonic mode (Dictionnaire)"] = await measure({ selector: ".btn-toggle--active", text: "Harmonic|Harmonique" });
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  } finally {
    await page.close();
  }
  return out;
}

function verifyActiveStates(r) {
  const problems = [];
  if (r.error) problems.push(`error: ${r.error}`);
  for (const [name, m] of Object.entries(r)) {
    if (name === "error") continue;
    if (!m.found) problems.push(`${name}: element not found (${m.selector})`);
    else if (m.ratio < CONTRAST_FLOOR) problems.push(`${name}: contrast ${m.ratio}:1 < ${CONTRAST_FLOOR}:1 (${m.color} on ${m.background})`);
  }
  return problems;
}

// ─── verification (assertions on top of the raw measurements) ─────────────

function verify(viewport, mode, r) {
  const problems = [];
  if (r.error) return [`error: ${r.error}`];

  for (const [name, { root, body }] of Object.entries(r.tokenMatch)) {
    if (root !== body) problems.push(`${name}: :root="${root}" != body="${body}"`);
    if (!root) problems.push(`${name}: empty on :root (undefined token)`);
  }

  for (const [label, ok] of Object.entries(r.fonts)) {
    if (!ok) problems.push(`font not loaded: ${label}`);
  }

  const floor = viewport.w >= 3840 ? 18 : 15;
  if (r.minLabelSize === null) {
    problems.push("no .note-label/.note-marker found to measure");
  } else if (r.minLabelSize < floor) {
    problems.push(`smallest note label ${r.minLabelSize}px < ${floor}px floor`);
  }

  if (r.bodyBackgroundColor !== "rgb(0, 0, 0)") {
    problems.push(`body background-color = "${r.bodyBackgroundColor}", expected rgb(0, 0, 0)`);
  }

  if (r.themeToggleFound) {
    problems.push("a theme-toggle button (Neon Monolith / Zen Studio) is still in the header");
  }

  if (r.pageErrors && r.pageErrors.length) {
    problems.push(...r.pageErrors.slice(0, 3).map((e) => `page error: ${e}`));
  }

  return problems;
}

// ─── run ────────────────────────────────────────────────────────────────

const { chromium } = await import("playwright");
const dev = await startDevServer();
if (!AS_JSON) {
  console.log("\nVisualMusic style probe (F1 — VMU-148, VMU-149)");
  console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
  console.log("  browser    : Chromium only — Gabriel uses Gecko (LibreWolf); see report for that limit.\n");
}

const browser = await chromium.launch({ headless: !KEEP_OPEN });
const results = [];

try {
  for (const viewport of VIEWPORTS) {
    for (const mode of ["studio", "dictionary"]) {
      const r = await runState(browser, viewport, mode);
      const problems = verify(viewport, mode, r);
      results.push({ viewport: viewport.label, mode, ...r, problems });
      if (!AS_JSON) printRow(viewport, mode, r, problems);
    }
  }
  // VMU-168 — active buttons / chosen list items stay readable.
  const active = await runActiveStates(browser);
  const activeProblems = verifyActiveStates(active);
  results.push({ viewport: "1920x1080", mode: "active-states", active, problems: activeProblems });
  if (!AS_JSON) {
    for (const [name, m] of Object.entries(active)) {
      if (name === "error") continue;
      console.log(
        m.found
          ? `1920x1080   active     ${name.padEnd(32)} text=${m.color}  bg=${m.background}  border=${m.border}  contrast=${m.ratio}:1`
          : `1920x1080   active     ${name.padEnd(32)} NOT FOUND (${m.selector})`
      );
    }
    console.log(`1920x1080   active     ${activeProblems.length ? "FAIL: " + activeProblems.join(" | ") : "PASS"}`);
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}

if (AS_JSON) {
  console.log(JSON.stringify(results, null, 2));
}

const failed = results.some((r) => r.problems.length > 0);
if (!AS_JSON) {
  console.log(failed ? "\nFAIL — see problems above" : "\nPASS — all criteria met on all viewports/modes");
}
process.exit(failed ? 1 : 0);

// ─── printing ───────────────────────────────────────────────────────────

function printRow(viewport, mode, r, problems) {
  const label = `${viewport.label.padEnd(11)} ${mode.padEnd(10)}`;
  if (r.error) {
    console.log(`${label} ERROR: ${r.error}`);
    return;
  }
  console.log(
    `${label} minLabel=${String(r.minLabelSize).padStart(6)}px  bg=${r.bodyBackgroundColor}  ` +
      `fonts=${Object.values(r.fonts).every(Boolean) ? "ok" : "MISSING"}  ` +
      `tokens=${Object.values(r.tokenMatch).every((t) => t.root === t.body && t.root) ? "match" : "MISMATCH"}  ` +
      `themeToggle=${r.themeToggleFound ? "FOUND" : "none"}  ` +
      `${problems.length ? "FAIL: " + problems.join(" | ") : "PASS"}`
  );
}
