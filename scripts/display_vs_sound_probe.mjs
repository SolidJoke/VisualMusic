#!/usr/bin/env node
/**
 * display_vs_sound_probe.mjs — VMU-180: what an instrument SHOWS against what
 * its synth is TOLD, measured in the served A' page (`/?prototype=a`).
 *
 * VisualMusic is a reminder for a beginner: if the instrument draws one shape
 * and plays another, it teaches a mistake. This probe opens the page in a real
 * Chromium at 3840x2045, drives the page's own gestures (the column heads' ▶,
 * the drawer's chord buttons, a click on a neck cell, the transport's ▶), and
 * for each point of the VMU-180 sheet prints the DRAWN pitches (lit cells and
 * keys of each column), the PROGRAMMED pitches (what each synth receives in
 * `triggerAttack`, see scripts/lib/displayVsSound.mjs) and the FLASHED ones
 * (every key or cell that carried `is-playing`, caught by a MutationObserver).
 *
 *   npm run display:probe                 # all points, port 5211
 *   npm run display:probe -- --only=1,5   # some of them
 *   DISPLAY_PROBE_PORT=5211 node scripts/display_vs_sound_probe.mjs
 *
 * Points (numbering of the VMU-180 sheet):
 *   1  bass, chord in the Dictionary: three notes drawn, how many programmed
 *   2  Studio, guitar sounding, "Octave des accords" != 0: shape drawn = shape played
 *   3  Studio, during the loop: the bass line against the bass neck's shape
 *   4  Dictionary, chord at +1 / +2 / +3 octave: shapes, ▶, range alert, labels, order
 *     (41 = the same on the classic page, ?layout=classic, where the octave moves the necks)
 *   5  the piano's flash on notes of another instrument (4 gestures)
 *   6  scale positions: bass, C major, octave 0, automatic position
 *
 * It does not judge a result: it prints the measured quantities and a verdict
 * word (SAME / DIFFERENT / FLASHES / QUIET) that the report reads. Exit 1 only
 * if the page throws or a setup step fails. Own dev server on its own port
 * (reused if one answers); never writes to dist/ or preview.local/. Chromium
 * only; it cannot hear anything.
 */
import path from "node:path";
import process from "node:process";
import { translations } from "../src/i18n/translations.js";
import { repoRootFrom } from "./lib/repoRoot.mjs";
import { installSynthTap, positionsToMidi, midiToName, nameToMidi, OPEN } from "./lib/displayVsSound.mjs";

const ROOT = repoRootFrom(import.meta.url);
const PORT = Number(process.env.DISPLAY_PROBE_PORT ?? 5211);
const ORIGIN = `http://localhost:${PORT}`;
const args = process.argv.slice(2);
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean).map(Number);
const INST = (args.find((a) => a.startsWith("--inst=")) || "").slice(7).split(",").filter(Boolean);
const wantInst = (i) => INST.length === 0 || INST.includes(i);
const want = (n) => ONLY.length === 0 || ONLY.includes(n);

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
  return { server, reused: false };
}

// ─── in-page recorders ─────────────────────────────────────────────────────

/** Runs in the page: records every key / cell that carries is-playing, from now on. */
function installFlashRecorder() {
  const w = (window.__vm = window.__vm || { log: [] });
  if (w.flash) return;
  w.flash = { piano: new Set(), guitar: new Set(), bass: new Set() };
  const scan = () => {
    const piano = document.querySelector('[data-s1="piano"]');
    if (piano) piano.querySelectorAll(".piano-key.is-playing[data-abs]").forEach((k) => w.flash.piano.add(Number(k.getAttribute("data-abs"))));
    for (const id of ["guitar", "bass"]) {
      const neck = document.querySelector(`[data-s1="${id}"]`);
      if (!neck) continue;
      neck.querySelectorAll(".note-marker.is-playing").forEach((m) => {
        const c = m.closest("[data-string-index]");
        const r = m.closest("[data-fret]");
        if (c && r) w.flash[id].add(`${c.getAttribute("data-string-index")}:${r.getAttribute("data-fret")}`);
      });
    }
  };
  new MutationObserver(scan).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
}

/** Runs in the page: what each column draws right now. */
function readShown() {
  const out = {};
  const piano = document.querySelector('[data-s1="piano"]');
  out.pianoAttr = piano.getAttribute("data-s1-notes") || "";
  out.pianoLit = [...piano.querySelectorAll(".piano-key[data-abs]")]
    .filter((k) => [...k.classList].some((c) => c.startsWith("role-")))
    .map((k) => Number(k.getAttribute("data-abs")));
  for (const id of ["guitar", "bass"]) {
    const neck = document.querySelector(`[data-s1="${id}"]`);
    out[`${id}Attr`] = neck.getAttribute("data-s1-positions") || "";
    out[`${id}Cells`] = [...neck.querySelectorAll(".note-marker")].map((m) => {
      const c = m.closest("[data-string-index]");
      const r = m.closest("[data-fret]");
      return {
        s: c ? Number(c.getAttribute("data-string-index")) : null,
        f: r ? Number(r.getAttribute("data-fret")) : null,
        playing: m.classList.contains("is-playing"),
      };
    });
  }
  return out;
}

// ─── helpers on the node side ──────────────────────────────────────────────

const uniqSorted = (a) => [...new Set(a)].sort((x, y) => x - y);
const names = (a) => a.map(midiToName).join(" ");
const cellToMidi = (inst, c) => OPEN[inst][OPEN[inst].length - 1 - c.s] + c.f;
/** Pitches drawn on a neck: lit cells that are not just the flash of a note. */
function drawnNeck(shown, inst) {
  return uniqSorted(shown[`${inst}Cells`].filter((c) => !c.playing && c.s !== null && c.f !== null).map((c) => cellToMidi(inst, c)));
}
function programmed(log, synthMatch) {
  return log.filter((e) => synthMatch(e.synth)).flatMap((e) => e.notes.map(nameToMidi));
}
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const lines = [];
const out = (s) => {
  lines.push(s);
  console.log(s);
};


/** True when the page carries the "out of range" warning, as text or as a mark's label (French page). */
async function hasRangeWarning(page) {
  return page.evaluate((t) => document.body.textContent.includes(t) || [...document.querySelectorAll("[aria-label],[title]")].some((e) => (e.getAttribute("aria-label") || e.getAttribute("title") || "").includes(t)), translations.fr.warningOutOfRange);
}

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}
async function tap(page) {
  return page.evaluate(installSynthTap);
}
async function resetRecorders(page) {
  await page.evaluate(() => {
    window.__vm.log.length = 0;
    for (const k of Object.keys(window.__vm.flash)) window.__vm.flash[k].clear();
  });
}
async function readRecorders(page) {
  return page.evaluate(() => ({
    log: window.__vm.log,
    flash: Object.fromEntries(Object.entries(window.__vm.flash).map(([k, v]) => [k, [...v]])),
  }));
}

async function openPage(browser, query, errors) {
  const page = await browser.newPage({ viewport: { width: 3840, height: 2045 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${ORIGIN}/?prototype=a${query}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-s1="piano"] .piano-vertical').waitFor({ state: "visible", timeout: 30_000 });
  // The samplers load from /samples; wait for them so the tap wraps the real synths.
  for (let i = 0; i < 40; i++) {
    const t = await tap(page);
    if (t.every((x) => !/Sampler:none|none$/.test(x)) && t.some((x) => x.startsWith("guitarCurrent:_Sampler")) && t.some((x) => x.startsWith("pianoCurrent:_Sampler"))) break;
    await page.waitForTimeout(500);
  }
  await page.evaluate(installFlashRecorder);
  return page;
}
async function openDrawer(page) {
  if (await page.locator('[data-s1="drawer"]').count()) return;
  await page.locator('[data-testid="proto-drawer-toggle"]').click();
  await page.locator('[data-s1="drawer"]').waitFor({ timeout: 5_000 });
}
async function closeDrawer(page) {
  if (!(await page.locator('[data-s1="drawer"]').count())) return;
  await page.locator('[data-testid="proto-drawer-toggle"]').click();
  await page.locator('[data-s1="drawer"]').waitFor({ state: "detached", timeout: 5_000 });
}
async function chooseInstrument(page, id) {
  const sel = `[data-fn="jouer.instrument-tuile-${id}"]`;
  await page.locator(sel).click();
  await page.locator(`${sel}[aria-pressed="true"]`).waitFor({ timeout: 5_000 });
}
async function studioChord(page, label) {
  await openDrawer(page);
  if (label) await page.locator('[data-s1="drawer"]').getByRole("button", { name: label, exact: true }).click();
  else {
    // The progression's first chord, whatever the style calls it: a chord button sits between two spans (its degree and its quality).
    const handle = await page.evaluateHandle(() => [...document.querySelectorAll('[data-s1="drawer"] button.btn-premium')].find((b) => b.previousElementSibling?.tagName === "SPAN" && b.nextElementSibling?.tagName === "SPAN"));
    await handle.asElement().click();
  }
  await closeDrawer(page);
}
async function setChordOctave(page, target) {
  // The arrows are the page's own gesture; the Studio starts at 0.
  const n = Math.abs(target);
  const fn = target > 0 ? "jouer.octave-piano-suiv" : "jouer.octave-piano-prec";
  for (let i = 0; i < n; i++) await page.locator(`[data-fn="${fn}"]`).first().click();
}

// ─── the points ────────────────────────────────────────────────────────────

async function point1(browser, errors) {
  out("\n== POINT 1 · bass, chord in the Dictionary: drawn vs programmed ==");
  for (const scenario of ["cmaj", "gsm7"]) {
    const page = await openPage(browser, `&bench=1&scenario=${scenario}`, errors);
    await page.locator(`[data-scenario="${scenario}"].is-active`).waitFor({ timeout: 10_000 });
    const rows = {};
    for (const inst of ["guitar", "bass", "piano"]) {
      await tap(page);
      await resetRecorders(page);
      await page.locator(`[data-fn="jouer.instrument-play-${inst}"]`).click();
      await settle(page, 800);
      const shown = await page.evaluate(readShown);
      const rec = await readRecorders(page);
      const prog = uniqSorted(programmed(rec.log, (s) => (inst === "bass" ? /bass/.test(s) : inst === "guitar" ? /guitar/.test(s) : /piano/.test(s))));
      const synths = [...new Set(rec.log.map((e) => `${e.synth}(${e.ctor})`))].join(",");
      const drawn = inst === "piano" ? uniqSorted(shown.pianoAttr.split(/\s+/).filter(Boolean).map(Number)) : drawnNeck(shown, inst);
      rows[inst] = { drawn, prog };
      out(`  ${scenario} ${inst}: drawn [${names(drawn)}] (${drawn.length}) | programmed [${names(prog)}] (${prog.length}) via ${synths || "no synth call"} -> ${same(drawn, prog) ? "SAME" : "DIFFERENT"}`);
    }
    await page.close();
  }
}

async function studioSetup(browser, errors, { instrument, octave }) {
  const page = await openPage(browser, "", errors);
  await page.locator('[data-fn="nav.mode-studio"]').click();
  await page.waitForTimeout(400);
  await chooseInstrument(page, instrument);
  if (octave !== 0) await setChordOctave(page, octave);
  return page;
}

async function point2(browser, errors) {
  out("\n== POINT 2 · Studio, chord octave != 0: shape drawn vs shape played (PR #160 fixed the guitar) ==");
  for (const instrument of ["guitar", "bass", "piano"].filter(wantInst)) {
    for (const octave of [0, 2, -2]) {
      for (const chord of ["Sol", "Do"]) {
        const page = await studioSetup(browser, errors, { instrument, octave });
        await tap(page);
        await resetRecorders(page);
        await studioChord(page, chord);
        await settle(page, 900);
        const shown = await page.evaluate(readShown);
        const rec = await readRecorders(page);
        const prog = uniqSorted(programmed(rec.log, (s) => (instrument === "bass" ? /bass/.test(s) : instrument === "guitar" ? /guitar/.test(s) : /piano/.test(s))));
        const drawn =
          instrument === "piano" ? uniqSorted(shown.pianoLit) : drawnNeck(shown, instrument);
        const attrDrawn = instrument === "piano" ? uniqSorted(shown.pianoAttr.split(/\s+/).filter(Boolean).map(Number)) : uniqSorted(positionsToMidi(instrument, shown[`${instrument}Attr`]));
        const warn = instrument === "piano" ? "n/a" : await hasRangeWarning(page);
        out(`  ${instrument} octave ${octave >= 0 ? "+" : ""}${octave} chord ${chord}: drawn [${names(drawn)}] (attr [${names(attrDrawn)}]) | programmed [${names(prog)}] -> ${same(drawn, prog) ? "SAME" : "DIFFERENT"} | out-of-range warning shown: ${warn}`);
        await page.close();
      }
    }
  }
}

async function pickStyle(page, pattern) {
  const container = page.locator('[data-fn="composer.style"]').first();
  await container.locator(".custom-select-header").click();
  const list = page.locator('[data-testid="custom-select-dropdown"]');
  await list.locator(".select-item", { hasText: pattern }).first().click({ force: true, timeout: 8000 });
  await list.waitFor({ state: "detached", timeout: 5_000 });
}

async function point3(browser, errors) {
  out("\n== POINT 3 · Studio, during the loop: the bass line against the bass neck ==");
  for (const style of [null, /^Jazz Standard/]) {
    const page = await studioSetup(browser, errors, { instrument: "bass", octave: 0 });
    if (style) await pickStyle(page, style);
    await tap(page);
    await studioChord(page, style ? null : "Do");
    await settle(page, 900);
    await tap(page);
    await resetRecorders(page);
    const drawnUnion = new Set();
    const playingSamples = [];
    await page.locator('[data-fn="jouer.lecture"]').click();
    const t0 = Date.now();
    while (Date.now() - t0 < 9000) {
      const shown = await page.evaluate(readShown);
      drawnNeck(shown, "bass").forEach((m) => drawnUnion.add(m));
      playingSamples.push(shown.bassCells.filter((c) => c.playing).length);
      await page.waitForTimeout(80);
    }
    const rec = await readRecorders(page);
    await page.locator('[data-fn="jouer.lecture"]').click();
    const bassCalls = rec.log.filter((e) => /bass/.test(e.synth));
    const bassProg = uniqSorted(programmed(rec.log, (s) => /bass/.test(s)));
    const flashedBass = uniqSorted(rec.flash.bass.map((k) => { const [s, f] = k.split(":").map(Number); return cellToMidi("bass", { s, f }); }));
    const drawn = [...drawnUnion].sort((a, b) => a - b);
    const notInDrawn = bassProg.filter((m) => !drawn.includes(m));
    const notFlashed = bassProg.filter((m) => !flashedBass.includes(m));
    const edges = playingSamples.filter((n, i) => n > 0 && (i === 0 || playingSamples[i - 1] === 0)).length;
    out(`  style ${style ? String(style) : "default"}: bass line programmed (distinct, 9 s) [${names(bassProg)}] from ${bassCalls.length} bassSynth call(s)`);
    out(`  bass neck drawn (union of the static shape over the run) [${names(drawn)}]`);
    out(`  bass neck flashed (is-playing) [${names(flashedBass)}]; ${edges} flash(es) seen at 80 ms sampling for ${bassCalls.length} note(s) sent`);
    out(`  programmed but NOT in the drawn shape [${names(notInDrawn)}]; programmed but never flashed [${names(notFlashed)}] -> ${notInDrawn.length === 0 ? "SAME" : notFlashed.length ? "DIFFERENT-NOT-FLASHED" : "DIFFERENT-FLASHED"}`);
    out(`  (piano flashed during the loop: [${names(uniqSorted(rec.flash.piano))}]; guitar neck flashed: ${JSON.stringify(rec.flash.guitar)})`);
    await page.close();
  }
}

async function point4(browser, errors) {
  out("\n== POINT 4 · Dictionary, chord Do at octave 0 / +1 / +2 / +3: shapes, ▶, alert, labels ==");
  for (const octave of [0, 1, 2, 3]) {
    const page = await openPage(browser, "&bench=1&scenario=cmaj", errors);
    await page.locator('[data-scenario="cmaj"].is-active').waitFor({ timeout: 10_000 });
    for (let i = 0; i < octave; i++) await page.locator('[data-fn="jouer.octave-piano-suiv"]').first().click();
    await settle(page, 400);
    for (const inst of ["guitar", "bass"]) {
      await tap(page);
      await resetRecorders(page);
      const shown = await page.evaluate(readShown);
      await page.locator(`[data-fn="jouer.instrument-play-${inst}"]`).click();
      await settle(page, 800);
      const rec = await readRecorders(page);
      const prog = uniqSorted(programmed(rec.log, (s) => new RegExp(inst).test(s)));
      const drawn = drawnNeck(shown, inst);
      const alerts = await page.locator(`[data-fn="jouer.position-alertes-${inst}"]`).allInnerTexts();
      const alertTitles = await page.locator(`[data-fn="jouer.position-alertes-${inst}"]`).evaluateAll((els) => els.map((e) => e.getAttribute("title") || e.getAttribute("aria-label") || ""));
      const panelBtn = await page.locator(`[data-fn="jouer.position-panneau-${inst}"]`).innerText();
      out(`  octave +${octave} ${inst}: positions "${shown[`${inst}Attr`]}" drawn [${names(drawn)}] | ▶ programmed [${names(prog)}] -> ${same(drawn, prog) ? "SAME" : "DIFFERENT"} | position label "${panelBtn.replace(/\s+/g, " ")}" | alert ${alerts.length ? JSON.stringify(alerts) + JSON.stringify(alertTitles) : "none"}`);
    }
    const shownP = await page.evaluate(readShown);
    out(`  octave +${octave} piano drawn [${names(uniqSorted(shownP.pianoAttr.split(/\s+/).filter(Boolean).map(Number)))}]`);
    await page.close();
  }
  // Labels with no position chosen: single note, chord, scale (Dictionary).
  for (const [label, scenarioQuery] of [["chord", "&bench=1&scenario=cmaj"], ["scale", "&bench=1&scenario=cmajscale"]]) {
    const page = await openPage(browser, scenarioQuery, errors);
    const g = await page.locator('[data-fn="jouer.position-panneau-guitar"]').innerText();
    const b = await page.locator('[data-fn="jouer.position-panneau-bass"]').innerText();
    out(`  ${label}: guitar position label "${g.replace(/\s+/g, " ")}" | bass "${b.replace(/\s+/g, " ")}"`);
    await page.close();
  }
  {
    const page = await openPage(browser, "&bench=1&scenario=cmaj", errors);
    await page.locator('[data-fn="dico.famille"] button').nth(0).click();
    await settle(page, 400);
    const g = await page.locator('[data-fn="jouer.position-panneau-guitar"]').innerText();
    const b = await page.locator('[data-fn="jouer.position-panneau-bass"]').innerText();
    out(`  single note: guitar position label "${g.replace(/\s+/g, " ")}" | bass "${b.replace(/\s+/g, " ")}"`);
    await page.close();
  }
}

/** Runs in the classic page: the lit cells of a horizontal neck as string row / cell index. */
function readClassicNecks() {
  const out = {};
  for (const id of ["guitar", "bass"]) {
    const neck = document.querySelector(`.fretboard-container.instrument-${id}`);
    const cells = [];
    if (neck) {
      neck.querySelectorAll(".string-row").forEach((row, s) => {
        [...row.children].filter((c) => c.classList.contains("fret")).forEach((cell, c) => {
          if (cell.querySelector(".note-marker")) cells.push({ s, f: c, playing: Boolean(cell.querySelector(".note-marker.is-playing")) });
        });
      });
    }
    out[`${id}Cells`] = cells;
    out[`${id}Range`] = neck && neck.querySelector(".fret-range-label") ? neck.querySelector(".fret-range-label").textContent.trim() : "";
  }
  return out;
}

async function point4b(browser, errors) {
  out("\n== POINT 4b · the CLASSIC page (?layout=classic), Dictionary, chord Do at octave 0 / +1 / +2 / +3 ==");
  for (const octave of [0, 1, 2, 3]) {
    const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${ORIGIN}/?layout=classic`, { waitUntil: "domcontentloaded" });
    await page.locator(".sidebar-cta-btn").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.locator('[data-testid="btn-mode-dictionary"]').click();
    await page.locator(".instrument-bar").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".sidebar-cta-btn", { hasText: "Studio & Harmonie" }).first().click();
    const panel = page.locator('[data-testid="dictionary-panel"]');
    await panel.waitFor({ state: "visible", timeout: 10_000 });
    await panel.locator(".btn-segment-group").first().locator(".btn-segment").nth(1).click();
    if (octave) await panel.locator(".btn-segment", { hasText: new RegExp(`^\\+${octave}$`) }).first().click();
    await page.keyboard.press("Escape");
    await page.locator(".modal-container").waitFor({ state: "detached", timeout: 10_000 });
    for (let i = 0; i < 40; i++) {
      const t = await tap(page).catch(() => []);
      if (t.some((x) => x.startsWith("guitarCurrent:_Sampler")) && t.some((x) => x.startsWith("pianoCurrent:_Sampler"))) break;
      await page.waitForTimeout(500);
    }
    for (const [i, inst] of ["guitar", "bass"].entries()) {
      await tap(page);
      await page.evaluate(() => { window.__vm.log.length = 0; });
      const shown = await page.evaluate(readClassicNecks);
      await page.locator(".instrument-bar__play").nth(i + 1).click();
      await settle(page, 800);
      const log = await page.evaluate(() => window.__vm.log);
      const drawn = uniqSorted(shown[`${inst}Cells`].map((c) => cellToMidi(inst, c)));
      const prog = uniqSorted(programmed(log, (s) => new RegExp(inst).test(s)));
      out(`  classic octave +${octave} ${inst}: drawn [${names(drawn)}] (cells ${JSON.stringify(shown[`${inst}Cells`].map((c) => `${c.s}:${c.f}`))}, window "${shown[`${inst}Range`]}") | ▶ programmed [${names(prog)}] -> ${same(drawn, prog) ? "SAME" : "DIFFERENT"} | out-of-range warning shown: ${await hasRangeWarning(page)}`);
    }
    await page.close();
  }
}

async function neckClick(page, inst, s, f) {
  await page.locator(`[data-s1="${inst}"] .fbv-fret-row[data-fret="${f}"] .fbv-cell[data-string-index="${s}"]`).first().click();
}

async function point5(browser, errors) {
  out("\n== POINT 5 · the piano's flash on notes of another instrument ==");
  const flashReport = async (page, what, inst) => {
    const rec = await readRecorders(page);
    const piano = uniqSorted(rec.flash.piano);
    const neck = rec.flash[inst] || [];
    out(`  ${what}: piano flashed [${names(piano)}] (${piano.length}) | ${inst} neck flashed ${JSON.stringify(neck)} -> ${piano.length ? "PIANO-FLASHES" : "QUIET"}`);
  };
  // (a) single note, ▶ on the guitar and the bass
  for (const inst of ["guitar", "bass"]) {
    const page = await openPage(browser, "&bench=1&scenario=cmaj", errors);
    await page.locator('[data-fn="dico.famille"] button').nth(0).click();
    await settle(page, 400);
    await resetRecorders(page);
    await page.locator(`[data-fn="jouer.instrument-play-${inst}"]`).click();
    await settle(page, 900);
    await flashReport(page, `(a) single note Do, ▶ ${inst}`, inst);
    await page.close();
  }
  // (e) chord and (f) scale, ▶ on the guitar and the bass
  for (const [tag, scenario, settleMs] of [["(e) chord Do", "cmaj", 900], ["(f) scale Do major", "cmajscale", 5000]]) {
    for (const inst of ["guitar", "bass"]) {
      const page = await openPage(browser, `&bench=1&scenario=${scenario}`, errors);
      await resetRecorders(page);
      await page.locator(`[data-fn="jouer.instrument-play-${inst}"]`).click();
      await settle(page, settleMs);
      await flashReport(page, `${tag}, ▶ ${inst}`, inst);
      await page.close();
    }
  }
  // (b) a non-root note of a neck clicked (chord Do, E)
  for (const inst of ["guitar", "bass"]) {
    const page = await openPage(browser, "&bench=1&scenario=cmaj", errors);
    const shown = await page.evaluate(readShown);
    const cells = shown[`${inst}Cells`].filter((c) => !c.playing);
    const nonRoot = cells.find((c) => cellToMidi(inst, c) % 12 !== 0);
    await resetRecorders(page);
    await neckClick(page, inst, nonRoot.s, nonRoot.f);
    await settle(page, 900);
    await flashReport(page, `(b) chord Do, ${inst} neck, non-root cell s${nonRoot.s} f${nonRoot.f} (${midiToName(cellToMidi(inst, nonRoot))}) clicked`, inst);
    await page.close();
  }
  // (c) the root of a chord clicked on a neck (PR #160 fixed the instrument tag)
  for (const inst of ["guitar", "bass"]) {
    const page = await openPage(browser, "&bench=1&scenario=cmaj", errors);
    const shown = await page.evaluate(readShown);
    const cells = shown[`${inst}Cells`].filter((c) => !c.playing);
    const root = cells.find((c) => cellToMidi(inst, c) % 12 === 0);
    await resetRecorders(page);
    await neckClick(page, inst, root.s, root.f);
    await settle(page, 900);
    await flashReport(page, `(c) chord Do, ${inst} neck, root cell s${root.s} f${root.f} clicked`, inst);
    await page.close();
  }
  // (d) Studio, a chord clicked while the guitar / bass sounds
  for (const inst of ["guitar", "bass"]) {
    const page = await studioSetup(browser, errors, { instrument: inst, octave: 0 });
    await tap(page);
    await resetRecorders(page);
    await studioChord(page, "Do");
    await settle(page, 900);
    await flashReport(page, `(d) Studio, ${inst} sounding, chord Do clicked`, inst);
    await page.close();
  }
}

async function point6(browser, errors) {
  out("\n== POINT 6 · scale positions: C major, octave 0, automatic position ==");
  const page = await openPage(browser, "&bench=1&scenario=cmajscale", errors);
  const shown = await page.evaluate(readShown);
  for (const inst of ["bass", "guitar"]) {
    const cells = shown[`${inst}Cells`].filter((c) => !c.playing);
    const midi = cells.map((c) => cellToMidi(inst, c)).sort((a, b) => a - b);
    const perString = {};
    for (const c of cells) (perString[c.s] = perString[c.s] || []).push(c.f);
    out(`  ${inst}: ${cells.length} lit cell(s) [${names(midi)}] by string ${JSON.stringify(perString)} (attr "${shown[`${inst}Attr`]}")`);
  }
  const g = await page.locator('[data-fn="jouer.position-panneau-guitar"]').innerText();
  const b = await page.locator('[data-fn="jouer.position-panneau-bass"]').innerText();
  out(`  position labels: guitar "${g.replace(/\s+/g, " ")}" | bass "${b.replace(/\s+/g, " ")}"`);
  await page.close();
}

// ─── run ───────────────────────────────────────────────────────────────────

const { chromium } = await import("playwright");
const dev = await startDevServer();
out(`VisualMusic display-vs-sound probe (VMU-180)`);
out(`  dev server : ${ORIGIN}${dev.reused ? " (reused)" : " (started here)"}`);
out(`  browser    : Chromium only; nothing is heard, only the synths' calls are read.`);
const browser = await chromium.launch();
const errors = [];
let failed = false;
try {
  for (const [n, fn] of [[1, point1], [2, point2], [3, point3], [4, point4], [41, point4b], [5, point5], [6, point6]]) {
    if (!want(n)) continue;
    try {
      await fn(browser, errors);
    } catch (e) {
      failed = true;
      out(`  SETUP FAILED in point ${n}: ${String(e && e.message ? e.message : e).split("\n")[0]}`);
    }
  }
} finally {
  await browser.close();
  if (dev.server) await dev.server.close();
}
out(`\npage errors: ${errors.length}${errors.length ? "\n  " + [...new Set(errors)].slice(0, 5).join("\n  ") : ""}`);
process.exit(failed || errors.length ? 1 : 0);
