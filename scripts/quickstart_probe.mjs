#!/usr/bin/env node
/**
 * quickstart_probe.mjs — VMU-161: the Studio's Quick Start, seen in a real page.
 *
 * Opens the app in Chromium (1920x1080), opens "Studio & Harmonie", picks the
 * Metal Epique style (E phrygian), and reads the chords the panel displays:
 *
 *   1. click "II-V-I"        -> the chords of the style's scale: with E phrygian
 *                               Fmaj7, Bm7b5, Em7 (the panel names them Fa, Sim, Mim:
 *                               chordNameEU keeps only the "m" and "dim" of a type);
 *   2. choose "classic cadence" with that Quick Start loaded
 *                            -> only the V changes (Bm7b5 -> B7, shown Si);
 *   3. choose another style (E dorian, "Funk/Disco Loop") and click "II-V-I"
 *      again, the cadence still chosen -> F#m7, B7, Em7 (Fa#m, Si, Mim).
 *
 * jsdom does no layout and loads no stylesheet, so this is the one place the
 * buttons are seen as a user sees them (the wiring is in
 * src/components/Panels/__tests__/StudioPanel.quickStart.test.jsx).
 *
 *   node scripts/quickstart_probe.mjs                 # human-readable, exit 1 on a failed check
 *   QUICKSTART_PROBE_PORT=5225 node scripts/quickstart_probe.mjs
 *
 * Own port (default 5225), never 4173 / 5199; writes nothing to dist/ or
 * preview.local/. Starts the Vite dev server itself when none answers.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "..");
const PORT = Number(process.env.QUICKSTART_PROBE_PORT ?? 5225);
const ORIGIN = `http://localhost:${PORT}`;

const bricks = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "bricks.json"), "utf8"));
const named = (rootValue, scaleKey, nameEn) => {
  const brick = bricks.find((b) => b.rootValue === rootValue && b.scaleKey === scaleKey && b.name.en === nameEn);
  if (!brick) throw new Error(`no style "${nameEn}" in bricks.json`);
  return brick;
};
const METAL = named(4, "scale_phrygian", "Epic Metal");
const FUNK = named(4, "scale_dorian", "Funk/Disco Loop");

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

/** What the panel shows under "magic progression": [degree, chord, quality] per chord. */
const readChords = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".magic-progression-container > div")].map((el) => ({
      degree: el.children[el.children.length - 3].textContent.trim(),
      chord: el.querySelector("button").textContent.trim(),
    })),
  );

async function chooseStyle(page, brick) {
  await page.locator(".modal-container .custom-select-header").first().click();
  await page.locator('[data-testid="custom-select-dropdown"]').first().waitFor({ state: "visible", timeout: 5_000 });
  const label = new RegExp(`^\\s*(${[brick.name.fr, brick.name.en].map((n) => n.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})\\s*$`);
  await page.locator(".select-item", { hasText: label }).first().click();
  await page.waitForTimeout(300);
}

async function main() {
  const server = await startDevServer();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
    await page.locator(".sidebar-cta-btn").first().waitFor({ state: "visible", timeout: 15_000 });
    await page.locator(".sidebar-cta-btn").first().click(); // "Studio & Harmonie"
    await page.locator(".modal-container").first().waitFor({ state: "visible", timeout: 5_000 });

    const button = (name) => page.locator(".modal-container button.btn-premium", { hasText: name });
    const isActive = async (name) => (await button(name).first().getAttribute("class")).includes("active");
    const chords = async () => (await readChords(page)).map((c) => c.chord);

    await chooseStyle(page, METAL);
    console.log(`style: ${METAL.name.en} (E phrygian), own progression: ${JSON.stringify(await chords())}`);

    // The four patterns: "Majeur II-V-I" and "Mineur ii-V-i" are one.
    const labels = await page.locator(".modal-container button.btn-premium").allTextContents();
    check("Quick Start buttons", labels.filter((l) => /II-V-I|Pop Standard|Turnaround|Neo-Soul/.test(l)).length, 4);
    check("no 'Majeur' / 'Mineur' button", labels.filter((l) => /Majeur|Mineur/.test(l)).length, 0);

    // 1. II-V-I, style chords.
    await button("II-V-I").first().click();
    await page.waitForTimeout(200);
    check("II-V-I on E phrygian, style chords (Fmaj7 Bm7b5 Em7)", await chords(), ["Famaj7", "Sim7b5", "Mim7"]);
    // The label above each chord is the chord's own degree in the key: lower case is minor.
    check("  degrees shown", (await readChords(page)).map((c) => c.degree), ["IIMaj7", "v7b5", "i7"]);
    check("  the II-V-I button is active", await isActive("II-V-I"), true);

    // 2. Classic cadence, Quick Start loaded: only the V changes.
    const before = await chords();
    await button(/Cadence classique|Classic cadence/).first().click();
    await page.waitForTimeout(200);
    const after = await chords();
    check("classic cadence (Fmaj7 B7 Em7)", after, ["Famaj7", "Si7", "Mim7"]);
    check("  only the V changed", before.map((c, i) => c !== after[i]), [false, true, false]);
    check("  degrees shown", (await readChords(page)).map((c) => c.degree), ["IIMaj7", "V7", "i7"]);
    check("  the II-V-I button is still active", await isActive("II-V-I"), true);

    // 3. Another style, cadence still chosen.
    await chooseStyle(page, FUNK);
    check("a style change clears the loaded Quick Start", await isActive("II-V-I"), false);
    await button("II-V-I").first().click();
    await page.waitForTimeout(200);
    check("II-V-I on E dorian with the cadence (F#m7 B7 Em7)", await chords(), ["Fa#m7", "Si7", "Mim7"]);

    // Back to style chords on the loaded Quick Start.
    await button(/Accords du style|Style chords/).first().click();
    await page.waitForTimeout(200);
    check("style chords again on E dorian (F#m7 Bm7 Em7)", await chords(), ["Fa#m7", "Sim7", "Mim7"]);

    check("no page error", pageErrors, []);
  } finally {
    await browser.close();
    if (server) await server.close();
  }
  console.log(failures.length === 0 ? "\nPASS — quickstart probe" : `\nFAIL — ${failures.length} check(s): ${failures.join("; ")}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
