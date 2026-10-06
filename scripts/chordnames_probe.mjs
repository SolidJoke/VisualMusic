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
 * (C, D, E, switched with the header button). Then, in EU (the longest names),
 * it loads each of the four Quick Starts at four viewport widths and measures
 * whether a chord's box and the row hold their names: the width of each box,
 * the box's text overflow, the row's horizontal overflow. Those measures are
 * printed, not asserted: the question they answer — does a longer name widen a
 * box, and does the row still hold? — is read against the same run on the
 * previous code.
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

// The four Quick Starts the Studio offers: name -> a piece of the button's label (same in every language).
const QUICK_STARTS = { "II-V-I": "II-V-I", "Pop": "I-V-vi-IV", "Turnaround": "I-vi-ii-V", "Neo-Soul": "IV-iii-vi" };

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

/**
 * A fresh page, opened at the viewport, on the Studio popup, the Epic Metal style chosen
 * (except on a phone: see below). `notation` "us" switches the header button; null leaves
 * the app's default (EU) and skips the header, which a phone does not show.
 */
async function openStudio(browser, notation, pageErrors, viewport = { width: 1920, height: 1080 }) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".sidebar-cta-btn, .bottom-nav-btn").first().waitFor({ state: "attached", timeout: 15_000 });

  if (notation) {
    // EU is the app's default; US is one click on the header button.
    const toggle = page.locator('[data-testid="header-notation-toggle"]');
    if ((await toggle.textContent()).trim().startsWith(notation === "us" ? "EU" : "US")) await toggle.click();
    check(`[${notation}] the header says the notation`, (await toggle.textContent()).trim().startsWith(notation === "us" ? "US" : "EU"), true);
  }

  // On a phone the sidebar is behind the menu button (as layout_probe.mjs opens it).
  const phone = viewport.width < 768;
  if (phone) await page.locator('button[aria-label="Open menu"]').click();
  await page.locator(".sidebar-cta-btn").first().click(); // "Studio & Harmonie"
  await page.locator(".modal-container").first().waitFor({ state: "visible", timeout: 5_000 });
  // On a phone the style list closes by itself within 100 ms of opening (seen at 390 px, 2 of 2
  // times; it stays open at 1280 and 3840), faster than a click can reach an item. The phone
  // keeps the app's default style (Modern Pop, C major) instead of racing it.
  if (!phone) await chooseStyle(page, METAL);
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
 * The row at one viewport, EU, II-V-I loaded. A fresh page opened AT the viewport for
 * each width, never resized: the app closes the popup about 250 ms after a viewport change
 * (measured: at 390 and 3840 from 1920, not at 1280), so a resized page is read before or
 * after the popup is gone, depending on timing.
 */
async function measureAt(browser, viewport, pageErrors) {
  const page = await openStudio(browser, null, pageErrors, viewport);
  const measures = {};
  for (const [quickStart, button] of Object.entries(QUICK_STARTS)) {
    await buttonNamed(page, button).first().click();
    await page.waitForTimeout(300);
    measures[quickStart] = { chords: (await readChords(page)).length, ...(await measureRow(page)) };
  }
  await page.close();
  return measures;
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
    // The measures are read only if they are of the chords they claim: 3, 4, 4, 3 at every width.
    check(
      "the measures are of the right Quick Starts (chords loaded: II-V-I 3, Pop 4, Turnaround 4, Neo-Soul 3) at every width",
      Object.values(measures).map((byQuickStart) => Object.values(byQuickStart).map((m) => m.chords)),
      VIEWPORTS.map(() => [3, 4, 4, 3]),
    );
    check("no page error", pageErrors, []);
  } finally {
    await browser.close();
    if (server) await server.close();
  }
  console.log("\nMEASURES (EU; Epic Metal, but the app's default style at 390 px; informational except the chord counts — read against the previous code's run)");
  for (const [viewport, byQuickStart] of Object.entries(measures)) {
    for (const [quickStart, m] of Object.entries(byQuickStart)) {
      const over = Math.max(0, m.rowScrollWidth - m.rowClientWidth);
      const boxes = m.boxes.map((b) => `${b.name} ${b.width}px`).join(" · ");
      const flags = [m.boxes.some((b) => b.textOverflows) && "TEXT OVERFLOWS", m.boxes.some((b) => b.outsideRow) && "BOX OUTSIDE ROW"].filter(Boolean).join(", ");
      console.log(`  ${viewport.padEnd(9)} ${quickStart.padEnd(12)} row ${m.rowClientWidth}px, content ${m.rowScrollWidth}px, over by ${over}px   ${boxes}${flags ? `   [${flags}]` : ""}`);
    }
  }
  console.log(failures.length === 0 ? "\nPASS — chord names probe" : `\nFAIL — ${failures.length} check(s): ${failures.join("; ")}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
