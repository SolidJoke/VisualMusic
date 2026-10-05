#!/usr/bin/env node
/**
 * chordnames_probe.mjs — VMU-169 / VMU-170: how the Studio panel names the
 * chords of a progression, seen in a real page.
 *
 * Opens the app in Chromium, opens "Studio & Harmonie", picks the Epic Metal
 * style (E phrygian) and reads what the panel writes under "magic progression"
 * for each chord: the degree, the name, and the quality line (Maj. / Min. /
 * Dim.):
 *
 *   1. the style's own progression (triads: its names must not move);
 *   2. "II-V-I" -> Fmaj7, Bm7b5, Em7  (the panel used to say Fa, Sim, Mim);
 *   3. "classic cadence" with it loaded -> Fmaj7, B7, Em7 (only the V changes).
 *
 * It does 2 and 3 in both notations: EU (Do, Ré, Mi: the app's default) and US
 * (C, D, E, switched with the header button). Then, with the longest names
 * loaded (EU), it measures at four viewport widths whether a chord's box and
 * the row hold their names: the box's text overflow, the row's horizontal
 * overflow, the width of each box. Those measures are printed, not asserted:
 * the question they answer — does a longer name widen a box? — is read against
 * the same run on the previous code.
 *
 * jsdom does no layout, so this is the one place the names are seen as a user
 * sees them (the wiring is in
 * src/components/Panels/__tests__/StudioPanel.chordNames.test.jsx).
 *
 *   node scripts/chordnames_probe.mjs                 # human-readable, exit 1 on a failed check
 *   CHORDNAMES_PROBE_PORT=5225 node scripts/chordnames_probe.mjs
 *
 * Own port (default 5225), never 4173 / 5199; writes nothing to dist/ or
 * preview.local/. Starts the Vite dev server itself when none answers.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
const PORT = Number(process.env.CHORDNAMES_PROBE_PORT ?? 5225);
const ORIGIN = `http://localhost:${PORT}`;

const bricks = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "bricks.json"), "utf8"));
const METAL = bricks.find((b) => b.rootValue === 4 && b.scaleKey === "scale_phrygian" && b.name.en === "Epic Metal");
if (!METAL) throw new Error('no style "Epic Metal" (E phrygian) in bricks.json');

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];

async function isServerUp() {
  try {
    const res = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function startDevServer() {
  if (await isServerUp()) return null;
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
    if (await isServerUp()) return server;
    await new Promise((r) => setTimeout(r, 200));
  }
  await server.close();
  throw new Error(`vite did not answer on ${ORIGIN} within 60s`);
}

const failures = [];
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}${ok ? "" : `  (expected ${JSON.stringify(expected)})`}`);
  if (!ok) failures.push(label);
};

/** What the panel shows under "magic progression": [degree, name, quality] per chord. */
const readChords = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".magic-progression-container > div")].map((el) => ({
      degree: el.children[el.children.length - 3].textContent.trim(),
      name: el.querySelector("button").textContent.trim(),
      quality: el.children[el.children.length - 1].textContent.trim(),
    })),
  );

/** Does each chord's box hold its name, and the row its boxes? */
const measureRow = (page) =>
  page.evaluate(() => {
    const row = document.querySelector(".magic-progression-container");
    const rowBox = row.getBoundingClientRect();
    return {
      rowClientWidth: row.clientWidth,
      rowScrollWidth: row.scrollWidth,
      rowOverflows: row.scrollWidth > row.clientWidth + 1,
      boxes: [...row.querySelectorAll("button")].map((button) => {
        const box = button.getBoundingClientRect();
        return {
          name: button.textContent.trim(),
          width: Math.round(box.width * 10) / 10,
          textOverflows: button.scrollWidth > button.clientWidth + 1,
          outsideRow: box.right > rowBox.right + 1 || box.left < rowBox.left - 1,
        };
      }),
    };
  });

async function chooseStyle(page, brick) {
  await page.locator(".modal-container .custom-select-header").first().click();
  await page.locator('[data-testid="custom-select-dropdown"]').first().waitFor({ state: "visible", timeout: 5_000 });
  const label = new RegExp(`^\\s*(${[brick.name.fr, brick.name.en].map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})\\s*$`);
  await page.locator(".select-item", { hasText: label }).first().click();
  await page.waitForTimeout(300);
}

/** A fresh page (1920x1080) on the Studio popup, in the notation asked for, the Epic Metal style chosen. */
async function openStudio(browser, notation, pageErrors) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".sidebar-cta-btn").first().waitFor({ state: "visible", timeout: 15_000 });

  // EU is the app's default; US is one click on the header button.
  const toggle = page.locator('[data-testid="header-notation-toggle"]');
  if ((await toggle.textContent()).trim().startsWith(notation === "us" ? "EU" : "US")) await toggle.click();
  check(`[${notation}] the header says the notation`, (await toggle.textContent()).trim().startsWith(notation === "us" ? "US" : "EU"), true);

  await page.locator(".sidebar-cta-btn").first().click(); // "Studio & Harmonie"
  await page.locator(".modal-container").first().waitFor({ state: "visible", timeout: 5_000 });
  await chooseStyle(page, METAL);
  return page;
}

const buttonNamed = (page, name) => page.locator(".modal-container button.btn-premium", { hasText: name });

/** One notation, one fresh page: the checks of 1-3 above. */
async function runNotation(browser, notation, expected, pageErrors) {
  const page = await openStudio(browser, notation, pageErrors);
  const names = async () => (await readChords(page)).map((c) => c.name);
  const qualities = async () => (await readChords(page)).map((c) => c.quality);

  check(`[${notation}] ${METAL.name.en}: its own progression`, await names(), expected.own);

  await buttonNamed(page, "II-V-I").first().click();
  await page.waitForTimeout(200);
  check(`[${notation}] II-V-I on E phrygian: names`, await names(), expected.styleChords);
  check(`[${notation}] II-V-I on E phrygian: degrees`, (await readChords(page)).map((c) => c.degree), ["IIMaj7", "v7b5", "i7"]);
  check(`[${notation}] II-V-I on E phrygian: quality line`, await qualities(), ["Maj.", "Min.", "Min."]);

  await buttonNamed(page, /Cadence classique|Classic cadence/).first().click();
  await page.waitForTimeout(200);
  check(`[${notation}] classic cadence: names (only the V changes)`, await names(), expected.cadence);
  check(`[${notation}] classic cadence: quality line`, await qualities(), ["Maj.", "Maj.", "Min."]);

  // Back to the style's chords.
  await buttonNamed(page, /Accords du style|Style chords/).first().click();
  await page.waitForTimeout(200);
  check(`[${notation}] style chords again: names`, await names(), expected.styleChords);
  await page.close();
}

/**
 * The row at one viewport, EU, II-V-I loaded. A fresh page for each width, and the
 * viewport changed once, after the chords are loaded: the app swaps its layout across
 * the narrow-screen breakpoint, and the chords loaded in one layout are not kept by the other.
 */
async function measureAt(browser, viewport, pageErrors) {
  const page = await openStudio(browser, "eu", pageErrors);
  await buttonNamed(page, "II-V-I").first().click();
  await page.waitForTimeout(200);
  if (viewport.width !== 1920) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(300);
  }
  const measure = { chords: (await readChords(page)).length, ...(await measureRow(page)) };
  await page.close();
  return measure;
}

async function main() {
  const server = await startDevServer();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const pageErrors = [];
  const measures = {};
  try {
    // Epic Metal's own progression is 1 b2 b6 5, four major triads on E phrygian.
    await runNotation(browser, "eu", { own: ["Mi", "Fa", "Do", "Si"], styleChords: ["Famaj7", "Sim7b5", "Mim7"], cadence: ["Famaj7", "Si7", "Mim7"] }, pageErrors);
    await runNotation(browser, "us", { own: ["E", "F", "C", "B"], styleChords: ["Fmaj7", "Bm7b5", "Em7"], cadence: ["Fmaj7", "B7", "Em7"] }, pageErrors);
    for (const viewport of VIEWPORTS) {
      measures[`${viewport.width}x${viewport.height}`] = await measureAt(browser, viewport, pageErrors);
    }
    check("the measures are of the II-V-I (3 chords) at every width", Object.values(measures).map((m) => m.chords), VIEWPORTS.map(() => 3));
    check("no page error", pageErrors, []);
  } finally {
    await browser.close();
    if (server) await server.close();
  }
  console.log("\nMEASURES (EU, II-V-I loaded; informational except the chord count — read against the previous code's run)");
  for (const [viewport, m] of Object.entries(measures)) {
    console.log(`  ${viewport}: row ${m.rowClientWidth}px wide, scrolls ${m.rowScrollWidth}px, overflows=${m.rowOverflows}`);
    m.boxes.forEach((b) => console.log(`    "${b.name}": ${b.width}px, text overflows=${b.textOverflows}, outside row=${b.outsideRow}`));
  }
  console.log(failures.length === 0 ? "\nPASS — chord names probe" : `\nFAIL — ${failures.length} check(s): ${failures.join("; ")}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
