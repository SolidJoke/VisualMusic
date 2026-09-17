#!/usr/bin/env node
/**
 * layout_probe.mjs — durable measurement tool for VMU-138 (modal size/layout).
 *
 * Opens the three popups ("Studio & Harmonie", "Math & Rythmes", "Instruments
 * & Audio") in a real Chromium page at a fixed set of viewports and prints,
 * for each (viewport, state) pair: the `.modal-container` width/height, the
 * `.modal-body` clientHeight/scrollHeight, and whether the body scrolls
 * (scrollHeight > clientHeight).
 *
 *   npm run layout:probe                 # human-readable table
 *   npm run layout:probe -- --json       # JSON array, one entry per (viewport, state)
 *
 * Why a browser: jsdom does no layout at all (no media queries, no box
 * model), so this cannot be a vitest suite — see CLAUDE.md "Pièges du
 * dépôt". Reuses the dev-server startup pattern from audio_measure.mjs
 * (VMU-026): reuse a server already listening on the target port rather than
 * starting a second one, and never stop a server this script did not start.
 * No new dependency: playwright is already a devDependency for audio_measure.
 */
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");

// Same env var pattern as audio_measure.mjs (AUDIO_MEASURE_PORT), scoped to
// this script. Defaults to 5199, the port the VisualMusic dev server is
// conventionally run on for these harnesses.
const PORT = Number(process.env.LAYOUT_PROBE_PORT ?? 5199);
const ORIGIN = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const AS_JSON = flag("json");
const KEEP_OPEN = flag("headed");

/**
 * Viewports and states from the brief (VMU-138). 3840x1263 and 2406x627 are
 * Gabriel's own measured window sizes (LibreWolf, 4K screen, maximized and
 * restored); the others bracket common desktop/tablet sizes plus one phone
 * size as a "strictly unchanged" control.
 */
const VIEWPORTS = [
  { w: 3840, h: 2160, label: "3840x2160" },
  { w: 3840, h: 1263, label: "3840x1263" },
  { w: 2560, h: 1440, label: "2560x1440" },
  { w: 2406, h: 627, label: "2406x627" },
  { w: 1920, h: 1080, label: "1920x1080" },
  { w: 390, h: 844, label: "390x844" },
];

const MODAL_LABEL = {
  studio: "Studio & Harmonie",
  math: "Math & Rythmes",
  audio: "Instruments & Audio",
};

/**
 * The five states from the brief's table: the three popups at opening, plus
 * "Studio & Harmonie" switched to Dictionary mode / type Gammes (scales),
 * list closed then open. The scale-type dropdown is targeted positionally
 * (second `.custom-select-container` inside the dictionary panel) rather
 * than by text, so it does not depend on the active language.
 */
const STATES = [
  { id: "studio-open", modal: "studio", title: "Studio & Harmonie — a l'ouverture (mode Studio)" },
  { id: "math-open", modal: "math", title: "Math & Rythmes — a l'ouverture" },
  { id: "audio-open", modal: "audio", title: "Instruments & Audio — a l'ouverture" },
  {
    id: "studio-dict-scales-closed",
    modal: "studio",
    title: "Studio & Harmonie — Dictionnaire, type Gammes, liste fermee",
    dictionary: true,
    openScaleList: false,
  },
  {
    id: "studio-dict-scales-open",
    modal: "studio",
    title: "Studio & Harmonie — Dictionnaire, type Gammes, liste ouverte",
    dictionary: true,
    openScaleList: true,
  },
];

// ─── dev server (same pattern as scripts/audio_measure.mjs) ───────────────

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

// ─── page actions ──────────────────────────────────────────────────────────

async function openModal(page, which, isPhone) {
  if (isPhone) {
    await page.locator('button[aria-label="Open menu"]').click();
  }
  await page
    .locator(".sidebar-cta-btn", { hasText: MODAL_LABEL[which] })
    .first()
    .click();
  await page.locator(".modal-container").waitFor({ state: "visible" });
  // Let the 0.2s slideUp animation (Modal.css) settle before measuring.
  await page.waitForTimeout(300);
}

async function switchToDictionaryScales(page, isPhone) {
  if (isPhone) {
    await page.locator(".bottom-nav-btn", { hasText: "Dict" }).click();
  } else {
    await page.locator('[data-testid="btn-mode-dictionary"]').click();
  }
  await page.waitForTimeout(50);
}

async function selectScaleFamily(page) {
  // Family selector: Note / Accords / Gammes, in that order (DictionaryPanel.jsx
  // handleFamilyChange). Positional, not text-based, so it holds under any
  // active language.
  const familyGroup = page.locator('[data-testid="dictionary-panel"] .btn-segment-group').first();
  await familyGroup.locator(".btn-segment").nth(2).click();
  await page.waitForTimeout(50);
}

async function openScaleTypeDropdown(page) {
  // Root note select is the first `.custom-select-container`; the scale-type
  // select (only rendered once family === "scale") is the second.
  const select = page.locator('[data-testid="dictionary-panel"] .custom-select-container').nth(1);
  await select.locator(".custom-select-header").click();
  await page.waitForTimeout(200);
}

async function measureModal(page) {
  const container = page.locator(".modal-container");
  const box = await container.boundingBox();
  const metrics = await page.locator(".modal-container .modal-body").evaluate((el) => ({
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
  }));
  return {
    container: { width: Math.round(box.width), height: Math.round(box.height) },
    body: {
      clientHeight: metrics.clientHeight,
      scrollHeight: metrics.scrollHeight,
      scrolls: metrics.scrollHeight > metrics.clientHeight + 1, // +1: sub-pixel rounding slack
    },
  };
}

async function runState(browser, viewport, state) {
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
    // App boot (audio sampler preload kick-off, first render) — wait for the
    // sidebar CTA buttons rather than a fixed sleep.
    await page.locator(".sidebar-cta-btn, .bottom-nav-btn").first().waitFor({ state: "visible", timeout: 15_000 });

    const isPhone = viewport.w < 768;
    if (state.dictionary) await switchToDictionaryScales(page, isPhone);
    await openModal(page, state.modal, isPhone);
    if (state.dictionary) {
      await selectScaleFamily(page);
      if (state.openScaleList) await openScaleTypeDropdown(page);
    }

    const measurement = await measureModal(page);
    return { ...measurement, pageErrors };
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), pageErrors };
  } finally {
    await page.close();
  }
}

// ─── run ────────────────────────────────────────────────────────────────

const { chromium } = await import("playwright");
const dev = await startDevServer();
if (!AS_JSON) {
  console.log("\nVisualMusic layout probe (VMU-138)");
  console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
  console.log("  browser    : Chromium only — Gabriel uses Gecko (LibreWolf); see report for that limit.\n");
}

const browser = await chromium.launch({ headless: !KEEP_OPEN });
const results = [];

try {
  for (const viewport of VIEWPORTS) {
    for (const state of STATES) {
      const r = await runState(browser, viewport, state);
      results.push({ viewport: viewport.label, state: state.id, title: state.title, ...r });
      if (!AS_JSON) printRow(viewport, state, r);
    }
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}

if (AS_JSON) {
  console.log(JSON.stringify(results, null, 2));
}

process.exit(results.some((r) => r.error) ? 1 : 0);

// ─── printing ───────────────────────────────────────────────────────────

function printRow(viewport, state, r) {
  if (r.error) {
    console.log(`${viewport.label.padEnd(11)} ${state.id.padEnd(28)} ERROR: ${r.error}`);
    return;
  }
  const c = r.container;
  const b = r.body;
  console.log(
    `${viewport.label.padEnd(11)} ${state.id.padEnd(28)} container ${String(c.width).padStart(5)}x${String(c.height).padStart(5)}` +
      `  body clientHeight ${String(b.clientHeight).padStart(5)}  scrollHeight ${String(b.scrollHeight).padStart(5)}` +
      `  ${b.scrolls ? "SCROLLS" : "fits"}`,
  );
  if (r.pageErrors.length) {
    console.log(`  page errors: ${r.pageErrors.slice(0, 3).join(" | ")}`);
  }
}
