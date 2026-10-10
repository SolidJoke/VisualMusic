#!/usr/bin/env node
/**
 * instruments_probe.mjs — INST-A1: every instrument shows ITS OWN notes in the
 * Dictionary, whichever instrument is chosen, measured in the served page.
 *
 * Gabriel, 2026-10-05: "Chaque instrument doit afficher et jouer les notes qui
 * lui sont propres." The unit test (src/components/__tests__/
 * InstrumentOwnNotes.test.jsx) proves it in jsdom; this probe proves it in a
 * real Chromium page, on the two pages Gabriel uses:
 *
 *   proto   /?prototype=a           3840x2160, vertical piano / guitar / bass
 *   normal  /  (Dictionary mode)    3840x2160, horizontal instruments + bar
 *
 * For each selection — note Do, chord Do majeur, chord Sol#m7, scale of Do
 * majeur — the probe chooses piano, then guitar, then bass, then piano again,
 * and reads what each instrument column lights: every lit key or neck cell,
 * with its classes and its label. Criterion, one per column so a broken column
 * turns only its own line red:
 *
 *   IP-<page>-<column>  the column lights the same thing whichever instrument
 *                       is chosen, and lights something.
 *
 * How the instrument is chosen is the page's own gesture, and the probe checks
 * that it took (otherwise an invariance would hold vacuously):
 *   normal  the instrument bar's tile (button[data-instrument]); its
 *           aria-pressed must turn "true".
 *   proto   it has no tile: a click on a note of that instrument chooses it
 *           (useFretboardPlayback.js autoPlayNote). The probe clicks a key or a
 *           cell whose pitch class is not the root's (a root click on a scale
 *           would set the contextual scale and change every label), waits for
 *           that note to flash ("is-playing", the click's own feedback), then
 *           for every flash to end, and only then reads the columns.
 *
 * Positive control: put back the old reading in ONE component, e.g. in
 * src/components/Instruments/PianoKeyboard.jsx read `activeNotes` from the
 * context instead of `realizationsByInstrument?.piano`, and run again: the
 * piano lines (and only them) must turn red, the measured lit keys printed
 * with --verbose must differ between "piano chosen" and "guitar chosen".
 *
 *   npm run instruments:probe                 # port 5215 by default
 *   npm run instruments:probe -- --verbose    # also print what each column lights
 *   npm run instruments:probe -- --only=proto # or --only=normal
 *   INSTRUMENTS_PROBE_PORT=5215 npm run instruments:probe
 *
 * Exit 1 on any FAIL. Its own dev server on its own port (reused if one already
 * answers there: the "dev server" line says which), never writes to dist/ or
 * preview.local/. Chromium only: Gabriel's LibreWolf (Gecko) is not measured.
 */
import path from "node:path";
import process from "node:process";
import { S1_SCENARIOS } from "../src/prototype/s1Scenarios.js";
import { translations } from "../src/i18n/translations.js";
import { repoRootFrom } from "./lib/repoRoot.mjs";

const ROOT = repoRootFrom(import.meta.url);
const PORT = Number(process.env.INSTRUMENTS_PROBE_PORT ?? 5215);
const ORIGIN = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length).split(",").filter(Boolean);

const VIEWPORT = { width: 3840, height: 2160 };
const CHOICES = ["piano", "guitar", "bass", "piano"];
const COLUMNS = ["piano", "guitar", "bass"];

/**
 * The brief's four selections. `scenario` is the prototype's own URL scenario
 * (src/prototype/s1Scenarios.js) when it has one; the note has none, so it is
 * reached through the Dictionary panel's family button, like on the normal page.
 * `family` is the panel's family segment (Note / Accords / Gammes, in that
 * order: DictionaryPanel.jsx). `root` is the root's index in the root list
 * (NOTES order, C first); `chordLabel` the chord type's label in French, the
 * default language, read from translations.js (no label typed here).
 */
const SELECTIONS = [
  { id: "note-do", label: "note Do", family: 0, root: 0, rootPc: 0, type: "single_note", scenario: null },
  { id: "cmaj", label: "Do majeur", family: 1, root: 0, rootPc: 0, type: "chord_major", scenario: "cmaj" },
  { id: "gsm7", label: "Sol#m7", family: 1, root: 8, rootPc: 8, type: "chord_m7", scenario: "gsm7", chordLabel: translations.fr.chordM7 },
  { id: "cmajscale", label: "gamme de Do majeur", family: 2, root: 0, rootPc: 0, type: "scale_major", scenario: "cmajscale" },
];
for (const s of SELECTIONS) {
  if (s.scenario && !S1_SCENARIOS.some((x) => x.id === s.scenario)) throw new Error(`unknown S1 scenario ${s.scenario}`);
}

// ─── dev server (same pattern as scripts/s1_probe.mjs) ─────────────────────

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

// ─── in-page reading (page.evaluate: no access to the outer scope) ─────────

/**
 * What each column lights, as plain strings: equal columns give equal lists.
 * A key is lit when it carries a role class; a neck cell when it holds a
 * marker. The identity of a horizontal key is its index in the keyboard (the
 * horizontal piano has no pitch attribute); a vertical key carries data-abs; a
 * horizontal cell is string x cell, a vertical one string x fret.
 */
function readColumns(scopes) {
  const classes = (el) => [...el.classList].sort().join(" ");
  const text = (el) => (el ? el.textContent.trim() : "");
  const isLit = (el) => [...el.classList].some((c) => c.startsWith("role-"));
  const out = {};

  const piano = document.querySelector(scopes.piano);
  if (!piano) out.piano = null;
  else {
    const keys = [...piano.querySelectorAll(".piano-key")];
    out.piano = keys
      .map((el, i) => ({ el, i }))
      .filter(({ el }) => isLit(el))
      .map(({ el, i }) => `${el.hasAttribute("data-abs") ? `abs ${el.getAttribute("data-abs")}` : `#${i}`} ${el.getAttribute("title")} | ${classes(el)} | ${text(el.querySelector(".note-label"))}`);
    const wrapper = piano.querySelector(".piano-wrapper--vertical");
    if (wrapper) out.piano.push(`window ${wrapper.getAttribute("data-window-start")}`);
    piano.querySelectorAll(".piano-scrubber-note").forEach((d) => out.piano.push(`scrubber ${d.style.left}`));
  }

  for (const id of ["guitar", "bass"]) {
    const neck = document.querySelector(scopes[id]);
    if (!neck) {
      out[id] = null;
      continue;
    }
    const lit = [];
    const vertical = neck.querySelectorAll(".fbv-fret-row");
    if (vertical.length) {
      vertical.forEach((row) => {
        row.querySelectorAll(".fbv-cell[data-string-index]").forEach((cell) => {
          const m = cell.querySelector(".note-marker");
          if (m) lit.push(`s${cell.getAttribute("data-string-index")} f${row.getAttribute("data-fret")} | ${classes(m)} | ${text(m)}`);
        });
      });
    } else {
      neck.querySelectorAll(".string-row").forEach((row, s) => {
        [...row.children].filter((c) => c.classList.contains("fret")).forEach((cell, c) => {
          const m = cell.querySelector(".note-marker");
          if (m) lit.push(`s${s} c${c} | ${classes(m)} | ${text(m)}`);
        });
      });
      const range = neck.querySelector(".fret-range-label");
      if (range) lit.push(`window ${text(range)}`);
      neck.querySelectorAll(".scrubber-note").forEach((d) => lit.push(`scrubber ${d.style.left}`));
    }
    out[id] = lit;
  }
  return out;
}

// ─── page actions ──────────────────────────────────────────────────────────

const SCOPES = {
  proto: { piano: '[data-s1="piano"]', guitar: '[data-s1="guitar"]', bass: '[data-s1="bass"]' },
  normal: {
    piano: ".piano-wrapper:not(.piano-wrapper--vertical)",
    guitar: ".fretboard-container.instrument-guitar",
    bass: ".fretboard-container.instrument-bass",
  },
};

/** The Dictionary panel's selection controls (shared by both pages). */
async function selectInPanel(page, sel) {
  const panel = page.locator('[data-testid="dictionary-panel"]');
  await panel.waitFor({ state: "visible", timeout: 10_000 });
  const familyButton = panel.locator(".btn-segment-group").first().locator(".btn-segment").nth(sel.family);
  await familyButton.click();
  await familyButton.and(page.locator(".btn-segment--active")).waitFor({ timeout: 5_000 });
  // CustomSelect draws its list in a portal on <body>; it keeps a hidden native
  // <select> in step with its value, which is what is checked below.
  const list = page.locator('[data-testid="custom-select-dropdown"]');
  const rootSelect = panel.locator(".custom-select-container").nth(0);
  if (sel.root !== 0) {
    await rootSelect.locator(".custom-select-header").click();
    await list.locator(".select-item").nth(sel.root).click();
    await list.waitFor({ state: "detached", timeout: 5_000 });
  }
  if (sel.chordLabel) {
    await panel.locator(".custom-select-container").nth(1).locator(".custom-select-header").click();
    await list.locator(".select-item", { hasText: sel.chordLabel }).first().click();
    await list.waitFor({ state: "detached", timeout: 5_000 });
  }
  const root = await rootSelect.locator("select").inputValue();
  if (root !== String(sel.rootPc)) throw new Error(`root select reads ${root}, ${sel.rootPc} expected`);
  if (sel.type !== "single_note") {
    const type = await panel.locator(".custom-select-container").nth(1).locator("select").inputValue();
    if (type !== sel.type) throw new Error(`type select reads ${type}, ${sel.type} expected`);
  }
}

/** Normal page: Dictionary mode, the selection through the "Studio & Harmonie" window. */
async function openNormal(page, sel) {
  await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  await page.locator(".sidebar-cta-btn").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.locator('[data-testid="btn-mode-dictionary"]').click();
  await page.locator(".instrument-bar").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator(".sidebar-cta-btn", { hasText: "Studio & Harmonie" }).first().click();
  await page.locator(".modal-container").waitFor({ state: "visible", timeout: 10_000 });
  await selectInPanel(page, sel);
  await page.keyboard.press("Escape");
  await page.locator(".modal-container").waitFor({ state: "detached", timeout: 10_000 });
}

/**
 * Prototype: the URL scenario, or (the note) the drawer's Dictionary panel.
 * bench=1 draws the scenario buttons, whose "is-active" confirms the scenario
 * was applied (as scripts/s1_probe.mjs waits for it); they sit in the centre
 * column and draw nothing on the instruments.
 */
async function openProto(page, sel) {
  const scenario = sel.scenario || "cmaj";
  await page.goto(`${ORIGIN}/?prototype=a&bench=1&scenario=${scenario}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(`[data-scenario="${scenario}"].is-active`).waitFor({ timeout: 10_000 });
  if (!sel.scenario) {
    await page.locator('[data-testid="proto-drawer-toggle"]').click();
    await selectInPanel(page, sel);
    await page.locator('[data-testid="proto-drawer-toggle"]').click();
    await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: 5_000 });
  }
}

/** Chooses `id` with the page's own gesture; returns null, or why it did not take. */
async function choose(page, kind, id, sel) {
  if (kind === "normal") {
    const tile = page.locator(`.instrument-bar__select[data-instrument="${id}"]`);
    await tile.click();
    try {
      await page.locator(`.instrument-bar__select[data-instrument="${id}"][aria-pressed="true"]`).waitFor({ timeout: 5_000 });
    } catch {
      return `the ${id} tile is not pressed after a click`;
    }
    await page.waitForTimeout(150);
    return null;
  }
  // proto: click a note of that instrument whose pitch class is not the root's.
  // A LIT one first: in a chord or a scale the fingering mask stops an unlit
  // cell from flashing (core/fretboardUtils.js resolveVoicingMask), so the
  // click's own feedback would never show. The note family lights only the
  // root: any other note then (no fingering, no mask).
  const scope = SCOPES.proto[id];
  const cells = id === "piano" ? `${scope} .piano-key[data-abs]` : `${scope} .fbv-cell[data-abs]`;
  const index = await page.evaluate(
    ({ cells, rootPc, isPiano }) => {
      const all = [...document.querySelectorAll(cells)];
      const notRoot = (el) => Number(el.getAttribute("data-abs")) % 12 !== rootPc;
      const lit = (el) => (isPiano ? [...el.classList].some((c) => c.startsWith("role-")) : !!el.querySelector(".note-marker"));
      const best = all.findIndex((el) => notRoot(el) && lit(el));
      return best >= 0 ? best : all.findIndex(notRoot);
    },
    { cells, rootPc: sel.rootPc, isPiano: id === "piano" }
  );
  if (index < 0) return `no ${id} note outside the root to click`;
  await page.locator(cells).nth(index).click();
  try {
    await page.locator(`${scope} .is-playing`).first().waitFor({ timeout: 10_000 });
  } catch {
    return `the clicked ${id} note never flashed: the click did not reach the instrument`;
  }
  // The flash lasts 0.5s (useFretboardPlayback.js): read only once nothing on
  // the page flashes any more.
  await page.waitForFunction(() => document.querySelectorAll(".is-playing").length === 0, null, { timeout: 10_000 });
  await page.waitForTimeout(150);
  return null;
}

// ─── run ───────────────────────────────────────────────────────────────────

const pitchNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// Display only (the "measured quantity" lines): a MIDI number read from the page, written as a name.
const nameOf = (abs) => `${pitchNames[abs % 12]}${Math.floor(abs / 12) - 1}`;

/**
 * One line per column: each lit item as "where(label)" — a vertical key by its
 * pitch, a horizontal key by its index and letter, a cell by string and fret
 * (or cell) — then the window and the scrubber dots, counted.
 */
function summarize(list) {
  if (list === null) return "column not found";
  const lit = list.filter((l) => !l.startsWith("window ") && !l.startsWith("scrubber "));
  const parts = lit.map((l) => {
    const [where, , label] = l.split(" | ");
    const w = where.startsWith("abs ")
      ? nameOf(Number(where.split(" ")[1]))
      : where.startsWith("#")
        ? `${where.split(" ")[0]}${where.split(" ")[1]}`
        : where.replace(" ", "");
    return `${w}(${label})`;
  });
  const windowLine = list.find((l) => l.startsWith("window "));
  const dots = list.filter((l) => l.startsWith("scrubber ")).length;
  return `${lit.length} lit: ${parts.join(" ")}${windowLine ? ` · ${windowLine}` : ""}${dots ? ` · ${dots} scrubber dot(s)` : ""}`;
}

function firstDifference(a, b) {
  const onlyA = a.filter((x) => !b.includes(x));
  const onlyB = b.filter((x) => !a.includes(x));
  return `only with first choice: [${onlyA.slice(0, 3).join(" ; ")}]${onlyA.length > 3 ? ` +${onlyA.length - 3}` : ""}; only with this choice: [${onlyB.slice(0, 3).join(" ; ")}]${onlyB.length > 3 ? ` +${onlyB.length - 3}` : ""}`;
}

const { chromium } = await import("playwright");
const dev = await startDevServer();
console.log("\nVisualMusic instruments probe (INST-A1)");
console.log(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
console.log("  browser    : Chromium only — Gabriel uses Gecko (LibreWolf): not measured here.\n");

const browser = await chromium.launch();
const results = []; // { criterion, pass, detail }
const failures = [];

try {
  for (const kind of ["proto", "normal"]) {
    if (ONLY.length && !ONLY.includes(kind)) continue;
    for (const sel of SELECTIONS) {
      const page = await browser.newPage({ viewport: VIEWPORT });
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(String(e)));
      const readings = []; // { chosen, columns }
      let setupError = null;
      try {
        if (kind === "proto") await openProto(page, sel);
        else await openNormal(page, sel);
        await page.waitForTimeout(300);
        for (const chosen of CHOICES) {
          // The page starts with the piano chosen (AppContext default): the
          // first "piano" is the start state, the last one a real choice back.
          const why = readings.length === 0 && chosen === "piano" && kind === "proto" ? null : await choose(page, kind, chosen, sel);
          if (why) {
            setupError = why;
            break;
          }
          readings.push({ chosen, columns: await page.evaluate(readColumns, SCOPES[kind]) });
        }
      } catch (err) {
        setupError = String(err && err.message ? err.message : err);
      } finally {
        await page.close();
      }

      for (const col of COLUMNS) {
        const criterion = `IP-${kind}-${col}`;
        const label = `${criterion}  ${sel.label}`;
        if (setupError || pageErrors.length) {
          const detail = setupError || `page error: ${pageErrors[0]}`;
          results.push({ criterion, pass: false });
          failures.push(`${label}: ${detail}`);
          console.log(`FAIL  ${label}  —  ${detail}`);
          continue;
        }
        const first = readings[0].columns[col];
        const problems = [];
        if (!first || first.filter((l) => !l.startsWith("window ") && !l.startsWith("scrubber ")).length === 0) {
          problems.push(`lights nothing with ${readings[0].chosen} chosen`);
        }
        for (const r of readings.slice(1)) {
          const now = r.columns[col];
          if (JSON.stringify(now) !== JSON.stringify(first)) {
            problems.push(`differs with ${r.chosen} chosen (${firstDifference(first || [], now || [])})`);
          }
        }
        const pass = problems.length === 0;
        results.push({ criterion, pass });
        if (!pass) failures.push(`${label}: ${problems.join(" | ")}`);
        console.log(`${pass ? "PASS" : "FAIL"}  ${label}  —  ${pass ? `same with ${CHOICES.join(", ")} chosen; ${summarize(first)}` : problems.join(" | ")}`);
        if (VERBOSE || !pass) {
          for (const r of readings) console.log(`        ${r.chosen.padEnd(6)} chosen: ${summarize(r.columns[col])}`);
        }
      }
    }
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}

console.log("\nSummary");
const byCriterion = new Map();
for (const r of results) {
  const c = byCriterion.get(r.criterion) || { pass: 0, n: 0 };
  c.n++;
  if (r.pass) c.pass++;
  byCriterion.set(r.criterion, c);
}
for (const [criterion, c] of byCriterion) {
  console.log(`  ${criterion.padEnd(16)} ${c.pass === c.n ? "PASS" : "FAIL"} ${c.pass}/${c.n}  the column lights the same notes whichever instrument is chosen`);
}
const ok = failures.length === 0 && results.length > 0;
console.log(`\n${ok ? "PASS" : "FAIL"} — ${results.filter((r) => r.pass).length}/${results.length} checks passed`);
process.exit(ok ? 0 : 1);
